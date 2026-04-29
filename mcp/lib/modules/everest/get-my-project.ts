import { fetchUserProjects, resolveUsername } from './client';
import { formatUserProjects } from './formatters';
import type { ToolMeta } from '@/lib/tool-meta';

/**
 * @tool get_my_everest_projects
 * @server everest
 *
 * Retrieve all projects associated with a specific Everest user.
 * Use this when the user asks "What projects am I on in Everest?" or "Show my Everest projects".
 * Calls the Everest project API using the username as the user query parameter.
 */
export const toolMeta: ToolMeta = {
  name: 'get_my_everest_projects',
  serverId: 'everest',
  description:
    'Retrieve all projects associated with a specific Everest user. ' +
    'Use this when the user asks "What projects am I on in Everest?" or "Show my Everest projects". ' +
    'Calls the Everest project API using the username as the user query parameter.',
};

export async function handleGetMyEverestProjects(args: Record<string, unknown>) {
  const username = resolveUsername(String(args.username || args.user || ''));

  try {
    const raw = await fetchUserProjects(username);
    const formatted = formatUserProjects(raw, username);
    return {
      content: [{ type: 'text' as const, text: formatted }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[get_my_everest_projects] Error:', errorMessage);
    return {
      content: [{ type: 'text' as const, text: `Error fetching projects from Everest for ${username}: ${errorMessage}.` }],
      isError: true,
    };
  }
}
