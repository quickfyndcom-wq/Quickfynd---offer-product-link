import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/firebase-admin';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import Product from '@/models/Product';
import { sendOrderStatusEmail } from '@/lib/email';

const CANCELLABLE_STATUSES = new Set([
  'ORDER_PLACED',
  'CONFIRMED',
  'PROCESSING',
  'PICKUP_REQUESTED',
  'WAITING_FOR_PICKUP',
]);

function findMatchingVariantIndex(variants = [], variantOptions = {}) {
  if (!Array.isArray(variants) || variants.length === 0 || !variantOptions) return -1;

  return variants.findIndex((variant) => {
    const options = variant?.options || {};
    const colorMatch = variantOptions?.color ? options?.color === variantOptions.color : true;
    const sizeMatch = variantOptions?.size ? options?.size === variantOptions.size : true;

    if (variantOptions?.bundleQty === null || variantOptions?.bundleQty === undefined) {
      const optionBundleQty = Number(options?.bundleQty);
      const isBundleVariant = Number.isFinite(optionBundleQty) && optionBundleQty > 1;
      return colorMatch && sizeMatch && !isBundleVariant;
    }

    const bundleMatch = Number(options?.bundleQty || 0) === Number(variantOptions?.bundleQty || 0);
    return colorMatch && sizeMatch && bundleMatch;
  });
}

export async function POST(req) {
  try {
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const auth = getAuth();
    const decoded = await auth.verifyIdToken(token);
    const userId = decoded.uid;

    const body = await req.json();
    const orderId = body?.orderId;
    const reason = String(body?.reason || '').trim();

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    await connectDB();

    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const isOwner = String(order.userId || '') === String(userId) || (decoded?.email && order.guestEmail === decoded.email);
    if (!isOwner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const currentStatus = String(order.status || '').toUpperCase();
    if (currentStatus === 'CANCELLED') {
      return NextResponse.json({ error: 'Order already cancelled' }, { status: 400 });
    }

    if (!CANCELLABLE_STATUSES.has(currentStatus)) {
      return NextResponse.json({ error: `Order cannot be cancelled at ${currentStatus} stage` }, { status: 400 });
    }

    order.status = 'CANCELLED';
    if (reason) {
      order.cancelReason = reason;
    }
    await order.save();

    // Restock product quantities for cancelled order
    for (const item of order.orderItems || []) {
      const productId = item?.productId;
      const qty = Number(item?.quantity) || 0;
      if (!productId || qty <= 0) continue;

      try {
        const product = await Product.findById(productId);
        if (!product) continue;

        if (item?.variantOptions && Array.isArray(product.variants) && product.variants.length > 0) {
          const variantIndex = findMatchingVariantIndex(product.variants, item.variantOptions);
          if (variantIndex >= 0) {
            const currentStock = Number(product.variants[variantIndex]?.stock ?? 0);
            product.variants[variantIndex].stock = currentStock + qty;
            product.stockQuantity = product.variants.reduce((sum, variant) => sum + Math.max(0, Number(variant?.stock ?? 0)), 0);
            product.inStock = product.stockQuantity > 0;
            await product.save();
            continue;
          }
        }

        product.stockQuantity = Math.max(0, Number(product.stockQuantity || 0) + qty);
        product.inStock = Number(product.stockQuantity || 0) > 0;
        await product.save();
      } catch (stockErr) {
        console.error('Cancel restock error:', stockErr);
      }
    }

    // Best effort email notification
    try {
      await sendOrderStatusEmail(order, 'CANCELLED');
    } catch (mailErr) {
      console.error('Cancel email send error:', mailErr);
    }

    const populatedOrder = await Order.findById(order._id)
      .populate({ path: 'orderItems.productId', model: 'Product' })
      .populate('addressId')
      .lean();

    return NextResponse.json({
      success: true,
      message: 'Order cancelled successfully',
      order: populatedOrder || order,
    });
  } catch (error) {
    console.error('Order cancel error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to cancel order' }, { status: 500 });
  }
}
