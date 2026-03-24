import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { KeyManager } from "../key-manager.js";
import { tornTorn } from "../torn-api.js";

export function registerTornTools(server: McpServer, keyManager: KeyManager) {
  server.tool(
    "get_torn_items",
    "Get the Torn item database. Without an itemId returns all items (names, types, market values). With an itemId returns details for that specific item.",
    { itemId: z.string().optional().describe("Specific item ID (omit for full database)") },
    async ({ itemId }) => {
      try {
        const data = await tornTorn(keyManager, "items", itemId);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  );
}
