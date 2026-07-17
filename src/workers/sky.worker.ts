/// <reference lib="webworker" />

import { buildSkyMap } from '@/core/sky';
import type { SkyInput } from '@/core/types';

type SkyWorkerRequest = { requestId: number; input: SkyInput };

self.addEventListener('message', (event: MessageEvent<SkyWorkerRequest>) => {
  const { requestId, input } = event.data;
  try {
    const sky = buildSkyMap(input);
    self.postMessage({ requestId, sky });
  } catch (error) {
    self.postMessage({
      requestId,
      error: error instanceof Error ? error.message : '星空计算失败',
    });
  }
});

export {};
