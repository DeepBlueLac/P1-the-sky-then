import type { RefObject } from 'react';

export async function exportPoster(ref: RefObject<HTMLElement | null>, fileName: string) {
  if (!ref.current) throw new Error('Poster is not ready');
  const { toPng } = await import('html-to-image');
  const dataUrl = await toPng(ref.current, { pixelRatio: 3, cacheBust: true, fontEmbedCSS: '' });
  const anchor = document.createElement('a');
  anchor.download = `${fileName}.png`;
  anchor.href = dataUrl;
  anchor.click();
}
