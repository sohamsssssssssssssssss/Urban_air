import { z } from "zod";

/**
 * Zod for client-side code. Our CSP has no 'unsafe-eval'. Zod 4 probes `new Function` when it builds object schemas
 * (to compile a faster parser); Zod catches the failure, but Chrome still logs a Content-Security-Policy issue and
 * Lighthouse's Best Practices score drops. Turning that JIT path off up front avoids the probe, and the slower path
 * is irrelevant for payloads this small. Import `z` from here (not "zod") in anything the browser loads, and import
 * it BEFORE any module that creates schemas.
 */
z.config({ jitless: true });

export { z };
