import Decimal from "decimal.js";
import { ASSETS, type AssetSymbol } from "@/lib/config/assets";
import { minorToDecimal, type Minor } from "./money";

export function formatNgn(
  minor: Minor,
  options: { compact?: boolean; withSymbol?: boolean } = {},
): string {
  const value = minorToDecimal(minor, 2).toNumber();
  const showSymbol = options.withSymbol !== false;
  if (options.compact && Math.abs(value) >= 1_000_000) {
    return `${showSymbol ? "₦" : ""}${new Intl.NumberFormat("en-NG", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value)}`;
  }
  const formatted = new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return showSymbol ? `₦${formatted}` : formatted;
}

export function formatAsset(
  minor: Minor,
  symbol: AssetSymbol,
  options: { withSymbol?: boolean; maxFractionDigits?: number } = {},
): string {
  const asset = ASSETS[symbol];
  const value = minorToDecimal(minor, asset.decimals);
  const maximumFractionDigits =
    options.maxFractionDigits ?? (asset.decimals > 6 ? 6 : asset.decimals);
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(value.toNumber());
  return options.withSymbol === false ? formatted : `${formatted} ${symbol}`;
}

export function formatAmount(
  minor: Minor,
  symbol: AssetSymbol,
  options: { withSymbol?: boolean; compact?: boolean } = {},
): string {
  return symbol === "NGN"
    ? formatNgn(minor, { compact: options.compact, withSymbol: options.withSymbol })
    : formatAsset(minor, symbol, { withSymbol: options.withSymbol });
}

export function formatRate(rate: string, from: AssetSymbol, to: AssetSymbol): string {
  const value = new Decimal(rate);
  const decimals = value.gte(1000) ? 2 : value.gte(1) ? 4 : 8;
  return `1 ${from} ≈ ${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value.toNumber())} ${to}`;
}

export function formatPercent(value: number, withSign = true): string {
  const sign = withSign && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function shortAddress(address: string, head = 8, tail = 6): string {
  if (address.length <= head + tail + 3) return address;
  return `${address.slice(0, head)}…${address.slice(-tail)}`;
}

export function shortReference(reference: string, head = 10, tail = 6): string {
  if (reference.length <= head + tail + 1) return reference;
  return `${reference.slice(0, head)}…${reference.slice(-tail)}`;
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  }).format(new Date(iso));
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeZone: "Africa/Lagos",
  }).format(new Date(iso));
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60_000);
  if (Math.abs(minutes) < 1) return "just now";
  if (Math.abs(minutes) < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 7) return `${days}d ago`;
  return formatDate(iso);
}

export function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
