/**
 * Everest client
 *
 * This module talks to the Everest backend APIs.
 * Auth is handled via headers forwarded from the MCP client, same pattern as OpsCenter:
 *   X-MCP-TYPE: everest, X-Username: {{username}}, Authorization: Token {{usertoken}}
 * Falls back to EVEREST_API_TOKEN env var if no request-level auth is available.
 */

import { getRequestHeaders } from '@/lib/request-context';

const EVEREST_BASE_URL = (process.env.EVEREST_BASE_URL || 'https://everest.radisys.com').replace(/\/+$/, '');
const EVEREST_API_TOKEN = process.env.EVEREST_API_TOKEN;

/** Build headers for Everest API — forward MCP request headers (same pattern as OpsCenter), with env fallback for token. */
export function generateEverestHeaders(): Record<string, string> {
  const source = (getRequestHeaders() || {}) as Record<string, string | string[] | undefined>;
  const headers: Record<string, string> = {};

  for (const [key, value] of Object.entries(source)) {
    if (!value) continue;
    const lowerKey = key.toLowerCase();

    if (
      lowerKey === 'content-length' ||
      lowerKey === 'host' ||
      lowerKey === 'connection' ||
      lowerKey === 'accept-encoding'
    ) {
      continue;
    }

    headers[lowerKey] = Array.isArray(value) ? value.join(',') : String(value);
  }

  headers['content-type'] = 'application/json';
  headers['accept'] = 'application/json';

  if (!headers['authorization'] && EVEREST_API_TOKEN) {
    headers['authorization'] = `Token ${EVEREST_API_TOKEN}`;
  }
  if (!headers['authorization']) {
    console.warn('[Everest] No auth token available — calling API without auth');
  }
  console.log("##################################################################################")
  console.log('Everest Base URL', EVEREST_BASE_URL);
  console.log('EVEREST_API_TOKEN', EVEREST_API_TOKEN);
  console.log('generateEverestHeaders headers', headers);
  console.log("##################################################################################")
  return headers;
}

/**
 * Resolve the username — prefer the explicit param, fall back to x-username header.
 * Same pattern as OpsCenter: `username || headers['x-username'] || headers['username']`
 */
