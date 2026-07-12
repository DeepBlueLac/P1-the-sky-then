import { describe, expect, it } from 'vitest';

import { buildSkyMap, projectEquatorialCoordinate } from '../src/core/sky';

const shanghai = {
  date: '2024-05-20',
  time: '20:30',
  latitude: 31.2304,
  longitude: 121.4737,
  timezone: 'Asia/Shanghai',
};

describe('sky projection', () => {
  it('keeps Polaris altitude close to observer latitude', () => {
    const polaris = projectEquatorialCoordinate([37.9546, 89.2641], shanghai);
    expect(polaris.altitude).toBeGreaterThan(30);
    expect(polaris.altitude).toBeLessThan(33);
  });

  it('projects only visible stars into the unit horizon circle', () => {
    const sky = buildSkyMap(shanghai);
    expect(sky.stars.length).toBeGreaterThan(1000);
    expect(sky.stars.every((star) => Math.hypot(star.x, star.y) <= 1.01)).toBe(true);
    expect(sky.lines.length).toBeGreaterThan(100);
  });

  it('uses the requested IANA timezone', () => {
    const sky = buildSkyMap({ ...shanghai, date: '2024-03-10', time: '01:30', timezone: 'America/New_York' });
    expect(sky.utcDate.toISOString()).toBe('2024-03-10T06:30:00.000Z');
  });

  it('changes the visible sky across seasons', () => {
    const may = buildSkyMap(shanghai);
    const november = buildSkyMap({ ...shanghai, date: '2024-11-20' });
    expect(may.stars.slice(0, 20)).not.toEqual(november.stars.slice(0, 20));
  });

  it('rejects malformed local dates', () => {
    expect(() => buildSkyMap({ ...shanghai, date: 'May 20' })).toThrow('Invalid local date or time');
  });
});
