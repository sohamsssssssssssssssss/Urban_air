import "server-only";
import { z } from "zod";

// Empty strings in .env files mean "not configured".
const optionalKey = z.preprocess((v) => (v === "" ? undefined : v), z.string().min(8).optional());

const EnvSchema = z.object({
  OPENAQ_API_KEY: optionalKey,
  DATA_GOV_IN_API_KEY: optionalKey,
  GEMINI_API_KEY: optionalKey,
  GEMINI_MODEL: z.string().trim().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

/**
 * Validates server environment variables. Throws at module load (fail fast) if a key is malformed.
 * @param source - environment to read, defaults to `process.env`
 * @returns the typed, validated environment
 */
export function parseEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    const fields = result.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Invalid environment variables: ${fields}`);
  }
  return result.data;
}

export const env = parseEnv();
