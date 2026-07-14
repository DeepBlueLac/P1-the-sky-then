import type { ProductEvent, ProductEventProperties } from './analytics.types';

export function trackProductEvent(event: ProductEvent, properties: ProductEventProperties) {
  import('@vercel/analytics')
    .then(({ track }) => track(event, properties))
    .catch(() => undefined);
}
