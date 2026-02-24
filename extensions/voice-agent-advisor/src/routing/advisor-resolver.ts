import { resolveAdvisorId } from "../config.js";

/**
 * Check whether an agentId belongs to an advisor agent.
 */
export function isAdvisorAgent(agentId: string): boolean {
  return agentId.startsWith("advisor-");
}

/**
 * Build an OpenClaw agentId from an advisor UUID.
 */
export function toAgentId(advisorId: string): string {
  return `advisor-${advisorId}`;
}

export { resolveAdvisorId };
