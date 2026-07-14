export type PosterThemeId = 'observatory' | 'atlas' | 'bloom';
export type PosterRatio = 'portrait' | 'square' | 'wallpaper';

export type LocationResult = {
  id: string;
  name: string;
  admin1?: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

export type SkyInput = {
  date: string;
  time: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

export type ProjectedStar = {
  id: string;
  x: number;
  y: number;
  altitude: number;
  azimuth: number;
  magnitude: number;
  opacity: number;
  twinkleSeed: number;
};
export type ProjectedLine = { x1: number; y1: number; x2: number; y2: number; constellationId: string };
export type ProjectedLabel = { x: number; y: number; text: string; rank: number; constellationId: string };

export type SkyMap = {
  utcDate: Date;
  stars: ProjectedStar[];
  lines: ProjectedLine[];
  labels: ProjectedLabel[];
};
