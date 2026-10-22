import { describe, expect, it } from 'vitest';
import { divide, finite, money, multiply, period, positive, rate, result, safe, sum } from '../src/internal.js';

describe('arithmetic boundaries', () => {
  it('rounds decimal multiplication half away from zero', () => {
    expect(multiply(100, 0.145)).toBe(15);
    expect(multiply(-100, 0.145)).toBe(-15);
    expect(multiply(1, 0.5)).toBe(1);
    expect(multiply(1, 0.499)).toBe(0);
    expect(multiply(10_000_000, 1e-7)).toBe(1);
    expect(multiply(1, 1e-20)).toBe(0);
    expect(multiply(0, 1e21)).toBe(0);
    expect(multiply(1, 0)).toBe(0);
  });

  it('rounds division and handles signed internal values', () => {
    expect(divide(101, 2)).toBe(51);
    expect(divide(-101, 2)).toBe(-51);
    expect(divide(10, 0.1)).toBe(100);
    expect(sum(1, -2, 3)).toBe(2);
    expect(sum(Number.MAX_SAFE_INTEGER, 1, -1)).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('accepts validator boundaries', () => {
    expect(() => money(0, 'amount')).not.toThrow();
    expect(() => money(1, 'amount', true)).not.toThrow();
    expect(() => rate(0, 'rate')).not.toThrow();
    expect(() => rate(1, 'rate')).not.toThrow();
    expect(() => period(1, 'months', 1200)).not.toThrow();
    expect(() => period(1200, 'months', 1200)).not.toThrow();
    expect(() => positive(0.1, 'area')).not.toThrow();
    expect(() => finite(-1, 'value')).not.toThrow();
    expect(result(0.1)).toBe(0.1);
    expect(safe(-1)).toBe(-1);
  });

  it('rejects non-finite intermediate results and unsafe totals', () => {
    expect(() => multiply(1, Infinity)).toThrow(/finite/);
    expect(() => divide(1, 0)).toThrow(/greater than zero/);
    expect(() => result(Infinity)).toThrow(/finite/);
    expect(() => sum(Number.MAX_SAFE_INTEGER, 1)).toThrow(/safe integer/);
    expect(() => safe(0.5)).toThrow(/safe integer/);
  });
});
