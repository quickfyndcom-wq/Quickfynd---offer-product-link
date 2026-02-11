'use client'

import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="bg-white flex items-center justify-center px-4 py-16 md:py-24">
      <div className="max-w-lg text-center">
        {/* 404 Number */}
        <div className="mb-8">
          <h1 className="text-8xl md:text-9xl font-black text-blue-600 mb-2">404</h1>
          <div className="h-1 w-24 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded"></div>
        </div>

        {/* Emoji Illustration */}
        <div className="mb-8 text-7xl animate-bounce">🔍</div>

        {/* Heading */}
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Page Not Found</h2>
        <p className="text-gray-600 text-lg mb-8">
          Sorry! The page you're looking for doesn't exist. It might have been moved or deleted.
        </p>

        {/* Primary Action Button */}
        <Link
          href="/"
          className="inline-block mb-6 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition shadow-lg hover:shadow-xl"
        >
          ← Back to Home
        </Link>

        {/* Secondary Options */}
        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
          <p className="text-gray-700 font-semibold mb-4">Here's what you can do:</p>
          <div className="space-y-2">
            <Link
              href="/shop"
              className="block px-4 py-2 text-blue-600 hover:bg-gray-100 rounded transition font-medium"
            >
              → Shop All Products
            </Link>
            <Link
              href="/categories"
              className="block px-4 py-2 text-blue-600 hover:bg-gray-100 rounded transition font-medium"
            >
              → Browse Categories
            </Link>
            <Link
              href="/support"
              className="block px-4 py-2 text-blue-600 hover:bg-gray-100 rounded transition font-medium"
            >
              → Get Help
            </Link>
          </div>
        </div>

        {/* Error Code */}
        <p className="mt-8 text-sm text-gray-400">Error Code: 404</p>
      </div>
    </div>
  );
}
