import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { KeyManager } from "../key-manager.js";
import { tornFaction, tornApiFetch } from "../torn-api.js";

export function registerFactionTools(server: McpServer, keyManager: KeyManager) {

  // ── Faction Basic ──

  server.tool(
    "get_faction_basic",
    "Get basic faction info (name, tag, leader, co-leader, members, respect, age, rank, ranked wars). Leave factionId empty for your own faction.",
    { factionId: z.string().optional().describe("Faction ID (omit for your own)") },
    async ({ factionId }) => {
      try {
        const data = await tornFaction(keyManager, "basic", factionId);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  // ── Faction Members (lightweight) ──

  server.tool(
    "get_faction_members",
    "Get ONLY the member list from a faction (lighter than full basic). Returns array of members with id, name, level, days_in_faction, position, last_action, status.",
    { factionId: z.string().optional().describe("Faction ID (omit for your own)") },
    async ({ factionId }) => {
      try {
        const data = await tornFaction(keyManager, "basic", factionId);
        const members = data.members || {};
        const memberList = Object.entries(members).map(([id, info]: [string, any]) => ({
          id,
          name: info.name,
          level: info.level,
          days_in_faction: info.days_in_faction,
          position: info.position,
          last_action: info.last_action,
          status: info.status,
        }));
        return { content: [{ type: "text", text: JSON.stringify(memberList, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  // ── Ranked Wars ──

  server.tool(
    "get_faction_rankedwars",
    "Get all ranked wars for a faction (current and historical). War IDs from this are used with get_ranked_war_report. An end time of 0 means the war is still active.",
    { factionId: z.string().optional().describe("Faction ID (omit for your own)") },
    async ({ factionId }) => {
      try {
        const data = await tornFaction(keyManager, "rankedwars", factionId);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  // ── Chain ──

  server.tool(
    "get_faction_chain",
    "Get current chain status (current count, timeout, max, modifier).",
    { factionId: z.string().optional().describe("Faction ID (omit for your own)") },
    async ({ factionId }) => {
      try {
        const data = await tornFaction(keyManager, "chain", factionId);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  // ── Contributors ──

  server.tool(
    "get_faction_contributors",
    "Get faction contributors for a specific category (requires AA key for your own faction).",
    {
      cat: z.string().describe("Category (e.g. 'money', 'respect', 'gym')"),
      factionId: z.string().optional().describe("Faction ID (omit for your own)"),
    },
    async ({ cat, factionId }) => {
      try {
        const extra: Record<string, string> = {};
        if (cat) extra.stat = cat;
        const data = await tornFaction(keyManager, "contributors", factionId, extra);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  // ── Faction Stats ──

  server.tool(
    "get_faction_stats",
    "Get faction stat summary (member count, best chain, respect, etc).",
    { factionId: z.string().optional().describe("Faction ID (omit for your own)") },
    async ({ factionId }) => {
      try {
        const data = await tornFaction(keyManager, "stats", factionId);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  // ── Faction Attacks (with time filtering) ──

  server.tool(
    "get_faction_attacks",
    "Get faction attack logs with time filtering. Requires AA key.",
    {
      from: z.number().optional().describe("Unix timestamp — attacks after this time"),
      to: z.number().optional().describe("Unix timestamp — attacks before this time"),
      limit: z.number().optional().describe("Max results (default 100, max 100)"),
      sort: z.enum(["asc", "desc"]).optional().describe("Sort order (default desc)"),
    },
    async ({ from, to, limit, sort }) => {
      try {
        const params: Record<string, string | number | undefined> = {};
        if (from) params.from = from;
        if (to) params.to = to;
        if (limit) params.limit = limit;
        if (sort) params.sort = sort;

        const data = await tornApiFetch(keyManager, "/faction/attacks", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  // ── Faction Attacks Full (higher limit, less detail) ──

  server.tool(
    "get_faction_attacksfull",
    "Get simplified faction attack logs with higher limit (up to 1000). Less detail per entry than get_faction_attacks.",
    {
      from: z.number().optional().describe("Unix timestamp — attacks after this time"),
      to: z.number().optional().describe("Unix timestamp — attacks before this time"),
      limit: z.number().optional().describe("Max results (default 1000, max 1000)"),
      sort: z.enum(["asc", "desc"]).optional().describe("Sort order (default desc)"),
    },
    async ({ from, to, limit, sort }) => {
      try {
        const params: Record<string, string | number | undefined> = {};
        if (from) params.from = from;
        if (to) params.to = to;
        if (limit) params.limit = limit;
        if (sort) params.sort = sort;

        const data = await tornApiFetch(keyManager, "/faction/attacksfull", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  // ── OC 2.0 (kept as-is, using v2 API) ──

  server.tool(
    "get_faction_crimes_v2",
    "Get OC 2.0 organized crime data for the faction. Use cat='planning' for active/recruiting OCs (scenario names, roles, member assignments, CPR, materials). Use cat='completed' for finished OCs (success/failure, rewards, participants). Requires faction API access.",
    {
      cat: z.enum(["planning", "completed"]).describe("Category: 'planning' for active OCs, 'completed' for finished OCs"),
      offset: z.string().optional().describe("Pagination offset (default 0)"),
    },
    async ({ cat, offset }) => {
      try {
        const params: Record<string, string> = { cat };
        if (offset) params.offset = offset;
        const data = await tornApiFetch(keyManager, "/faction/crimes", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  server.tool(
    "get_user_organized_crimes_v2",
    "Get OC 2.0 scenarios with Recruiting status and empty slots available to join. Uses v2 user endpoint.",
    {},
    async () => {
      try {
        const data = await tornApiFetch(keyManager, "/user", { selections: "organizedcrimes" });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  // ── Faction Stats Sweep — added in Phase 5 (see below in this file) ──
  // The get_faction_stats_sweep tool is registered at the bottom of this function.

  server.tool(
    "get_faction_stats_sweep",
    "Iterate over ALL members of a faction and pull specific stats (current + historical) to compute deltas. This is the faction-wide activity report tool. Takes 1-3 minutes depending on faction size and number of API keys. Max 10 stat names.",
    {
      factionId: z.string().optional().describe("Faction ID (omit for your own)"),
      stats: z.string().describe("Comma-separated stat names, max 10 (e.g. 'xantaken,attackswon,refills,itemsdumped,missionscompleted')"),
      days_ago: z.number().optional().describe("Days back to compare (default 30)"),
      timestamp_from: z.number().optional().describe("Explicit start Unix timestamp (overrides days_ago)"),
    },
    async ({ factionId, stats, days_ago, timestamp_from }) => {
      try {
        const daysAgo = days_ago ?? 30;
        const fromTs = timestamp_from ?? Math.floor(Date.now() / 1000) - (daysAgo * 86400);
        const statList = stats.split(",").map((s) => s.trim()).slice(0, 10).join(",");
        const statNames = statList.split(",");

        // Step 1: Get roster
        const faction = await tornFaction(keyManager, "basic", factionId);
        const members = faction.members || {};
        const memberIds = Object.keys(members);

        const results: any[] = [];
        const errors: string[] = [];
        let apiCalls = 1; // roster call

        // Step 2: Loop through every member
        for (let i = 0; i < memberIds.length; i++) {
          const pid = memberIds[i];
          const member = members[pid];

          try {
            // Historical snapshot
            const historical = await tornApiFetch(keyManager, `/user/${pid}/personalstats`, {
              stat: statList,
              timestamp: fromTs,
            });
            apiCalls++;

            // Current snapshot
            const current = await tornApiFetch(keyManager, `/user/${pid}/personalstats`, {
              stat: statList,
            });
            apiCalls++;

            // Compute deltas
            const deltas: Record<string, any> = {};
            for (const statName of statNames) {
              const fromVal = historical?.personalstats?.[statName] ?? null;
              const toVal = current?.personalstats?.[statName] ?? null;
              const delta = fromVal !== null && toVal !== null ? toVal - fromVal : null;
              deltas[statName] = {
                from: fromVal,
                to: toVal,
                delta,
                per_day: delta !== null ? Math.round((delta / daysAgo) * 100) / 100 : null,
              };
            }

            results.push({
              id: pid,
              name: member.name,
              level: member.level,
              days_in_faction: member.days_in_faction,
              stats: deltas,
            });
          } catch (err: any) {
            errors.push(`${member.name} [${pid}]: ${err.message}`);
          }
        }

        const result = {
          faction_id: faction.ID || factionId || "own",
          faction_name: faction.name,
          member_count: memberIds.length,
          period_days: daysAgo,
          from_timestamp: fromTs,
          members: results,
          processed: results.length,
          api_calls_made: apiCalls,
          errors,
        };

        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  );
}
