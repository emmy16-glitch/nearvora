import { ASSETS, type AssetSymbol } from "@/lib/config/assets";
import type {
  AssistantIntent,
  AssistantOperationIntent,
  PlannerContext,
} from "./types";

const SMALL: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

const SCALES: Record<string, number> = {
  thousand: 1_000,
  million: 1_000_000,
  billion: 1_000_000_000,
};

const NUMBER_RUN =
  /\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|and)(?:\s+(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|and))*\b/gi;

export function normalizeSpelledNumbers(input: string): string {
  return input.replace(NUMBER_RUN, (match) => {
    const words = match.toLowerCase().split(/\s+/);
    const value = wordsToValue(words);
    return value === null ? match : String(value);
  });
}

function wordsToValue(words: string[]): number | null {
  let total = 0;
  let current = 0;
  let matched = false;
  for (const word of words) {
    if (word === "and") continue;
    if (word in SMALL) {
      current += SMALL[word];
      matched = true;
    } else if (word === "hundred") {
      current = (current || 1) * 100;
      matched = true;
    } else if (word in SCALES) {
      total += (current || 1) * SCALES[word];
      current = 0;
      matched = true;
    }
  }
  if (!matched) return null;
  return total + current;
}

const ASSET_WORDS: Record<string, AssetSymbol> = {
  naira: "NGN",
  ngn: "NGN",
  usdt: "USDT",
  usdc: "USDC",
  btc: "BTC",
  bitcoin: "BTC",
  eth: "ETH",
  ethereum: "ETH",
};

export function extractAmounts(clause: string): string[] {
  const pattern =
    /(?:₦|ngn|naira)?\s*(\d[\d,]*(?:\.\d+)?)\s*(thousand|million|billion|k|m|bn)?/gi;
  const amounts: string[] = [];
  for (const match of clause.matchAll(pattern)) {
    const raw = match[1].replace(/,/g, "");
    const suffix = match[2]?.toLowerCase();
    let value = Number(raw);
    if (!Number.isFinite(value)) continue;
    if (suffix === "k" || suffix === "thousand") value *= 1_000;
    if (suffix === "m" || suffix === "million") value *= 1_000_000;
    if (suffix === "bn" || suffix === "billion") value *= 1_000_000_000;
    if (value <= 0) continue;
    amounts.push(trimNumber(value));
  }
  return amounts;
}

function trimNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(8).replace(/0+$/, "");
}

function splitClauses(text: string): string[] {
  return text
    .split(
      /(?:[,;]\s+(?=[a-zA-Z])|\.\s+|\band\s+(?=(?:send|transfer|convert|swap|pay|leave|withdraw|deposit|buy|then)\b))/i,
    )
    .map((clause) => clause.trim())
    .filter(Boolean);
}

function findAssets(clause: string): AssetSymbol[] {
  const found: AssetSymbol[] = [];
  for (const match of clause.matchAll(/\b(naira|ngn|usdt|usdc|btc|bitcoin|eth|ethereum)\b/gi)) {
    const symbol = ASSET_WORDS[match[1].toLowerCase()];
    if (symbol && !found.includes(symbol)) found.push(symbol);
  }
  return found;
}

function findBeneficiary(clause: string, context: PlannerContext) {
  const lower = clause.toLowerCase();
  return context.beneficiaries.find((beneficiary) => {
    if (beneficiary.type !== "bank") return false;
    if (beneficiary.nickname && lower.includes(beneficiary.nickname.toLowerCase())) return true;
    const parts = beneficiary.name.toLowerCase().split(" ");
    return parts.some((part) => part.length > 3 && lower.includes(part));
  });
}

function findBill(clause: string, context: PlannerContext) {
  const lower = clause.toLowerCase();
  if (/electric|ikedc|ikeja|power|nepa/.test(lower)) {
    return context.bills.find((bill) => bill.category === "electricity");
  }
  if (/airtime|recharge/.test(lower)) {
    return context.bills.find((bill) => bill.category === "airtime");
  }
  if (/data|internet|bundle/.test(lower)) {
    return context.bills.find((bill) => bill.category === "data");
  }
  return context.bills.find(
    (bill) =>
      lower.includes(bill.provider.toLowerCase()) ||
      lower.includes(bill.nickname.toLowerCase()),
  );
}

/**
 * Deterministic development planner. It is used when no model is configured or
 * when the model call fails. It only reads backend demo data (beneficiaries,
 * bills, balances) and asks for missing information instead of inventing it.
 */
