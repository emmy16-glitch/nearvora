import Decimal from "decimal.js";

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export type Minor = string;

export function isMinor(value: string | null | undefined): value is Minor {
  return typeof value === "string" && /^-?\d+$/.test(value);
}

/** Parse a human decimal amount into integer minor units. Never use floats. */
export function toMinor(amount: string | number, decimals: number): Minor {
  const value = new Decimal(String(amount).replace(/,/g, "").trim());
  if (!value.isFinite()) throw new Error("Amount is not a finite number");
  if (value.isNegative()) throw new Error("Amount cannot be negative");
  return value
    .mul(new Decimal(10).pow(decimals))
    .toDecimalPlaces(0, Decimal.ROUND_DOWN)
    .toFixed(0);
}

export function minorToDecimal(minor: Minor, decimals: number): Decimal {
  return new Decimal(minor).div(new Decimal(10).pow(decimals));
}

export function fromMinor(minor: Minor, decimals: number): string {
  return minorToDecimal(minor, decimals).toFixed(decimals);
}

export function addMinor(...values: Minor[]): Minor {
  return values.reduce((sum, value) => sum.plus(value), new Decimal(0)).toFixed(0);
}

export function subMinor(a: Minor, b: Minor): Minor {
  return new Decimal(a).minus(b).toFixed(0);
}

export function mulMinor(a: Minor, b: Minor): Minor {
  return new Decimal(a).mul(b).toFixed(0);
}

export function compareMinor(a: Minor, b: Minor): number {
  return new Decimal(a).cmp(b);
}

export function isPositiveMinor(value: Minor): boolean {
  return new Decimal(value).gt(0);
}

export function isZeroMinor(value: Minor): boolean {
  return new Decimal(value).eq(0);
}

export function percentOfMinor(value: Minor, bps: number): Minor {
  return new Decimal(value).mul(bps).div(10_000).toDecimalPlaces(0, Decimal.ROUND_DOWN).toFixed(0);
}

/** Convert an amount between assets using a rate expressed in quote units per base unit. */
export function convertMinor(
  amount: Minor,
  fromDecimals: number,
  rate: string,
  toDecimals: number,
): Minor {
  return minorToDecimal(amount, fromDecimals)
    .mul(rate)
    .mul(new Decimal(10).pow(toDecimals))
    .toDecimalPlaces(0, Decimal.ROUND_DOWN)
    .toFixed(0);
}

export function minMinor(a: Minor, b: Minor): Minor {
  return compareMinor(a, b) <= 0 ? a : b;
}

export function maxMinor(a: Minor, b: Minor): Minor {
  return compareMinor(a, b) >= 0 ? a : b;
}

export function absMinor(value: Minor): Minor {
  return new Decimal(value).abs().toFixed(0);
}

export function assertNonNegative(value: Minor, label = "Amount"): void {
  if (!isMinor(value) || new Decimal(value).isNegative()) {
    throw new Error(`${label} must be a non-negative integer amount`);
  }
}
