import { NextRequest } from 'next/server';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { registerTools } from '@/lib/register-tools';
import { runWithRequestContext } from '@/lib/request-context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PLANNED_SERVERS: string[] = [];

type ServerId = 'opscenter' | 'everest' | 'vmware' | 'xenautomation' | 'ereq' | 'salesforce';
const VALID_SERVERS: ServerId[] = ['opscenter', 'everest', 'vmware', 'xenautomation', 'ereq', 'salesforce'];

async function handleMCPRequest(
  request: NextRequest,
  serverId: ServerId
): Promise<Response> {
  return runWithRequestContext(
    { headers: Object.fromEntries(request.headers.entries()) },
    async () => {
      const mcpServer = new McpServer(
        { name: 'radisys-server', version: '1.0.0' },
        { capabilities: { tools: {} } }
      );
      // Only register tools for the requested backend (opscenter, everest, vmware, xenautomation).
      registerTools(mcpServer, { serverId });
      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
      await mcpServer.connect(transport);
      return transport.handleRequest(request as unknown as Request);
    }
  );
}

function plannedResponse(server: string) {
  return Response.json(
    {
      message: 'Server endpoint',
      server,
      status: 'planned',
      usage: 'Send requests with header: Authorization: Bearer <MCP_API_KEY> when available.',
    },
    { status: 200 }
  );
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ server: string }> }) {
  const { server } = await params;
  if (PLANNED_SERVERS.includes(server)) {
    return Response.json(
      { error: 'Server not yet available', server, status: 'planned' },
      { status: 503 }
    );
  }
  if (!VALID_SERVERS.includes(server as ServerId)) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }
  return handleMCPRequest(request, server as ServerId);
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ server: string }> }) {
  const { server } = await params;
  if (PLANNED_SERVERS.includes(server)) {
    return plannedResponse(server);
  }
  if (!VALID_SERVERS.includes(server as ServerId)) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }
  return handleMCPRequest(request, server as ServerId);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ server: string }> }) {
  const { server } = await params;
  if (PLANNED_SERVERS.includes(server)) {
    return Response.json(
      { error: 'Server not yet available', server, status: 'planned' },
      { status: 503 }
    );
  }
  if (!VALID_SERVERS.includes(server as ServerId)) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }
  return handleMCPRequest(request, server as ServerId);
}
