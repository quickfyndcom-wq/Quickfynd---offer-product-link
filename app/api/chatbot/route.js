import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import Coupon from "@/models/Coupon";

// Validate API key exists
if (!process.env.GEMINI_API_KEY) {
    console.error('[Chatbot] GEMINI_API_KEY is not set in environment variables');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request) {
    try {
        // Check if API key is set
        if (!process.env.GEMINI_API_KEY) {
            console.error('[Chatbot] Missing GEMINI_API_KEY - cannot initialize AI');
            return NextResponse.json({ 
                error: "AI service is not configured. Please contact support." 
            }, { status: 503 });
        }

        const { message, conversationHistory } = await request.json();

        if (!message) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        try {
            // Fetch products and store info for context
            await dbConnect();
            const products = await Product.find({ inStock: true })
                .select('_id name description price mrp category inStock fastDelivery')
                .limit(50)
                .lean();

            // Fetch active coupons
            const coupons = await Coupon.find({
                isActive: true,
                expiresAt: { $gte: new Date() }
            })
                .select('code discountValue discountType description minOrderValue forNewUser forMember')
                .lean();

            // Build context for AI
            const systemContext = `You are QuickAI, Quickfynd's friendly shopping assistant. Help customers find products, answer questions about offers, shipping, returns, and provide excellent customer service.

**Available Products (${products.length}):**
${products.slice(0, 30).map(p => `- ${p.name} (₹${p.price}${p.mrp > p.price ? `, was ₹${p.mrp}` : ''}) - ${p.category}${p.fastDelivery ? ' ⚡ Fast Delivery' : ''}`).join('\n')}

**Active Offers & Coupons:**
${coupons.length > 0 ? coupons.slice(0, 10).map(c => 
    `- Code: ${c.code} - ${c.discountType === 'percentage' ? c.discountValue + '% off' : '₹' + c.discountValue + ' off'}${c.minOrderValue ? ' (Min: ₹' + c.minOrderValue + ')' : ''}${c.forNewUser ? ' 🆕 New Users' : ''}${c.forMember ? ' 👤 Members' : ''}`
).join('\n') : 'No active coupons at the moment.'}

**Store Policies:**
- Free shipping on orders above ₹499
- 7-day return and replacement policy
- Cash on Delivery (COD) and Online payment
- Fast delivery on select products
- Guest checkout available

**Guidelines:**
1. Be friendly and helpful
2. Recommend products based on customer needs
3. Provide accurate pricing and availability
4. Explain offers and coupon codes
5. Help with orders, returns, and general questions
6. Keep responses concise and informative
7. Use emojis occasionally 😊
8. Mention prices in ₹ (Indian Rupees)

Respond naturally and helpfully!`;

            // Build conversation history for context
            const conversationContext = conversationHistory && conversationHistory.length > 0
                ? conversationHistory.map(msg => `${msg.role === 'user' ? 'Customer' : 'Assistant'}: ${msg.content}`).join('\n')
                : '';

            const fullPrompt = conversationContext 
                ? `${systemContext}\n\nPrevious Conversation:\n${conversationContext}\n\nCurrent Question: ${message}`
                : systemContext + `\n\nCustomer Question: ${message}`;

            console.log('[Chatbot] Sending request to Gemini AI...');

            // Generate AI response
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const result = await model.generateContent(fullPrompt);
            const response = await result.response;
            const aiMessage = response.text();

            console.log('[Chatbot] Response generated successfully');

            return NextResponse.json({
                message: aiMessage,
                timestamp: new Date().toISOString()
            });

        } catch (apiError) {
            console.error('[Chatbot] Gemini API Error:', apiError.message);
            
            // Check if it's a quota/rate limit error
            if (apiError.message?.includes('429') || apiError.message?.includes('quota') || apiError.status === 429) {
                console.log('[Chatbot] API quota exceeded, using fallback mode');
                
                // Fallback: Return helpful response without AI
                const fallbackResponses = {
                    'product': "Hey there! 👋 We've got a wide range of products to choose from. Whether you're looking for electronics, fashion, home essentials, or something else, we've got you covered. What are you interested in?",
                    'price': "Great question! 💰 Our prices are really competitive, and we regularly have promotions and discounts available. Plus, if you use one of our coupon codes, you can save even more. Want to know about any specific products?",
                    'shipping': "Good question! 📦 We offer free shipping on orders above ₹499. We also have fast delivery options available on select products. Where would you like your order shipped? I can give you more details based on your location.",
                    'order': "I'd be happy to help you track your order! 🚚 You can check the status in your dashboard anytime. If you have an order number, I can help you find specific details about it.",
                    'return': "No problem! ↩️ We have a hassle-free 7-day return and replacement policy. If anything's wrong with your product, just let us know through your dashboard and we'll take care of it. Need any details?",
                    'payment': "Perfect! 💳 We accept multiple payment options including Cash on Delivery (COD), credit/debit cards, and other online payment methods. Choose whatever works best for you.",
                    'coupon': "Awesome! 🎉 We have several active coupon codes with great discounts. Some are for everyone, some are specifically for new users, and some are for our members. Check your offers section to see what's available for you!",
                    'account': "Need help with your account? 👤 You can log in anytime to manage your profile, addresses, orders, and wishlist. If you're having any issues accessing your account, let me know and I can guide you!",
                    'default': "Hi there! Thanks for reaching out! 👋 I'm here to help. While I'm processing your question, could you give me a bit more detail? I can help with product searches, orders, shipping, returns, payments, offers, and pretty much anything else. What can I do for you?"
                };

                // Match user question to fallback response
                const msgLower = message.toLowerCase();
                let response = fallbackResponses.default;
                
                if (msgLower.includes('product') || msgLower.includes('item') || msgLower.includes('find')) response = fallbackResponses.product;
                else if (msgLower.includes('price') || msgLower.includes('cost') || msgLower.includes('cheap') || msgLower.includes('expensive')) response = fallbackResponses.price;
                else if (msgLower.includes('ship') || msgLower.includes('delivery') || msgLower.includes('deliver') || msgLower.includes('address')) response = fallbackResponses.shipping;
                else if (msgLower.includes('order') || msgLower.includes('track') || msgLower.includes('status')) response = fallbackResponses.order;
                else if (msgLower.includes('return') || msgLower.includes('replace') || msgLower.includes('refund')) response = fallbackResponses.return;
                else if (msgLower.includes('payment') || msgLower.includes('pay') || msgLower.includes('card') || msgLower.includes('wallet')) response = fallbackResponses.payment;
                else if (msgLower.includes('coupon') || msgLower.includes('code') || msgLower.includes('discount') || msgLower.includes('offer')) response = fallbackResponses.coupon;
                else if (msgLower.includes('account') || msgLower.includes('login') || msgLower.includes('profile') || msgLower.includes('password')) response = fallbackResponses.account;

                return NextResponse.json({
                    message: response,
                    timestamp: new Date().toISOString(),
                    isFallback: true
                });
            }

            // Re-throw other errors
            throw apiError;
        }

    } catch (error) {
        console.error('[Chatbot] Error details:', {
            message: error.message,
            code: error.code,
            status: error.status,
            stack: error.stack?.split('\n')[0]
        });

        // Handle specific Gemini errors
        if (error.message?.includes('API key not valid')) {
            return NextResponse.json({ 
                error: "Invalid API key configuration. Please contact support." 
            }, { status: 500 });
        }

        if (error.message?.includes('Invalid request')) {
            return NextResponse.json({ 
                error: "Request format error. Please try again with a simpler message." 
            }, { status: 400 });
        }

        return NextResponse.json({ 
            error: error.message || "Failed to process your message. Please try again." 
        }, { status: 500 });
    }
}
