import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { tornStatsFactionCPR } from "../tornstats-api.js";

export function registerTornStatsTools(server: McpServer, tornStatsKey: string) {
  server.tool(
    "get_faction_cpr",
    "Get CPR (Checkpoint Pass Rate) values for all faction members across all OC 2.0 scenarios and roles from TornStats. Returns each member's CPR percentage per crime scenario (Break the Bank, Blast From the Past, etc.) and role (Muscle, Thief, Hacker, etc.). Essential for determining Carry/Core/Recon assignments.",
    {},
    async () => {
      try {
        const data = await tornStatsFactionCPR(tornStatsKey);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `TornStats CPR Error: ${error.message}` }],
          isError: true,
        };
      }
    }
  );
}
