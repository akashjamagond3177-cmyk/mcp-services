import { NextRequest } from 'next/server';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { registerTools } from '@/lib/register-tools';
import { runWithRequestContext } from '@/lib/request-context';

// Force Node.js runtime (not Edge)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';



// ─── Shared Handler ─────────────────────────────────────────────────────────────

/**
 * Create a fresh McpServer + WebStandard transport per request (stateless mode).
 * WebStandardStreamableHTTPServerTransport works directly with web standard
 * Request/Response — perfect for Next.js App Router.
 */
async function handleMCPRequest(request: NextRequest): Promise<Response> {
  return runWithRequestContext(
    { headers: Object.fromEntries(request.headers.entries()) },
    async () => {
      const mcpServer = new McpServer(
        { name: 'radisys-server', version: '1.0.0' },
        { capabilities: { tools: {} } }
      );
      // Aggregate endpoint: expose all tools from all backends.
      registerTools(mcpServer);
      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // stateless mode — no session tracking
        enableJsonResponse: true,      // return JSON instead of SSE for simple calls
      });

      await mcpServer.connect(transport);

      // The transport handles the web standard Request and returns a Response
      const response = await transport.handleRequest(request as unknown as Request);

      return response;
    }
  );
}

// ─── Route Handlers ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  return handleMCPRequest(request);
}

export async function GET(request: NextRequest) {

  return handleMCPRequest(request);
}

export async function DELETE(request: NextRequest) {

  return handleMCPRequest(request);
}
