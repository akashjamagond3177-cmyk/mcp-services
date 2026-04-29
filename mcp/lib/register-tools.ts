import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ALL_HANDLERS } from './all-tools';

// Re-import individual handlers for the Zod schema wiring below.
// The description for each tool comes from the handler file's own toolMeta.description
// (via ALL_HANDLERS) — no duplication needed.
import { handleGetTicketDetail } from './modules/opscenter/get-ticket-detail';
import { handleGetTicketComments } from './modules/opscenter/get-ticket-comments';
import { handleGetMyTickets } from './modules/opscenter/get-my-tickets';
import { handleGetAssignedToMe } from './modules/opscenter/get-assigned-to-me';
import { handleGetMyChangeRequests } from './modules/opscenter/get-my-change-requests';
import { handleGetClosedTickets } from './modules/opscenter/get-closed-tickets';
import { handleGetResolvedByMe } from './modules/opscenter/get-resolved-by-me';
import { handleSearchTickets } from './modules/opscenter/search-tickets';
import { handleGetPendingApprovals } from './modules/opscenter/get-pending-approvals';
import { handleGetApprovedByMe } from './modules/opscenter/get-approved-by-me';
import { handleGetRejectedByMe } from './modules/opscenter/get-rejected-by-me';
import { handleGetAllMyApprovals } from './modules/opscenter/get-all-my-approvals';
import { handleAddTicketComment } from './modules/opscenter/add-ticket-comment';
import { handleGetMyEverestProjects } from './modules/everest/get-my-projects';
import { handleGetMyEverestActiveProjects } from './modules/everest/get-my-active-projects';
import { handleGetEverestProjectDetail } from './modules/everest/get-project-detail';
import { handleGetEverestProjectResources } from './modules/everest/get-project-resources';
import { handleGetEverestProjectCloudResources } from './modules/everest/get-project-cloud-resources';
import { handleGetEverestProjectAssets } from './modules/everest/get-project-assets';
import { handleGetEverestUserAllocations } from './modules/everest/get-user-allocations';
import { handleGetEverestProjectMilestones } from './modules/everest/get-project-milestones';
import { handleGetEverestProjectDependencies } from './modules/everest/get-project-dependencies';
import { handleGetEverestProjectRisks } from './modules/everest/get-project-risks';
import { handleGetMyEverestTimesheet } from './modules/everest/get-my-timesheet';
import { handleGetMyTeamEverestTimesheet } from './modules/everest/get-my-team-timesheet';
import { handleGetEverestProjectCR } from './modules/everest/get-project-cr';
import { handleGetEverestProjectStakeholders } from './modules/everest/get-project-stakeholders';
import { handleGetEverestProjectTimesheet } from './modules/everest/get-project-timesheet';
import { handleSubmitEverestTimesheet } from './modules/everest/submit-timesheet';
import { handleApproveEverestTimesheet } from './modules/everest/approve-timesheet';
import { handleGetEverestPendingActions } from './modules/everest/get-pending-actions';
import { handleGetEverestAssignedIssues } from './modules/everest/get-assigned-issues';
import { handleGetEverestTaskDetail } from './modules/everest/get-task-detail';
import { handleLogEverestTime } from './modules/everest/log-time';
import { handleGetEverestProjectFinance } from './modules/everest/get-project-finance';
import { handleGetEverestProjectToolApplicationDetails } from './modules/everest/get-project-tool-application-details';
import { handleListVMs } from './modules/vmware/list-vms';
import { handleGetVMDetail } from './modules/vmware/get-vm-detail';
import { handleGetVMPowerState } from './modules/vmware/get-vm-power-state';
import { handleListHosts } from './modules/vmware/list-hosts';
import { handleListDatastores } from './modules/vmware/list-datastores';
import { handleListClusters } from './modules/vmware/list-clusters';
import { handleListVMs as handleXenListVMs } from './xenautomation/my-vms-list';
import { handleVMPowerStatusCheck } from './xenautomation/vm-power-status-check';
// import { handleStopVM } from './xenautomation/stop-vm';
// import { handleStartVM } from './xenautomation/start-vm';
// DISABLED: import { handleCreateVMTransferTicket } from './xenautomation/create-vm-transfer-ticket';
// DISABLED: import { handleCreateVMShareRequest } from './xenautomation/share-ticket';
// DISABLED: import { handleCreateVMUpdateRequest } from './xenautomation/update-vm-request';
import { handleListVMsAllocatedToProjects } from './xenautomation/list-project-vms';
// DISABLED: import { handleValidateUser } from './modules/opscenter/validate-user';
// DISABLED: import { handleValidateVM } from './xenautomation/validate-vm';
import { handleListVMsByManager } from './xenautomation/vms-by-manager';
import { handleVmEstimatedUsageCost } from './xenautomation/vm-cost';
import { handleVmDetails } from './xenautomation/vm-details';
import { handleProjectVmsEstimatedUsageCost } from './xenautomation/project-vms-cost';
import { handleAllMyVmsCost } from './xenautomation/my-vms-cost';
// DISABLED: import { handleCreateVMUpgradeTicket } from './xenautomation/create-vm-upgrade-ticket';
// DISABLED: import { handleCreateVMRequestTicket } from './xenautomation/create-vm-request-ticket';

// eReq (P2P)
import { handleQuerySpendData } from './modules/ereq/query-spend-data';
import { handleQueryInvoiceStatus } from './modules/ereq/query-invoice-status';
import { handleQueryPOStatus } from './modules/ereq/query-po-status';
import { handleGetAssetDetails as handleEreqGetAssetDetails } from './modules/ereq/get-asset-details';
import { handleGetCostCenterDetails } from './modules/ereq/get-cost-center-details';
import { handleDrilldownRecords } from './modules/ereq/drilldown-records';
import { handleGetSpendSummary } from './modules/ereq/get-spend-summary';
import { handleGetMyRecentEreqRequests } from './modules/ereq/get-my-recent-requests';
import { handleGetEreqRequestStatus } from './modules/ereq/get-ereq-request-status';