export function resolveUsername(username?: string): string {
  if (username?.trim()) return username.trim();
  const headers = generateEverestHeaders();
  const fromHeader = headers['x-username'] || headers['username'] || '';
  if (fromHeader.trim()) return fromHeader.trim();
  return '';
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetch projects for a given user from Everest.
 *
 * This calls:
 *   GET <EVEREST_BASE_URL>/pm/api/project/?user=<username>
 */
export async function fetchUserProjects(username?: string, search_name: string = '', status: string = ''): Promise<unknown> {  
  const user = resolveUsername(username);
  if (!user) {
    throw new Error('Username is required to fetch Everest projects.');
  }

  const url = `${EVEREST_BASE_URL}/pm/api/project/?user=${encodeURIComponent(user)}${search_name ? `&search=${search_name}` : ''}${status ? `&status=${status}` : ''}`;

  const headers = generateEverestHeaders();

  const response = await fetch(url, { method: 'GET', headers });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Everest API error (${response.status}): ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Fetch resource allocations for a given project from Everest.
 */
export async function fetchProjectResources(projectId: string): Promise<unknown> {
  const id = projectId.trim();
  if (!id) {
    throw new Error('projectId is required to fetch Everest resources.');
  }

  const params = new URLSearchParams({
    project_details: id,
    ordering: '-',
    page: '1',
    per_page: '15',
    active: 'true',
  });

  const url = `${EVEREST_BASE_URL}/pm/api/resource/?${params.toString()}`;
  const headers = generateEverestHeaders();

  const response = await fetch(url, { method: 'GET', headers });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Everest resource API error (${response.status}): ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Fetch resource allocations for a given user (resource) from Everest.
 */
export async function fetchUserResourceAllocations(userId: string): Promise<unknown> {
  const id = userId.trim();
  if (!id) {
    throw new Error('userId is required to fetch Everest resource allocations.');
  }

  const params = new URLSearchParams({
    resource_id: id,
    per_page: '-1',
    ordering: '-start_date',
  });

  const url = `${EVEREST_BASE_URL}/pm/api/resource/?${params.toString()}`;
  const headers = generateEverestHeaders();

  const response = await fetch(url, { method: 'GET', headers });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Everest resource API error (${response.status}): ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Shared GET helper for project-scoped Everest APIs (milestone, dependency, risk). */
async function fetchProjectScoped(
  path: string,
  projectId: string,
  label: string
): Promise<unknown> {
  const id = projectId.trim();
  if (!id) {
    throw new Error(`projectId is required to fetch Everest ${label}.`);
  }
  const params = new URLSearchParams({
     project_details: id,
     page: '1',
     per_page: '15',
  });
  if(label === 'milestone') {
    params.set('version', 'Latest');
  }
  if(label === 'dependency') {
    params.set('project_detail', projectId);
  }
  const url = `${EVEREST_BASE_URL}/pm/api/${path}/?${params.toString()}`;
  const headers = generateEverestHeaders();

  const response = await fetch(url, { method: 'GET', headers });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Everest ${label} API error (${response.status}): ${text}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Fetch milestones for a given project from Everest.
 */
export async function fetchProjectMilestones(projectId: string): Promise<unknown> {
  return fetchProjectScoped('milestones', projectId, 'milestone');
}

/**
 * Fetch dependencies for a given project from Everest.
 */
export async function fetchProjectDependencies(projectId: string): Promise<unknown> {
  return fetchProjectScoped('dependencies', projectId, 'dependency');
}

/**
 * Fetch risks for a given project from Everest.
 */
export async function fetchProjectRisks(projectId: string): Promise<unknown> {
  return fetchProjectScoped('risk_register', projectId, 'risk');
}

/**
 * Fetch cloud resources (RWS resources) for a given project from Everest.
 */
export async function fetchProjectCloudResources(projectId: string): Promise<unknown> {
  const id = projectId.trim();
  if (!id) {
    throw new Error('projectId is required to fetch Everest cloud resources.');
  }

  const params = new URLSearchParams({
    project_details: id,
    page: '1',
    per_page: '15',
  });

  const url = `${EVEREST_BASE_URL}/pm/api/rwsresources/?${params.toString()}`;
  const headers = generateEverestHeaders();

  const response = await fetch(url, { method: 'GET', headers });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Everest rwsresources API error (${response.status}): ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Fetch inventory / hardware / software assets allocated to a given project from Everest.
 */
export async function fetchProjectAllocatedAssets(projectId: string): Promise<unknown> {
  const id = projectId.trim();
  if (!id) {
    throw new Error('projectId is required to fetch Everest allocated assets.');
  }

  const params = new URLSearchParams({
    project_details: id
  });

  const url = `${EVEREST_BASE_URL}/pm/api/integration/myasset/allocatedassets/?${params.toString()}`;
  const headers = generateEverestHeaders();

  const response = await fetch(url, { method: 'GET', headers });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Everest allocatedassets API error (${response.status}): ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Fetch basic Everest user details (including employee_id) for a given username.
 */
export async function fetchEverestUserDetails(username?: string, returnPromise: boolean = false): Promise<unknown> {
  const user = resolveUsername(username);
  if (!user) {
    throw new Error('Username is required to fetch Everest user details.');
  }

  const params = new URLSearchParams({
    fields: 'employee_id,full_name,email,username',
  });

  const url = `${EVEREST_BASE_URL}/pm/api/users/${encodeURIComponent(user)}/?${params.toString()}`;
  const headers = generateEverestHeaders();

  const response = await fetch(url, { method: 'GET', headers });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Everest user API error (${response.status}): ${text}`);
  }

  try {
    if(returnPromise) {
      return Promise.resolve(JSON.parse(text));
    } else {
      return JSON.parse(text);
    }
  } catch {
    if(returnPromise) {
      return Promise.resolve(text);
    } else {
      return text;
    }
  }
}

/**
 * Fetch timesheet data for a given user from Everest.
 */
export async function fetchMyTimesheet(
  username?: string,
  fromDate?: string,
  toDate?: string
): Promise<unknown> {
  const user = resolveUsername(username);
  if (!user) {
    throw new Error('Username is required to fetch Everest timesheet data.');
  }

  let dateAfter = fromDate?.trim();
  let dateBefore = toDate?.trim();
  if (!dateAfter || !dateBefore) {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    if (!dateAfter) dateAfter = weekAgo.toISOString().slice(0, 10);
    if (!dateBefore) dateBefore = today.toISOString().slice(0, 10);
  }

  const params = new URLSearchParams({
    limit: '100',
    date_after: dateAfter,
    date_before: dateBefore,
    group_by: 'user__username',
    pagenum: '1',
    user__username: user,
  });

  const url = `${EVEREST_BASE_URL}/pm/api/apps/timesheet/entries/group_by/?${params.toString()}`;
  const headers = generateEverestHeaders();

  const response = await fetch(url, { method: 'GET', headers });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Everest timesheet API error (${response.status}): ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Fetch timesheet data for all team members under a manager from Everest.
 */
export async function fetchMyTeamTimesheet(
  username?: string,
  fromDate?: string,
  toDate?: string
): Promise<unknown> {
  const manager = resolveUsername(username);
  if (!username) {
    throw new Error('Username is required to fetch team timesheet data.');
  }

  // First resolve the manager's internal id (employee_id) via the Everest user API.
  const userDetails = await fetchEverestUserDetails(username);

  let managerId: string | undefined;
  if (userDetails && typeof userDetails === 'object') {
    const details = userDetails as Record<string, unknown>;
    const rawEmployeeId = details.employee_id as string | '';
    if (rawEmployeeId) {
      managerId = String(rawEmployeeId).trim();
    }
  }

  if (!managerId) {
    throw new Error(
      `Could not resolve employee_id for Everest user ${username} from the user details API response.`
    );
  }

  let dateAfter = fromDate?.trim();
  let dateBefore = toDate?.trim();
  if (!dateAfter || !dateBefore) {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    if (!dateAfter) dateAfter = weekAgo.toISOString().slice(0, 10);
    if (!dateBefore) dateBefore = today.toISOString().slice(0, 10);
  }

  const params = new URLSearchParams({
    limit: '100',
    date_after: dateAfter,
    date_before: dateBefore,
    group_by: 'user__username',
    pagenum: '1',
    manager_id: managerId,
  });

  const url = `${EVEREST_BASE_URL}/pm/api/apps/timesheet/entries/group_by/?${params.toString()}`;
  const headers = generateEverestHeaders();

  const response = await fetch(url, { method: 'GET', headers });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Everest team timesheet API error (${response.status}): ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// ─── New fetch functions for additional Everest tools ───────────────────────

/**
 * Fetch change requests for a given project from Everest.
 * API: GET /pm/api/cr/?project_details=<uuid>&page=1&per_page=15&ordering=-id
 */
export async function fetchProjectChangeRequests(projectId: string): Promise<unknown> {
  const id = projectId.trim();
  if (!id) {
    throw new Error('projectId is required to fetch Everest change requests.');
  }
  const params = new URLSearchParams({
    project_details: id,
    page: '1',
    per_page: '15',
    ordering: '-id',
  });
  const url = `${EVEREST_BASE_URL}/pm/api/cr/?${params.toString()}`;
  const headers = generateEverestHeaders();

  const response = await fetch(url, { method: 'GET', headers });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Everest CR API error (${response.status}): ${text}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Fetch stakeholders for a given project from Everest.
 */
export async function fetchProjectStakeholders(projectId: string): Promise<unknown> {
  return fetchProjectScoped('stakeholders', projectId, 'stakeholder');
}

/**
 * Fetch project-level timesheet (grouped by user) from Everest.
 * API: GET /pm/api/apps/timesheet/entries/group_by/?project=<uuid>&group_by=user__username&...
 * Backend filter field is task__project, but the frontend sends 'project'.
 */
export async function fetchProjectTimesheet(
  projectId: string,
  fromDate?: string,
  toDate?: string,
  teamids?: string[]
): Promise<unknown> {
  const id = projectId.trim();
  if (!id) {
    throw new Error('projectId is required to fetch Everest project timesheet.');
  }

  let dateAfter = fromDate?.trim();
  let dateBefore = toDate?.trim();
  if (!dateAfter || !dateBefore) {
    // Default to current week (Sun–Sat)
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    if (!dateAfter) dateAfter = weekStart.toISOString().slice(0, 10);
    if (!dateBefore) dateBefore = weekEnd.toISOString().slice(0, 10);
  }

  const params = new URLSearchParams({
    group_by: 'user__username',
    limit: '100',
    date_after: dateAfter,
    date_before: dateBefore,
    pagenum: '1',
  });

  params.set('task__project', projectId);
  params.set('team', teamids?.join(',') ?? '');
  const url = `${EVEREST_BASE_URL}/pm/api/apps/timesheet/entries/group_by/?${params.toString()}`;
  const headers = generateEverestHeaders();

  const response = await fetch(url, { method: 'GET', headers });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Everest project timesheet API error (${response.status}): ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Submit a timesheet for approval in Everest.
 * API: POST /pm/api/apps/timesheet/approvals/submit_time_sheet/
 * Backend: TimeSheetCURDMixins.py:288-311
 * Required payload: user, approver (employee_id), start_date, end_date, total_hours, comment?
 */
export async function submitTimesheetForApproval(
  username: string | undefined,
  approverEmployeeId: string,
  startDate: string,
  endDate: string,
  totalHours: number,
  comment?: string,
  tsData?: Record<string, Record<string, unknown>>
): Promise<unknown> {
  const resolvedUser = resolveUsername(username);
  if (!resolvedUser) {
    throw new Error('username is required to submit an Everest timesheet.');
  }
  if (!approverEmployeeId.trim()) {
    throw new Error('approver employee_id is required to submit an Everest timesheet.');
  }

  const url = `${EVEREST_BASE_URL}/pm/api/apps/timesheet/approvals/submit_time_sheet/`;
  const headers = generateEverestHeaders();

  const payload: Record<string, unknown> = {
    user: resolvedUser,
    approver: approverEmployeeId.trim(),
    start_date: startDate.trim(),
    end_date: endDate.trim(),
    total_hours: totalHours,
    data: JSON.stringify(tsData),
  };
  if (comment) {
    payload.comment = comment.trim().slice(0, 500);
  }
  else {
    payload.comment = "Submitted via MCP";
  }

  const body = JSON.stringify(payload);
  console.log("[submitTimesheetForApproval] Payload:", payload);
  const response = await fetch(url, { method: 'POST', headers, body });
  const text = await response.text();


  console.log("response........................", response)

  if (!response.ok) {
    throw new Error(`Everest submit timesheet API error (${response.status}): ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Approve a pending timesheet approval in Everest.
 * API: POST /pm/api/apps/timesheet/approvals/{id}/approve_time_sheet/
 * Backend: viewset.py:221-245
 * Payload: {"comment": "optional approval comment"}
 */
export async function approveTimesheet(approvalId: string, comment?: string): Promise<unknown> {
  if (!approvalId.trim()) {
    throw new Error('approval_id is required to approve an Everest timesheet.');
  }

  const url = `${EVEREST_BASE_URL}/pm/api/apps/timesheet/approvals/${encodeURIComponent(approvalId.trim())}/approve_time_sheet/`;
  const headers = generateEverestHeaders();

  const payload: Record<string, unknown> = {};
  if (comment) {
    payload.comment = comment.trim();
  }

  const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Everest approve timesheet API error (${response.status}): ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Fetch pending timesheet approvals for an approver from Everest.
 * API: GET /pm/api/apps/timesheet/approvals/?approver__employee_id=<id>&status=1&view=manager
 * Status codes: 0=Draft, 1=Waiting for Approval, 2=Approved, 3=Rejected, 4=Withdrawn
 */
export async function fetchPendingTimesheetApprovals(employeeId: string): Promise<unknown> {
  if (!employeeId.trim()) {
    throw new Error('employee_id is required to fetch pending timesheet approvals.');
  }

  const params = new URLSearchParams({
    approver__employee_id: employeeId.trim(),
    status: '1',
    view: 'manager',
  });

  const url = `${EVEREST_BASE_URL}/pm/api/apps/timesheet/approvals/?${params.toString()}`;
  const headers = generateEverestHeaders();

  const response = await fetch(url, { method: 'GET', headers });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Everest pending approvals API error (${response.status}): ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Fetch tasks/issues assigned to a user from Everest.
 * API: GET /pm/api/apps/tasks/task/?assigned_to__employee_id=<id>&page=1&per_page=25
 * Backend: TaskViewSet filter fields: project, assigned_to__employee_id, etc.
 */
export async function fetchAssignedIssues(
  employeeId: string,
  projectId?: string,
  status?: string
): Promise<unknown> {
  if (!employeeId.trim()) {
    throw new Error('employee_id is required to fetch assigned issues from Everest.');
  }

  const params = new URLSearchParams({
    assigned_to__employee_id: employeeId.trim(),
    page: '1',
    per_page: '25',
  });
  if (projectId) {
    params.set('project', projectId.trim());
  }
  if (status) {
    params.set('status', status.trim());
  }

  const url = `${EVEREST_BASE_URL}/pm/api/apps/tasks/task/?${params.toString()}`;
  const headers = generateEverestHeaders();
  console.log('[fetchAssignedIssues] url:', url);
  console.log('[fetchAssignedIssues] params:', Object.fromEntries(params));

  const response = await fetch(url, { method: 'GET', headers });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Everest assigned issues API error (${response.status}): ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Fetch a single task/issue by id from Everest.
 * API: GET /pm/api/apps/tasks/task/<id>/
 * If the primary key lookup fails (e.g. user passed human-readable task_id like "PROJ-123"),
 * falls back to GET /pm/api/apps/tasks/task/?task_id=<id> and returns the first exact match.
 */
export async function fetchTaskDetail(taskId: string): Promise<unknown> {
  const id = taskId.trim();
  if (!id) {
    throw new Error('task_id is required to fetch task details from Everest.');
  }

  const headers = generateEverestHeaders();
  const detailUrl = `${EVEREST_BASE_URL}/pm/api/apps/tasks/task/${encodeURIComponent(id)}/`;

  const detailResponse = await fetch(detailUrl, { method: 'GET', headers });
  const detailText = await detailResponse.text();

  if (detailResponse.ok) {
    try {
      return JSON.parse(detailText);
    } catch {
      return detailText;
    }
  }

  if (detailResponse.status !== 404 && detailResponse.status !== 400) {
    throw new Error(`Everest task detail API error (${detailResponse.status}): ${detailText}`);
  }

  const params = new URLSearchParams({
    task_id: id,
    page: '1',
    per_page: '25',
  });
  const listUrl = `${EVEREST_BASE_URL}/pm/api/apps/tasks/task/?${params.toString()}`;
  const listResponse = await fetch(listUrl, { method: 'GET', headers });
  const listText = await listResponse.text();

  if (!listResponse.ok) {
    throw new Error(`Everest task lookup API error (${listResponse.status}): ${listText}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(listText);
  } catch {
    throw new Error(`Everest task lookup returned non-JSON: ${listText}`);
  }

  const results = (parsed as { results?: unknown[] })?.results;
  if (!Array.isArray(results) || results.length === 0) {
    throw new Error(`Everest task detail API error (${detailResponse.status}): ${detailText}`);
  }

  const exact = results.find((item) => {
    if (!item || typeof item !== 'object') return false;
    const o = item as Record<string, unknown>;
    return String(o.task_id ?? '') === id || String(o.id ?? '') === id;
  });
  if (exact) return exact;
  if (results.length === 1) return results[0];

  throw new Error(
    `Everest returned multiple tasks for task_id=${id}; pass the numeric task id from Everest for a unique match. Original error: ${detailText}`
  );
}

/**
 * Log time for a task/issue in Everest.
 * API: POST /pm/api/apps/timesheet/entries/log_time/
 * Backend: TimeSheetCURDMixins.py:24-53
 * Payload: { task, user, date, start_time, end_time, duration, notes, billable }
 */
export async function logTime(
  taskId: string,
  username: string | undefined,
  durationMinutes: number,
  date: string,
  startTime?: string,
  endTime?: string,
  comment?: string,
  billable?: boolean
): Promise<unknown> {
  const resolvedUser = resolveUsername(username);
  if (!taskId.trim()) {
    throw new Error('task_id is required to log time in Everest.');
  }
  if (!durationMinutes || durationMinutes <= 0) {
    throw new Error('duration_minutes must be a positive number to log time in Everest.');
  }

  // Convert minutes to Django DurationField format "HH:MM:SS"
  const hrs = Math.floor(durationMinutes / 60);
  const mins = Math.round(durationMinutes % 60);
  const durationStr = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`;

  const url = `${EVEREST_BASE_URL}/pm/api/apps/timesheet/entries/log_time/`;
  const headers = generateEverestHeaders();

  const payload: Record<string, unknown> = {
    task: taskId.trim(),
    user: resolvedUser,
    date: date.trim(),
    duration: durationStr,
    billable: billable ?? true,
  };
  if (startTime) {
    payload.start_time = startTime.trim();
  }
  if (endTime) {
    payload.end_time = endTime.trim();
  }
  if (comment) {
    payload.notes = comment.trim();
  }

  const body = JSON.stringify(payload);
  console.log(`[logTime] Logging time with payload: ${body}`);
  const response = await fetch(url, { method: 'POST', headers, body });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Everest log time API error (${response.status}): ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
/**
 * Fetch total logged hours for a user on a specific day from Everest.
 * API: GET /pm/api/apps/timesheet/entries/?user__username=<username>&date=<date>&per_page=-1
 * Sums up the duration of all entries for that day.
 */
export async function fetchLoggedHoursForDay(
  username: string,
  date: string
): Promise<number> {
  const params = new URLSearchParams({
    user__username: username,
    date: date,
    per_page: '-1',
  });

  const url = `${EVEREST_BASE_URL}/pm/api/apps/timesheet/entries/?${params.toString()}`;
  const headers = generateEverestHeaders();

  const response = await fetch(url, { method: 'GET', headers });
  const text = await response.text();

  if (!response.ok) {
    console.warn(`[fetchLoggedHoursForDay] Failed: ${response.status}`);
    return 0;
  }

  const data = JSON.parse(text) as { results: { duration: string }[] };

  let totalMinutes = 0;
  for (const entry of data.results || []) {
    const parts = String(entry.duration || '0:0:0').split(':');
    const h = parseInt(parts[0]) || 0;
    const m = parseInt(parts[1]) || 0;
    totalMinutes += h * 60 + m;
  }

  console.log(`[fetchLoggedHoursForDay] ${date} → already logged: ${totalMinutes / 60}h`);
  return totalMinutes / 60;
}

/**
 * Fetch finance details for a given project from Everest.
 * API: GET /pm/api/financedetails/?project_details=<uuid>&page=1&per_page=15
 * Response: { planned, actual, planned_total_cost, actual_total_cost }
 */
export async function fetchProjectFinance(projectId: string): Promise<unknown> {
  const id = projectId.trim();
  if (!id) {
    throw new Error('projectId is required to fetch Everest finance details.');
  }

  const params = new URLSearchParams({ project_id: id, page: '1', per_page: '15' });
  const url = `${EVEREST_BASE_URL}/pm/api/financedetails/?${params.toString()}`;
  const headers = generateEverestHeaders();

  const response = await fetch(url, { method: 'GET', headers });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Everest finance API error (${response.status}): ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Fetch budget details for a given project from Everest.
 */
export async function fetchProjectBudget(projectId: string): Promise<unknown> {
  const id = projectId.trim();
  if (!id) {
    throw new Error('projectId is required to fetch Everest budget.');
  }

  const url = `${EVEREST_BASE_URL}/pm/api/project/${encodeURIComponent(id)}/budget/`;
  const headers = generateEverestHeaders();

  const response = await fetch(url, { method: 'GET', headers });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Everest budget API error (${response.status}): ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function fetchEverestUserDetails_field(
  username?: string,
  returnfield: string[] = []
): Promise<unknown> {
  const user = resolveUsername(username);
  if (!user) {
    throw new Error('Username is required to fetch Everest user details.');
  }

  const params = new URLSearchParams({
    fields: returnfield.join(','),
  });

  const url = `${EVEREST_BASE_URL}/pm/api/users/${encodeURIComponent(user)}/?${params.toString()}`;
  const headers = generateEverestHeaders();

  const response = await fetch(url, { method: 'GET', headers });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Everest user API error (${response.status}): ${text}`);
  }

  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    return returnfield.map((field) => parsed[field]);
  } catch {
    return text;
  }
}

/**
 * Fetch my timesheet attendance from Everest.
 */
export async function fetchMyTimesheetAttendance(userId: string, startDate: string, endDate: string): Promise<unknown> {
  const url = `${EVEREST_BASE_URL}/pm/api/users/${userId}/timesheetattendance/?startDate=${startDate}&endDate=${endDate}`;
  const headers = generateEverestHeaders();
  const response = await fetch(url, { method: 'GET', headers });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Everest timesheet attendance API error (${response.status}): ${text}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}


export function computeTotalHoursFromAttendance(attendanceData: Record<string, unknown>): number {
  if (!attendanceData?.attendance_data || typeof attendanceData.attendance_data !== 'object') {
    return 0;
  }
  const data = attendanceData.attendance_data as Record<string, Record<string, unknown>>;
  let thrs = 0;
  for (const [_date, day] of Object.entries(data)) {
    if(day['IsHoliday'] === true) {
      continue;
    }
    if(day['IsPTO'] === true) {
      thrs += Number(day['timesheet_logs']) || 0;
      continue;
    }
    const totalWorkedHrs = Number(day['total_worked_hrs']) || 0;
    const timesheetLogs = Number(day['timesheet_logs']) || 0;
    thrs += totalWorkedHrs > 0 && (!timesheetLogs || totalWorkedHrs > timesheetLogs) ? totalWorkedHrs : timesheetLogs;
  }
  return thrs;
}

/**
 * Fetch ALM/tool-application/jira/bitbucket/confluence details for a given project from Everest.
 *
 * This expects the Everest project link (URL) as provided by the UI and forwards
 * it to the backend as the `project` query parameter.
 * API: GET /pm/api/project/<project_id>/ALMInfoDetails/
 * 
 */
export async function fetchProjectToolApplicationDetails(projectId: string): Promise<unknown> {
  const id = projectId.trim();
  if (!id) {
    throw new Error('projectId is required to fetch Everest project tool application details.');
  }

  const url = `${EVEREST_BASE_URL}/pm/api/project/${encodeURIComponent(id)}/ALMInfoDetails/`;
  const headers = generateEverestHeaders();

  const response = await fetch(url, { method: 'GET', headers });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Everest toolsapplications API error (${response.status}): ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function fetchprojectTeamDetails(projectId: string): Promise<string[]> {
  const headers = generateEverestHeaders();
  const response = await fetch(`${EVEREST_BASE_URL}/pm/api/teamnamedetails/?project_details=${projectId}`, {
    method: 'GET',
    headers: headers,
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Everest teamnamedetails API error (${response.status}): ${errorText}`);
  }
  const data = await response.json();
  return data.results.map((team: Record<string, unknown>) => team.id as string);
}
