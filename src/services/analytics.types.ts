import type { PosterRatio, PosterThemeId } from '@/core/types';

export type ProductEvent = 'poster_generated' | 'poster_downloaded' | 'premium_intent_clicked';

export type ProductEventProperties = {
  theme: PosterThemeId;
  ratio: PosterRatio;
};
