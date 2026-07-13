import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import type { ProductEvent, ProductEventProperties } from './analytics.types';

const STORAGE_KEY = 'the-sky-then:anonymous-events:v1';

export function trackProductEvent(event: ProductEvent, properties: ProductEventProperties) {
  if (Platform.OS === 'web') {
    import('@vercel/analytics')
      .then(({ track }) => track(event, properties))
      .catch(() => undefined);
    return;
  }

  AsyncStorage.getItem(STORAGE_KEY)
    .then((saved) => {
      const counters = saved ? JSON.parse(saved) as Record<string, number> : {};
      const key = `${event}:${properties.theme}:${properties.ratio}`;
      counters[key] = (counters[key] ?? 0) + 1;
      return AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(counters));
    })
    .catch(() => undefined);
}
