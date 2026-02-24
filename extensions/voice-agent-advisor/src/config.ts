import { z } from "zod";

export const advisorConfigSchema = z.object({
  /** PostgreSQL connection string for advisor data */
  databaseUrl: z.string(),
  /** Port where FastAPI runs inside the sandbox container */
  fastApiPort: z.number().default(8000),
  /** Base URL override for FastAPI (defaults to http://localhost:{fastApiPort}) */
  fastApiBaseUrl: z.string().optional(),
});

export type AdvisorConfig = z.infer<typeof advisorConfigSchema>;

/** Build the FastAPI base URL from config */
export function fastApiUrl(config: AdvisorConfig): string {
  return (
    config.fastApiBaseUrl || `http://localhost:${config.fastApiPort}`
  );
}

/** Extract advisor UUID from an OpenClaw agentId like "advisor-{uuid}" */
export function resolveAdvisorId(agentId: string): string {
  const match = agentId.match(/^advisor-(.+)$/);
  if (!match) {
    throw new Error(
      `Cannot resolve advisor ID from agentId "${agentId}". Expected format: advisor-{uuid}`,
    );
  }
  return match[1];
}
