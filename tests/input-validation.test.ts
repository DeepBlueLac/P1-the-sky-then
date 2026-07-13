import { describe, expect, it } from 'vitest';

import { validateDateTime } from '../src/core/input-validation';

describe('date and time validation', () => {
  it('accepts a valid local date and time', () => {
    expect(validateDateTime('2024-05-20', '20:30')).toEqual({});
  });

  it('rejects impossible dates', () => {
    expect(validateDateTime('2024-02-30', '20:30').date).toBe('请输入真实存在的日期');
  });

  it('rejects invalid time ranges', () => {
    expect(validateDateTime('2024-05-20', '24:10').time).toBe('请输入 00:00 至 23:59');
  });

  it('requires stable machine-readable formats', () => {
    expect(validateDateTime('May 20', '8:30')).toEqual({
      date: '请使用 YYYY-MM-DD 格式',
      time: '请使用 HH:mm 格式',
    });
  });
});
