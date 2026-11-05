# Nearvora integration status

This document records what is genuinely implemented, what is simulated, and what must be supplied before an integration can be switched to LIVE.

## Runtime modes

| Mode | Behaviour |
| --- | --- |
| `DEMO_MODE=true` (default) | In-memory demo data, simulated providers, clearly labelled demo execution. |
| `DEMO_MODE=false` | Fails closed. The in-memory store refuses to serve data, simulated quotes/rates/plans are rejected, and `src/proxy.ts` returns `LIVE_RUNTIME_UNAVAILABLE` for API routes. |

LIVE mode is not implemented in this build. It must not be enabled for customers until the requirements below are complete and verified.

## AI provider (Groq / NEAR AI Cloud)

Implemented:

- Server-only OpenAI-compatible client (`src/lib/ai/openai-compatible.ts`) for `groq` and `near-ai-cloud`.
- Model discovery through each provider's `GET /models` (`src/lib/ai/model-config.ts`).
- Configurable provider, model, base URL, timeout, output-token limit, step limit and daily request/token budget (`src/lib/config/env.ts`).
- Bounded SDK retries (`maxRetries: 1`) and no retry loops.
- Structured intent extraction using strict JSON schema output on Groq, plus text-only answers for general account questions.
- Backend-owned balances, quotes, fees, recipients, plan creation and execution.
- Usage/cost snapshot per user (`src/lib/ai/usage.ts`).
- Safe health check at `GET /api/health/ai`; opt-in live completion with `?probe=1` (session required, rate limited).
- Safe error mapping and no credential logging.
- Customer-facing identity is always **Nearvora AI**; status responses do not return the model ID.

### Groq status: verified locally

- Provider: `AI_PROVIDER=groq`.
- Model: `openai/gpt-oss-120b` (tools, structured outputs, JSON mode, reasoning, 131k context).
- Pricing used for local estimates: $0.15 input / $0.60 output per million tokens.
- `GET /api/health/ai?probe=1` returned `status: "ok"` and `credentialVerified: true`.
- `POST /api/ai/chat` returned `planner: "model"` for both a general balance question and a transfer request.
- Strict structured output requires every JSON-schema property to be listed in `required`; the intent schema therefore uses required nullable fields and the prompt instructs the model to emit `null` for unknown values.

### NEAR AI Cloud status: alternate, blocked by billing here

1. Supply a valid `NEAR_AI_KEY` through the server environment or `.env` (never commit it). NEAR AI Cloud keys use `Authorization: Bearer sk-...`.
2. Select a model from `GET https://cloud-api.near.ai/v1/models` and set `NEAR_AI_MODEL`. This model supports tools and reasoning. No model is hardcoded.
3. Run `GET /api/health/ai` and confirm `modelAvailable: true`. The status is `unverified` because the provider's model list is public and does not validate the key.
4. Sign in and run `GET /api/health/ai?probe=1` to confirm the credential with a tiny live completion; expect `status: "ok"` and `credentialVerified: true`.

A credential previously present in local tool history was rejected by NEAR AI Cloud chat completions (`401 Invalid or expired API key`). It was not written to the repository and must not be treated as valid.

A later valid-format key authenticated but inference returned `402 No spending limit configured. Please contact support to set up credits.` The key's organization/workspace has no active spending limit or usable credit. Add credits and set a spending limit in the NEAR AI Cloud console, or contact NEAR AI support. Model discovery still works, so `GET /api/health/ai` may report `modelAvailable: true` while the probe reports `degraded`.

## Naira payments (Flutterwave / Paystack / Monnify)

Implemented:

- Provider-agnostic payment adapter interface.
- Demo provider returning clearly simulated virtual accounts and intents.
- Generic webhook signature verification scaffold.
- LIVE mode never returns the demo provider.

Not implemented:

- Real provider credentials and official API contracts.
- Provider-specific webhook signature schemes, timestamp/replay protection and event deduplication.
- Provider verification of deposits, payouts, reversals and bank account ownership.
- Business approval, settlement accounts, reconciliation and regulatory arrangements.

Required before LIVE:

