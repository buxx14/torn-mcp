import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { tornMarket, tornTorn } from "../torn-api.js";
import { yataForeignStocks } from "../yata-api.js";

export function registerMarketTools(server: McpServer, apiKey: string) {
  server.tool(
    "get_item_market",
    "Get item market listings for a specific item (cheapest listings across all bazaars).",
    { itemId: z.string().describe("The item ID to look up") },
    async ({ itemId }) => {
      const data = await tornMarket(apiKey, "itemmarket", itemId);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_bazaar_listings",
    "Get bazaar listings for a specific item.",
    { itemId: z.string().describe("The item ID to look up") },
    async ({ itemId }) => {
      const data = await tornMarket(apiKey, "bazaar", itemId);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_points_market",
    "Get current points market listings (price per point).",
    {},
    async () => {
      const data = await tornMarket(apiKey, "pointsmarket");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_torn_items",
    "Get the full Torn item database (all items with names, types, market values, etc). Useful for looking up item IDs by name.",
    {},
    async () => {
      const data = await tornTorn(apiKey, "items");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_torn_item_details",
    "Get details for a specific item from the Torn database.",
    { itemId: z.string().describe("The item ID") },
    async ({ itemId }) => {
      const data = await tornTorn(apiKey, "items", itemId);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_torn_stocks",
    "Get all stock market data (stock prices, dividends, available shares).",
    {},
    async () => {
      const data = await tornTorn(apiKey, "stocks");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_torn_stock_details",
    "Get details for a specific stock.",
    { stockId: z.string().describe("The stock ID") },
    async ({ stockId }) => {
      const data = await tornTorn(apiKey, "stocks", stockId);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_torn_bank_rates",
    "Get current Torn City bank interest rates for all time periods.",
    {},
    async () => {
      const data = await tornTorn(apiKey, "bank");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_torn_pawnshop",
    "Get current pawnshop prices (what the pawnshop will pay for items).",
    {},
    async () => {
      const data = await tornTorn(apiKey, "pawnshop");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_foreign_stocks",
    "Get current foreign country stock levels from YATA (crowdsourced data showing item availability in travel destinations).",
    {},
    async () => {
      try {
        const data = await yataForeignStocks(apiKey);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Failed to fetch YATA foreign stocks: ${error instanceof Error ? error.message : String(error)}. Make sure you've logged into yata.yt at least once.` }],
          isError: true,
        };
      }
    }
  );
}
