import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { yataSpy, yataFactionSpies } from "../yata-api.js";

export function registerYataTools(server: McpServer, apiKey: string) {
  server.tool(
    "get_spy_data",
    "Get YATA spy data for a specific player (battle stats if available). Requires your faction to have spy data on the target.",
    { targetId: z.string().describe("The target player's ID") },
    async ({ targetId }) => {
      try {
        const data = await yataSpy(apiKey, targetId);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Failed to fetch spy data: ${error instanceof Error ? error.message : String(error)}. The target may not have been spied, or you need to log into yata.yt first.` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "get_faction_spies",
    "Get all spy data your faction has collected (from YATA). Optionally filter by target faction. Rate limited to 1 call/hour.",
    { factionId: z.string().optional().describe("Filter by target faction ID") },
    async ({ factionId }) => {
      try {
        const data = await yataFactionSpies(apiKey, factionId);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Failed to fetch faction spies: ${error instanceof Error ? error.message : String(error)}. This endpoint is rate-limited to 1 call/hour.` }],
          isError: true,
        };
      }
    }
  );
}
