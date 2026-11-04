import { env } from "@/lib/config/env";
import { AiBudgetExceededError } from "./errors";

export interface AiUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface UsageSnapshot extends AiUsage {
  requests: number;
  estimatedCostUsd: number | null;
  limits: {
    dailyRequests: number;
    dailyTokens: number;
  };
}

interface UsageRecord extends AiUsage {
  requests: number;
  estimatedCostUsd: number;
}

const usage = new Map<string, UsageRecord>();

function dayKey(userId: string): string {
  return `${new Date().toISOString().slice(0, 10)}:${userId}`;
}

function costFor(usage: AiUsage): number | null {
  const input = env.ai.inputCostPerMillion;
  const output = env.ai.outputCostPerMillion;
  if (input === null || output === null) return null;
  return (
    (usage.inputTokens / 1_000_000) * input + (usage.outputTokens / 1_000_000) * output
  );
}

export function assertUsageAllowed(userId: string): void {
  const record = usage.get(dayKey(userId));
  if (!record) return;
  if (
    record.requests >= env.ai.dailyRequestLimit ||
    record.totalTokens >= env.ai.dailyTokenLimit
  ) {
    throw new AiBudgetExceededError();
  }
}

export function recordUsage(userId: string, next: Partial<AiUsage>): UsageSnapshot {
  const key = dayKey(userId);
  const inputTokens = Math.max(0, Math.floor(next.inputTokens ?? 0));
  const outputTokens = Math.max(0, Math.floor(next.outputTokens ?? 0));
  const totalTokens = Math.max(0, Math.floor(next.totalTokens ?? inputTokens + outputTokens));
  const current: UsageRecord = usage.get(key) ?? {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    requests: 0,
    estimatedCostUsd: 0,
  };
  const updated: UsageRecord = {
    inputTokens: current.inputTokens + inputTokens,
    outputTokens: current.outputTokens + outputTokens,
    totalTokens: current.totalTokens + totalTokens,
    requests: current.requests + 1,
    estimatedCostUsd: current.estimatedCostUsd,
  };
  const cost = costFor({ inputTokens, outputTokens, totalTokens });
  if (cost !== null) updated.estimatedCostUsd += cost;
  usage.set(key, updated);

  return {
    ...updated,
    estimatedCostUsd: costFor(updated) === null && env.ai.inputCostPerMillion === null
      ? null
      : updated.estimatedCostUsd,
    limits: {
      dailyRequests: env.ai.dailyRequestLimit,
      dailyTokens: env.ai.dailyTokenLimit,
    },
  };
}

export function getUsageSnapshot(userId: string): UsageSnapshot {
  const record = usage.get(dayKey(userId)) ?? {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    requests: 0,
    estimatedCostUsd: 0,
  };
  return {
    ...record,
    estimatedCostUsd:
      env.ai.inputCostPerMillion === null || env.ai.outputCostPerMillion === null
        ? null
        : record.estimatedCostUsd,
    limits: {
      dailyRequests: env.ai.dailyRequestLimit,
      dailyTokens: env.ai.dailyTokenLimit,
    },
  };
}

export function resetUsageForTests(): void {
  usage.clear();
}
