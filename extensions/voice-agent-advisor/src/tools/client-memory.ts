import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { type AdvisorConfig, fastApiUrl } from "../config.js";

export function registerClientMemoryTool(
  api: OpenClawPluginApi,
  config: AdvisorConfig,
) {
  const baseUrl = fastApiUrl(config);

  api.registerTool({
    name: "advisor_client_memory",
    label: "Client Memory",
    description:
      "Look up a client's history — past session summaries, background, goals, action items, and preferences. Use this to personalize advice.",
    parameters: Type.Object({
      client_id: Type.String({
        description: "Client identifier (name or ID)",
      }),
      query: Type.Optional(
        Type.String({
          description: "Optional search query to filter client history",
        }),
      ),
    }),
    async execute(_toolCallId, params) {
      const { client_id, query } = params as {
        client_id: string;
        query?: string;
      };

      try {
        const url = new URL(
          `${baseUrl}/api/internal/memory/client/${encodeURIComponent(client_id)}`,
        );
        if (query) url.searchParams.set("query", query);

        const resp = await fetch(url.toString());

        if (!resp.ok) {
          const error = await resp.text();
          return {
            content: [
              {
                type: "text" as const,
                text: `Client memory lookup failed: ${error}`,
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
              text: `Client memory error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    },
  });
}
