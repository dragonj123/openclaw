import { Type } from "@sinclair/typebox";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { type AdvisorConfig, fastApiUrl } from "../config.js";

/** Generate SKILL.md content — matches voice-agent-backend's generate_skill_md() */
function generateSkillMd(
  name: string,
  description: string,
  instruction: string,
): string {
  return `---
name: ${name}
description: ${description}
---

# ${name}

${instruction}
`;
}

export function registerSkillAuthorTool(
  api: OpenClawPluginApi,
  config: AdvisorConfig,
) {
  const baseUrl = fastApiUrl(config);

  api.registerTool({
    name: "advisor_save_skill",
    label: "Save Skill",
    description:
      "Save a workflow as a reusable skill (SKILL.md). Call this after discussing the workflow details with the advisor. The skill will be available in future conversations.",
    parameters: Type.Object({
      name: Type.String({
        description:
          "Kebab-case skill name, max 5 words (e.g. follow-up-email, weekly-report)",
      }),
      description: Type.String({
        description:
          "1-2 sentence description of when this skill should be triggered",
      }),
      instruction: Type.String({
        description:
          "Clear, step-by-step instructions for the AI to follow. Must be client-agnostic and reusable.",
      }),
    }),
    async execute(_toolCallId, params) {
      const { name, description, instruction } = params as {
        name: string;
        description: string;
        instruction: string;
      };

      try {
        // 1. Generate SKILL.md
        const skillMd = generateSkillMd(name, description, instruction);

        // 2. Write to sandbox workspace
        const skillDir = join("/workspace/skills", name);
        await mkdir(skillDir, { recursive: true });
        await writeFile(join(skillDir, "SKILL.md"), skillMd, "utf-8");

        // 3. Sync to PG via FastAPI
        const resp = await fetch(
          `${baseUrl}/api/internal/workflows/sync-skill`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name,
              description,
              instruction,
              skill_md: skillMd,
              status: "active",
            }),
          },
        );

        const synced = resp.ok;
        if (!synced) {
          api.logger.warn(
            `[voice-agent-advisor] Skill saved locally but PG sync failed: ${await resp.text()}`,
          );
        }

        return {
          content: [
            {
              type: "text" as const,
              text: `Skill "${name}" saved to ${skillDir}/SKILL.md${synced ? " and synced to database" : " (local only — database sync failed)"}. It will be available in future conversations.`,
            },
          ],
          details: { name, path: `${skillDir}/SKILL.md`, synced },
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to save skill: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    },
  });
}
