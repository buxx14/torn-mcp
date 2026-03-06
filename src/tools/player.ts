import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { tornUser } from "../torn-api.js";

export function registerPlayerTools(server: McpServer, apiKey: string) {
  server.tool(
    "get_player_profile",
    "Get a player's profile info (level, status, life, faction, job, etc). Leave playerId empty for yourself.",
    { playerId: z.string().optional().describe("Player ID (omit for yourself)") },
    async ({ playerId }) => {
      const data = await tornUser(apiKey, "profile", playerId);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_player_battle_stats",
    "Get your battle stats (strength, speed, dexterity, defense). Only works for your own key.",
    {},
    async () => {
      const data = await tornUser(apiKey, "battlestats");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_player_bars",
    "Get your current bars (energy, nerve, happy, life, chain) and their maximums.",
    {},
    async () => {
      const data = await tornUser(apiKey, "bars");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_player_cooldowns",
    "Get your current cooldowns (drug, booster, medical).",
    {},
    async () => {
      const data = await tornUser(apiKey, "cooldowns");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_player_travel",
    "Get your current travel status (destination, departure, arrival times).",
    {},
    async () => {
      const data = await tornUser(apiKey, "travel");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_player_inventory",
    "Get your inventory (all items you're carrying).",
    {},
    async () => {
      const data = await tornUser(apiKey, "inventory");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_player_money",
    "Get your money (wallet, vault, bank, company vault, etc).",
    {},
    async () => {
      const data = await tornUser(apiKey, "money");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_player_networth",
    "Get a detailed breakdown of your networth by category.",
    {},
    async () => {
      const data = await tornUser(apiKey, "networth");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_player_events",
    "Get your recent events/notifications.",
    { limit: z.string().optional().describe("Max events to return (default 25)") },
    async ({ limit }) => {
      const extra = limit ? { limit } : undefined;
      const data = await tornUser(apiKey, "events", undefined, extra);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_player_attacks",
    "Get your recent attacks.",
    { limit: z.string().optional().describe("Max attacks to return") },
    async ({ limit }) => {
      const extra = limit ? { limit } : undefined;
      const data = await tornUser(apiKey, "attacks", undefined, extra);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_player_personal_stats",
    "Get personal stats for yourself or another player (xanax used, attacks won, etc.). Leave playerId empty for yourself. Note: querying other players returns only publicly visible stats.",
    { playerId: z.string().optional().describe("Player ID (omit for yourself)") },
    async ({ playerId }) => {
      try {
        const data = await tornUser(apiKey, "personalstats", playerId);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  server.tool(
    "get_player_skills",
    "Get your current skill levels (racing, reviving, etc).",
    {},
    async () => {
      const data = await tornUser(apiKey, "skills");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_player_education",
    "Get your education status and completed courses.",
    {},
    async () => {
      const data = await tornUser(apiKey, "education");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_player_crimes",
    "Get your organized crime participation data.",
    {},
    async () => {
      const data = await tornUser(apiKey, "crimes");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_player_perks",
    "Get all your active perks (job, faction, book, education, merit, stock).",
    {},
    async () => {
      const data = await tornUser(apiKey, "perks");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_player_equipment",
    "Get your equipped items (weapons, armor, temporary items).",
    {},
    async () => {
      const data = await tornUser(apiKey, "equipment");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_player_ammo",
    "Get your ammunition inventory.",
    {},
    async () => {
      const data = await tornUser(apiKey, "ammo");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_player_honors",
    "Get honors you've earned and those available.",
    { playerId: z.string().optional().describe("Player ID (omit for yourself)") },
    async ({ playerId }) => {
      const data = await tornUser(apiKey, "honors", playerId);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_player_medals",
    "Get medals you've earned and those available.",
    { playerId: z.string().optional().describe("Player ID (omit for yourself)") },
    async ({ playerId }) => {
      const data = await tornUser(apiKey, "medals", playerId);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_player_properties",
    "Get your properties (houses, etc).",
    {},
    async () => {
      const data = await tornUser(apiKey, "properties");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_player_stocks",
    "Get your stock portfolio (owned stocks and dividends).",
    {},
    async () => {
      const data = await tornUser(apiKey, "stocks");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_player_bazaar",
    "Get items listed in a player's bazaar. Leave playerId empty for yourself.",
    { playerId: z.string().optional().describe("Player ID (omit for yourself)") },
    async ({ playerId }) => {
      const data = await tornUser(apiKey, "bazaar", playerId);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_player_messages",
    "Get your recent messages.",
    { limit: z.string().optional().describe("Max messages to return") },
    async ({ limit }) => {
      const extra = limit ? { limit } : undefined;
      const data = await tornUser(apiKey, "messages", undefined, extra);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_player_notifications",
    "Get counts of unread notifications, messages, and events.",
    {},
    async () => {
      const data = await tornUser(apiKey, "notifications");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );
}
