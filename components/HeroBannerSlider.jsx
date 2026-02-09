'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import BannerC from '@/assets/heroslider1/main2.webp';
import WideBanner1 from '@/assets/heroslider1/main3.webp';
import WideBanner2 from '@/assets/heroslider1/main1.webp';

const HEIGHT = 320;

const slides = [
  { image: BannerC, link: '/offers', bg: '#420608' },
  { image: WideBanner1, link: '/offers', bg: '#0071A4' },
  { image: WideBanner2, link: '/offers', bg: '#00D5C3' },
];

export default function HeroBannerSlider() {
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(() => slides.map(() => false));
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    /* FULL WIDTH BACKGROUND */
    <div
      style={{
        width: '100%',
        height: HEIGHT,
        backgroundColor: slides[index].bg,
        position: 'relative',
        overflow: 'hidden',
        transition: 'background-color 0.6s ease',
      }}
    >
      {/* IMAGE VIEWPORT (CENTERED, FIXED WIDTH) */}
      <div
        style={{
          position: 'relative',
          height: HEIGHT,
          width: 1250,
          maxWidth: '100%',
          margin: '0 auto',
          overflow: 'hidden',
        }}
      >
        {slides.map((slide, i) => (
          <div
            key={i}
            onClick={() => router.push(slide.link)}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              cursor: 'pointer',
              opacity: i === index ? 1 : 0,
              clipPath: i === index ? 'circle(120% at 50% 50%)' : 'circle(0% at 50% 50%)',
              transition: 'opacity 0.6s ease',
              animation: i === index ? 'qfCircleReveal 0.9s ease' : 'none',
              pointerEvents: i === index ? 'auto' : 'none',
            }}
          >
            <Image
              src={slide.image}
              alt=""
              width={1250}
              height={HEIGHT}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                objectPosition: 'center',
                display: 'block',
              }}
              priority={i === 0}
              onLoadingComplete={() => {
                setLoaded((prev) => {
                  if (prev[i]) return prev;
                  const next = [...prev];
                  next[i] = true;
                  return next;
                });
              }}
            />
          </div>
        ))}
      </div>
      <style jsx>{`
        @keyframes qfCircleReveal {
          0% { clip-path: circle(0% at 50% 50%); filter: blur(3px); }
          70% { clip-path: circle(70% at 50% 50%); filter: blur(0px); }
          100% { clip-path: circle(120% at 50% 50%); filter: blur(0px); }
        }
      `}</style>

      {/* PILLS */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 8,
          padding: '3px 5px',
          borderRadius: 999,
          background: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(6px)',
        }}
      >
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            aria-label={`Go to slide ${i + 1}`}
            style={{
              width: i === index ? 40 : 30,
              height: 6,
              borderRadius: 999,
              background: i === index ? 'rgba(255, 255, 255, 0.56)' : 'rgba(0,0,0,0.2)',
              boxShadow: i === index ? '0 1px 4px rgba(0,0,0,0.15)' : 'none',
              cursor: 'pointer',
              border: 'none',
              padding: 0,
              transition: 'all 0.2s ease',
            }}
          />
        ))}
      </div>
    </div>
  );
}
