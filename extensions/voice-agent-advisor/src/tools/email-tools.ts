import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { type AdvisorConfig, fastApiUrl } from "../config.js";

export function registerEmailTools(
  api: OpenClawPluginApi,
  config: AdvisorConfig,
) {
  const baseUrl = fastApiUrl(config);

  // --- Email Search ---
  api.registerTool({
    name: "advisor_email_search",
    label: "Email Search",
    description:
      "Search the advisor's synced emails. Returns classified work emails with subjects, senders, and AI summaries.",
    parameters: Type.Object({
      query: Type.Optional(
        Type.String({ description: "Search query for email content" }),
      ),
      client_name: Type.Optional(
        Type.String({ description: "Filter emails by client name" }),
      ),
      limit: Type.Optional(
        Type.Number({ description: "Max results", default: 10 }),
      ),
    }),
    async execute(_toolCallId, params) {
      const { query, client_name, limit } = params as {
        query?: string;
        client_name?: string;
        limit?: number;
      };

      try {
        const url = new URL(`${baseUrl}/api/internal/emails`);
        if (query) url.searchParams.set("query", query);
        if (client_name) url.searchParams.set("client_name", client_name);
        if (limit) url.searchParams.set("limit", String(limit));

        const resp = await fetch(url.toString());

        if (!resp.ok) {
          const error = await resp.text();
          return {
            content: [
              {
                type: "text" as const,
                text: `Email search failed: ${error}`,
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
              text: `Email search error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    },
  });

  // --- Email Draft ---
  api.registerTool({
    name: "advisor_email_draft",
    label: "Email Draft",
    description:
      "Draft an email reply in the advisor's voice and style. Returns the draft text for review.",
    parameters: Type.Object({
      email_id: Type.String({
        description: "ID of the email to reply to",
      }),
      instruction: Type.Optional(
        Type.String({
          description:
            "Additional instructions for the reply (e.g. tone, key points to address)",
        }),
      ),
    }),
    async execute(_toolCallId, params) {
      const { email_id, instruction } = params as {
        email_id: string;
        instruction?: string;
      };

      try {
        const resp = await fetch(`${baseUrl}/api/internal/emails/draft`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email_id, instruction }),
        });

        if (!resp.ok) {
          const error = await resp.text();
          return {
            content: [
              {
                type: "text" as const,
                text: `Email draft failed: ${error}`,
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
              text: `Email draft error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    },
  });
}
