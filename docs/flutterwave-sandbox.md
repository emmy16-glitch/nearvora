# Flutterwave sandbox integration

Nearvora's Flutterwave integration is intentionally test-mode only. It supports sandbox bill catalog lookup and customer validation, bank account resolution, one-off bank-transfer charge creation, test payouts, bill payments, and transaction verification at the client layer. It is not a live-money integration.

## Configure the sandbox

In Vercel, add `FLUTTERWAVE_TEST_SECRET_KEY` as a server-side environment variable for the deployment environment. Use a Flutterwave **test** secret beginning `FLWSECK_TEST-`; the server rejects any other key. Do not use a `NEXT_PUBLIC_` variable, commit the key, or paste it in chat. Redeploy after changing environment variables. The screens show a setup error when the key is missing or invalid rather than silently substituting a demo provider result.

## App flows

- **Deposit** creates a one-time Flutterwave sandbox bank-transfer charge and displays the provider's returned bank details, amount, expiry and reference. It does not create a Nearvora deposit transaction or credit any wallet.
- **Withdraw** loads Flutterwave's current NG bank list, resolves the account name, and requires an explicit confirmation immediately before requesting a sandbox payout. The server resolves the account again before payout submission.
- **Bills** loads categories, billers and service items from Flutterwave, validates customer identifiers where supported, requires confirmation, and checks bill items and fixed-price amounts server-side before payment.

The API is `GET` and `POST /api/payments/flutterwave`. GET `resource` values are `status`, `banks`, `categories`, `billers` (with `categoryCode`) and `items` (with `billerCode`). POST `operation` values are `resolve_account`, `create_deposit`, `payout`, `validate_bill` and `bill_payment`. Requests are protected by the current app session and same-origin checks for writes. The current app session is demo authentication, not production user authentication.

## Important limits

Sandbox operations are not saved to the database, activity feed, or accounting ledger. Nearvora does not process Flutterwave webhooks or reconcile eventual status changes. Provider references are sent with outgoing requests, but Nearvora does not persist an idempotency record. Transaction-creating calls are not automatically retried after errors/timeouts; check provider status before manually resubmitting an operation that may have reached Flutterwave.

The main app still has demo balances and other simulated features. The Flutterwave sandbox pages do not use those balances, and sandbox results do not update them. Do not enable live keys or use these screens for customer funds. Real-money launch needs durable storage and accounting, production authentication, idempotent webhook processing, reconciliation, approved production credentials, and legal/compliance review.

## Official Flutterwave v3 references

- [Get all banks](https://developer.flutterwave.com/reference/get-all-banks)
- [Get supported bill categories](https://developer.flutterwave.com/reference/get-supported-bill-categories)
- [Get biller information](https://developer.flutterwave.com/reference/get-biller-information)
- [Get bill information](https://developer.flutterwave.com/reference/get-bill-information)
- [Validate customer details](https://developer.flutterwave.com/reference/validate-bill-service)
- [Resolve bank account](https://developer.flutterwave.com/reference/resolve-account-transfer-details)
- [Create bill payment](https://developer.flutterwave.com/reference/create-a-bill-payment)
- [Nigerian bank transfers](https://developer.flutterwave.com/docs/nigerian-bank-account-transfer)
- [Webhooks](https://developer.flutterwave.com/docs/webhooks)