export function produceFallbackIntent(
  message: string,
  context: PlannerContext,
): AssistantIntent {
  const normalized = normalizeSpelledNumbers(message.toLowerCase());
  const clauses = splitClauses(normalized);
  const operations: AssistantOperationIntent[] = [];
  const missingInformation: string[] = [];
  const assumptions: string[] = [];

  for (const clause of clauses) {
    const amounts = extractAmounts(clause);
    const amount = amounts[0];

    if (/^(?:i have|i've got|my balance|leave|keep|retain)\b/.test(clause)) {
      if (/leave|keep|retain/.test(clause) && /remain/.test(clause)) {
        assumptions.push("The remaining balance stays in your Naira wallet.");
      }
      continue;
    }

    if (/electric|bill|airtime|data|ikedc|ikeja|mtn|glo|airtel/.test(clause)) {
      const bill = findBill(clause, context);
      if (!bill) {
        missingInformation.push("Which biller or saved bill should I use?");
        continue;
      }
      operations.push({
        kind: "bill_payment",
        billId: bill.id,
        billerHint: bill.provider,
        amount,
      });
      continue;
    }

    if (/\b(?:convert|swap|change|buy)\b/.test(clause)) {
      const assets = findAssets(clause);
      const swap = resolveSwapDirection(clause, assets);
      if (!swap) {
        missingInformation.push("Which asset should I convert to?");
        continue;
      }
      if (!amount) {
        missingInformation.push("How much should I convert?");
        continue;
      }
      operations.push({
        kind: "swap",
        fromAsset: swap.from,
        toAsset: swap.to,
        amount,
      });
      continue;
    }

    if (/\bwithdraw\b/.test(clause)) {
      if (!amount) {
        missingInformation.push("How much would you like to withdraw?");
        continue;
      }
      const beneficiary = findBeneficiary(clause, context);
      operations.push({
        kind: "cash_withdrawal",
        amount,
        beneficiaryHint: beneficiary?.name,
      });
      continue;
    }

    if (/\b(?:deposit|top up|top-up|fund|add money)\b/.test(clause)) {
      if (!amount) {
        missingInformation.push("How much would you like to deposit?");
        continue;
      }
      operations.push({ kind: "cash_deposit", amount });
      continue;
    }

    if (/\b(?:send|transfer|pay)\b/.test(clause)) {
      const assets = findAssets(clause).filter((symbol) => symbol !== "NGN");
      const addressMatch = clause.match(/\b(demo_[a-z0-9_]+)\b/i);
      if (assets.length > 0) {
        if (!addressMatch) {
          missingInformation.push(
            `What demo ${assets[0]} address should receive the transfer? Use a demo_ address; I will not invent one.`,
          );
          continue;
        }
        if (!amount) {
          missingInformation.push(`How much ${assets[0]} should I send?`);
          continue;
        }
        operations.push({
          kind: "crypto_transfer",
          asset: assets[0],
          amount,
          address: addressMatch[1],
          network: ASSETS[assets[0]].networks[0]?.id,
        });
        continue;
      }

      const beneficiary = findBeneficiary(clause, context);
      if (!beneficiary) {
        missingInformation.push(
          "Who should receive the bank transfer? Pick a saved beneficiary or provide the account name, bank and 10-digit account number.",
        );
        continue;
      }
      if (!amount) {
        missingInformation.push(`How much should I send to ${beneficiary.name}?`);
        continue;
      }
      operations.push({
        kind: "bank_transfer",
        amount,
        beneficiaryHint: beneficiary.name,
      });
      continue;
    }
  }

  if (operations.length === 0 && missingInformation.length === 0) {
    missingInformation.push(
      "Tell me whether you want to transfer, convert, pay a bill, deposit or withdraw.",
    );
  }

  return {
    summary:
      operations.length > 0
        ? `Development planner identified ${operations.length} operation${operations.length === 1 ? "" : "s"}.`
        : "I need a little more detail before preparing a plan.",
    operations,
    missingInformation,
    assumptions,
    planner: "fallback",
  };
}

function resolveSwapDirection(
  clause: string,
  assets: AssetSymbol[],
): { from: AssetSymbol; to: AssetSymbol } | null {
  if (assets.length >= 2) {
    return { from: assets[0], to: assets[1] };
  }
  if (assets.length === 1) {
    const only = assets[0];
    if (only === "NGN") return null;
    if (/\bfrom\b/.test(clause)) return { from: only, to: "NGN" };
    return { from: "NGN", to: only };
  }
  return null;
}
