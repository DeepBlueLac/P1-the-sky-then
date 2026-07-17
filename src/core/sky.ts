import { fromZonedTime } from 'date-fns-tz';
import * as Astronomy from 'astronomy-engine';

import constellationData from '@/data/constellations.json';
import constellationLineData from '@/data/constellations.lines.json';
import starData from '@/data/stars.6.json';
import type { ProjectedLabel, ProjectedLine, ProjectedStar, SkyInput, SkyMap } from '@/core/types';

type Coordinate = [number, number];
type StarFeature = { id: string | number; properties: { mag: number; bv?: string | number }; geometry: { coordinates: Coordinate } };
type LineFeature = { id: string; geometry: { coordinates: Coordinate[][] } };
type LabelFeature = { id: string; properties: { desig: string; rank?: string | number }; geometry: { coordinates: Coordinate } };

const stars = (starData as unknown as { features: StarFeature[] }).features.filter((star) => Number(star.properties.mag) <= 5.5);
const constellationLines = (constellationLineData as unknown as { features: LineFeature[] }).features;
const constellationLabels = (constellationData as unknown as { features: LabelFeature[] }).features;

const PROPER_STAR_NAMES: Record<number, string> = {
  7588: 'Achernar',
  11767: 'Polaris',
  21421: 'Aldebaran',
  24436: 'Rigel',
  24608: 'Capella',
  27989: 'Betelgeuse',
  30438: 'Canopus',
  32349: 'Sirius',
  37279: 'Procyon',
  37826: 'Pollux',
  49669: 'Regulus',
  60718: 'Acrux',
  62434: 'Mimosa',
  65474: 'Spica',
  68702: 'Hadar',
  69673: 'Arcturus',
  71683: 'Rigil Kentaurus',
  80763: 'Antares',
  91262: 'Vega',
  97649: 'Altair',
  102098: 'Deneb',
  113368: 'Fomalhaut',
};

export function estimateStellarTemperature(colorIndex: number | null) {
  if (colorIndex === null || !Number.isFinite(colorIndex)) return null;
  const temperature = 4600 * ((1 / (0.92 * colorIndex + 1.7)) + (1 / (0.92 * colorIndex + 0.62)));
  return Math.round(Math.min(40000, Math.max(2500, temperature)) / 50) * 50;
}

export function estimateSpectralClass(temperature: number | null) {
  if (temperature === null) return null;
  if (temperature >= 30000) return 'O';
  if (temperature >= 10000) return 'B';
  if (temperature >= 7500) return 'A';
  if (temperature >= 6000) return 'F';
  if (temperature >= 5200) return 'G';
  if (temperature >= 3700) return 'K';
  return 'M';
}

function projectCoordinate(
  coordinate: Coordinate,
  time: Date,
  rotation: Astronomy.RotationMatrix,
): { x: number; y: number; altitude: number; azimuth: number } {
  const [rightAscensionDegrees, declination] = coordinate;
  const vector = Astronomy.VectorFromSphere(new Astronomy.Spherical(declination, rightAscensionDegrees, 1), time);
  const horizontalVector = Astronomy.RotateVector(rotation, vector);
  const horizon = Astronomy.HorizonFromVector(horizontalVector, 'normal');
  const radius = (90 - horizon.lat) / 90;
  const azimuth = (horizon.lon * Math.PI) / 180;
  return { x: radius * Math.sin(azimuth), y: -radius * Math.cos(azimuth), altitude: horizon.lat, azimuth: horizon.lon };
}

export function projectEquatorialCoordinate(coordinate: Coordinate, input: SkyInput) {
  const utcDate = fromZonedTime(`${input.date}T${input.time}:00`, input.timezone);
  const observer = new Astronomy.Observer(input.latitude, input.longitude, 0);
  const rotation = Astronomy.Rotation_EQJ_HOR(utcDate, observer);
  return { ...projectCoordinate(coordinate, utcDate, rotation), utcDate };
}

export function buildSkyMap(input: SkyInput): SkyMap {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !/^\d{2}:\d{2}$/.test(input.time)) {
    throw new Error('Invalid local date or time');
  }
  const utcDate = fromZonedTime(`${input.date}T${input.time}:00`, input.timezone);
  if (Number.isNaN(utcDate.getTime())) throw new Error('Invalid zoned date');

  const observer = new Astronomy.Observer(input.latitude, input.longitude, 0);
  const rotation = Astronomy.Rotation_EQJ_HOR(utcDate, observer);

  const projectedStars: ProjectedStar[] = [];
  for (const star of stars) {
    const point = projectCoordinate(star.geometry.coordinates, utcDate, rotation);
    if (point.altitude >= 0) {
      const hip = Number(star.id);
      const parsedColorIndex = Number(star.properties.bv);
      const colorIndex = Number.isFinite(parsedColorIndex) ? parsedColorIndex : null;
      const temperature = estimateStellarTemperature(colorIndex);
      projectedStars.push({
        id: `hip-${hip}`,
        hip,
        name: PROPER_STAR_NAMES[hip],
        x: point.x,
        y: point.y,
        altitude: point.altitude,
        azimuth: point.azimuth,
        magnitude: Number(star.properties.mag),
        colorIndex,
        temperature,
        spectralClass: estimateSpectralClass(temperature),
        opacity: Math.max(0.3, Math.min(1, point.altitude / 18)),
        twinkleSeed: hip % 997,
      });
    }
  }

  const projectedLines: ProjectedLine[] = [];
  for (const feature of constellationLines) {
    for (const line of feature.geometry.coordinates) {
      for (let index = 1; index < line.length; index += 1) {
        const start = projectCoordinate(line[index - 1], utcDate, rotation);
        const end = projectCoordinate(line[index], utcDate, rotation);
        if (start.altitude >= 0 && end.altitude >= 0) {
          projectedLines.push({ x1: start.x, y1: start.y, x2: end.x, y2: end.y, constellationId: feature.id });
        }
      }
    }
  }

  const projectedLabels: ProjectedLabel[] = [];
  for (const feature of constellationLabels) {
    const point = projectCoordinate(feature.geometry.coordinates, utcDate, rotation);
    if (point.altitude >= 8) {
      projectedLabels.push({ x: point.x, y: point.y, text: feature.properties.desig, rank: Number(feature.properties.rank ?? 3), constellationId: feature.id });
    }
  }

  return { utcDate, stars: projectedStars, lines: projectedLines, labels: projectedLabels };
}
