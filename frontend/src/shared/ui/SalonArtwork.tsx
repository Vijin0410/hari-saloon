import { useId } from 'react';
import { cn } from '@/shared/lib/cn';

/** 原创矢量沙龙场景：拱形镜面、发丝轮廓与暖光；纯 SVG 素材，尊重减少动态效果偏好。 */
export interface SalonArtworkProps {
  className?: string;
  animated?: boolean;
}

export function SalonArtwork({ className, animated = true }: SalonArtworkProps) {
  const id = useId().replace(/:/g, '');
  return (
    <svg aria-hidden="true" viewBox="0 0 640 650" fill="none" className={cn('w-full', className)}>
      <defs>
        <linearGradient
          id={`${id}-mirror`}
          x1="155"
          y1="115"
          x2="490"
          y2="570"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#b9a7c6" />
          <stop offset=".55" stopColor="#e5d0c0" />
          <stop offset="1" stopColor="#b8939b" />
        </linearGradient>
        <linearGradient
          id={`${id}-hair`}
          x1="240"
          y1="190"
          x2="410"
          y2="520"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#372532" />
          <stop offset=".5" stopColor="#64424f" />
          <stop offset="1" stopColor="#302431" />
        </linearGradient>
        <linearGradient
          id={`${id}-skin`}
          x1="330"
          y1="240"
          x2="390"
          y2="450"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#f2d6bd" />
          <stop offset="1" stopColor="#c58e78" />
        </linearGradient>
        <linearGradient
          id={`${id}-frame`}
          x1="140"
          y1="95"
          x2="460"
          y2="570"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#eddcc2" />
          <stop offset=".4" stopColor="#a88474" />
          <stop offset=".7" stopColor="#eddac4" />
          <stop offset="1" stopColor="#a88c83" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <path d="M147 559V269a173 173 0 0 1 346 0v290Z" />
        </clipPath>
      </defs>
      <ellipse cx="325" cy="588" rx="235" ry="21" fill="#1d1724" opacity=".18" />
      <path d="M130 563V268a190 190 0 0 1 380 0v295Z" stroke="#bca18f" strokeOpacity=".22" />
      <path
        d="M141 563V269a179 179 0 0 1 358 0v294Z"
        stroke={`url(#${id}-frame)`}
        strokeWidth="7"
      />
      <g clipPath={`url(#${id}-clip)`}>
        <path d="M147 559V269a173 173 0 0 1 346 0v290Z" fill={`url(#${id}-mirror)`} />
        <path d="M181 560V274c0-82 60-142 137-142" stroke="#fff3df" strokeOpacity=".45" />
        <path
          d="M423 90 177 580M470 90 224 580"
          stroke="#fff8ed"
          strokeOpacity=".1"
          strokeWidth="40"
          className={
            animated
              ? 'origin-center motion-safe:animate-[salon-light_9s_ease-in-out_infinite]'
              : undefined
          }
        />
        <path
          d="M172 575c16-60 62-90 112-104l32-64 63-3 23 65c65 13 111 52 132 106Z"
          fill="#e6daca"
        />
        <path d="m314 388-8 65-31 24c24 39 79 46 114 10l-36-35 1-62Z" fill={`url(#${id}-skin)`} />
        <path
          d="M234 304c-9-92 38-137 108-128 66 8 88 69 72 137-6 24-10 54 3 83 15 34 34 57 23 88-14 36-67 48-104 22-15-10-25-22-28-37-57 20-123-6-122-50 0-37 52-64 48-115Z"
          fill={`url(#${id}-hair)`}
        />
        <path
          d="M339 245c1 23 20 44 44 52l14 35-13 7c0 18-8 42-26 49-25 8-52-15-60-41-10 3-20-8-19-20 1-11 12-14 18-7-3-25 6-61 42-75Z"
          fill={`url(#${id}-skin)`}
        />
        <path d="M349 310c8-4 15-3 21 1" stroke="#77524f" strokeWidth="2" strokeLinecap="round" />
        <path d="M354 318c6 3 11 3 16 0" stroke="#49333b" strokeWidth="2" strokeLinecap="round" />
        <path d="m375 351 9 1-6 4" stroke="#a66961" strokeWidth="2" strokeLinecap="round" />
        <path
          d="M340 225c-35 37-24 66-43 107-11 27-30 50-26 86 5 41 48 51 50 79-27 7-54-2-69-21-40-51 3-84 6-116 6-54-37-95-1-138 23-28 54-24 83-18Z"
          fill={`url(#${id}-hair)`}
        />
        <g stroke="#ca9e91" strokeOpacity=".5" strokeLinecap="round">
          <path d="M333 204c-74-6-94 47-68 105 27 62-51 106-15 155" />
          <path d="M326 217c-61 1-70 51-49 95 27 57-53 109-12 161" />
          <path d="M322 229c-35 21-37 49-32 77 12 64-49 101-10 164" />
          <path d="M308 195c-67 5-89 53-72 108 24 77-62 113-20 159" />
          <path d="M352 202c41 17 55 49 48 90-13 82 55 109 29 161" />
          <path d="M365 220c28 20 30 51 25 76-10 69 59 110 26 160" />
          <path d="M247 370c-22 43-24 74 13 93" />
        </g>
        <path d="M300 336c0 13 8 20 15 17" stroke="#d5b07a" strokeWidth="3" strokeLinecap="round" />
        <path d="m286 495 32 65m64-66-15 65" stroke="#ba9e8c" strokeOpacity=".6" />
      </g>
      <path d="M111 566h418" stroke="#dcc3a7" strokeWidth="5" strokeLinecap="round" />
      <path d="M99 574h444" stroke="#a48c83" strokeOpacity=".6" strokeWidth="2" />
      <g
        className={
          animated ? 'motion-safe:animate-[salon-breathe_7s_ease-in-out_infinite]' : undefined
        }
      >
        <path
          d="M78 541c17-49 12-84-13-121 39 17 48 59 24 98 29-48 53-60 77-63-14 37-38 56-77 63"
          stroke="#b7b39e"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path d="M62 535h54l-8 38H71Z" fill="#c3aea0" />
      </g>
      <rect x="470" y="487" width="30" height="70" rx="6" fill="#e1c8ac" />
      <path d="M478 485v-11h14v11" fill="#8b6d69" />
      <rect x="478" y="510" width="14" height="24" rx="1" stroke="#9e7a70" strokeOpacity=".6" />
      <rect x="507" y="519" width="23" height="38" rx="5" fill="#9c8187" />
      <path d="M517 510v9" stroke="#ddc8ad" strokeWidth="3" />
      <path d="M517 511h9" stroke="#ddc8ad" strokeWidth="3" strokeLinecap="round" />
      <circle cx="505" cy="172" r="3" fill="#e5c8a4" />
      <path d="M535 207v18m-9-9h18" stroke="#dac0a8" strokeLinecap="round" />
      <circle cx="115" cy="320" r="3" fill="#b7a1c4" />
    </svg>
  );
}
