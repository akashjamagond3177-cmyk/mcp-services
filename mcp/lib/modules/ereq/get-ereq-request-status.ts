import { getEreqRequestStatusText } from './client';
import type { ToolMeta } from '@/lib/tool-meta';

/**
 * @tool get_ereq_request_status
 * @server ereq
 *
 * Fetch status details for a specific eReq request id.
 * Use when user asks "what is status of eReq 49856?".
 */
export const toolMeta: ToolMeta = {
  name: 'get_ereq_request_status',
  serverId: 'ereq',
  description:
    'Fetch status details for a specific eReq request id from the MaterialsDB `requests` table. ' +
    'ALWAYS use this tool when user asks status/track details of a specific eReq id, ' +
    'for example: "status of eReq 49856", "track eReq 49856", "check request 49856". ' +
    'Do NOT redirect to spend/invoice/PO tools when a concrete request id is provided.',
};

export async function handleGetEreqRequestStatus(args: Record<string, unknown>) {
  try {
    console.log("########### IT hits get-ereq-request-status ###########")
    const requestId = String(args.request_id || '').trim();
    const requesterId = args.requester_id ? String(args.requester_id).trim() : undefined;

    if (!requestId) {
      return {
        content: [{ type: 'text' as const, text: 'request_id is required to fetch eReq request status.' }],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: await getEreqRequestStatusText({ requestId, requesterId }),
        },
      ],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [{ type: 'text' as const, text: `Error fetching eReq request status: ${msg}` }],
      isError: true,
    };
  }
}
