'use client'
import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";
import ProductDetails from "@/components/ProductDetails";
import ProductDescription from "@/components/ProductDescription";
import CountdownTimer from "@/components/CountdownTimer";
import { Sparkles, Gift, Tag, AlertCircle, X } from "lucide-react";

function setOfferTokenCookie(value) {
  if (typeof document === 'undefined' || !value) return;
  document.cookie = `activeOfferToken=${encodeURIComponent(value)}; path=/; max-age=2592000; SameSite=Lax`;
}

function getOfferTokenCookie() {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|; )activeOfferToken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export default function SpecialOfferBySlugPage() {
  const { slug } = useParams();
  const searchParams = useSearchParams();
  const queryToken = searchParams.get('token');
  const pathToken = typeof slug === 'string' && /^[a-f0-9]{16,}$/i.test(slug) ? slug : null;
  const token = queryToken || pathToken;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [offer, setOffer] = useState(null);
  const [product, setProduct] = useState(null);
  const [error, setError] = useState(null);
  const [expired, setExpired] = useState(false);
  const [showTopBanner, setShowTopBanner] = useState(true);
  const [resolvedToken, setResolvedToken] = useState(token || null);

  useEffect(() => {
    if (token) {
      setResolvedToken(token);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('activeOfferToken', token);
      }
      setOfferTokenCookie(token);
      return;
    }

    if (typeof window !== 'undefined') {
      const storedToken = sessionStorage.getItem('activeOfferToken');
      if (storedToken) {
        setResolvedToken(storedToken);
        return;
      }

      const cookieToken = getOfferTokenCookie();
      if (cookieToken) {
        sessionStorage.setItem('activeOfferToken', cookieToken);
        setResolvedToken(cookieToken);
        return;
      }
    }

    setResolvedToken(null);
  }, [token]);

  useEffect(() => {
    if (resolvedToken) {
      fetchOfferDetails(resolvedToken);
      return;
    }

    if (slug && typeof slug === 'string' && !pathToken) {
      fetchOfferDetailsBySlug(slug);
      return;
    }

    setError('Offer token is missing');
    setLoading(false);
  }, [resolvedToken, slug, pathToken]);

  const applyOfferData = (data, activeToken) => {
    setOffer(data.offer);
    setProduct(data.product);
    setExpired(!data.valid && data.expired);

    if (activeToken) {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('activeOfferToken', activeToken);
      }
      setOfferTokenCookie(activeToken);
    }

    if (!data.valid) {
      if (data.expired) {
        toast.error("This offer has expired");
      } else if (data.used) {
        toast.error("This offer has already been used");
      } else {
        toast.error("This offer is no longer valid");
      }

      setTimeout(() => {
        router.push(`/product/${data.product.slug}`);
      }, 3000);
    }

    if (data.product.slug && slug) {
      const needsCleanUrl = data.product.slug !== slug || Boolean(queryToken) || Boolean(pathToken);
      if (needsCleanUrl) {
        router.replace(`/offer/${data.product.slug}`);
      }
    }
  };

  const fetchOfferDetails = async (activeToken) => {
    try {
      setLoading(true);
      const { data } = await axios.get(`/api/personalized-offers/validate/${activeToken}`);

      if (data.success && data.product) {
        applyOfferData(data, activeToken);
      } else {
        setError(data.error || "Invalid offer");
        toast.error(data.error || "Invalid offer link");
      }
    } catch (error) {
      console.error("Error fetching offer:", error);
      const errorMsg = error.response?.data?.error || "Failed to load offer";
      setError(errorMsg);
      toast.error(errorMsg);

      setTimeout(() => {
        router.push('/');
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  const fetchOfferDetailsBySlug = async (productSlug) => {
    try {
      setLoading(true);
      const { data } = await axios.get(`/api/personalized-offers/resolve/${productSlug}`);

      if (data.success && data.product && data.offer?.offerToken) {
        applyOfferData(data, data.offer.offerToken);
      } else {
        setError(data.error || "Invalid offer");
        toast.error(data.error || "Invalid offer link");
      }
    } catch (error) {
      console.error("Error resolving offer by slug:", error);
      const errorMsg = error.response?.data?.error || "Failed to load offer";
      setError(errorMsg);
      toast.error(errorMsg);

      setTimeout(() => {
        router.push('/');
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleOfferExpire = () => {
    setExpired(true);
    toast.error("Offer has expired! Redirecting to normal product page...");
    setTimeout(() => {
      if (product?.slug) {
        router.push(`/product/${product.slug}`);
      }
    }, 3000);
  };

  const offerSlides = [
    "🎉 Exclusive Offer Just For You!",
    offer?.discountPercent ? `🔥 Get ${offer.discountPercent}% OFF - limited time only` : "🔥 Limited-time deal is live now",
    product?.savings ? `💰 You save ₹${product.savings} on this product` : "💰 Save more with this special pricing"
  ];

  const marqueeSlides = [...offerSlides, ...offerSlides];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your exclusive offer...</p>
        </div>
      </div>
    );
  }

  if (error || !offer || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <AlertCircle className="mx-auto mb-4 text-red-500" size={64} />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Offer Not Found</h1>
          <p className="text-gray-600 mb-4">{error || "This offer link is invalid or has expired."}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  const productWithDiscount = {
    ...product,
    _id: product._id || product.id,
    price: product.discountedPrice,
    mrp: product.originalPrice,
    originalPrice: product.originalPrice,
    specialOffer: {
      isSpecialOffer: true,
      discountPercent: offer.discountPercent,
      savings: product.savings,
      offerToken: resolvedToken || offer.offerToken
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {showTopBanner && (
        <div className="bg-gradient-to-r from-sky-600 to-blue-700 text-white py-4 px-4 relative overflow-hidden">
          <div className="max-w-[1450px] mx-auto pr-10 overflow-hidden">
            <div className="offer-marquee-track flex items-center gap-12 w-max whitespace-nowrap">
              {marqueeSlides.map((slide, index) => (
                <div key={`slide-${index}`} className="flex items-center gap-3 text-lg md:text-xl font-bold">
                  <Sparkles className="animate-pulse" size={20} />
                  <span>{slide}</span>
                  <Sparkles className="animate-pulse" size={20} />
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowTopBanner(false)}
            aria-label="Close offer banner"
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/15 hover:bg-white/25 transition"
          >
            <X size={18} />
          </button>
        </div>
      )}

      <style jsx>{`
        .offer-marquee-track {
          animation: offerMarquee 16s linear infinite;
        }

        .offer-marquee-track:hover {
          animation-play-state: paused;
        }

        @keyframes offerMarquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>

      <div className="max-w-[1450px] mx-auto px-4 py-8">
        {offer.customerName && (
          <div className="bg-blue-50 rounded-lg shadow-md p-4 mb-6 border-l-4 border-blue-500">
            <div className="flex items-start gap-3">
              <Gift className="text-blue-500 mt-1" size={24} />
              <div>
                <h2 className="font-semibold text-lg text-gray-900">
                  Hi {offer.customerName}!
                </h2>
                <p className="text-gray-600">
                  We've created this special discount just for you on this amazing product.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <ProductDetails
            product={productWithDiscount}
            offerData={{
              countdownTimer: !expired && offer && (
                <CountdownTimer
                  expiresAt={offer.expiresAt}
                  onExpire={handleOfferExpire}
                />
              ),
              discountBadge: (
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg shadow-lg p-6 text-white">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <Tag size={32} />
                      <div>
                        <div className="text-sm opacity-90">Your Exclusive Discount</div>
                        <div className="text-4xl font-bold">{offer.discountPercent}% OFF</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm opacity-90">You Save</div>
                      <div className="text-3xl font-bold">₹{product.savings}</div>
                    </div>
                  </div>
                </div>
              ),
              priceComparison: (
                <div className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Regular Price</div>
                      <div className="text-2xl text-gray-500 line-through">₹{product.originalPrice}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-green-600 font-semibold">Your Special Price</div>
                      <div className="text-4xl font-bold text-green-600">₹{product.discountedPrice}</div>
                    </div>
                  </div>
                </div>
              )
            }}
          />
        </div>

        <ProductDescription product={product} />

        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-amber-600 flex-shrink-0 mt-1" size={20} />
            <div className="text-sm text-amber-800">
              <strong>Important:</strong> This is a time-limited exclusive offer.
              After the countdown ends, this special pricing will no longer be available
              and the product will return to its regular price.
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl mb-2">✓</div>
            <div className="text-sm font-medium">Secure Checkout</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl mb-2">🚚</div>
            <div className="text-sm font-medium">Fast Delivery</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl mb-2">💯</div>
            <div className="text-sm font-medium">100% Authentic</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl mb-2">🔒</div>
            <div className="text-sm font-medium">Safe Payment</div>
          </div>
        </div>
      </div>
    </div>
  );
}
