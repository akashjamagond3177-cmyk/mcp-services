import { fetchUserProjects, resolveUsername } from './client';
import { formatUserProjects } from './formatters';
import type { ToolMeta } from '@/lib/tool-meta';

/**
 * @tool get_my_everest_active_projects
 * @server everest
 *
 * Retrieve all active projects associated with a specific Everest user.
 * Use this when the user asks "What active projects am I on in Everest?" or "Show my active Everest projects".
 * Calls the Everest project API using the username as the user query parameter.
 */
export const toolMeta: ToolMeta = {
  name: 'get_my_everest_active_projects',
  serverId: 'everest',
  description:
    'Retrieve all active projects associated with a specific Everest user. ' +
    'Use this when the user asks "What active projects am I on in Everest?" or "Show my active Everest projects". ' +
    'Calls the Everest project API using the username as the user query parameter.',
};

export async function handleGetMyEverestActiveProjects(args: Record<string, unknown>) {
  const username = resolveUsername(String(args.username || args.user || ''));

  try {
    console.log("##################################################################################")
    console.log('handleGetMyEverestActiveProjects args', args);
    console.log("##################################################################################")
    const raw = await fetchUserProjects(username, '', '7');
    const formatted = formatUserProjects(raw, username);
    return {
      content: [{ type: 'text' as const, text: formatted }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[get_my_everest_active_projects] Error:', errorMessage);
    return {
      content: [{ type: 'text' as const, text: `Error fetching active projects from Everest for ${username}: ${errorMessage}.` }],
      isError: true,
    };
  }
}
