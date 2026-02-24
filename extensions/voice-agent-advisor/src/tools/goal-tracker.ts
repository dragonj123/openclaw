import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { type AdvisorConfig, fastApiUrl } from "../config.js";

export function registerGoalTrackerTool(
  api: OpenClawPluginApi,
  config: AdvisorConfig,
) {
  const baseUrl = fastApiUrl(config);

  api.registerTool({
    name: "advisor_goals",
    label: "Goals & Actions",
    description:
      "Manage client goals and action items — list, create, or update goals and action items for a client.",
    parameters: Type.Object({
      action: Type.Union(
        [
          Type.Literal("list"),
          Type.Literal("set_goal"),
          Type.Literal("update_goal"),
          Type.Literal("add_action_item"),
          Type.Literal("complete_action_item"),
        ],
        { description: "Action to perform" },
      ),
      client_id: Type.String({ description: "Client identifier" }),
      goal: Type.Optional(Type.String({ description: "Goal description" })),
      status: Type.Optional(
        Type.String({ description: "New status for the goal" }),
      ),
      item: Type.Optional(
        Type.String({ description: "Action item description" }),
      ),
    }),
    async execute(_toolCallId, params) {
      const { action, client_id, goal, status, item } = params as {
        action: string;
        client_id: string;
        goal?: string;
        status?: string;
        item?: string;
      };

      try {
        const resp = await fetch(`${baseUrl}/api/internal/goals`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, client_id, goal, status, item }),
        });

        if (!resp.ok) {
          const error = await resp.text();
          return {
            content: [
              {
                type: "text" as const,
                text: `Goal tracker failed: ${error}`,
              },
            ],
          };
        }

        const result = await resp.json();
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result, null, 2) },
          ],
          details: result,
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Goal tracker error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    },
  });
}
