'use client';

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useAuth } from '@/lib/useAuth';
import axios from 'axios';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import ProductCard from '@/components/ProductCard';

export default function RecentSearchProducts() {
  const products = useSelector(state => state.product.list);
  const { user, getToken } = useAuth();
  const [recentProducts, setRecentProducts] = useState([]);
  const [isNewCustomer, setIsNewCustomer] = useState(true);

  useEffect(() => {
    const fetchRecentlyViewed = async () => {
      let viewedProductIds = [];

      // If logged in, fetch from database
      if (user) {
        try {
          const token = await getToken();
          if (token) {
            const response = await axios.get('/api/browse-history', {
              headers: { Authorization: `Bearer ${token}` },
            });
            // API returns history with products already populated
            if (response.data.history && response.data.history.length > 0) {
              const viewed = response.data.history
                .map(h => h.product)
                .filter(Boolean)
                .slice(0, 8);
              setRecentProducts(viewed);
              setIsNewCustomer(false);
              return;
            }
          }
        } catch (error) {
          console.error('Error fetching browse history from DB:', error);
          // Fallback to localStorage if API fails
          const localViewed = localStorage.getItem('recentlyViewed');
          if (localViewed) {
            try {
              viewedProductIds = JSON.parse(localViewed);
            } catch (e) {
              console.error('Error parsing localStorage viewed:', e);
            }
          }
        }
      } else {
        // Not logged in - use localStorage
        const localViewed = localStorage.getItem('recentlyViewed');
        if (localViewed) {
          try {
            viewedProductIds = JSON.parse(localViewed);
          } catch (error) {
            console.error('Error parsing recently viewed:', error);
          }
        }
      }

      // Map IDs to products from Redux
      if (viewedProductIds.length > 0) {
        const viewed = viewedProductIds
          .map(id => products.find(p => (p._id || p.id) === id))
          .filter(Boolean)
          .slice(0, 8);
        
        if (viewed.length > 0) {
          setIsNewCustomer(false);
          setRecentProducts(viewed);
        }
      }
    };

    fetchRecentlyViewed();
  }, [products, user, getToken]);

  // Don't show if customer is new
  if (isNewCustomer || recentProducts.length === 0) {
    return null;
  }

  return (
    <section className="w-full bg-white py-8 mb-6">
      <div className="max-w-[1280px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 px-4">
          <div>
            <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">Your History</span>
            <h2 className="text-2xl font-bold text-gray-900 mt-1">Recently Viewed Products</h2>
            <p className="text-sm text-gray-500 mt-1">Products you've recently checked out</p>
          </div>
          <Link
            href="/recently-viewed"
            className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-orange-600 transition"
          >
            View All
            <ChevronRight size={18} />
          </Link>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 px-4">
          {recentProducts.map(product => (
            <ProductCard key={product._id || product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
