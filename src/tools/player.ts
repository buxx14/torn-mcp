import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { KeyManager } from "../key-manager.js";
import { tornUser, tornApiFetch, tornApiV1Call } from "../torn-api.js";

const STAT_CATEGORIES = [
  "attacking", "jobs", "trading", "jail", "hospital", "finishinghits",
  "communication", "criminaloffenses", "bounties", "items", "travel",
  "drugs", "missions", "racing", "networth", "other", "all", "popular",
] as const;

export function registerPlayerTools(server: McpServer, keyManager: KeyManager) {

  // ── Profile ──

  server.tool(
    "get_player_profile",
    "Get a player's profile info (level, status, life, faction, job, etc). Leave playerId empty for yourself.",
    { playerId: z.string().optional().describe("Player ID (omit for yourself)") },
    async ({ playerId }) => {
      try {
        const data = await tornUser(keyManager, "profile", playerId);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  // ── Personal Stats (rewritten with timestamp/stat/cat support) ──

  server.tool(
    "get_player_personal_stats",
    "Get personal stats for a player. Supports historical lookups with timestamp + specific stats, or current values by category. When using timestamp, stats parameter is REQUIRED (max 10 stat names).",
    {
      playerId: z.string().describe("Player ID"),
      category: z.enum(STAT_CATEGORIES).optional().describe("Stat category (e.g. attacking, drugs, items, popular). Cannot use with timestamp."),
      stats: z.string().optional().describe("Comma-separated stat names, max 10 (e.g. 'xantaken,attackswon,refills'). Required when using timestamp."),
      timestamp: z.number().optional().describe("Unix timestamp for historical lookup. Must also provide stats param."),
    },
    async ({ playerId, category, stats, timestamp }) => {
      try {
        const params: Record<string, string | number | undefined> = {};
        if (category) params.cat = category;
        if (stats) params.stat = stats;
        if (timestamp) params.timestamp = timestamp;

        const data = await tornApiFetch(keyManager, `/user/${playerId}/personalstats`, params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  // ── Stats Delta ──

  server.tool(
    "get_player_stats_delta",
    "Compute the change in specific stats for a player over a time period. Makes TWO API calls internally (historical + current) and returns the delta. Essential for activity tracking.",
    {
      playerId: z.string().describe("Player ID"),
      stats: z.string().describe("Comma-separated stat names, max 10 (e.g. 'xantaken,attackswon,refills,itemsdumped')"),
      days_ago: z.number().optional().describe("Days back to compare (default 30)"),
      timestamp_from: z.number().optional().describe("Explicit start Unix timestamp (overrides days_ago)"),
      timestamp_to: z.number().optional().describe("Explicit end Unix timestamp (default: current)"),
    },
    async ({ playerId, stats, days_ago, timestamp_from, timestamp_to }) => {
      try {
        const daysAgo = days_ago ?? 30;
        const fromTs = timestamp_from ?? Math.floor(Date.now() / 1000) - (daysAgo * 86400);
        const statList = stats.split(",").map((s) => s.trim()).slice(0, 10).join(",");

        // Historical snapshot
        const historicalParams: Record<string, string | number | undefined> = {
          stat: statList,
          timestamp: fromTs,
        };
        const historical = await tornApiFetch(keyManager, `/user/${playerId}/personalstats`, historicalParams);

        // Current (or end-point) snapshot
        const currentParams: Record<string, string | number | undefined> = {
          stat: statList,
        };
        if (timestamp_to) currentParams.timestamp = timestamp_to;
        const current = await tornApiFetch(keyManager, `/user/${playerId}/personalstats`, currentParams);

        // Compute deltas
        const statNames = statList.split(",");
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

        const result = {
          player_id: playerId,
          period_days: daysAgo,
          from_timestamp: fromTs,
          to_timestamp: timestamp_to ?? null,
          stats: deltas,
        };

        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  // ── Personal Stats by Category ──

  server.tool(
    "get_player_personal_stats_category",
    "Get all stats in a specific category for a player. Current values only (no timestamp). Use for 'show me all their attacking stats' type queries.",
    {
      playerId: z.string().describe("Player ID"),
      category: z.enum(STAT_CATEGORIES).describe("Stat category"),
    },
    async ({ playerId, category }) => {
      try {
        const data = await tornApiFetch(keyManager, `/user/${playerId}/personalstats`, { cat: category });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  // ── Honors ──

  server.tool(
    "get_player_honors",
    "Get honor bars achieved by a player.",
    { playerId: z.string().describe("Player ID") },
    async ({ playerId }) => {
      try {
        // Try v2 first
        const data = await tornApiFetch(keyManager, `/user/${playerId}/honors`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch {
        try {
          // Fall back to v1
          const data = await tornUser(keyManager, "honors", playerId);
          return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        } catch (error: any) {
          return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
        }
      }
    }
  );

  // ── Hall of Fame ──

  server.tool(
    "get_player_hof",
    "Get a player's Hall of Fame rankings across all categories. HoF rankings for battle stats can indicate relative strength even without spy data.",
    { playerId: z.string().describe("Player ID") },
    async ({ playerId }) => {
      try {
        const data = await tornApiFetch(keyManager, `/user/${playerId}/hof`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  // ── Player Attacks ──

  server.tool(
    "get_player_attacks",
    "Get attack logs for a player with time filtering.",
    {
      playerId: z.string().optional().describe("Player ID (omit for key owner)"),
      from: z.number().optional().describe("Unix timestamp — attacks after this time"),
      to: z.number().optional().describe("Unix timestamp — attacks before this time"),
      limit: z.number().optional().describe("Max results (default 100, max 100)"),
      sort: z.enum(["asc", "desc"]).optional().describe("Sort order (default desc)"),
      filter: z.enum(["incoming", "outgoing"]).optional().describe("Filter by direction"),
    },
    async ({ playerId, from, to, limit, sort, filter }) => {
      try {
        const path = playerId ? `/user/${playerId}/attacks` : "/user/attacks";
        const params: Record<string, string | number | undefined> = {};
        if (from) params.from = from;
        if (to) params.to = to;
        if (limit) params.limit = limit;
        if (sort) params.sort = sort;
        if (filter) params.filter = filter;

        const data = await tornApiFetch(keyManager, path, params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  );
}
