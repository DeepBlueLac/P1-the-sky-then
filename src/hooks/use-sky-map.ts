import { useEffect, useRef, useState } from 'react';

import type { SkyInput, SkyMap } from '@/core/types';

type SkyWorkerResponse = { requestId: number; sky?: SkyMap; error?: string };

export function useSkyMap(input: SkyInput) {
  const workerRef = useRef<Worker | null>(null);
  const requestRef = useRef(0);
  const [sky, setSky] = useState<SkyMap | null>(null);
  const [state, setState] = useState<'calculating' | 'ready' | 'error'>('calculating');

  useEffect(() => {
    const worker = new Worker(new URL('../workers/sky.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    worker.addEventListener('message', (event: MessageEvent<SkyWorkerResponse>) => {
      if (event.data.requestId !== requestRef.current) return;
      if (event.data.sky) {
        setSky({ ...event.data.sky, utcDate: new Date(event.data.sky.utcDate) });
        setState('ready');
      } else {
        setState('error');
      }
    });
    worker.addEventListener('error', () => setState('error'));
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!workerRef.current) return;
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setState('calculating');
    workerRef.current.postMessage({ requestId, input });
  }, [input]);

  return { sky, state };
}
