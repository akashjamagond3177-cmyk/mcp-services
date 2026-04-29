/**
 * @file lib/all-tools.ts
 *
 * Central registry of all tool modules.
 * Each module exports both a `toolMeta` (name, serverId, description)
 * and its handler function.
 *
 * HOW TO ADD A NEW TOOL:
 *   1. Create the handler file in lib/modules/<server>/<tool-name>.ts
 *      — export `toolMeta` and `handleXxx` from that file.
 *   2. Add ONE import line below (the `toolMeta` and handler both come from the same import).
 *   3. Add the handler + toolMeta to the ALL_HANDLERS array.
 *
 * Everything else (register-tools, /api/tools endpoint, the UI) picks up automatically.
 */

import type { ToolMeta } from './tool-meta';

// ── OpsCenter ──────────────────────────────────────────────────────────────────
import { toolMeta as tmGetTicketDetail, handleGetTicketDetail } from './modules/opscenter/get-ticket-detail';
import { toolMeta as tmGetTicketComments, handleGetTicketComments } from './modules/opscenter/get-ticket-comments';
import { toolMeta as tmGetMyTickets, handleGetMyTickets } from './modules/opscenter/get-my-tickets';
import { toolMeta as tmGetAssignedToMe, handleGetAssignedToMe } from './modules/opscenter/get-assigned-to-me';
import { toolMeta as tmGetMyChangeRequests, handleGetMyChangeRequests } from './modules/opscenter/get-my-change-requests';
import { toolMeta as tmGetClosedTickets, handleGetClosedTickets } from './modules/opscenter/get-closed-tickets';
import { toolMeta as tmGetResolvedByMe, handleGetResolvedByMe } from './modules/opscenter/get-resolved-by-me';
import { toolMeta as tmSearchTickets, handleSearchTickets } from './modules/opscenter/search-tickets';
import { toolMeta as tmGetPendingApprovals, handleGetPendingApprovals } from './modules/opscenter/get-pending-approvals';
import { toolMeta as tmGetApprovedByMe, handleGetApprovedByMe } from './modules/opscenter/get-approved-by-me';
import { toolMeta as tmGetRejectedByMe, handleGetRejectedByMe } from './modules/opscenter/get-rejected-by-me';
import { toolMeta as tmGetAllMyApprovals, handleGetAllMyApprovals } from './modules/opscenter/get-all-my-approvals';
import { toolMeta as tmAddTicketComment, handleAddTicketComment } from './modules/opscenter/add-ticket-comment';
// DISABLED: import { toolMeta as tmValidateUser, handleValidateUser } from './modules/opscenter/validate-user';

// ── Everest ────────────────────────────────────────────────────────────────────
import { toolMeta as tmGetMyEverestProjects, handleGetMyEverestProjects } from './modules/everest/get-my-projects';
import { toolMeta as tmGetMyEverestActiveProjects, handleGetMyEverestActiveProjects } from './modules/everest/get-my-active-projects';
import { toolMeta as tmGetEverestProjectDetail, handleGetEverestProjectDetail } from './modules/everest/get-project-detail';
import { toolMeta as tmGetEverestProjectResources, handleGetEverestProjectResources } from './modules/everest/get-project-resources';
import { toolMeta as tmGetEverestProjectCloudResources, handleGetEverestProjectCloudResources } from './modules/everest/get-project-cloud-resources';
import { toolMeta as tmGetEverestProjectAssets, handleGetEverestProjectAssets } from './modules/everest/get-project-assets';
import { toolMeta as tmGetEverestUserAllocations, handleGetEverestUserAllocations } from './modules/everest/get-user-allocations';
import { toolMeta as tmGetEverestProjectMilestones, handleGetEverestProjectMilestones } from './modules/everest/get-project-milestones';
import { toolMeta as tmGetEverestProjectDependencies, handleGetEverestProjectDependencies } from './modules/everest/get-project-dependencies';
import { toolMeta as tmGetEverestProjectRisks, handleGetEverestProjectRisks } from './modules/everest/get-project-risks';
import { toolMeta as tmGetMyEverestTimesheet, handleGetMyEverestTimesheet } from './modules/everest/get-my-timesheet';
import { toolMeta as tmGetMyTeamEverestTimesheet, handleGetMyTeamEverestTimesheet } from './modules/everest/get-my-team-timesheet';
import { toolMeta as tmGetEverestProjectCR, handleGetEverestProjectCR } from './modules/everest/get-project-cr';
import { toolMeta as tmGetEverestProjectStakeholders, handleGetEverestProjectStakeholders } from './modules/everest/get-project-stakeholders';
import { toolMeta as tmGetEverestProjectTimesheet, handleGetEverestProjectTimesheet } from './modules/everest/get-project-timesheet';
import { toolMeta as tmSubmitEverestTimesheet, handleSubmitEverestTimesheet } from './modules/everest/submit-timesheet';
import { toolMeta as tmApproveEverestTimesheet, handleApproveEverestTimesheet } from './modules/everest/approve-timesheet';
import { toolMeta as tmGetEverestPendingActions, handleGetEverestPendingActions } from './modules/everest/get-pending-actions';
import { toolMeta as tmGetEverestAssignedIssues, handleGetEverestAssignedIssues } from './modules/everest/get-assigned-issues';
import { toolMeta as tmGetEverestTaskDetail, handleGetEverestTaskDetail } from './modules/everest/get-task-detail';
import { toolMeta as tmLogEverestTime, handleLogEverestTime } from './modules/everest/log-time';
import { toolMeta as tmGetEverestProjectFinance, handleGetEverestProjectFinance } from './modules/everest/get-project-finance';
import {
  toolMeta as tmGetEverestProjectToolApplicationDetails,
  handleGetEverestProjectToolApplicationDetails,
} from './modules/everest/get-project-tool-application-details';

