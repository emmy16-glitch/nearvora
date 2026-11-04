# Nearvora

Nearvora is an AI-assisted Naira and crypto financial workspace. It can review balances, prepare bank transfers, convert assets, pay bills and execute multi-step money plans — but only after the backend validates the request and the user explicitly approves the prepared plan.

This repository is a complete, runnable **demo implementation**. Balances, quotes, providers and settlement are simulated and clearly labelled. No real money moves. The assistant's inference layer supports server-side **Groq** and **NEAR AI Cloud** through an OpenAI-compatible client and is never exposed to the browser.

> **LIVE mode is intentionally not available in this build.** Setting `DEMO_MODE=false` makes data, quotes, payment, Intents, OutLayer and AI execution paths fail closed instead of serving demo data as live data.

## What is implemented

- Responsive app shell with dashboard, wallets, crypto receive/send, Naira deposit/withdraw/transfer, swap, live demo rates, activity, transaction detail, bills, assistant and account pages.
- One shared transaction-plan engine for both manual screens and AI requests.
- Plan lifecycle: `DRAFT → VALIDATING → AWAITING_APPROVAL → APPROVED → EXECUTING → COMPLETED`, with `PARTIALLY_COMPLETED`, `FAILED`, `CANCELLED` and `EXPIRED` outcomes.
- Backend-enforced approval, high-risk acknowledgment, quote freshness checks, balance re-validation at execution, idempotency and audit logging.
- Server-side **Groq** or **NEAR AI Cloud** integration through an OpenAI-compatible client, with model discovery, timeouts, bounded retries, usage/cost tracking, a health check and a labelled deterministic fallback planner for demo mode.
- Structured intent extraction plus text-only answers to general account questions. The model never supplies balances or executes operations; plans are rebuilt from backend data.
- Controlled backend AI helpers for balances, saved beneficiaries, bills and quotes (not exposed as unrestricted model tools).
- Simulated quote provider, outbound policy adapter (OutLayer boundary), NEAR Intents boundary, payment-provider boundary and demo accounting ledger.
- Explicit DEMO/LIVE runtime modes. LIVE mode fails closed until persistent storage and verified provider adapters exist.
- Prisma/PostgreSQL schema, initial SQL migration and seed script.
- Unit and flow tests for money arithmetic, plan creation/approval/execution, idempotency, risk gates and AI fallback planning.

## Quick start

```bash
npm install
cp .env.example .env   # optional for pure demo mode
npm run dev
```

Open <http://localhost:3000>. The app creates a signed demo session automatically and seeds the in-memory store with the demo profile.

No API keys or database are required for demo mode.

### Demo walkthrough

1. Open the dashboard and inspect the seeded Naira and crypto balances.
2. Send Naira to the saved “Brother” beneficiary and review the plan before approving.
3. Pay the seeded electricity bill or swap NGN to USDT.
4. Open **Assistant** and use a request such as:
   > I have ₦1,000,000. Send ₦200,000 to my brother, convert ₦300,000 to USDT, pay my electricity bill and leave the rest.
5. Review the combined AI plan. Nothing executes until you approve it.
6. Use **Account → Reset demo data** to restore the seed.

## Environment

All values are optional for the demo. See `.env.example`.

