import dbConnect from '@/lib/mongodb';
import CategorySlider from '@/models/CategorySlider';
import Product from '@/models/Product';
import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    await dbConnect();

    // Fetch all category sliders (sections) to display on homepage
    let sections = await CategorySlider.find({}).lean();

    // If no sections exist, create fallback with actual products from database
    if (!sections || sections.length === 0) {
      const availableProducts = await Product.find({ inStock: true })
        .select('_id name slug image images price basePrice mrp rating reviews inStock')
        .limit(10)
        .lean();

      if (availableProducts && availableProducts.length > 0) {
        sections = [
          {
            _id: 'fallback-featured',
            title: 'Featured Products',
            subtitle: 'Check out our latest collection',
            products: availableProducts.slice(0, 5)
          },
          {
            _id: 'fallback-trending',
            title: 'Trending Now',
            subtitle: 'Most popular items',
            products: availableProducts.slice(5, 10)
          }
        ];
      }
    } else {
      // Populate products for each section with productIds
      sections = await Promise.all(
        sections.map(async (section) => {
          if (section.productIds && section.productIds.length > 0) {
            const products = await Product.find({
              _id: { $in: section.productIds },
              inStock: true
            })
            .select('_id name slug image images price basePrice mrp rating reviews inStock fastDelivery')
            .lean();
            
            return {
              ...section,
              products
            };
          }
          return section;
        })
      );
    }

    return NextResponse.json({ sections: sections || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching featured sections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sections' },
      { status: 500 }
    );
  }
}