// ── VMware ─────────────────────────────────────────────────────────────────────
import { toolMeta as tmListVMs, handleListVMs } from './modules/vmware/list-vms';
import { toolMeta as tmGetVMDetail, handleGetVMDetail } from './modules/vmware/get-vm-detail';
import { toolMeta as tmGetVMPowerState, handleGetVMPowerState } from './modules/vmware/get-vm-power-state';
import { toolMeta as tmListHosts, handleListHosts } from './modules/vmware/list-hosts';
import { toolMeta as tmListDatastores, handleListDatastores } from './modules/vmware/list-datastores';
import { toolMeta as tmListClusters, handleListClusters } from './modules/vmware/list-clusters';

// ── XenAutomation ──────────────────────────────────────────────────────────────
import { toolMeta as tmXenListVMs, handleListVMs as handleXenListVMs } from './xenautomation/my-vms-list';
import { toolMeta as tmXenVMPowerStatusCheck, handleVMPowerStatusCheck } from './xenautomation/vm-power-status-check';
// import { toolMeta as tmXenStopVM, handleStopVM } from './xenautomation/stop-vm';
// import { toolMeta as tmXenStartVM, handleStartVM } from './xenautomation/start-vm';
// DISABLED: import { toolMeta as tmXenCreateVMTransferTicket, handleCreateVMTransferTicket } from './xenautomation/create-vm-transfer-ticket';
// import { toolMeta as tmXenCreateVMShareRequest, handleCreateVMShareRequest } from './xenautomation/share-ticket';
// import { toolMeta as tmXenCreateVMUpdateRequest, handleCreateVMUpdateRequest } from './xenautomation/update-vm-request';
import { toolMeta as tmXenListProjectVMs, handleListVMsAllocatedToProjects } from './xenautomation/list-project-vms';
// DISABLED: import { toolMeta as tmValidateVM, handleValidateVM } from './xenautomation/validate-vm';
import { toolMeta as tmXenListVMsByManager, handleListVMsByManager } from './xenautomation/vms-by-manager';
import { toolMeta as tmXenVmCost, handleVmEstimatedUsageCost } from './xenautomation/vm-cost';
import { toolMeta as tmXenVmDetails, handleVmDetails } from './xenautomation/vm-details';
import { toolMeta as tmXenProjectVmsCost, handleProjectVmsEstimatedUsageCost } from './xenautomation/project-vms-cost';
import { toolMeta as tmXenAllMyVmsCost, handleAllMyVmsCost } from './xenautomation/my-vms-cost';
// DISABLED: import { toolMeta as tmXenCreateVMUpgradeTicket, handleCreateVMUpgradeTicket } from './xenautomation/create-vm-upgrade-ticket';
// DISABLED: import { toolMeta as tmXenCreateVMRequestTicket, handleCreateVMRequestTicket } from './xenautomation/create-vm-request-ticket';

// ── eReq (P2P) ───────────────────────────────────────────────────────────────
import { toolMeta as tmQuerySpendData, handleQuerySpendData } from './modules/ereq/query-spend-data';
import { toolMeta as tmQueryInvoiceStatus, handleQueryInvoiceStatus } from './modules/ereq/query-invoice-status';
import { toolMeta as tmQueryPOStatus, handleQueryPOStatus } from './modules/ereq/query-po-status';
import { toolMeta as tmGetAssetDetails, handleGetAssetDetails as handleEreqGetAssetDetails } from './modules/ereq/get-asset-details';
import { toolMeta as tmGetCostCenterDetails, handleGetCostCenterDetails } from './modules/ereq/get-cost-center-details';
import { toolMeta as tmDrilldownRecords, handleDrilldownRecords } from './modules/ereq/drilldown-records';
import { toolMeta as tmGetSpendSummary, handleGetSpendSummary } from './modules/ereq/get-spend-summary';
import { toolMeta as tmGetMyRecentEreqRequests, handleGetMyRecentEreqRequests } from './modules/ereq/get-my-recent-requests';
import { toolMeta as tmGetEreqRequestStatus, handleGetEreqRequestStatus } from './modules/ereq/get-ereq-request-status';

