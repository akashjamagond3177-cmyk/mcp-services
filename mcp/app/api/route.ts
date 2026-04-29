/**
 * GET /api/tools
 *
 * Returns server and tool metadata dynamically.
 * Tool descriptions are read directly from each handler file's `toolMeta` export
 * via lib/all-tools.ts — no separate registry to keep in sync.
 *
 * When you add a new tool:
 *   1. Create the handler with toolMeta export
 *   2. Register it in lib/all-tools.ts
 *   → This endpoint and the landing page UI update automatically.
 *
 * Response shape:
 * {
 *   servers: [
 *     {
 *       id, name, description, status, endpoint, icon,
 *       tools: [{ name, serverId, description }, ...]
 *     }
 *   ]
 * }
 */

import { NextResponse } from 'next/server';
import { SERVER_REGISTRY } from '@/lib/server-registry';
import { getToolMetaByServer } from '@/lib/all-tools';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
    // Build tools map from handler-level toolMeta exports — descriptions come from the source
    const toolsByServer = getToolMetaByServer();

    const servers = SERVER_REGISTRY.map((server) => ({
        ...server,
        tools: toolsByServer[server.id] ?? [],
    }));

    return NextResponse.json({ servers }, { status: 200 });
}
