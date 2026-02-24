import type { AdvisorConfig } from "../config.js";
import { fastApiUrl, resolveAdvisorId } from "../config.js";

type CloneProfile = {
  communication_style?: string;
  headline?: string;
  core_expertise?: string[];
  signature_phrases?: string[];
  keyterms?: string[];
  language_preferences?: string;
};

type AdvisorProfile = {
  name: string;
  specialization: string;
  clone_profile: CloneProfile | null;
  custom_taxonomy: Record<string, string[]> | null;
};

function formatCloneProfile(profile: CloneProfile): string {
  const parts: string[] = [];

  if (profile.headline) {
    parts.push(`**Headline:** ${profile.headline}`);
  }
  if (profile.communication_style) {
    parts.push(`**Communication style:** ${profile.communication_style}`);
  }
  if (profile.core_expertise?.length) {
    parts.push(
      `**Core expertise:** ${profile.core_expertise.join(", ")}`,
    );
  }
  if (profile.signature_phrases?.length) {
    parts.push(
      `**Signature phrases:** ${profile.signature_phrases.map((p) => `"${p}"`).join(", ")}`,
    );
  }
  if (profile.language_preferences) {
    parts.push(
      `**Preferred language:** ${profile.language_preferences}`,
    );
  }

  return parts.join("\n");
}

/**
 * Returns a before_prompt_build hook handler that injects the advisor's
 * identity and communication style into the system prompt.
 */
export function injectAdvisorContext(config: AdvisorConfig) {
  const baseUrl = fastApiUrl(config);

  // Simple in-memory cache to avoid hitting FastAPI every turn
  const cache = new Map<
    string,
    { profile: AdvisorProfile; fetchedAt: number }
  >();
  const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  return async (event: { prompt?: string }, ctx: { agentId?: string }) => {
    const agentId = ctx.agentId;
    if (!agentId) return;

    let advisorId: string;
    try {
      advisorId = resolveAdvisorId(agentId);
    } catch {
      // Not an advisor agent — skip
      return;
    }

    // Check cache
    const cached = cache.get(advisorId);
    const now = Date.now();
    let profile: AdvisorProfile;

    if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
      profile = cached.profile;
    } else {
      try {
        const resp = await fetch(
          `${baseUrl}/api/internal/advisors/${advisorId}/profile`,
        );
        if (!resp.ok) return;
        profile = (await resp.json()) as AdvisorProfile;
        cache.set(advisorId, { profile, fetchedAt: now });
      } catch {
        // FastAPI not ready yet — skip silently
        return;
      }
    }

    const cloneSection = profile.clone_profile
      ? formatCloneProfile(profile.clone_profile)
      : "";

    const taxonomySection =
      profile.custom_taxonomy
        ? `**Knowledge categories:** ${Object.keys(profile.custom_taxonomy).join(", ")}`
        : "";

    return {
      prependContext: `## Your Identity

You are an AI clone of ${profile.name}, a ${profile.specialization} advisor.
${cloneSection}
${taxonomySection}

## Instructions

- Always search your knowledge base (advisor_knowledge_search) before answering domain-specific questions.
- Use client memory (advisor_client_memory) to personalize advice with their history and goals.
- Speak in the advisor's voice, style, and preferred language.
- When the advisor wants to create a reusable workflow, help them define it and then call advisor_save_skill.
`,
    };
  };
}