// ── Salesforce ─────────────────────────────────────────────────────────────────
import { toolMeta as tmSfCheckLicense, handleSalesforceCheckLicenseStatus } from './modules/salesforce/check-license-status';
import { toolMeta as tmSfInactiveUsers, handleSalesforceGetInactiveUsers } from './modules/salesforce/get-inactive-users';
import { toolMeta as tmSfActivateUser, handleSalesforceActivateUserLicense } from './modules/salesforce/activate-user-license';

// ─── Handler Entry ─────────────────────────────────────────────────────────────

export interface HandlerEntry {
    meta: ToolMeta;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: (args: Record<string, unknown>) => Promise<any>;
}

/**
 * All registered tool handlers, in the order they should be registered with the MCP server.
 * Description comes from the toolMeta exported by each handler file — no duplication.
 */
export const ALL_HANDLERS: HandlerEntry[] = [
    // OpsCenter
    { meta: tmGetTicketDetail, handler: handleGetTicketDetail },
    { meta: tmGetTicketComments, handler: handleGetTicketComments },
    { meta: tmGetMyTickets, handler: handleGetMyTickets },
    { meta: tmGetAssignedToMe, handler: handleGetAssignedToMe },
    { meta: tmGetMyChangeRequests, handler: handleGetMyChangeRequests },
    { meta: tmGetClosedTickets, handler: handleGetClosedTickets },
    { meta: tmGetResolvedByMe, handler: handleGetResolvedByMe },
    { meta: tmSearchTickets, handler: handleSearchTickets },
    { meta: tmGetPendingApprovals, handler: handleGetPendingApprovals },
    { meta: tmGetApprovedByMe, handler: handleGetApprovedByMe },
    { meta: tmGetRejectedByMe, handler: handleGetRejectedByMe },
    { meta: tmGetAllMyApprovals, handler: handleGetAllMyApprovals },
    { meta: tmAddTicketComment, handler: handleAddTicketComment },
    // DISABLED: { meta: tmValidateUser, handler: handleValidateUser },

    // Everest
    { meta: tmGetMyEverestProjects, handler: handleGetMyEverestProjects },
    { meta: tmGetMyEverestActiveProjects, handler: handleGetMyEverestActiveProjects },
    { meta: tmGetEverestProjectDetail, handler: handleGetEverestProjectDetail },
    { meta: tmGetEverestProjectResources, handler: handleGetEverestProjectResources },
    { meta: tmGetEverestProjectCloudResources, handler: handleGetEverestProjectCloudResources },
    { meta: tmGetEverestProjectAssets, handler: handleGetEverestProjectAssets },
    { meta: tmGetEverestUserAllocations, handler: handleGetEverestUserAllocations },
    { meta: tmGetEverestProjectMilestones, handler: handleGetEverestProjectMilestones },
    { meta: tmGetEverestProjectDependencies, handler: handleGetEverestProjectDependencies },
    { meta: tmGetEverestProjectRisks, handler: handleGetEverestProjectRisks },
    { meta: tmGetMyEverestTimesheet, handler: handleGetMyEverestTimesheet },
    { meta: tmGetMyTeamEverestTimesheet, handler: handleGetMyTeamEverestTimesheet },
    { meta: tmGetEverestProjectCR, handler: handleGetEverestProjectCR },
    { meta: tmGetEverestProjectStakeholders, handler: handleGetEverestProjectStakeholders },
    { meta: tmGetEverestProjectTimesheet, handler: handleGetEverestProjectTimesheet },
    // { meta: tmSubmitEverestTimesheet, handler: handleSubmitEverestTimesheet },
    // { meta: tmApproveEverestTimesheet, handler: handleApproveEverestTimesheet },
    { meta: tmGetEverestPendingActions, handler: handleGetEverestPendingActions },
    { meta: tmGetEverestAssignedIssues, handler: handleGetEverestAssignedIssues },
    { meta: tmGetEverestTaskDetail, handler: handleGetEverestTaskDetail },
    // { meta: tmLogEverestTime, handler: handleLogEverestTime },
    { meta: tmGetEverestProjectFinance, handler: handleGetEverestProjectFinance },
    { meta: tmGetEverestProjectToolApplicationDetails, handler: handleGetEverestProjectToolApplicationDetails },

    // XenAutomation (before VMware so power-status and "my VM" queries use XenAutomation first)
    { meta: tmXenListVMs, handler: handleXenListVMs },
    { meta: tmXenVMPowerStatusCheck, handler: handleVMPowerStatusCheck },
    // { meta: tmXenStopVM, handler: handleStopVM },
    // { meta: tmXenStartVM, handler: handleStartVM },
    // DISABLED: { meta: tmXenCreateVMTransferTicket, handler: handleCreateVMTransferTicket },
    // DISABLED: { meta: tmXenCreateVMShareRequest, handler: handleCreateVMShareRequest },
    // DISABLED: { meta: tmXenCreateVMUpdateRequest, handler: handleCreateVMUpdateRequest },
    // DISABLED: { meta: tmXenListProjectVMs, handler: handleListVMsAllocatedToProjects },
    { meta: tmXenListVMsByManager, handler: handleListVMsByManager },
    { meta: tmXenVmCost, handler: handleVmEstimatedUsageCost },
    { meta: tmXenVmDetails, handler: handleVmDetails },
    { meta: tmXenProjectVmsCost, handler: handleProjectVmsEstimatedUsageCost },
    { meta: tmXenAllMyVmsCost, handler: handleAllMyVmsCost },
    // DISABLED: { meta: tmValidateVM, handler: handleValidateVM},
    // DISABLED: { meta: tmXenCreateVMUpgradeTicket, handler: handleCreateVMUpgradeTicket },
    // DISABLED: { meta: tmXenCreateVMRequestTicket, handler: handleCreateVMRequestTicket },

    // VMware vSphere
    { meta: tmListVMs, handler: handleListVMs },
    { meta: tmGetVMDetail, handler: handleGetVMDetail },
    { meta: tmGetVMPowerState, handler: handleGetVMPowerState },
    { meta: tmListHosts, handler: handleListHosts },
    { meta: tmListDatastores, handler: handleListDatastores },
    { meta: tmListClusters, handler: handleListClusters },

    // eReq (P2P)
    { meta: tmQuerySpendData, handler: handleQuerySpendData },
    { meta: tmQueryInvoiceStatus, handler: handleQueryInvoiceStatus },
    { meta: tmQueryPOStatus, handler: handleQueryPOStatus },
    { meta: tmGetAssetDetails, handler: handleEreqGetAssetDetails },
    { meta: tmGetCostCenterDetails, handler: handleGetCostCenterDetails },
    { meta: tmDrilldownRecords, handler: handleDrilldownRecords },
    { meta: tmGetSpendSummary, handler: handleGetSpendSummary },
    { meta: tmGetMyRecentEreqRequests, handler: handleGetMyRecentEreqRequests },
    { meta: tmGetEreqRequestStatus, handler: handleGetEreqRequestStatus },
    // XenAutomation
    { meta: tmXenListVMs, handler: handleXenListVMs },
    { meta: tmXenVMPowerStatusCheck, handler: handleVMPowerStatusCheck },
    // { meta: tmXenStopVM, handler: handleStopVM },
    // { meta: tmXenStartVM, handler: handleStartVM },
    // { meta: tmXenCreateVMTransferTicket, handler: handleCreateVMTransferTicket },
    // DISABLED: { meta: tmXenCreateVMShareRequest, handler: handleCreateVMShareRequest },
    // DISABLED: { meta: tmXenCreateVMUpdateRequest, handler: handleCreateVMUpdateRequest },
    { meta: tmXenListProjectVMs, handler: handleListVMsAllocatedToProjects },
    { meta: tmXenListVMsByManager, handler: handleListVMsByManager },
    { meta: tmXenVmCost, handler: handleVmEstimatedUsageCost },
    { meta: tmXenProjectVmsCost, handler: handleProjectVmsEstimatedUsageCost },
    { meta: tmXenAllMyVmsCost, handler: handleAllMyVmsCost },
    // { meta: tmValidateVM, handler: handleValidateVM },

    // Salesforce
    { meta: tmSfCheckLicense, handler: handleSalesforceCheckLicenseStatus },
    { meta: tmSfInactiveUsers, handler: handleSalesforceGetInactiveUsers },
    { meta: tmSfActivateUser, handler: handleSalesforceActivateUserLicense },
];

/**
 * Returns all toolMeta records grouped by serverId.
 * Used by the /api/tools endpoint to build the UI response.
 */
export function getToolMetaByServer(): Record<string, ToolMeta[]> {
    const map: Record<string, ToolMeta[]> = {};
    for (const { meta } of ALL_HANDLERS) {
        if (!map[meta.serverId]) map[meta.serverId] = [];
        map[meta.serverId].push(meta);
    }
    return map;
}