| Variable | Purpose |
| --- | --- |
| `DEMO_MODE` | Defaults to `true`. Must stay true until persistent storage and real provider execution are implemented. `false` fails closed. |
| `DATA_MODE` | `demo` in this build. The Prisma-backed runtime repository is not wired yet. |
| `SESSION_SECRET` | HMAC secret for the demo session cookie. Required in production (24+ characters). |
| `DATABASE_URL` | PostgreSQL connection string for Prisma migrations/seed. |
| `AI_PROVIDER` | `groq` or `near-ai-cloud`. Defaults to `near-ai-cloud`. |
| `GROQ_API_KEY`, `GROQ_MODEL`, `GROQ_BASE_URL` | Server-only Groq credential, model ID and endpoint. Never expose to the browser. |
| `NEAR_AI_KEY`, `NEAR_AI_MODEL`, `NEAR_AI_BASE_URL` | Server-only NEAR AI Cloud credential, model ID and endpoint. |
| `AI_TIMEOUT_MS`, `AI_MAX_OUTPUT_TOKENS`, `AI_MAX_STEPS` | Shared AI request limits. |
| `AI_DAILY_REQUEST_LIMIT`, `AI_DAILY_TOKEN_LIMIT` | Per-user daily AI budget guardrails. |
| `GROQ_*_COST_PER_MILLION`, `NEAR_AI_*_COST_PER_MILLION` | Optional verified pricing for cost estimates. |
| `NEAR_NETWORK`, `NEAR_RPC_URL`, `NEAR_ACCOUNT_ID` | NEAR context for the Intents adapter. |
| `NEAR_INTENTS_API_URL` | Intents quote/settlement endpoint when implemented. |
| `OUTLAYER_API_URL`, `OUTLAYER_API_KEY` | OutLayer policy/execution boundary. |
| `PAYMENT_PROVIDER`, `PAYMENT_WEBHOOK_SECRET` | Naira provider target and webhook verification. |
| `FORMANCE_LEDGER_URL`, `FORMANCE_LEDGER_TOKEN` | Formance ledger boundary. |

### Enable Nearvora AI

Groq is the verified local provider. NEAR AI Cloud remains supported as an alternate provider but requires a key whose workspace has a spending limit.

1. Create a server-only API key with the selected provider.
2. Put it in `.env` (never in client code, browser storage or `NEXT_PUBLIC_*` variables):

```bash
# Groq (verified path)
AI_PROVIDER=groq
GROQ_API_KEY=your-key
GROQ_MODEL=openai/gpt-oss-120b
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_INPUT_COST_PER_MILLION=0.15
GROQ_OUTPUT_COST_PER_MILLION=0.60

# NEAR AI Cloud (alternate)
# AI_PROVIDER=near-ai-cloud
# NEAR_AI_KEY=your-key
# NEAR_AI_MODEL=your-selected-model
# NEAR_AI_BASE_URL=https://cloud-api.near.ai/v1
```

3. Discover models and verify the selected ID exists:

```bash
# Groq
curl -s -H "Authorization: Bearer $GROQ_API_KEY" \
  https://api.groq.com/openai/v1/models
# NEAR AI Cloud
curl -s -H "Authorization: Bearer $NEAR_AI_KEY" \
  https://cloud-api.near.ai/v1/models
```

4. Start the app and check the safe health endpoint:

```bash
curl -s http://localhost:3000/api/health/ai
# tiny live completion; requires a signed-in session and is rate limited
curl -s -X GET "http://localhost:3000/api/health/ai?probe=1" -b "nv_session=<cookie>"
```

Without `?probe=1` the status is `unverified`: configuration and model availability are checked, but model catalogs are public, so only a live probe confirms the credential. A successful probe returns `status: "ok"` and `credentialVerified: true`. The response never returns the key. Customer-facing surfaces always identify the assistant as **Nearvora AI** and do not show the inference provider or model name.

No real key is committed to this repository. If the selected provider has no key, demo mode uses the clearly labelled deterministic planner; in LIVE mode the assistant fails closed instead of using fake inference.

## Database

The Prisma schema models users, wallets, beneficiaries, transactions, quotes, plans, approvals, conversations, messages, bills, notifications, audit logs, idempotency records and webhook events.

```bash
# with DATABASE_URL set
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:studio
```

Runtime persistence is intentionally **in-memory demo** in this build. The store is isolated in `src/lib/database/store.ts`; the Prisma schema and seed are ready for a repository adapter, but application services are not yet wired to PostgreSQL. Restarting the server resets demo data.

## Architecture

```text
Browser
  → Next.js route handlers (validation, session, rate limit, audit)
    → transaction plan service
      → DemoStore (balances, recipients, bills, quotes, plans)
      → OutLayer policy boundary
      → NEAR Intents / payment / ledger adapters
  → Plan review UI
    → explicit approval request
      → re-validation + simulated execution
```

Key boundaries:

