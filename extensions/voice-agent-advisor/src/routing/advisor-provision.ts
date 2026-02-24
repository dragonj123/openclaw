import type { GatewayRequestHandlerOptions, OpenClawPluginApi } from "openclaw/plugin-sdk";
import type { AdvisorConfig } from "../config.js";
import { toAgentId } from "./advisor-resolver.js";

/**
 * Register the `advisor.provision` gateway method.
 *
 * Called after an advisor completes onboarding to create their dedicated
 * OpenClaw agent entry with sandbox config.
 */
export function registerAdvisorProvision(
  api: OpenClawPluginApi,
  config: AdvisorConfig,
) {
  api.registerGatewayMethod(
    "advisor.provision",
    async ({ params, respond }: GatewayRequestHandlerOptions) => {
      try {
        const advisorId =
          typeof params?.advisorId === "string"
            ? params.advisorId.trim()
            : "";
        const name =
          typeof params?.name === "string" ? params.name.trim() : "";
        const specialization =
          typeof params?.specialization === "string"
            ? params.specialization.trim()
            : "";

        if (!advisorId || !name) {
          respond(false, { error: "advisorId and name are required" });
          return;
        }

        const agentId = toAgentId(advisorId);

        // The agent config that will be added to agents.list
        const agentConfig = {
          id: agentId,
          name,
          model: "anthropic/claude-sonnet-4-20250514",
          workspace: "/workspace",
          sandbox: {
            mode: "all" as const,
            scope: "agent" as const,
            workspaceAccess: "rw" as const,
            docker: {
              image: "openclaw-sandbox-advisor:latest",
              network: "bridge",
              env: {
                ADVISOR_ID: advisorId,
                DATABASE_URL: "${DATABASE_URL}",
              },
            },
          },
        };

        api.logger.info(
          `[voice-agent-advisor] Provisioned agent "${agentId}" for advisor "${name}" (${specialization})`,
        );

        respond(true, {
          agentId,
          advisorId,
          name,
          specialization,
          config: agentConfig,
          message:
            "Agent config generated. Add to agents.list in your OpenClaw config to activate.",
        });
      } catch (err) {
        respond(false, {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },
  );
}