1. Choose one approved provider and obtain production credentials.
2. Implement the adapter against the provider's official API and sandbox.
3. Implement and test provider-specific webhook signatures, idempotency and event storage.
4. Reconcile provider settlements against the internal ledger.
5. Complete KYB/KYC, licensing and customer-funds arrangements.

## Crypto / NEAR Intents / OutLayer

Implemented:

- Demo wallet balances and reserved `demo_` addresses that are not valid on any chain.
- Simulated quote engine with expiry and fee/spread fields.
- 1Click Swap API client (`src/lib/services/intents/oneclick-client.ts`) covering:
  - `GET /v0/tokens` with a short-lived token cache.
  - `POST /v0/quote` with `X-API-Key` partner auth, slippage, referral and deadline handling.
  - `GET /v0/status` with optional `depositMemo`.
  - `POST /v0/deposit/submit`.
- Live `OneClickNearIntentsAdapter` with deterministic asset resolution, optional `NEAR_INTENTS_ASSET_MAP` overrides, typed errors and no credential logging.
- Demo and live adapter selection based on `NEAR_INTENTS_API_KEY` (or explicit `NEAR_INTENTS_ALLOW_UNAUTHENTICATED`) and `NEAR_INTENTS_API_URL`.
- OutLayer adapter boundary that fails closed in LIVE mode.

Not implemented:

- Wiring live 1Click quotes into the swap UI and plan engine; `POST /api/quotes` still uses the clearly labelled simulated provider.
- Wallet creation, key management, signing, broadcasting or chain confirmation.
- Funding an `ORIGIN_CHAIN` or `INTENTS` deposit from Nearvora custody, and settling/refunding live swaps.
- Quote signature verification against the 1Click signing key.
- OutLayer attestation/execution API contract and credentials.
- Formance ledger postings and reconciliation.

Required before LIVE:

1. Add runtime persistence and a production session store so LIVE API routes are no longer blocked by `src/proxy.ts`.
2. Decide the custody model and fund either an origin-chain deposit address or an Intents account for each quote.
3. Implement key management with a protected signer or MPC/chain-signature setup; never expose keys to the model or browser.
4. Implement independent transaction confirmation, status polling, refund handling and reconciliation.
5. Verify 1Click quote/status signatures and persist the full signed quote response.
6. Obtain all required approvals and legal/compliance sign-off.

### 1Click notes

- The API has no testnet. Use small amounts for any manual verification.
- Authenticated partner JWTs use the partner fee schedule; unauthenticated requests add 0.25% and are disabled unless `NEAR_INTENTS_ALLOW_UNAUTHENTICATED=true`.
- Amounts are integer strings in the asset's smallest unit; never send decimal strings.
- Default asset selection prefers NEAR for stablecoins, BTC on Bitcoin, and so on. Use `NEAR_INTENTS_ASSET_MAP` when a deployment needs an exact assetId.
- Quotes default to `INTENTS` deposit/refund types using the configured NEAR account. Supply an explicit `refundTo` (and optionally `depositType`/`refundType`) to use the standard `ORIGIN_CHAIN` flow.
- Naira is not settled by NEAR Intents; the adapter rejects NGN rather than inventing a route.

## Database and authentication

Implemented:

- Prisma schema, migration and seed script describing the persistence model.
- In-memory demo store with user-scoped queries and audit records.

Not implemented:

- Runtime repository backed by PostgreSQL.
- Registration, login, password hashing, account recovery, multi-user sessions or role permissions.

Required before LIVE:

1. Implement the Prisma repository adapter and migrate runtime services off `DemoStore`.
2. Add production authentication (password hashing, secure sessions, expiry/revocation, recovery).
3. Add backend authorization tests for every user-scoped resource.
4. Replace in-memory rate limits and AI usage counters with durable shared storage for multi-instance deployment.

## Safety rules

- Never put `GROQ_API_KEY`, `NEAR_AI_KEY` or any provider key in client JavaScript, `NEXT_PUBLIC_*` variables, browser storage or logs.
- Never execute real financial transactions from this demo.
- Never describe simulated data, unverified providers or unapproved capabilities as live.
- Keep the AI non-authoritative: backend validation and explicit user approval remain mandatory.
