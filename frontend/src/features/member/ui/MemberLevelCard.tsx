import { useEffect, useId, useState } from 'react';
import { Crown, Scissors } from 'lucide-react';
import { fileApi } from '@/shared/api/modules/systemApi';
import { cn } from '@/shared/lib/cn';

/** 等级列表、编辑预览与会员档案共用的银行卡比例卡面；自选贴图不可用时回退内置纹理。 */
interface MemberLevelCardProps {
  name: string;
  levelNo?: number;
  cardImage?: string | null;
  holderName?: string;
  compact?: boolean;
  className?: string;
}

const PALETTES = [
  ['#ddd5e9', '#b8a4cf', '#78618f', '#392b49'],
  ['#cbd2e0', '#8996b5', '#53617f', '#242c42'],
  ['#e6d3b5', '#b99463', '#806044', '#3d2b28'],
  ['#b9a4cd', '#79618f', '#49344f', '#251c30'],
] as const;

export function MemberLevelCard({
  name,
  levelNo = 0,
  cardImage,
  holderName,
  compact = false,
  className,
}: MemberLevelCardProps) {
  const id = useId().replace(/:/g, '');
  const palette = PALETTES[Math.abs(Math.trunc(levelNo)) % PALETTES.length];
  const [image, setImage] = useState({ key: '', url: '' });

  useEffect(() => {
    if (!cardImage) return;
    let active = true;
    fileApi.urlByKey(cardImage).then((url) => {
      if (active) setImage({ key: cardImage, url });
    }).catch(() => {
      if (active) setImage({ key: cardImage, url: '' });
    });
    return () => { active = false; };
  }, [cardImage]);

  const imageUrl = image.key === cardImage ? image.url : '';

  return (
    <div
      className={cn(
        'relative isolate aspect-[1.586/1] w-full overflow-hidden rounded-xl bg-salon-plum text-white shadow-[0_8px_20px_-12px_rgba(48,36,49,0.65)] ring-1 ring-inset ring-white/15 [container-type:inline-size]',
        className,
      )}
      aria-label={`${name || '会员卡'}${holderName ? `，持卡人${holderName}` : ''}`}
    >
      <svg
        aria-hidden='true'
        className='absolute inset-0 size-full'
        viewBox='0 0 640 404'
        preserveAspectRatio='xMidYMid slice'
      >
        <defs>
          <linearGradient id={`${id}-base`} x1='0' y1='0' x2='1' y2='1'>
            <stop stopColor={palette[1]} />
            <stop offset='0.5' stopColor={palette[2]} />
            <stop offset='1' stopColor={palette[3]} />
          </linearGradient>
          <radialGradient id={`${id}-light`} cx='0.12' cy='0' r='1'>
            <stop stopColor={palette[0]} stopOpacity='.75' />
            <stop offset='1' stopColor={palette[0]} stopOpacity='0' />
          </radialGradient>
        </defs>
        <path fill={`url(#${id}-base)`} d='M0 0h640v404H0z' />
        <path fill={`url(#${id}-light)`} d='M0 0h640v404H0z' />
        <g fill='none' stroke={palette[0]} strokeWidth='0.8' opacity='.28'>
          {Array.from({ length: 12 }, (_, i) => (
            <ellipse key={i} cx='586' cy='112' rx={105 + i * 18} ry={125 + i * 18} transform='rotate(-32 586 112)' />
          ))}
        </g>
        <path d='M0 336Q180 240 360 358T700 315' stroke={palette[0]} strokeOpacity='.16' strokeWidth='60' fill='none' />
        <rect x='1' y='1' width='638' height='402' rx='22' stroke='white' strokeOpacity='.18' fill='none' />
      </svg>
      {imageUrl ? (
        <img
          alt='' src={imageUrl}
          className='absolute inset-0 size-full object-cover'
          onError={() => setImage({ key: cardImage ?? '', url: '' })}
        />
      ) : null}
      {imageUrl ? <div aria-hidden='true' className='absolute inset-0 bg-linear-to-r from-salon-plum/80 via-salon-plum/45 to-salon-plum/20' /> : null}
      <div className={cn('relative flex h-full flex-col justify-between', compact ? 'p-2.5' : 'p-[7%]')}>
        <div className='flex items-center justify-between gap-3'>
          <span className='flex items-center gap-2 text-[clamp(0.5rem,3cqw,0.625rem)] font-medium tracking-[0.16em] text-white/85'>
            <Scissors aria-hidden='true' className='size-3.5 shrink-0' /> SALON MEMBERSHIP
          </span>
          <Crown aria-hidden='true' className={cn('shrink-0 text-white/75', compact ? 'size-3.5' : 'size-5')} strokeWidth={1.25} />
        </div>
        <div className={cn('min-w-0', compact ? 'my-1' : 'my-1.5')}>
          {!compact ? <p className='mb-1 text-[10px] tracking-[0.2em] text-white/65'>MEMBER PRIVILEGES</p> : null}
          <p className='line-clamp-2 break-all text-[clamp(0.875rem,6.5cqw,1.5rem)] font-semibold leading-snug tracking-wide'>{name || '会员等级'}</p>
        </div>
        <div className='flex items-end justify-between gap-3'>
          <p className='min-w-0 truncate text-[clamp(0.625rem,3.5cqw,0.75rem)] tracking-wide text-white/85'>{holderName || '专属礼遇 · 美好日常'}</p>
          <span className='shrink-0 rounded-full border border-white/25 px-2.5 py-0.5 text-[10px] tracking-wider text-white/85'>LV.{levelNo}</span>
        </div>
      </div>
    </div>
  );
}
