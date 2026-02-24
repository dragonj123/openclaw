import type { AdvisorConfig } from "../config.js";
import { fastApiUrl, resolveAdvisorId } from "../config.js";
import type { PluginLogger } from "openclaw/plugin-sdk";

/**
 * Returns session_start / session_end hook handlers that notify FastAPI
 * so it can create/archive session records in PostgreSQL.
 */
export function createSessionLifecycleHooks(
  config: AdvisorConfig,
  logger: PluginLogger,
) {
  const baseUrl = fastApiUrl(config);

  const onSessionStart = async (
    _event: unknown,
    ctx: { agentId?: string; sessionKey?: string },
  ) => {
    const agentId = ctx.agentId;
    if (!agentId) return;

    let advisorId: string;
    try {
      advisorId = resolveAdvisorId(agentId);
    } catch {
      return;
    }

    try {
      await fetch(`${baseUrl}/api/internal/sessions/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          advisor_id: advisorId,
          session_key: ctx.sessionKey,
          agent_type: "text",
        }),
      });
    } catch (err) {
      logger.warn(
        `[voice-agent-advisor] session_start notification failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  const onSessionEnd = async (
    _event: unknown,
    ctx: { agentId?: string; sessionKey?: string },
  ) => {
    const agentId = ctx.agentId;
    if (!agentId) return;

    let advisorId: string;
    try {
      advisorId = resolveAdvisorId(agentId);
    } catch {
      return;
    }

    try {
      await fetch(`${baseUrl}/api/internal/sessions/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          advisor_id: advisorId,
          session_key: ctx.sessionKey,
        }),
      });
    } catch (err) {
      logger.warn(
        `[voice-agent-advisor] session_end notification failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  return { onSessionStart, onSessionEnd };
}
