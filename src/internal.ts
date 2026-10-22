/** Internal arithmetic. Public amounts are integer kuruş, never floating-point TL. */
export function finite(value: number, name: string): void {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite.`);
}

export function money(value: number, name: string, positive = false): void {
  if (!Number.isSafeInteger(value) || value < 0 || (positive && value === 0)) {
    throw new RangeError(`${name} must be a ${positive ? 'positive' : 'non-negative'} safe integer in kuruş.`);
  }
}

export function rate(value: number, name: string, max = 1): void {
  finite(value, name);
  if (value < 0 || value > max) throw new RangeError(`${name} must be between 0 and ${max}.`);
}

export function positive(value: number, name: string): void {
  finite(value, name);
  if (value <= 0) throw new RangeError(`${name} must be greater than zero.`);
}

export function period(value: number, name: string, max: number): void {
  if (!Number.isInteger(value) || value < 1 || value > max) {
    throw new RangeError(`${name} must be an integer between 1 and ${max}.`);
  }
}

export function safe(value: number): number {
  if (!Number.isSafeInteger(value)) throw new RangeError('Monetary result exceeds the safe integer range.');
  return value;
}

export function result(value: number): number {
  finite(value, 'Result');
  return value;
}

export function sum(...values: number[]): number {
  return fromBigInt(values.reduce((total, value) => total + BigInt(value), 0n));
}

function fromBigInt(value: bigint): number {
  return safe(Number(value));
}

/** Use the exact decimal spelling of a JS number, including exponential notation. */
function fraction(value: number): [bigint, bigint] {
  const [coefficient = '', exponent = '0'] = value.toString().split('e');
  const [whole = '', decimal = ''] = coefficient.split('.');
  const scale = decimal.length - Number(exponent);
  const numerator = BigInt(whole + decimal);
  return scale < 0 ? [numerator * 10n ** BigInt(-scale), 1n] : [numerator, 10n ** BigInt(scale)];
}

function rounded(numerator: bigint, denominator: bigint): number {
  const sign = numerator < 0n ? -1n : 1n;
  const magnitude = numerator * sign;
  return fromBigInt(sign * ((magnitude * 2n + denominator) / (2n * denominator)));
}

/** Half away from zero. Decimal multiplication is exact before kuruş rounding. */
export function multiply(amount: number, factor: number): number {
  finite(factor, 'Factor');
  const [numerator, denominator] = fraction(factor);
  return rounded(BigInt(amount) * numerator, denominator);
}

export function divide(amount: number, divisor: number): number {
  positive(divisor, 'Divisor');
  const [numerator, denominator] = fraction(divisor);
  return rounded(BigInt(amount) * denominator, numerator);
}
