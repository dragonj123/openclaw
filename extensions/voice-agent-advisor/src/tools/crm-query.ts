import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { type AdvisorConfig, fastApiUrl } from "../config.js";

export function registerCrmQueryTool(
  api: OpenClawPluginApi,
  config: AdvisorConfig,
) {
  const baseUrl = fastApiUrl(config);

  api.registerTool({
    name: "advisor_crm_query",
    label: "CRM Query",
    description:
      "Query CRM records — client relationship data, meeting insights, deal pipeline, and interaction history.",
    parameters: Type.Object({
      client_name: Type.Optional(
        Type.String({ description: "Filter by client name" }),
      ),
      record_id: Type.Optional(
        Type.String({ description: "Fetch a specific CRM record by ID" }),
      ),
      limit: Type.Optional(
        Type.Number({ description: "Max records to return", default: 10 }),
      ),
    }),
    async execute(_toolCallId, params) {
      const { client_name, record_id, limit } = params as {
        client_name?: string;
        record_id?: string;
        limit?: number;
      };

      try {
        const url = new URL(`${baseUrl}/api/internal/crm`);
        if (client_name) url.searchParams.set("client_name", client_name);
        if (record_id) url.searchParams.set("record_id", record_id);
        if (limit) url.searchParams.set("limit", String(limit));

        const resp = await fetch(url.toString());

        if (!resp.ok) {
          const error = await resp.text();
          return {
            content: [
              { type: "text" as const, text: `CRM query failed: ${error}` },
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
              text: `CRM query error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    },
  });
}
