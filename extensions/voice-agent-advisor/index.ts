import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { advisorConfigSchema, type AdvisorConfig } from "./src/config.js";

// Tools
import { registerKnowledgeSearchTool } from "./src/tools/knowledge-search.js";
import { registerClientMemoryTool } from "./src/tools/client-memory.js";
import { registerCrmQueryTool } from "./src/tools/crm-query.js";
import { registerEmailTools } from "./src/tools/email-tools.js";
import { registerGoalTrackerTool } from "./src/tools/goal-tracker.js";
import { registerSkillAuthorTool } from "./src/tools/skill-author.js";

// Hooks
import { injectAdvisorContext } from "./src/hooks/advisor-context.js";
import { createSessionLifecycleHooks } from "./src/hooks/session-lifecycle.js";

// Routing
import { registerAdvisorProvision } from "./src/routing/advisor-provision.js";

const voiceAgentAdvisorPlugin = {
  id: "voice-agent-advisor",
  name: "Voice Agent Advisor",
  description:
    "Advisor sandbox platform — each advisor gets an isolated sandbox with text agent (Claude), voice agent (LiveKit), and custom skills.",

  configSchema: {
    parse(value: unknown): AdvisorConfig {
      return advisorConfigSchema.parse(value);
    },
    uiHints: {
      databaseUrl: {
        label: "Database URL",
        help: "PostgreSQL connection string (e.g. postgresql://user:pass@host:5432/db)",
        sensitive: true,
      },
      fastApiPort: {
        label: "FastAPI Port",
        help: "Port where the Python FastAPI server runs inside the sandbox (default: 8000)",
      },
    },
  },

  register(api: OpenClawPluginApi) {
    // Parse and validate config
    const config = advisorConfigSchema.parse(api.pluginConfig ?? {});

    api.logger.info("[voice-agent-advisor] Registering plugin...");

    // --- Tools ---
    // Each tool proxies requests to the FastAPI server running inside the sandbox
    registerKnowledgeSearchTool(api, config);
    registerClientMemoryTool(api, config);
    registerCrmQueryTool(api, config);
    registerEmailTools(api, config);
    registerGoalTrackerTool(api, config);
    registerSkillAuthorTool(api, config);

    // --- Hooks ---
    // Inject advisor identity into system prompt
    api.on("before_prompt_build", injectAdvisorContext(config));

    // Track session lifecycle in PG
    const { onSessionStart, onSessionEnd } = createSessionLifecycleHooks(
      config,
      api.logger,
    );
    api.on("session_start", onSessionStart);
    api.on("session_end", onSessionEnd);

    // --- Gateway Methods ---
    // Provision new advisor agents
    registerAdvisorProvision(api, config);

    api.logger.info(
      "[voice-agent-advisor] Plugin registered — 7 tools, 3 hooks, 1 gateway method",
    );
  },
};

export default voiceAgentAdvisorPlugin;
