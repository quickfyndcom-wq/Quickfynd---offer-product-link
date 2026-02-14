'use client'
import { addToCart, removeFromCart } from "@/lib/features/cart/cartSlice";
import { useDispatch, useSelector } from "react-redux";

const Counter = ({ productId, maxQty }) => {

    const { cartItems } = useSelector(state => state.cart);

    const dispatch = useDispatch();

    const entry = cartItems[productId];
    const quantity = typeof entry === 'number' ? entry : entry?.quantity || 0;
    const price = typeof entry === 'number' ? undefined : entry?.price;
    const normalizedMaxQty = typeof maxQty === 'number' ? Math.max(0, maxQty) : null;
    const canIncrement = normalizedMaxQty === null ? true : quantity < normalizedMaxQty;

    const addToCartHandler = () => {
        if (!canIncrement) return;
        dispatch(addToCart({ productId, price, maxQty: normalizedMaxQty }))
    }

    const removeFromCartHandler = () => {
        dispatch(removeFromCart({ productId }))
    }

    return (
        <div className="inline-flex items-center gap-1 sm:gap-3 px-3 py-1 rounded border border-slate-200 max-sm:text-sm text-slate-600">
            <button onClick={removeFromCartHandler} className="p-1 select-none">-</button>
            <p className="p-1">{quantity}</p>
            <button
                onClick={addToCartHandler}
                disabled={!canIncrement}
                className={`p-1 select-none ${!canIncrement ? 'opacity-40 cursor-not-allowed' : ''}`}
            >+
            </button>
        </div>
    )
}

export default Counter