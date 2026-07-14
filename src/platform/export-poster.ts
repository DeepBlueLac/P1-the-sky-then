import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import { Platform, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

export async function exportPoster(ref: RefObject<View | null>, fileName: string) {
  if (!ref.current) throw new Error('Poster is not ready');
  if (Platform.OS === 'web') {
    const { toPng } = await import('html-to-image');
    // The poster itself is SVG. Skip document font harvesting so a cross-origin
    // presentation font can never block the user's local PNG export.
    const dataUrl = await toPng(ref.current as unknown as HTMLElement, { pixelRatio: 3, cacheBust: true, fontEmbedCSS: '' });
    const anchor = document.createElement('a');
    anchor.download = `${fileName}.png`;
    anchor.href = dataUrl;
    anchor.click();
    return;
  }
  await Haptics.selectionAsync();
  const uri = await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: '保存此刻星空' });
  }
}
