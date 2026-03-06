import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { tornTorn, tornCompany, tornKey } from "../torn-api.js";

export function registerTornTools(server: McpServer, apiKey: string) {
  server.tool(
    "get_torn_stats",
    "Get global Torn statistics (total users, online, attacks, etc).",
    {},
    async () => {
      const data = await tornTorn(apiKey, "stats");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_torn_education",
    "Get all available education courses and their details.",
    {},
    async () => {
      const data = await tornTorn(apiKey, "education");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_torn_honors",
    "Get all available honors and their requirements.",
    {},
    async () => {
      const data = await tornTorn(apiKey, "honors");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_torn_medals",
    "Get all available medals and their requirements.",
    {},
    async () => {
      const data = await tornTorn(apiKey, "medals");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_torn_properties",
    "Get all property types available in Torn.",
    {},
    async () => {
      const data = await tornTorn(apiKey, "properties");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_company_details",
    "Get details about a specific company.",
    { companyId: z.string().describe("The company ID") },
    async ({ companyId }) => {
      const data = await tornCompany(apiKey, "profile", companyId);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_company_employees",
    "Get employees of a specific company.",
    { companyId: z.string().describe("The company ID") },
    async ({ companyId }) => {
      const data = await tornCompany(apiKey, "employees", companyId);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_my_company",
    "Get your own company profile and details.",
    {},
    async () => {
      const data = await tornCompany(apiKey, "profile");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_all_companies",
    "Get a list of all company types in Torn.",
    {},
    async () => {
      const data = await tornCompany(apiKey, "companies");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_api_key_info",
    "Get info about the current API key (access level, selections available).",
    {},
    async () => {
      const data = await tornKey(apiKey, "info");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );
}
