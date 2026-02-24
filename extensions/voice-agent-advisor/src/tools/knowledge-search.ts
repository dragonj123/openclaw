import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { type AdvisorConfig, fastApiUrl, resolveAdvisorId } from "../config.js";

export function registerKnowledgeSearchTool(
  api: OpenClawPluginApi,
  config: AdvisorConfig,
) {
  const baseUrl = fastApiUrl(config);

  api.registerTool({
    name: "advisor_knowledge_search",
    label: "Knowledge Search",
    description:
      "Search the advisor's expert knowledge base for frameworks, methodologies, insights, and domain expertise. Use this before answering any domain-specific question.",
    parameters: Type.Object({
      query: Type.String({ description: "Natural language search query" }),
      top_k: Type.Optional(
        Type.Number({
          description: "Number of results to return",
          default: 5,
        }),
      ),
      category: Type.Optional(
        Type.String({
          description:
            "Filter by knowledge category (e.g. fact, insight, decision_trace)",
        }),
      ),
    }),
    async execute(_toolCallId, params) {
      const { query, top_k, category } = params as {
        query: string;
        top_k?: number;
        category?: string;
      };

      try {
        const resp = await fetch(`${baseUrl}/api/internal/memory/search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            top_k: top_k ?? 5,
            ...(category && { category }),
          }),
        });

        if (!resp.ok) {
          const error = await resp.text();
          return {
            content: [
              {
                type: "text" as const,
                text: `Knowledge search failed: ${error}`,
              },
            ],
          };
        }

        const results = await resp.json();
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(results, null, 2) },
          ],
          details: results,
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Knowledge search error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    },
  });
}
