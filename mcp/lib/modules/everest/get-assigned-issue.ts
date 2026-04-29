import { fetchAssignedIssues, fetchEverestUserDetails, resolveUsername } from './client';
import { formatAssignedIssues } from './formatters';
import type { ToolMeta } from '@/lib/tool-meta';

/**
 * @tool get_everest_assigned_issues
 * @server everest
 *
 * Retrieve tasks/issues assigned to a specific user in Everest.
 * Use this when the user asks "What tasks are assigned to me?" or "Show my open issues in Everest".
 * Resolves the user's employee_id, then queries tasks by assigned_to__employee_id.
 * Optionally filter by project_id and/or status.
 */
export const toolMeta: ToolMeta = {
  name: 'get_everest_assigned_issues',
  serverId: 'everest',
  description:
    'Retrieve tasks/issues assigned to a specific user in Everest. ' +
    'Use this when the user asks "What tasks are assigned to me?", "Show my open issues", ' +
    '"Show my tasks in Everest", "List my issues in HelpDesk PRO". ' +
    'ALWAYS pass status param — default to "open" if user does not specify. ' +
    'If user says "open tasks" or "my tasks" pass status="open". ' +
    'If user says "closed" or "completed" pass status="completed". ' +
    'If user says "in progress" pass status="in progress". ' +
    'If user says "all tasks" or "all issues" do NOT pass status. ' +
    'If user mentions a project like "HelpDesk PRO" or "Everest Dev" pass it in project_id exactly. ' +
    'Leave project_id empty if user wants tasks from ALL projects.'+
    'IMPORTANT: Display the tool response EXACTLY as returned — do NOT reformat, regenerate, or summarize the table. ' + // ← ADD
    'NEVER create your own table — always show the exact tool output.'+ // ← ADD
    'Each row in the table has a clickable Task ID link — preserve all markdown links as-is.'+ // ← ADD
    'The table MUST show all 8 columns: #, Task ID, Project, Title, Status, Priority, Reporter, Assignee. ' + // ← ADD
    'Do NOT remove or hide any columns from the table.', // ← ADD
};

export async function handleGetEverestAssignedIssues(args: Record<string, unknown>) {
  const username = resolveUsername(String(args.username || args.user || ''));
  const status = args.status ? String(args.status).trim() : undefined;
  const projectId = args.project_id ? String(args.project_id).trim() : undefined;
  console.log('[handleGetEverestAssignedIssues] args:', { username, status, projectId });


  try {
    // Resolve employee_id for the user
    const userDetails = await fetchEverestUserDetails(username);
    let employeeId: string | undefined;

    if (userDetails && typeof userDetails === 'object') {
      const details = userDetails as Record<string, unknown>;
      const rawId = details.employee_id as string | '';
      if (rawId) employeeId = String(rawId).trim();
    }

    if (!employeeId) {
      return {
        content: [{
          type: 'text' as const,
          text: `Could not resolve employee_id for Everest user **${username}**. Ensure the username is correct.`,
        }],
        isError: true,
      };
    }

    const raw = await fetchAssignedIssues(employeeId, projectId, status);
    const formatted = formatAssignedIssues(raw, username,status);

    return {
      content: [{ type: 'text' as const, text: formatted }]
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[get_everest_assigned_issues] Error:', errorMessage);

    return {
      content: [{
        type: 'text' as const,
        text: `Error fetching assigned issues from Everest for ${username}: ${errorMessage}.`,
      }],
      isError: true,
    };
  }
}
