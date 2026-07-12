import { fromZonedTime } from 'date-fns-tz';
import * as Astronomy from 'astronomy-engine';

import constellationData from '@/data/constellations.json';
import constellationLineData from '@/data/constellations.lines.json';
import starData from '@/data/stars.6.json';
import type { ProjectedLabel, ProjectedLine, ProjectedStar, SkyInput, SkyMap } from '@/core/types';

type Coordinate = [number, number];
type StarFeature = { properties: { mag: number }; geometry: { coordinates: Coordinate } };
type LineFeature = { geometry: { coordinates: Coordinate[][] } };
type LabelFeature = { properties: { desig: string; rank?: string | number }; geometry: { coordinates: Coordinate } };

const stars = (starData as unknown as { features: StarFeature[] }).features.filter((star) => Number(star.properties.mag) <= 5.5);
const constellationLines = (constellationLineData as unknown as { features: LineFeature[] }).features;
const constellationLabels = (constellationData as unknown as { features: LabelFeature[] }).features;

function projectCoordinate(
  coordinate: Coordinate,
  time: Date,
  rotation: Astronomy.RotationMatrix,
): { x: number; y: number; altitude: number } {
  const [rightAscensionDegrees, declination] = coordinate;
  const vector = Astronomy.VectorFromSphere(new Astronomy.Spherical(declination, rightAscensionDegrees, 1), time);
  const horizontalVector = Astronomy.RotateVector(rotation, vector);
  const horizon = Astronomy.HorizonFromVector(horizontalVector, 'normal');
  const radius = (90 - horizon.lat) / 90;
  const azimuth = (horizon.lon * Math.PI) / 180;
  return { x: radius * Math.sin(azimuth), y: -radius * Math.cos(azimuth), altitude: horizon.lat };
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
      projectedStars.push({
        x: point.x,
        y: point.y,
        magnitude: Number(star.properties.mag),
        opacity: Math.max(0.3, Math.min(1, point.altitude / 18)),
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
          projectedLines.push({ x1: start.x, y1: start.y, x2: end.x, y2: end.y });
        }
      }
    }
  }

  const projectedLabels: ProjectedLabel[] = [];
  for (const feature of constellationLabels) {
    const point = projectCoordinate(feature.geometry.coordinates, utcDate, rotation);
    if (point.altitude >= 8) {
      projectedLabels.push({ x: point.x, y: point.y, text: feature.properties.desig, rank: Number(feature.properties.rank ?? 3) });
    }
  }

  return { utcDate, stars: projectedStars, lines: projectedLines, labels: projectedLabels };
}
