import "dotenv/config";
import { randomUUID } from "crypto";
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { registerPlayerTools } from "./tools/player.js";
import { registerFactionTools } from "./tools/faction.js";
import { registerMarketTools } from "./tools/market.js";
import { registerYataTools } from "./tools/yata.js";
import { registerTornTools } from "./tools/torn.js";
import { registerTornStatsTools } from "./tools/tornstats.js";

const apiKey = process.env.TORN_API_KEY;
const tornStatsKey = process.env.TORNSTATS_API_KEY;

if (!apiKey) {
  console.error("ERROR: TORN_API_KEY environment variable is required.");
  console.error("Set it in a .env file or pass it as an environment variable.");
  process.exit(1);
}

function createServer(key: string): McpServer {
  const server = new McpServer({
    name: "torn-mcp",
    version: "1.0.0",
    description: "MCP server for Torn.com - access player data, faction info, market data, and YATA tools",
  });

  registerPlayerTools(server, key);
  registerFactionTools(server, key);
  registerMarketTools(server, key);
  registerYataTools(server, key);
  registerTornTools(server, key);
  if (tornStatsKey) {
    registerTornStatsTools(server, tornStatsKey);
  }

  return server;
}

// Determine transport mode: HTTP if PORT is set (Railway), otherwise stdio (local)
const mode = process.env.PORT ? "http" : "stdio";

async function main() {
  if (mode === "stdio") {
    const server = createServer(apiKey!);
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Torn MCP server running on stdio");
  } else {
    const app = express();
    app.use(express.json());

    // ── Streamable HTTP transport (modern clients) ──
    const streamableSessions = new Map<string, { transport: StreamableHTTPServerTransport; server: McpServer }>();

    // ── SSE transport (legacy clients like Nexus) ──
    const sseSessions = new Map<string, { transport: SSEServerTransport; server: McpServer }>();

    // Health check for Railway
    app.get("/health", (_req, res) => {
      res.json({ status: "ok", tools: 57 });
    });

    // ── Legacy SSE endpoints ──

    // GET /sse — client connects here to establish SSE stream
    app.get("/sse", async (req, res) => {
      console.log("New SSE connection");
      const transport = new SSEServerTransport("/messages", res);
      const server = createServer(apiKey!);

      await server.connect(transport);

      const sid = transport.sessionId;
      sseSessions.set(sid, { transport, server });
      console.log(`SSE session created: ${sid}`);

      transport.onclose = () => {
        console.log(`SSE session closed: ${sid}`);
        sseSessions.delete(sid);
      };
    });

    // POST /messages — client sends JSON-RPC messages here
    app.post("/messages", async (req, res) => {
      const sessionId = req.query.sessionId as string;
      if (!sessionId || !sseSessions.has(sessionId)) {
        res.status(400).json({ error: "Invalid or missing session ID" });
        return;
      }
      const session = sseSessions.get(sessionId)!;
      await session.transport.handlePostMessage(req, res, req.body);
    });

    // ── Streamable HTTP endpoint (modern clients) ──

    app.all("/mcp", async (req, res) => {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;

      if (req.method === "POST") {
        // Check for existing session
        if (sessionId && streamableSessions.has(sessionId)) {
          const session = streamableSessions.get(sessionId)!;
          await session.transport.handleRequest(req, res, req.body);
          return;
        }

        // New session: create transport + server
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
        });

        const server = createServer(apiKey!);
        await server.connect(transport);

        // Store session once initialized
        transport.onclose = () => {
          const sid = (transport as any).sessionId;
          if (sid) streamableSessions.delete(sid);
        };

        // Handle the request — this will generate the session ID
        await transport.handleRequest(req, res, req.body);

        // Store the session using the generated ID
        const sid = (transport as any).sessionId;
        if (sid) {
          streamableSessions.set(sid, { transport, server });
        }
      } else if (req.method === "GET") {
        // SSE stream for notifications
        if (!sessionId || !streamableSessions.has(sessionId)) {
          res.status(400).json({ error: "Invalid or missing session ID" });
          return;
        }
        const session = streamableSessions.get(sessionId)!;
        await session.transport.handleRequest(req, res);
      } else if (req.method === "DELETE") {
        // Session close
        if (sessionId && streamableSessions.has(sessionId)) {
          const session = streamableSessions.get(sessionId)!;
          await session.transport.handleRequest(req, res);
          streamableSessions.delete(sessionId);
        } else {
          res.status(400).json({ error: "Invalid or missing session ID" });
        }
      } else {
        res.status(405).json({ error: "Method not allowed" });
      }
    });

    const port = parseInt(process.env.PORT || "3000", 10);
    app.listen(port, "0.0.0.0", () => {
      console.log(`Torn MCP server running on http://0.0.0.0:${port}`);
      console.log(`  Streamable HTTP: /mcp`);
      console.log(`  Legacy SSE:      /sse + /messages`);
    });
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
