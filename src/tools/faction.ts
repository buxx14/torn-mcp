import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { tornFaction, tornFactionV2, tornUserV2 } from "../torn-api.js";

export function registerFactionTools(server: McpServer, apiKey: string) {
  server.tool(
    "get_faction_basic",
    "Get basic faction info (name, tag, leader, co-leader, members, respect, age). Leave factionId empty for your own faction.",
    { factionId: z.string().optional().describe("Faction ID (omit for your own)") },
    async ({ factionId }) => {
      const data = await tornFaction(apiKey, "basic", factionId);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_faction_chain",
    "Get current chain status (current count, timeout, max, modifier).",
    { factionId: z.string().optional().describe("Faction ID (omit for your own)") },
    async ({ factionId }) => {
      const data = await tornFaction(apiKey, "chain", factionId);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_faction_chains",
    "Get history of faction chains.",
    { factionId: z.string().optional().describe("Faction ID (omit for your own)") },
    async ({ factionId }) => {
      const data = await tornFaction(apiKey, "chains", factionId);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_faction_wars",
    "Get current ranked wars the faction is involved in.",
    { factionId: z.string().optional().describe("Faction ID (omit for your own)") },
    async ({ factionId }) => {
      const data = await tornFaction(apiKey, "rankedwars", factionId);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_faction_territory",
    "Get faction territory data.",
    { factionId: z.string().optional().describe("Faction ID (omit for your own)") },
    async ({ factionId }) => {
      const data = await tornFaction(apiKey, "territory", factionId);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_faction_crimes",
    "Get organized crime data for the faction (requires faction API access).",
    { factionId: z.string().optional().describe("Faction ID (omit for your own)") },
    async ({ factionId }) => {
      const data = await tornFaction(apiKey, "crimes", factionId);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_faction_attacks",
    "Get recent faction attacks.",
    {
      factionId: z.string().optional().describe("Faction ID (omit for your own)"),
      limit: z.string().optional().describe("Max attacks to return"),
    },
    async ({ factionId, limit }) => {
      const extra = limit ? { limit } : undefined;
      const data = await tornFaction(apiKey, "attacks", factionId, extra);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_faction_stats",
    "Get faction stat summary (member count, best chain, respect, etc).",
    { factionId: z.string().optional().describe("Faction ID (omit for your own)") },
    async ({ factionId }) => {
      const data = await tornFaction(apiKey, "stats", factionId);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_faction_upgrades",
    "Get faction upgrades (perks the faction has unlocked).",
    { factionId: z.string().optional().describe("Faction ID (omit for your own)") },
    async ({ factionId }) => {
      const data = await tornFaction(apiKey, "upgrades", factionId);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_faction_contributors",
    "Get faction contributors for various categories (requires AA of your faction).",
    { factionId: z.string().optional().describe("Faction ID (omit for your own)") },
    async ({ factionId }) => {
      const data = await tornFaction(apiKey, "contributors", factionId);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_faction_applications",
    "Get pending faction applications (requires faction API access).",
    {},
    async () => {
      const data = await tornFaction(apiKey, "applications");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_faction_armor_and_weapons",
    "Get faction armory contents (weapons, armor, temporary items).",
    {},
    async () => {
      const data = await tornFaction(apiKey, "weapons,armor,temporary,medical,boosters,drugs");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_faction_donations",
    "Get faction donation data (requires faction API access).",
    {},
    async () => {
      const data = await tornFaction(apiKey, "donations");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_faction_revives",
    "Get recent faction revives.",
    {
      limit: z.string().optional().describe("Max revives to return"),
    },
    async ({ limit }) => {
      const extra = limit ? { limit } : undefined;
      const data = await tornFaction(apiKey, "revives", undefined, extra);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_faction_news",
    "Get faction news feed (main news, armory, funds, attack, member, territory news).",
    {
      newsType: z.enum(["mainnews", "armorynews", "fundsnews", "attacknews", "membershipnews", "territorynews"]).describe("Type of news"),
      limit: z.string().optional().describe("Max news entries to return"),
    },
    async ({ newsType, limit }) => {
      const extra = limit ? { limit } : undefined;
      const data = await tornFaction(apiKey, newsType, undefined, extra);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ── OC 2.0 tools (v2 API) ──

  server.tool(
    "get_faction_crimes_v2",
    "Get OC 2.0 organized crime data for the faction. Use cat='planning' for active/recruiting OCs (scenario names, roles, member assignments, CPR, materials). Use cat='completed' for finished OCs (success/failure, rewards, participants). Requires faction API access.",
    {
      cat: z.enum(["planning", "completed"]).describe("Category: 'planning' for active OCs, 'completed' for finished OCs"),
      offset: z.string().optional().describe("Pagination offset (default 0)"),
    },
    async ({ cat, offset }) => {
      const params: Record<string, string> = { cat };
      if (offset) params.offset = offset;
      const data = await tornFactionV2(apiKey, "crimes", params);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_user_organized_crimes_v2",
    "Get OC 2.0 scenarios with Recruiting status and empty slots available to join. Uses v2 user endpoint with Minimal access key.",
    {},
    async () => {
      const data = await tornUserV2(apiKey, "organizedcrimes");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );
}
