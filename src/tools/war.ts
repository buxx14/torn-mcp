import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { KeyManager } from "../key-manager.js";
import { tornFaction, tornApiV1Call } from "../torn-api.js";
import { tornStatsGet } from "../tornstats-api.js";

export function registerWarTools(server: McpServer, keyManager: KeyManager, tornStatsKey?: string) {

  // ── Ranked War Report ──

  server.tool(
    "get_ranked_war_report",
    "Get the full ranked war report for a specific war — both factions' member-level stats (attacks, respect, score contribution). Get war IDs from get_faction_rankedwars.",
    { warId: z.string().describe("Ranked war ID (from get_faction_rankedwars)") },
    async ({ warId }) => {
      try {
        const data = await tornApiV1Call(keyManager, "faction", "rankedwarreport", warId);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  // ── Last N Wars ──

  server.tool(
    "get_last_n_wars",
    "Convenience tool: gets the last N ranked war reports for a faction. Fetches war IDs then retrieves each report. Returns array of war reports sorted by start time descending.",
    {
      factionId: z.string().optional().describe("Faction ID (omit for your own)"),
      count: z.number().optional().describe("How many wars to retrieve (default 6, max 20)"),
    },
    async ({ factionId, count }) => {
      try {
        const n = Math.min(count ?? 6, 20);

        // Get ranked wars
        const warsData = await tornFaction(keyManager, "rankedwars", factionId);
        const rankedWars = warsData.rankedwars || {};

        // Sort by start time descending and take last N
        const warEntries = Object.entries(rankedWars)
          .map(([id, data]: [string, any]) => ({ id, ...data }))
          .sort((a, b) => (b.war?.start || b.start || 0) - (a.war?.start || a.start || 0))
          .slice(0, n);

        if (warEntries.length === 0) {
          return { content: [{ type: "text", text: "No ranked wars found for this faction." }] };
        }

        // Fetch each war report
        const reports: any[] = [];
        const errors: string[] = [];

        for (const war of warEntries) {
          try {
            const report = await tornApiV1Call(keyManager, "faction", "rankedwarreport", war.id);
            reports.push({ war_id: war.id, ...report });
          } catch (err: any) {
            errors.push(`War ${war.id}: ${err.message}`);
          }
        }

        const result = {
          faction_id: factionId || "own",
          wars_requested: n,
          wars_found: warEntries.length,
          reports,
          errors: errors.length > 0 ? errors : undefined,
        };

        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  // ── War Stats (TornStats) ──

  if (tornStatsKey) {
    server.tool(
      "get_war_stats",
      "Get war stat exchange data from TornStats for a specific war. Returns stat exchange data for both factions' members.",
      { warId: z.string().describe("TornStats war ID") },
      async ({ warId }) => {
        try {
          const data = await tornStatsGet(tornStatsKey, `wars/${warId}`);
          return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        } catch (error: any) {
          return { content: [{ type: "text", text: `TornStats Error: ${error.message}` }], isError: true };
        }
      }
    );
  }
}
