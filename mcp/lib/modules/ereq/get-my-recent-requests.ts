import { getMyRecentEreqRequestsText } from './client';
import type { ToolMeta } from '@/lib/tool-meta';

/**
 * @tool get_my_recent_ereq_requests
 * @server ereq
 *
 * List the latest eReq requests created by a requester.
 * Use when user asks questions like "what are my last 5 eReq requests?".
 */
export const toolMeta: ToolMeta = {
  name: 'get_my_recent_ereq_requests',
  serverId: 'ereq',
  description:
    'List latest eReq requests created by the logged-in requester directly from the database. ' +
    'ALWAYS use this tool when user asks for recent/last eReq requests, such as: ' +
    '"show my last 5 eReq requests", "latest eReqs I created", "last eReq request I created". ' +
    'Default to limit=5 when user says "last" and does not provide a number. ' +
    'Do NOT ask for cost center/date range for this intent. ' +
    'CRITICAL: NEVER ask the user for their employee ID or requester ID. ' +
    'ALWAYS call this tool immediately WITHOUT the requester_id parameter. ' +
    'The server automatically resolves the logged-in user identity from request headers. ' +
    'Omitting requester_id is correct and expected — the system will handle user resolution.',
};

export async function handleGetMyRecentEreqRequests(args: Record<string, unknown>) {
  try {
    const requesterId = args.requester_id ? String(args.requester_id).trim() : undefined;
    const limit = args.limit ? Number(args.limit) : 5;

    return {
      content: [{ type: 'text' as const, text: await getMyRecentEreqRequestsText({ requesterId, limit }) }],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [{ type: 'text' as const, text: `Error fetching recent eReq requests: ${msg}` }],
      isError: true,
    };
  }
}
