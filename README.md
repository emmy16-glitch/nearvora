# Nearvora

Nearvora is an AI-assisted Naira and crypto financial workspace. It can review balances, prepare bank transfers, convert assets, pay bills and execute multi-step money plans — but only after the backend validates the request and the user explicitly approves the prepared plan.

This repository is a complete, runnable **demo implementation**. Balances, quotes, providers and settlement are simulated and clearly labelled. No real money moves.

## What is implemented

- Responsive app shell with dashboard, wallets, crypto receive/send, Naira deposit/withdraw/transfer, swap, live demo rates, activity, transaction detail, bills, assistant and account pages.
- One shared transaction-plan engine for both manual screens and AI requests.
- Plan lifecycle: `DRAFT → VALIDATING → AWAITING_APPROVAL → APPROVED → EXECUTING → COMPLETED`, with `PARTIALLY_COMPLETED`, `FAILED`, `CANCELLED` and `EXPIRED` outcomes.
- Backend-enforced approval, high-risk acknowledgment, quote freshness checks, balance re-validation at execution, idempotency and audit logging.
- AI intent extraction through an OpenAI-compatible model when configured, plus a labelled deterministic fallback planner when no model is available.
- Controlled backend AI tools for balances, saved beneficiaries, bills and quotes. The model never supplies balances or executes operations.
- Simulated quote provider, outbound policy adapter (OutLayer boundary), NEAR Intents boundary, payment-provider boundary and demo accounting ledger.
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
| `DEMO_MODE` | Defaults to `true`. Must stay true until real provider execution is implemented. |
| `SESSION_SECRET` | HMAC secret for the demo session cookie. Required in production. |
| `DATABASE_URL` | PostgreSQL connection string for Prisma migrations/seed. |
| `AI_API_KEY` / `AI_BASE_URL` / `AI_MODEL` | Enable the OpenAI-compatible planner. |
| `NEAR_NETWORK`, `NEAR_RPC_URL`, `NEAR_ACCOUNT_ID` | NEAR context for the Intents adapter. |
| `NEAR_INTENTS_API_URL` | Intents quote/settlement endpoint when implemented. |
| `OUTLAYER_API_URL`, `OUTLAYER_API_KEY` | OutLayer policy/execution boundary. |
| `PAYMENT_PROVIDER`, `PAYMENT_WEBHOOK_SECRET` | Naira provider target and webhook verification. |
| `FORMANCE_LEDGER_URL`, `FORMANCE_LEDGER_TOKEN` | Formance ledger boundary. |

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
- `src/lib/services/ai/` — model planner, deterministic fallback, backend tools and chat service.
- `src/lib/services/outlayer.ts` — policy/execution guard boundary.
- `src/lib/services/intents.ts` — NEAR Intents boundary.
- `src/lib/services/payments.ts` — payment-provider boundary.
- `src/lib/services/accounting.ts` — demo ledger/Formance boundary.
- `src/lib/database/store.ts` — in-memory demo repository.
- `prisma/schema.prisma` — relational persistence model.

## API surface

| Area | Routes |
| --- | --- |
| Session/health | `GET /api/session`, `DELETE /api/session`, `GET /api/health` |
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
- The AI receives only the minimum backend context and cannot access keys or sign transactions.
- Demo execution is always marked `simulated: true`.
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

- Demo runtime persistence only; the Prisma repository adapter is not wired.
- No real NEAR Intents quotes, OutLayer attestations, payment settlement or Formance postings.
- No production authentication/KYC provider. The signed demo session is not a login system.
- Webhook verification is scaffolded but provider-specific signature schemes are not live.
- AI replies remain untrusted even with a model configured: plans are always rebuilt from backend data.

These boundaries are surfaced in the UI rather than hidden behind fake “live” states.
