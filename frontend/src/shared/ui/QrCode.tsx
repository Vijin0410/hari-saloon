import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/**
 * 二维码渲染（渠道支付 code_url 转 QR 图；本地生成不外发）。
 */
export function QrCode({ size = 220, text }: { size?: number; text: string }) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(text, { width: size, margin: 1 })
      .then((url) => {
        if (active) {
          setSrc(url);
        }
      })
      .catch(() => {
        if (active) {
          setSrc('');
        }
      });
    return () => {
      active = false;
    };
  }, [text, size]);

  if (!src) {
    return <div className="animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" style={{ height: size, width: size }} />;
  }
  return <img alt="支付二维码" className="rounded-md" height={size} src={src} width={size} />;
}