- `src/lib/services/transactions/plan-service.ts` — shared plan engine.
- `src/lib/ai/` — OpenAI-compatible Groq/NEAR AI provider, model configuration, health check, usage budget and safe errors.
- `src/lib/services/ai/` — model intent planner, text answers, deterministic fallback, backend helpers and chat service.
- `src/lib/services/outlayer/index.ts` — policy/execution guard boundary.
- `src/lib/services/intents/index.ts` — NEAR Intents boundary.
- `src/lib/services/payments/index.ts` — payment-provider boundary.
- `src/lib/services/accounting/index.ts` — demo ledger/Formance boundary.
- `src/lib/database/store.ts` — in-memory demo repository with a LIVE-mode fail-closed guard.
- `src/proxy.ts` — blocks API access in unavailable LIVE mode.
- `prisma/schema.prisma` — relational persistence model.

## API surface

| Area | Routes |
| --- | --- |
| Session/health | `GET /api/session`, `DELETE /api/session`, `GET /api/health`, `GET /api/health/ai` |
| Wallet | `GET /api/wallets`, `GET /api/transactions`, `GET /api/transactions/[id]` |
| Beneficiaries | `GET/POST /api/beneficiaries` |
| Bills | `GET /api/bills` |
| Quotes | `POST /api/quotes` |
| Plans | `GET/POST /api/plans`, `GET /api/plans/[id]`, `POST /api/plans/[id]/approve`, `POST /api/plans/[id]/cancel` |
| AI | `POST /api/ai/chat`, `GET /api/ai/status`, `GET /api/ai/conversations`, `GET /api/ai/conversations/[id]` |
| Account | `GET/POST /api/notifications`, `GET /api/account/audit` |
| Payments | `POST /api/payments/virtual-account`, `POST /api/webhooks/[provider]` |
| Demo | `POST /api/demo/reset` |

The public API uses a consistent envelope:

```json
{ "ok": true, "data": {}, "meta": {} }
```

Errors use `{ "ok": false, "error": { "code": "...", "message": "..." } }`.

## Security invariants

- Amounts are integer minor units with `decimal.js`; floating point is never used for accounting.
- Every plan is created on the server. Clients cannot set status, fees, quotes or execution results.
- Approval is a backend record, not just a disabled button.
- High-risk plans require explicit acknowledgment and can expire.
- Execution re-checks balances and quote freshness.
- Create/execute endpoints accept idempotency keys to prevent duplicate plans and double-spends.
- The AI receives only the minimum backend context and cannot access keys, sign transactions or execute arbitrary financial operations.
- AI provider keys are read on the server only. No `NEXT_PUBLIC_*` AI key exists, and health/status responses never include credentials.
- Demo execution is always marked `simulated: true`. LIVE mode refuses to serve the in-memory demo store, simulated quotes, demo rates, demo payments or demo policy execution.
- Session cookies are HTTP-only, same-site and HMAC-signed; write routes validate origin.

## Testing and checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

The test suite covers exact money arithmetic, plan creation, idempotency, high-risk approval gates, simulated execution, insufficient funds, cancellation and the canonical AI fallback flow.

If Next.js cannot load its native SWC binary on an unusual ARM host (for example a `Bus error` before compilation), use the portable WASM/Webpack path:

```bash
NEXT_TEST_WASM=1 npx next build --webpack
```

## Current limitations

- Demo runtime persistence only; the Prisma repository adapter is not wired. Restarting the server resets data.
- No real NEAR Intents quotes, OutLayer attestations, payment settlement or Formance postings.
- No production authentication/registration/password recovery. The signed demo session is not a login system.
- No live Flutterwave/Paystack/Monnify adapter, webhook event processing, duplicate-event handling or reconciliation.
- No live wallet creation, key management, signing or blockchain broadcasting. All addresses and balances are demo values.
- No KYC provider, licensing or compliance approval. The "verified" KYC state is seeded demo data.
- Webhook signature verification is scaffolded; provider-specific live schemes are not implemented.
- AI replies remain untrusted even with a model configured: plans are always rebuilt from backend data and require explicit approval.
- Groq `openai/gpt-oss-120b` has been verified for text answers and strict structured intent extraction. Tool calling is not required by the current financial flow. NEAR AI Cloud still requires a valid key with an active spending limit.
- Rate limiting, AI usage tracking and sessions are in-memory and not suitable for multi-instance production deployments.

These boundaries are surfaced in the UI rather than hidden behind fake “live” states. See `docs/integrations.md` for the exact work required before each integration can be enabled live.
