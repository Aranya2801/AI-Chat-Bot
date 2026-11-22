# Ledgerly Payments API Reference (v3)

## Authentication

All requests are authenticated with a bearer token in the Authorization header. Tokens starting with lk_test_ work only in the sandbox; tokens starting with lk_live_ move real money. Tokens never expire on their own, but they can be revoked from the dashboard at any time. Rotate live tokens at least every 90 days.

## Rate limits

The default limit is 100 requests per second per account in live mode and 25 requests per second in sandbox. When you exceed the limit, the API returns HTTP 429 with a Retry-After header in seconds. Clients should back off exponentially and should not retry more than five times.

## Idempotency

POST requests accept an Idempotency-Key header. If the same key is sent twice within 24 hours, the second request returns the stored result of the first instead of creating a duplicate payment. Keys must be unique per request body; reusing a key with a different body returns error LDG-409.

## Creating a payment

Send POST /v3/payments with an amount in the smallest currency unit (paise for INR, cents for USD), a currency code, and a customer id. The minimum amount is 100 paise. Payments start in the pending state and move to succeeded or failed. A pending payment that is not confirmed within 30 minutes is automatically cancelled.

## Refunds

Refunds are created with POST /v3/refunds. A payment can be refunded partially several times, but the total refunded can never exceed the original amount. Refunds are only possible within 180 days of the original payment. After that, the money has to be returned to the customer outside of Ledgerly.

## Webhooks

Ledgerly sends webhook events such as payment.succeeded, payment.failed and refund.created. Every webhook includes a Ledgerly-Signature header, an HMAC-SHA256 of the raw body using your webhook secret. Always verify the signature before trusting the event. If your endpoint does not return a 2xx status, Ledgerly retries with exponential backoff for up to three days.

## Errors

LDG-401 means the token is missing or invalid.
LDG-402 means the card was declined by the issuing bank. The response includes a decline_reason field.
LDG-409 means an idempotency key was reused with a different request body.
LDG-422 means a field failed validation, for example an amount below the minimum.
LDG-503 means a downstream banking partner is unavailable. These errors are safe to retry.

## Pagination

List endpoints return at most 100 objects per page. Use the starting_after parameter with the id of the last object to fetch the next page. Results are always sorted newest first.
