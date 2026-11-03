import { describe, expect, it } from "vitest";
import {
  addMinor,
  compareMinor,
  convertMinor,
  fromMinor,
  percentOfMinor,
  subMinor,
  toMinor,
} from "@/lib/money/money";
import { formatAmount, formatNgn, shortAddress } from "@/lib/money/format";

describe("money primitives", () => {
  it("parses human amounts into integer minor units", () => {
    expect(toMinor("1,250.50", 2)).toBe("125050");
    expect(toMinor("0.0001", 8)).toBe("10000");
    expect(toMinor("1845.50", 6)).toBe("1845500000");
  });

  it("rounds down instead of creating fractional minor units", () => {
    expect(toMinor("1.005", 2)).toBe("100");
    expect(toMinor("0.999999999", 8)).toBe("99999999");
  });

  it("rejects invalid and negative amounts", () => {
    expect(() => toMinor("-1", 2)).toThrow();
    expect(() => toMinor("not-a-number", 2)).toThrow();
  });

  it("performs exact arithmetic on minor units", () => {
    expect(addMinor("10000", "2500", "1")).toBe("12501");
    expect(subMinor("125000000", "20010000")).toBe("104990000");
    expect(compareMinor("100", "100")).toBe(0);
    expect(percentOfMinor("1000000", 60)).toBe("6000");
  });

  it("converts assets without floating point drift", () => {
    expect(convertMinor("100000000", 2, "1584.5", 6)).toBe("1584500000000000");
    expect(convertMinor("10000", 2, "1584.5", 6)).toBe("158450000000");
    expect(convertMinor("1845500000", 6, "0.0006311", 2)).toBe("116");
  });

  it("formats display values from minor units", () => {
    expect(fromMinor("125000000", 2)).toBe("1250000.00");
    expect(formatNgn("1840000")).toContain("18,400.00");
    expect(formatAmount("10000", "BTC")).toContain("0.0001");
    expect(shortAddress("demo_usdt_near_testnet_recipient_nearvora")).toContain("…");
  });
});
