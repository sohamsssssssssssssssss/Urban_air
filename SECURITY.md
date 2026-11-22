# Security

## Threat model

| Threat | Impact | Mitigation | Where |
|---|---|---|---|
| **API key leak** | Billing abuse, quota exhaustion | Keys are read only in modules that `import "server-only"` (a build error if a client component imports them). No `NEXT_PUBLIC_` keys. Env is Zod-validated at module load. `.env` is git-ignored; `.env.example` has no values. The browser only ever calls our own `/api/*`, so CSP `connect-src 'self'` is enough. | `src/lib/env.ts`, `src/lib/ai/client.ts`, `next.config.ts` |
| **Prompt injection** (chat) | Model ignores grounding, leaks the prompt, or makes up data | The profile is enums, booleans and numbers only, so there's no free text in advice prompts. Chat text is capped at 500 chars, wrapped in `<user_message>` delimiters (spoofed delimiters are stripped), and the system prompt says to treat it as untrusted. The AQ snapshot is **fetched server-side**, never taken from the client. | `src/lib/ai/prompts.ts`, `src/lib/requests.ts`, `src/app/api/chat/route.ts` |
| **Hallucinated pollution values** | Users act on fake data | The LLM never sees a prompt without a live reading (503 `AQ_UNAVAILABLE` otherwise). Impact numbers come from deterministic code. Advice output is rejected if it has any number that isn't in the grounded context (`ungroundedNumbers`). After 1 retry, it falls back to rule-based advice. | `src/lib/ai/advisor.ts`, `src/lib/ai/grounding.ts` |
| **XSS via model output** | Script execution | Model text is rendered as React text nodes only. There is no `dangerouslySetInnerHTML` and no markdown rendering. CSP, `object-src 'none'`, `base-uri 'self'`. | `src/components/*`, `next.config.ts` |
| **Abuse / cost DoS** | Gemini and upstream quota burn | Per-IP token bucket (20 burst, 20/min) → 429 + `Retry-After`. Bodies over 16 KB are rejected. Advice is cached 15 min and AQ 10 min, with in-flight de-duplication. `maxOutputTokens` is capped. All upstream calls have 5–20 s timeouts. | `src/lib/rateLimit.ts`, `src/lib/http.ts`, `src/lib/cache.ts` |
| **Malformed upstream data** | Crashes, wrong numbers | Every OpenAQ/CPCB response is Zod-validated. The app drops readings with unknown units, readings older than 24 hours and readings with implausible future timestamps. | `src/lib/fetchJson.ts`, `src/lib/aq/*` |
| **Information disclosure** | Stack traces, internals | All errors go through `toErrorResponse`: typed `{code, message}`, generic 500, and no stack traces or upstream messages. | `src/lib/errors.ts` |
| **Clickjacking / sniffing** | UI redress | `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy: geolocation=(self)`, HSTS. | `next.config.ts` |

## Known trade-offs

- Store OpenAQ, data.gov.in and Gemini keys as [Vercel environment variables](https://vercel.com/docs/environment-variables) for Production and Preview. Vercel encrypts them at rest.
- **CSP allows `'unsafe-inline'` scripts.** Next.js injects inline bootstrap scripts. Nonce-based CSP would force every page to render dynamically, which conflicts with the efficiency goal. This is mitigated by the absence of any HTML rendering of untrusted content.
- **The cache and rate limiter are in-memory and per Vercel function instance.** Cold starts clear their state. Cache entries and rate limits are independent across instances.
- **Client IP** comes from the `X-Forwarded-For` header set by Vercel. [Vercel request headers](https://vercel.com/docs/headers/request-headers#x-forwarded-for)

## Supply chain

`npm audit --audit-level=high` runs in CI and currently reports 0 vulnerabilities. A `postcss` override pins a patched version under Next.js.

## Reporting

Please open a private security advisory on the repository.