// Salesforce
import { handleSalesforceCheckLicenseStatus } from './modules/salesforce/check-license-status';
import { handleSalesforceGetInactiveUsers } from './modules/salesforce/get-inactive-users';
import { handleSalesforceActivateUserLicense } from './modules/salesforce/activate-user-license';

// ─── Helper ─────────────────────────────────────────────────────────────────────

type RegisterToolsServerFilter = 'opscenter' | 'everest' | 'vmware' | 'xenautomation' | 'ereq' | 'salesforce' | 'all';

interface RegisterToolsOptions {
  /**
   * Limit which module's tools are registered on this MCP server instance.
   * - 'opscenter' | 'everest' | 'vmware' | 'xenautomation' → only that module's tools
   * - 'all' or undefined                                   → register all tools (default behavior)
   */
  serverId?: RegisterToolsServerFilter;
}

/** Reads the description for a tool from its handler file's own toolMeta — single source of truth. */
function desc(name: string, serverId?: string): string {
  let entry = ALL_HANDLERS.find((h) => h.meta.name === name);
  if (!entry && serverId) {
    entry = ALL_HANDLERS.find((h) => h.meta.name === name && h.meta.serverId === serverId);
  }
  if (!entry) throw new Error(`[register-tools] No toolMeta found for: "${name}"`);
  return entry.meta.description;
}

// ─── Registration ────────────────────────────────────────────────────────────────

/**
 * Register MCP tools onto a McpServer instance.
 *
 * Tool descriptions are read from each handler file's own `toolMeta.description`
 * export via the desc() helper — no duplication, no separate registry to maintain.
 *
 * The Zod input schemas are defined here (they belong with the tool registration,
 * not the handler, as they describe what the MCP SDK should validate before calling).
 *
 * HOW TO ADD A NEW TOOL:
 *   1. Create the handler file with toolMeta + handler exported.
 *   2. Add it to lib/all-tools.ts (one import + one entry in ALL_HANDLERS).
 *   3. Add a server.tool() call below with the Zod schema.
 *   4. Done — the UI and AI both get the description from the handler file.
 */
