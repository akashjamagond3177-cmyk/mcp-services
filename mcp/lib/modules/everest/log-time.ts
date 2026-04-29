import { logTime, resolveUsername,fetchLoggedHoursForDay } from './client';
import { formatLogTimeResult } from './formatters';
import type { ToolMeta } from '@/lib/tool-meta';

/**
 * @tool log_everest_time
 * @server everest
 *
 * Log time for a task/issue in Everest.
 * Use this when the user says "Log 4 hours on task X" or "Record time for issue #123".
 * Requires username, task_id, duration_minutes, and date (YYYY-MM-DD).
 * Optional: start_time, end_time (HH:MM), comment, billable. This is a write operation.
 */
export const toolMeta: ToolMeta = {
  name: 'log_everest_time',
  serverId: 'everest',
  description:
    'ALWAYS use this tool when user wants to log, add, or record hours/time on a task in Everest. ' +
    'Trigger phrases: "log 4 hours on task X", "add 8h on task 419540", ' +
    '"record time for issue 123", "I worked 2 hours on task X". ' +
    'Requires username, task_id, duration_minutes. ' +
    'Optional: start_time, end_time (HH:MM), billable. This is a write operation. ' +
    'This tool is ONLY for writing/saving time entries — it does NOT fetch or display timesheet data. ' +
    'After logging, just confirm success — do NOT fetch or show timesheet data. ' +
    'If user does NOT mention a date, leave date field EMPTY — system will use today\'s date automatically. ' +
    'If user says "today", leave date field EMPTY. ' + 
    'If user says "yesterday", calculate and pass yesterday\'s date. '+
    'If user does NOT provide a comment/description, ask before logging. ' +
    'IMPORTANT: Maximum allowed is 17 hours (1020 minutes) per day. ' +
    'If duration_minutes > 1020, STOP and say "Cannot log more than 17 hours per day." — do NOT suggest splitting. '+
    'Do NOT pass dates from previous conversations or tool calls. '+
    'NEVER reuse dates from previous messages or conversations. ' +
    'Always determine TODAY\'s date fresh for each new request. '
};

export async function handleLogEverestTime(args: Record<string, unknown>) {
  const username = resolveUsername(String(args.username || args.user || ''));
  const taskId = String(args.task_id || args.taskId || '').trim();
  const durationMinutes = Number(args.duration_minutes || args.durationMinutes);
  const date = String(args.date || '').trim() || new Date().toISOString().split('T')[0];
  const startTime = args.start_time ? String(args.start_time).trim() : undefined;
  const endTime = args.end_time ? String(args.end_time).trim() : undefined;
  const comment = args.comment ? String(args.comment).trim() : undefined;
  const billable = args.billable != null ? Boolean(args.billable) : undefined;
  const alreadyLoggedHours = await fetchLoggedHoursForDay(username, date);
  const alreadyLoggedMinutes = Math.round(alreadyLoggedHours * 60);
  const totalAfterLog = durationMinutes + alreadyLoggedMinutes;
  console.log('[log_everest_time] args.date:', args.date, '→ final date:', date);

if (totalAfterLog > 1020) {
  const remainingMinutes = 1020 - alreadyLoggedMinutes;
  const remainingHours = Math.floor(remainingMinutes / 60);
  const remainingMins = remainingMinutes % 60;
  return {
    content: [{
      type: 'text' as const,
      text:
        ` Cannot log **${durationMinutes / 60}h** on **${date}**.\n\n` +
        `- Already logged today: **${alreadyLoggedHours}h**\n` +
        `- Trying to add: **${durationMinutes / 60}h**\n` +
        `- Maximum allowed per day: **17h**\n\n` +
        `You can log a maximum of **${remainingHours}h ${remainingMins > 0 ? remainingMins + 'm' : ''}** more on ${date}.`,
    }],
  };
}

  if (!taskId) {
    return {
      content: [{ type: 'text' as const, text: 'task_id is required to log time in Everest.' }],
    };
  }
  if (!durationMinutes || durationMinutes <= 0 || Number.isNaN(durationMinutes)) {
    return {
      content: [{ type: 'text' as const, text: 'duration_minutes must be a positive number to log time in Everest.' }],
    };
  }
  // here already we are taking default date as today if not provided, so no need to check for date presence. Just validate format if provided.
  // if (!date) {
  //   return {
  //     content: [{ type: 'text' as const, text: 'date (YYYY-MM-DD) is required to log time in Everest.' }],
  //   };
  // }

  try {
    console.log(`[log_everest_time] Logging time for user ${username} on task ${taskId} for ${durationMinutes} minutes on ${date}.`);
    const raw = await logTime(taskId, username, durationMinutes, date, startTime, endTime, comment, billable);
    const formatted = formatLogTimeResult(raw);
    return { content: [{ type: 'text' as const, text: formatted }] };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[log_everest_time] Error:', errorMessage);
    return {
      content: [{ type: 'text' as const, text: `Error logging time in Everest for task ${taskId}: ${errorMessage}.` }],
      isError: true,
    };
  }
}