export function registerTools(server: McpServer, options?: RegisterToolsOptions) {
  const filter: RegisterToolsServerFilter = options?.serverId ?? 'all';
  const allowOpscenter = filter === 'all' || filter === 'opscenter';
  const allowEverest = filter === 'all' || filter === 'everest';
  const allowVmware = filter === 'all' || filter === 'vmware';
  const allowXenautomation = filter === 'all' || filter === 'xenautomation';
  const allowEreq = filter === 'all' || filter === 'ereq';
  const allowSalesforce = filter === 'all' || filter === 'salesforce';

  const registeredToolNames: string[] = [];

  const ValidatedVMSchema = z.object({
    vm_name: z.string().optional(),
    ip_addr: z.string().optional(),
    uuid: z.string().optional(),
    request_by: z.string().optional(),
    id: z.string().optional(),
    servicedesk_id: z.string().optional(),
    type: z.string().optional(),
    os: z.string().optional(),
    cpu: z.number().optional(),
    ram: z.number().optional(),
    number_of_disks: z.number().optional(),
    number_of_nic: z.number().optional(),
    weekly_cost: z.number().optional(),
    number_of_weeks: z.number().optional(),
    cost_center: z.string().optional(),
    status: z.number().optional(),
    server_type: z.number().optional(),
    host: z.string().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    p_code: z.string().optional(),
    snapshot: z.number().optional(),
    hdd: z.number().optional(),
  });

  const ValidatedUserSchema = z.object({
    employee_id: z.string().optional(),
    full_name: z.string().optional(),
    email: z.string().optional(),
    username: z.string().optional(),
  });

  const VMTransferSchema = z.object({
    vm_details: ValidatedVMSchema,
    to_user: ValidatedUserSchema,
    reason: z.string().optional(),
  });

  // ── OpsCenter ────────────────────────────────────────────────────────────────

  if (allowOpscenter) {
    server.tool(
      'get_ticket_detail',
      desc('get_ticket_detail'),
      {
        ticketId: z.string().describe("The ticket ID or number (e.g., 'ST-12345' or '12345')"),
        username: z.string().describe('The username of the person requesting ticket info'),
      },
      async (params) => handleGetTicketDetail(params as Record<string, unknown>)
    );
    registeredToolNames.push('get_ticket_detail');

    server.tool(
      'get_ticket_comments',
      desc('get_ticket_comments'),
      {
        ticketId: z.string().describe("The ticket ID or number (e.g., 'ST-12345' or '12345')"),
        username: z.string().describe('The username of the person requesting ticket comments'),
      },
      async (params) => handleGetTicketComments(params as Record<string, unknown>)
    );
    registeredToolNames.push('get_ticket_comments');

    server.tool(
      'get_my_tickets',
      desc('get_my_tickets'),
      {
        username: z.string().describe('The username to fetch tickets for'),
        status: z
          .string()
          .optional()
          .describe(
            "Optional: Filter by status (e.g., 'Open', 'In Progress', 'Closed'). Leave empty for all open tickets."
          ),
      },
      async (params) => handleGetMyTickets(params as Record<string, unknown>)
    );
    registeredToolNames.push('get_my_tickets');

    server.tool(
      'get_assigned_to_me',
      desc('get_assigned_to_me'),
      async (params) => handleGetAssignedToMe(params as Record<string, unknown>)
    );
    registeredToolNames.push('get_assigned_to_me');

    server.tool(
      'get_my_change_requests',
      desc('get_my_change_requests'),
      { username: z.string().describe('The username to fetch change requests for') },
      async (params) => handleGetMyChangeRequests(params as Record<string, unknown>)
    );
    registeredToolNames.push('get_my_change_requests');

    server.tool(
      'get_closed_tickets',
      desc('get_closed_tickets'),
      { username: z.string().describe('The username to fetch closed tickets for') },
      async (params) => handleGetClosedTickets(params as Record<string, unknown>)
    );
    registeredToolNames.push('get_closed_tickets');

    server.tool(
      'get_resolved_by_me',
      desc('get_resolved_by_me'),
      { username: z.string().describe('The username to fetch resolved-by-me tickets for') },
      async (params) => handleGetResolvedByMe(params as Record<string, unknown>)
    );
    registeredToolNames.push('get_resolved_by_me');

    server.tool(
      'search_tickets',
      desc('search_tickets'),
      {
        username: z.string().describe('The username performing the search'),
        query: z.string().optional().describe('Text to search in ticket summary/title'),
        status: z
          .string()
          .optional()
          .describe("Filter by status (e.g., 'Open', 'In Progress', 'Closed')"),
        priority: z
          .string()
          .optional()
          .describe("Filter by priority (e.g., 'High', 'Medium', 'Low')"),
        issue_type: z
          .string()
          .optional()
          .describe("Filter by issue type slug (e.g., 'change-request', 'incident')"),
        assignee: z.string().optional().describe('Filter by assignee username'),
        date_from: z
          .string()
          .optional()
          .describe('Filter tickets created on or after this date (YYYY-MM-DD)'),
        date_to: z
          .string()
          .optional()
          .describe('Filter tickets created on or before this date (YYYY-MM-DD)'),
      },
      async (params) => handleSearchTickets(params as Record<string, unknown>)
    );
    registeredToolNames.push('search_tickets');

    server.tool(
      'get_pending_approvals',
      desc('get_pending_approvals'),
      { username: z.string().describe('The username to fetch pending approvals for') },
      async (params) => handleGetPendingApprovals(params as Record<string, unknown>)
    );
    registeredToolNames.push('get_pending_approvals');

    server.tool(
      'get_approved_by_me',
      desc('get_approved_by_me'),
      { username: z.string().describe('The username to fetch approved records for') },
      async (params) => handleGetApprovedByMe(params as Record<string, unknown>)
    );
    registeredToolNames.push('get_approved_by_me');

    server.tool(
      'get_rejected_by_me',
      desc('get_rejected_by_me'),
      { username: z.string().describe('The username to fetch rejected records for') },
      async (params) => handleGetRejectedByMe(params as Record<string, unknown>)
    );
    registeredToolNames.push('get_rejected_by_me');

    server.tool(
      'get_all_my_approvals',
      desc('get_all_my_approvals'),
      { username: z.string().describe('The username to fetch all approval records for') },
      async (params) => handleGetAllMyApprovals(params as Record<string, unknown>)
    );
    registeredToolNames.push('get_all_my_approvals');

    server.tool(
      'add_ticket_comment',
      desc('add_ticket_comment'),
      {
        ticketId: z.string().describe("The ticket ID (e.g., 'ST-12345' or '12345')"),
        comment: z.string().describe('The comment text to add to the ticket'),
        username: z.string().describe('The username of the person adding the comment'),
      },
      async (params) => handleAddTicketComment(params as Record<string, unknown>)
    );
    registeredToolNames.push('add_ticket_comment');

    //Disabled: 
    // server.tool(
    //   'validate_user',
    //   desc('validate_user'),
    //   {
    //     identifier: z.string().describe('The identifier to validate (e.g., full name, employee_id, username, email)'),
    //   },
    //   async (params) => handleValidateUser(params as Record<string, unknown>)
    // );
    // registeredToolNames.push('validate_user');
  }

  // ── Everest ──────────────────────────────────────────────────────────────────

  if (allowEverest) {
    server.tool(
      'get_my_everest_projects',
      desc('get_my_everest_projects'),
      {
        username: z
          .string()
          .min(1)
          .describe(
            "The Everest username to fetch projects for (used as the 'user' query parameter)."
          ),
      },
      async (params) => handleGetMyEverestProjects(params as Record<string, unknown>)
    );
    registeredToolNames.push('get_my_everest_projects');

    server.tool(
      'get_my_everest_active_projects',
      desc('get_my_everest_active_projects'),
      {
        username: z
          .string()
          .min(1)
          .describe(
            "The Everest username to fetch active projects for (used as the 'user' query parameter)."
          ),
      },
      async (params) => handleGetMyEverestActiveProjects(params as Record<string, unknown>)
    );
    registeredToolNames.push('get_my_everest_active_projects');

    server.tool(
      'get_everest_project_detail',
      desc('get_everest_project_detail'),
      {
        username: z
          .string()
          .min(1)
          .describe("The Everest username (used as the 'user' query parameter)."),
        projectId: z
          .string()
          .min(1)
          .describe("The Everest project identifier or name (e.g., 'EV-1001')."),
      },
      async (params) => handleGetEverestProjectDetail(params as Record<string, unknown>)
    );
    registeredToolNames.push('get_everest_project_detail');

    server.tool(
      'get_everest_project_resources',
      desc('get_everest_project_resources'),
      {
        username: z
          .string()
          .min(1)
          .describe("The Everest username (used as the 'user' query parameter)."),
        projectId: z
          .string()
          .min(1)
          .describe('The Everest project identifier or name; resolves to a canonical project id.'),
      },
      async (params) => handleGetEverestProjectResources(params as Record<string, unknown>)
    );
    registeredToolNames.push('get_everest_project_resources');

    server.tool(
      'get_everest_project_cloud_resources',
      'Retrieve cloud resources for a specific Everest project. Resolves project id from username + projectId, then calls the cloud resources API.',
      {
        username: z
          .string()
          .min(1)
          .describe(
            "The Everest username used to fetch projects (used as the 'user' query parameter)."
          ),
        projectId: z
          .string()
          .min(1)
          .describe(
            'The Everest project identifier or name to look up; used to resolve the internal id for the project_details query parameter.'
          ),
      },
      async (params) => {
        return await handleGetEverestProjectCloudResources(params as Record<string, unknown>);
      }
    );
    registeredToolNames.push('get_everest_project_cloud_resources');

    server.tool(
      'get_everest_project_assets',
      'Retrieve inventory / hardware / software assets allocated to a specific Everest project. Resolves project id from username + projectId, then calls the allocatedassets API.',
      {
        username: z
          .string()
          .min(1)
          .describe(
            "The Everest username used to fetch projects (used as the 'user' query parameter)."
          ),
        projectId: z
          .string()
          .min(1)
          .describe(
            'The Everest project identifier or name to look up; used to resolve the internal id for the project_details query parameter.'
          ),
      },
      async (params) => {
        return await handleGetEverestProjectAssets(params as Record<string, unknown>);
      }
    );
    registeredToolNames.push('get_everest_project_assets');

    server.tool(
      'get_everest_user_allocations',
      desc('get_everest_user_allocations'),
      {
        userId: z
          .string()
          .min(1)
          .describe(
            "The Everest user/resource identifier (used as 'resource_id', e.g., 'sakumar')."
          ),
      },
      async (params) => handleGetEverestUserAllocations(params as Record<string, unknown>)
    );
    registeredToolNames.push('get_everest_user_allocations');

    server.tool(
      'get_everest_project_milestones',
      desc('get_everest_project_milestones'),
      {
        username: z
          .string()
          .min(1)
          .describe("The Everest username (used as the 'user' query parameter)."),
        projectId: z
          .string()
          .min(1)
          .describe('The Everest project identifier or name.'),
      },
      async (params) => handleGetEverestProjectMilestones(params as Record<string, unknown>)
    );
    registeredToolNames.push('get_everest_project_milestones');

    server.tool(
      'get_everest_project_dependencies',
      desc('get_everest_project_dependencies'),
      {
        username: z
          .string()
          .min(1)
          .describe(
            "The Everest username used to fetch projects (used as the 'user' query parameter)."
          ),
        projectId: z
          .string()
          .min(1)
          .describe(
            'The Everest project identifier or name to look up; used to resolve the internal id for the project_details query parameter.'
          ),
      },
      async (params) => {
        return await handleGetEverestProjectDependencies(params as Record<string, unknown>);
      }
    );
    registeredToolNames.push('get_everest_project_dependencies');

    server.tool(
      'get_everest_project_risks',
      desc('get_everest_project_risks'),
      {
        username: z
          .string()
          .min(1)
          .describe(
            "The Everest username used to fetch projects (used as the 'user' query parameter)."
          ),
        projectId: z
          .string()
          .min(1)
          .describe(
            'The Everest project identifier or name to look up; used to resolve the internal id for the project_details query parameter.'
          ),
      },
      async (params) => {
        return await handleGetEverestProjectRisks(params as Record<string, unknown>);
      }
    );
    registeredToolNames.push('get_everest_project_risks');

    server.tool(
      'get_my_everest_timesheet',
      desc('get_my_everest_timesheet'),
      {
        username: z
          .string()
          .min(1)
          .describe(
            "The Everest username to fetch timesheet data for (used as the 'user' query parameter)."
          ),
        from_date: z
          .string()
          .optional()
          .describe('Optional start date for the timesheet range (e.g. YYYY-MM-DD).'),
        to_date: z
          .string()
          .optional()
          .describe('Optional end date for the timesheet range (e.g. YYYY-MM-DD).'),
      },
      async (params) => {
        return await handleGetMyEverestTimesheet(params as Record<string, unknown>);
      }
    );
    registeredToolNames.push('get_my_everest_timesheet');

    server.tool(
      'get_my_team_everest_timesheet',
      desc('get_my_team_everest_timesheet'),
      {
        manager_username: z
          .string()
          .min(1)
          .describe(
            "The Everest manager username (used as 'manager_id' to fetch timesheets for all direct reports)."
          ),
        from_date: z
          .string()
          .optional()
          .describe('Optional start date for the timesheet range (e.g. YYYY-MM-DD).'),
        to_date: z
          .string()
          .optional()
          .describe('Optional end date for the timesheet range (e.g. YYYY-MM-DD).'),
      },
      async (params) => {
        return await handleGetMyTeamEverestTimesheet(params as Record<string, unknown>);
      }
    );
    registeredToolNames.push('get_my_team_everest_timesheet');

    server.tool(
      'get_everest_project_cr',
      desc('get_everest_project_cr'),
      {
        username: z
          .string()
          .min(1)
          .describe("The Everest username (used as the 'user' query parameter)."),
        projectId: z
          .string()
          .min(1)
          .describe('The Everest project identifier or name to look up.'),
      },
      async (params) => handleGetEverestProjectCR(params as Record<string, unknown>)
    );
    registeredToolNames.push('get_everest_project_cr');

    server.tool(
      'get_everest_project_stakeholders',
      desc('get_everest_project_stakeholders'),
      {
        username: z
          .string()
          .min(1)
          .describe("The Everest username (used as the 'user' query parameter)."),
        projectId: z
          .string()
          .min(1)
          .describe('The Everest project identifier or name to look up.'),
      },
      async (params) => handleGetEverestProjectStakeholders(params as Record<string, unknown>)
    );
    registeredToolNames.push('get_everest_project_stakeholders');

    server.tool(
      'get_everest_project_timesheet',
      desc('get_everest_project_timesheet'),
      {
        username: z
          .string()
          .optional()
          .describe(
            "Everest username for resolving project code/name. Omit if `project` is a UUID, or if the server sets `x-username`/`username` on the request."
          ),
        project: z
          .string()
          .optional()
          .describe(
            'The Everest project: UUID, code, or name. Provide this or projectId (at least one required).'
          ),
        projectId: z
          .string()
          .optional()
          .describe('Alias of project. Provide project or projectId (at least one required).'),
        from_date: z
          .string()
          .optional()
          .describe('Optional start date for the timesheet range (YYYY-MM-DD).'),
        to_date: z
          .string()
          .optional()
          .describe('Optional end date for the timesheet range (YYYY-MM-DD).'),
      },
      async (params) => handleGetEverestProjectTimesheet(params as Record<string, unknown>)
    );
    registeredToolNames.push('get_everest_project_timesheet');

    // server.tool(
    //   'submit_everest_timesheet',
    //   desc('submit_everest_timesheet'),
    //   {
    //     username: z
    //       .string()
    //       .min(1)
    //       .describe('The Everest username of the person submitting their timesheet.'),
    //     approver_username: z
    //       .string()
    //       .min(1)
    //       .describe('The Everest username of the approver/manager who should approve this timesheet.'),
    //     start_date: z
    //       .string()
    //       .min(1)
    //       .describe('Start date for the timesheet period (YYYY-MM-DD).'),
    //     end_date: z
    //       .string()
    //       .min(1)
    //       .describe('End date for the timesheet period (YYYY-MM-DD).'),
    //     comment: z
    //       .string()
    //       .optional()
    //       .describe('Optional comment to include with the submission.'),
    //   },
    //   async (params) => handleSubmitEverestTimesheet(params as Record<string, unknown>)
    // );
    // registeredToolNames.push('submit_everest_timesheet');

    // server.tool(
    //   'approve_everest_timesheet',
    //   desc('approve_everest_timesheet'),
    //   {
    //     username: z
    //       .string()
    //       .min(1)
    //       .describe('The Everest username of the approver (manager).'),
    //     approval_id: z
    //       .string()
    //       .min(1)
    //       .describe('The ID of the pending timesheet approval to approve.'),
    //     comment: z
    //       .string()
    //       .optional()
    //       .describe('Optional comment to include with the approval.'),
    //   },
    //   async (params) => handleApproveEverestTimesheet(params as Record<string, unknown>)
    // );
    // registeredToolNames.push('approve_everest_timesheet');

    server.tool(
      'get_everest_pending_actions',
      desc('get_everest_pending_actions'),
      {
        username: z
          .string()
          .min(1)
          .describe('The Everest username to fetch pending actions for.'),
      },
      async (params) => handleGetEverestPendingActions(params as Record<string, unknown>)
    );
    registeredToolNames.push('get_everest_pending_actions');

    server.tool(
      'get_everest_assigned_issues',
      desc('get_everest_assigned_issues'),
      {
        username: z
          .string()
          .min(1)
          .describe('The Everest username to fetch assigned issues/tasks for.'),
        project_id: z
          .string()
          .optional()
          .describe(
            'Optional: specific project name or ID to filter issues. ' +
            'If user mentions a project like "HelpDesk PRO" or "Everest Dev", pass it here exactly. ' +
            'Leave empty ONLY if user wants issues from ALL projects.'
          ),
        status: z.string()
          .optional()
          .describe(
            'Optional: filter issues by status. ' +
            'If user says "open", "pending", "list issues", "show issues" pass "open". ' +
            'If user says "in progress" pass "in progress". ' +
            'If user says "submitted" pass "submitted". ' +
            'If user says "completed", "closed", "resolved" pass "completed". ' +
            'If no specific status mentioned, pass "open" as default. ' +
            'Examples: "open", "in progress", "submitted", "completed".'
          ),
      },
      async (params) => handleGetEverestAssignedIssues(params as Record<string, unknown>)
    );
    registeredToolNames.push('get_everest_assigned_issues');

    server.tool(
      'get_everest_task_detail',
      desc('get_everest_task_detail'),
      {
        task_id: z
          .string()
          .min(1)
          .describe(
            'Everest task identifier: numeric primary key (e.g. 419540) or human-readable task key (e.g. AKA-359240).'
          ),
      },
      async (params) => handleGetEverestTaskDetail(params as Record<string, unknown>)
    );
    registeredToolNames.push('get_everest_task_detail');

    // server.tool(
    //   'log_everest_time',
    //   desc('log_everest_time'),
    //   {
    //     username: z
    //       .string()
    //       .min(1)
    //       .describe('The Everest username logging the time.'),
    //     task_id: z
    //       .string()
    //       .min(1)
    //       .describe('The ID of the task/issue to log time against.'),
    //     duration_minutes: z
    //       .number()
    //       .positive()
    //       .describe('Duration to log in minutes (e.g. 240 for 4 hours, 90 for 1.5 hours).'),
    //     date: z
    //       .string()
    //       .optional()
    //       .describe(
    //         'The date to log time for (YYYY-MM-DD). ' +
    //         'If user says "today" — leave EMPTY, system will use today\'s date automatically. ' +
    //         'If user says "yesterday" — calculate yesterday\'s date and pass it. ' +
    //         'If user says "last Monday" — calculate that date and pass it. ' +
    //         'If user mentions a specific date like "2026-03-19" — pass it directly. ' +
    //         'If user does NOT mention any date — leave EMPTY.'
    //       ),
    //     start_time: z
    //       .string()
    //       .optional()
    //       .describe('Optional start time (HH:MM, 24-hour format).'),
    //     end_time: z
    //       .string()
    //       .optional()
    //       .describe('Optional end time (HH:MM, 24-hour format).'),
    //     comment: z.string().optional().describe(
    //       'Description/notes of the work done — REQUIRED before logging. ' +
    //       'If user did not provide one, ask: "Please provide a brief description of the work done." ' +
    //       'Examples: "Implemented MCP tool integration", "Fixed login bug", "Code review".'
    //     ),
    //     billable: z
    //       .boolean()
    //       .optional()
    //       .describe('Whether the time is billable (defaults to true).'),
    //   },
    //   async (params) => handleLogEverestTime(params as Record<string, unknown>)
    // );
    // registeredToolNames.push('log_everest_time');

    server.tool(
      'get_everest_project_finance',
      desc('get_everest_project_finance'),
      {
        username: z
          .string()
          .min(1)
          .describe("The Everest username (used as the 'user' query parameter)."),
        projectId: z
          .string()
          .min(1)
          .describe('The Everest project identifier or name to look up.'),
      },
      async (params) => handleGetEverestProjectFinance(params as Record<string, unknown>)
    );
    registeredToolNames.push('get_everest_project_finance');

    server.tool(
      'get-project-tool-application-details',
      desc('get-project-tool-application-details'),
      {
        project_link: z
          .string()
          .min(1)
          .describe('The Everest project to fetch ALM / tool-application / Jira / Bitbucket / Confluence details for.'),
      },
      async (params) => handleGetEverestProjectToolApplicationDetails(params as Record<string, unknown>)
    );
    registeredToolNames.push('get-project-tool-application-details');
  }

  // ── VMware vSphere ──────────────────────────────────────────────────────────

  if (allowVmware) {
    server.tool(
      'list_vms',
      desc('list_vms'),
      {
        username: z
          .string()
          .optional()
          .describe(
            "Username of the requesting user. Pass this to return only that user's VMs (VM names include the owner's username). Omit to return all VMs."
          ),
        filter: z
          .string()
          .optional()
          .describe('Optional VM name filter. Only VMs matching this name will be returned.'),
      },
      async (params) => handleListVMs(params as Record<string, unknown>)
    );
    registeredToolNames.push('list_vms');

    server.tool(
      'get_vm_detail',
      desc('get_vm_detail'),
      {
        username: z
          .string()
          .optional()
          .describe('Username of the requesting user (for context).'),
        vmId: z
          .string()
          .optional()
          .describe('The VM managed object ID (e.g. "vm-123"). Either vmId or vmName is required.'),
        vmName: z
          .string()
          .optional()
          .describe(
            'The human-readable VM name. If provided instead of vmId, the tool resolves the name to a VM ID first.'
          ),
      },
      async (params) => handleGetVMDetail(params as Record<string, unknown>)
    );
    registeredToolNames.push('get_vm_detail');

    server.tool(
      'get_vm_power_state',
      desc('get_vm_power_state'),
      {
        username: z
          .string()
          .optional()
          .describe('Username of the requesting user (for context).'),
        vmId: z
          .string()
          .optional()
          .describe('The VM managed object ID (e.g. "vm-123"). Either vmId or vmName is required.'),
        vmName: z
          .string()
          .optional()
          .describe(
            'The human-readable VM name. If provided instead of vmId, the tool resolves the name to a VM ID first.'
          ),
      },
      async (params) => handleGetVMPowerState(params as Record<string, unknown>)
    );
    registeredToolNames.push('get_vm_power_state');

    server.tool(
      'list_hosts',
      desc('list_hosts'),
      {
        username: z
          .string()
          .optional()
          .describe('Username of the requesting user (for context).'),
      },
      async (params) => handleListHosts(params as Record<string, unknown>)
    );
    registeredToolNames.push('list_hosts');

    server.tool(
      'list_datastores',
      desc('list_datastores'),
      {
        username: z
          .string()
          .optional()
          .describe('Username of the requesting user (for context).'),
      },
      async (params) => handleListDatastores(params as Record<string, unknown>)
    );
    registeredToolNames.push('list_datastores');

    server.tool(
      'list_clusters',
      desc('list_clusters'),
      {
        username: z
          .string()
          .optional()
          .describe('Username of the requesting user (for context).'),
      },
      async (params) => handleListClusters(params as Record<string, unknown>)
    );
    registeredToolNames.push('list_clusters');
  }

  // ── XenAutomation ──────────────────────────────────────────────────────────

  if (allowXenautomation) {
    server.tool(
      'list_my_vms',
      desc('list_my_vms', 'xenautomation'),
      {
        filter: z.string().optional().describe('Optional VM name filter.'),
      },
      async (params) => handleXenListVMs(params as Record<string, unknown>)
    );
    registeredToolNames.push('list_my_vms');

    server.tool(
      'vm_power_status_check',
      desc('vm_power_status_check', 'xenautomation'),
      {
        vm_name: z.string().optional().describe('VM name. Either vm_name or ip_address is required. User can only check their own VMs.'),
        ip_address: z.string().optional().describe('VM IP address. Either vm_name or ip_address is required. User can only check their own VMs.'),
      },
      async (params) => handleVMPowerStatusCheck(params as Record<string, unknown>)
    );
    registeredToolNames.push('vm_power_status_check');

    // server.tool(
    //   'stop_vm',
    //   desc('stop_vm', 'xenautomation'),
    //   {
    //     vm_name: z
    //       .string()
    //       .optional()
    //       .describe('VM name. Either vm_name or ip_address is required. User can only power off their own VMs.'),
    //     ip_address: z
    //       .string()
    //       .optional()
    //       .describe('VM IP address. Either vm_name or ip_address is required. User can only power off their own VMs.'),
    //   },
    //   async (params) => handleStopVM(params as Record<string, unknown>)
    // );
    // registeredToolNames.push('stop_vm');

    // server.tool(
    //   'start_vm',
    //   desc('start_vm', 'xenautomation'),
    //   {
    //     vm_name: z
    //       .string()
    //       .optional()
    //       .describe('VM name. Either vm_name or ip_address is required. User can only start their own VMs.'),
    //     ip_address: z
    //       .string()
    //       .optional()
    //       .describe('VM IP address. Either vm_name or ip_address is required. User can only start their own VMs.'),
    //   },
    //   async (params) => handleStartVM(params as Record<string, unknown>)
    // );
    // registeredToolNames.push('start_vm');

    //Disabled:
    // server.tool(
    //   'create_vm_transfer_ticket',
    //   desc('create_vm_transfer_ticket', 'xenautomation'),
    //   {
    //     vm_identifier: z.string().describe('The validated UUID or exact name of the VM.'),
    //     recipient_username: z.string().describe('The validated username of the recipient.'),
    //   },
    //   async (params) => handleCreateVMTransferTicket(params as Record<string, unknown>)
    // );

    // server.tool(
    //   'create_vm_share_request',
    //   desc('create_vm_share_request', 'xenautomation'),
    //   {
    //     vm_id: z.string().describe('VM UUID to share.'),
    //     share_with_user: z.string().describe('Username or ID of the user to share the VM with.'),
    //     message: z.string().optional().describe('Optional message for the share request.'),
    //   },
    //   async (params) => handleCreateVMShareRequest(params as Record<string, unknown>)
    // );
    // registeredToolNames.push('create_vm_share_request');

    // server.tool(
    //   'create_vm_update_request',
    //   desc('create_vm_update_request', 'xenautomation'),
    //   {
    //     vm_id: z.string().describe('VM UUID to request updates for.'),
    //     requested_changes: z
    //       .record(z.string(), z.unknown())
    //       .describe('Requested changes (e.g. cpu, ram, description).'),
    //   },
    //   async (params) => handleCreateVMUpdateRequest(params as Record<string, unknown>)
    // );
    // registeredToolNames.push('create_vm_update_request');

    server.tool(
      'list_vms_allocated_to_projects',
      desc('list_vms_allocated_to_projects', 'xenautomation'),
      {
        project_id: z
          .string()
          .optional()
          .describe('Optional Everest project id. Either project_id or project_name is required.'),
        project_name: z
          .string()
          .optional()
          .describe('Optional Everest project name. Either project_id or project_name is required.'),
      },
      async (params) => handleListVMsAllocatedToProjects(params as Record<string, unknown>)
    );
    registeredToolNames.push('list_vms_allocated_to_projects');

    //Disabled:
    // server.tool(
    //   'validate_vm',
    //   desc('validate_vm'),
    //   {
    //     identifier: z.string().describe('The identifier to validate (e.g., uuid, vm_name, ip address)'),
    //   },
    //   async (params) => handleValidateVM(params as Record<string, unknown>)
    // );
    // registeredToolNames.push('validate_vm');

    server.tool(
      'list_vms_by_manager',
      desc('list_vms_by_manager', 'xenautomation'),
      {
        manager_username: z.string().describe('The username of the manager to list VMs for.'),
      },
      async (params) => handleListVMsByManager(params as Record<string, unknown>)
    );
    registeredToolNames.push('list_vms_by_manager');

    server.tool(
      'vm_estimated_usage_cost',
      desc('vm_estimated_usage_cost', 'xenautomation'),
      {
        vm_name: z.string().optional().describe('VM name. Either vm_name or ip_address is required.'),
        ip_address: z.string().optional().describe('VM IP address. Either vm_name or ip_address is required.'),
      },
      async (params) => handleVmEstimatedUsageCost(params as Record<string, unknown>)
    );
    registeredToolNames.push('vm_estimated_usage_cost');

    server.tool(
      'vm_details',
      desc('vm_details', 'xenautomation'),
      {
        vm_name: z.string().optional().describe('VM name. Either vm_name or ip_address is required.'),
        ip_address: z.string().optional().describe('VM IP address. Either vm_name or ip_address is required.'),
      },
      async (params) => handleVmDetails(params as Record<string, unknown>)
    );
    registeredToolNames.push('vm_details');

    server.tool(
      'project_vms_estimated_usage_cost',
      desc('project_vms_estimated_usage_cost', 'xenautomation'),
      {
        project_id: z.string().optional().describe('Everest project id. Either project_id or project_name is required.'),
        project_name: z.string().optional().describe('Everest project name. Either project_id or project_name is required.'),
      },
      async (params) => handleProjectVmsEstimatedUsageCost(params as Record<string, unknown>)
    );
    registeredToolNames.push('project_vms_estimated_usage_cost');

    server.tool(
      'all_my_vms_cost',
      desc('all_my_vms_cost', 'xenautomation'),
      {},
      async (params) => handleAllMyVmsCost(params as Record<string, unknown>)
    );
    registeredToolNames.push('all_my_vms_cost');

    //Disabled:
    // server.tool(
    //   'create_vm_upgrade_ticket',
    //   desc('create_vm_upgrade_ticket', 'xenautomation'),
    //   {
    //     vm_identifier: z.string().describe('The VM identifier — UUID, exact name, or IP address.'),
    //     new_cpu: z.number().optional().describe('Desired number of vCPUs after upgrade. Defaults to current VM value if omitted.'),
    //     new_ram: z.number().optional().describe('Desired RAM in GB after upgrade. Defaults to current VM value if omitted.'),
    //     new_hdd: z.number().optional().describe('Desired primary HDD/storage in GB after upgrade. Defaults to current VM value if omitted.'),
    //     new_vm_type: z.string().optional().describe('Desired VM type after upgrade (e.g. "Small", "Medium", "Large"). Defaults to current VM type if omitted.'),
    //     number_of_disks: z.number().optional().describe('Number of disks for the upgraded VM. Defaults to current VM value if omitted.'),
    //     number_of_nic: z.number().optional().describe('Number of NICs for the upgraded VM. Defaults to current VM value if omitted.'),
    //     number_of_weeks: z.number().optional().describe('Number of weeks the upgraded VM is needed for. Defaults to current VM value if omitted.'),
    //     weekly_cost: z.number().optional().describe('Weekly cost of the upgraded VM configuration. Defaults to current VM value if omitted.'),
    //     total_cost: z.number().optional().describe('Total cost for the upgrade. Defaults to weekly_cost × number_of_weeks if omitted.'),
    //     p_code: z.string().optional().describe('Project code to charge the upgrade to. Defaults to current VM project code if omitted.'),
    //     network_label: z.string().optional().describe('Optional network label for the upgraded VM.'),
    //     hdd2: z.number().optional().describe('Optional secondary HDD size in GB.'),
    //   },
    //   async (params) => handleCreateVMUpgradeTicket(params as Record<string, unknown>)
    // );
    // registeredToolNames.push('create_vm_upgrade_ticket');

  //Disabled:
  //   server.tool(
  //     'create_new_vm_request_ticket',
  //     desc('create_vm_request_ticket', 'xenautomation'),
  //     {
  //       vms: z
  //         .array(z.record(z.string(), z.unknown()))
  //         .min(1)
  //         .describe(
  //           'Array of VM request rows. Each row should include: os, vm, cpu, ram, hdd, ' +
  //           'number_of_disks, pcode, project_name, number_of_nic, storage_type, ' +
  //           'weekly_cost, no_vms, number_of_weeks, total_cost.'
  //         ),
  //       total_cost: z
  //         .string()
  //         .describe('Estimated total cost for all VMs across all weeks (e.g. "120.00").'),
  //       business_justification: z
  //         .string()
  //         .optional()
  //         .describe('Optional business justification for the VM request.'),
  //       cost_center_name: z
  //         .string()
  //         .optional()
  //         .describe('Optional cost center name to charge the request to. Defaults to "NA".'),
  //     },
  //     async (params) => handleCreateVMRequestTicket(params as Record<string, unknown>)
  //   );
  //   registeredToolNames.push('create_new_vm_request_ticket');
  }

  // ── eReq (P2P) ─────────────────────────────────────────────────────────────

  if (allowEreq) {
    server.tool(
      'query_spend_data',
      desc('query_spend_data'),
      {
        vendor: z.string().optional().describe('Filter by vendor name (partial match).'),
        cost_center: z.string().optional().describe('Filter by exact cost center code.'),
        category: z.string().optional().describe('Filter by asset category (partial match).'),
        date_from: z.string().optional().describe('Start date filter (YYYY-MM-DD).'),
        date_to: z.string().optional().describe('End date filter (YYYY-MM-DD).'),
        group_by: z.enum(['vendor', 'cost_center', 'category', 'month']).optional().describe('How to group results. Default: vendor.'),
        limit: z.number().optional().describe('Max rows to return (default 20).'),
      },
      async (params) => handleQuerySpendData(params as Record<string, unknown>)
    );
    registeredToolNames.push('query_spend_data');

    server.tool(
      'query_invoice_status',
      desc('query_invoice_status'),
      {
        status: z.enum(['paid', 'due', 'overdue', 'all']).optional().describe('Filter by invoice status. Default: all.'),
        cost_center: z.string().optional().describe('Filter by exact cost center code.'),
        date_from: z.string().optional().describe('Start date filter (YYYY-MM-DD).'),
        date_to: z.string().optional().describe('End date filter (YYYY-MM-DD).'),
      },
      async (params) => handleQueryInvoiceStatus(params as Record<string, unknown>)
    );
    registeredToolNames.push('query_invoice_status');

    server.tool(
      'query_po_status',
      desc('query_po_status'),
      {
        with_po: z.boolean().optional().describe('If true, only with PO; if false, only without PO. Omit for both.'),
        cost_center: z.string().optional().describe('Filter by exact cost center code.'),
        date_from: z.string().optional().describe('Start date filter (YYYY-MM-DD).'),
        date_to: z.string().optional().describe('End date filter (YYYY-MM-DD).'),
      },
      async (params) => handleQueryPOStatus(params as Record<string, unknown>)
    );
    registeredToolNames.push('query_po_status');

    server.tool(
      'get_asset_details',
      desc('get_asset_details'),
      {
        ereq_id: z.string().optional().describe('Filter by specific eReq/MR ID.'),
        cost_center: z.string().optional().describe('Filter by exact cost center code.'),
        category: z.string().optional().describe('Filter by asset category (partial match).'),
      },
      async (params) => handleEreqGetAssetDetails(params as Record<string, unknown>)
    );
    registeredToolNames.push('get_asset_details');

    server.tool(
      'get_cost_center_details',
      desc('get_cost_center_details'),
      {
        cost_center: z.string().optional().describe('Filter by specific cost center code. Omit to list all accessible.'),
      },
      async (params) => handleGetCostCenterDetails(params as Record<string, unknown>)
    );
    registeredToolNames.push('get_cost_center_details');

    server.tool(
      'drilldown_records',
      desc('drilldown_records'),
      {
        dimension: z.enum(['vendor', 'cost_center', 'category']).describe('The dimension to drill down on.'),
        value: z.string().describe('The specific value for that dimension (e.g., vendor name, cost center code).'),
        cost_center: z.string().optional().describe('Additional cost center filter.'),
        date_from: z.string().optional().describe('Start date filter (YYYY-MM-DD).'),
        date_to: z.string().optional().describe('End date filter (YYYY-MM-DD).'),
      },
      async (params) => handleDrilldownRecords(params as Record<string, unknown>)
    );
    registeredToolNames.push('drilldown_records');

    server.tool(
      'get_spend_summary',
      desc('get_spend_summary'),
      {
        date_from: z.string().optional().describe('Start date filter (YYYY-MM-DD).'),
        date_to: z.string().optional().describe('End date filter (YYYY-MM-DD).'),
        cost_center: z.string().optional().describe('Filter by exact cost center code.'),
      },
      async (params) => handleGetSpendSummary(params as Record<string, unknown>)
    );
    registeredToolNames.push('get_spend_summary');

    server.tool(
      'get_my_recent_ereq_requests',
      desc('get_my_recent_ereq_requests'),
      {
        requester_id: z
          .string()
          .optional()
          .describe(
            'NEVER ask the user for this. ALWAYS omit this parameter. ' +
            'The server automatically resolves the logged-in user from request headers.'
          ),
        limit: z
          .number()
          .int()
          .min(1)
          .max(20)
          .optional()
          .describe('Number of recent requests to return (default 5, max 20).'),
      },
      async (params) => handleGetMyRecentEreqRequests(params as Record<string, unknown>)
    );
    registeredToolNames.push('get_my_recent_ereq_requests');

    server.tool(
      'get_ereq_request_status',
      desc('get_ereq_request_status'),
      {
        request_id: z.string().describe('The eReq request id to check (example: 49856).'),
        requester_id: z
          .string()
          .optional()
          .describe('Optional requester employee id. Used to scope lookup when required by API permissions.'),
      },
      async (params) => handleGetEreqRequestStatus(params as Record<string, unknown>)
    );
    registeredToolNames.push('get_ereq_request_status');
  }

  // ── Salesforce ───────────────────────────────────────────────────────────────

  if (allowSalesforce) {
    server.tool(
      'salesforce_check_license_status',
      desc('salesforce_check_license_status'),
      {
        email: z.string().email().describe('The email address of the Salesforce user to look up.'),
      },
      async (params) => handleSalesforceCheckLicenseStatus(params as Record<string, unknown>)
    );
    registeredToolNames.push('salesforce_check_license_status');

    server.tool(
      'salesforce_get_inactive_users',
      desc('salesforce_get_inactive_users'),
      {
        limit: z
          .number()
          .int()
          .min(1)
          .max(200)
          .optional()
          .describe('Maximum number of inactive users to return (default 50, max 200).'),
      },
      async (params) => handleSalesforceGetInactiveUsers(params as Record<string, unknown>)
    );
    registeredToolNames.push('salesforce_get_inactive_users');

    server.tool(
      'salesforce_activate_user_license',
      desc('salesforce_activate_user_license'),
      {
        email: z
          .string()
          .email()
          .describe("User's email address. Used to look up the Salesforce user to activate."),
      },
      async (params) => handleSalesforceActivateUserLicense(params as Record<string, unknown>)
    );
    registeredToolNames.push('salesforce_activate_user_license');
  }

  console.log(
    `[register-tools] Registered ${registeredToolNames.length} tools (filter="${filter}"):`,
    registeredToolNames.join(', ')
  );
}
