import { fetchEverestUserDetails, fetchEverestUserDetails_field } from "./client";
const EVEREST_BASE_URL = (process.env.EVEREST_BASE_URL || 'https://evereststage.radisys.com').replace(/\/+$/, '');
export function formatUserProjects(data: unknown, username: string): string {
  if (data == null) {
    return `No projects were returned for user **${username}** from Everest.`;
  }

  if (typeof data === 'string') {
    return `Everest response for **${username}**:\n\n${data}`;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return `No projects found for user **${username}** in Everest.`;
    }

    const lines: string[] = [];
    lines.push(`**Everest projects for ${username}**`, '');

    data.forEach((item, index) => {
      if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        const id =
          (obj.id as string) ||
          (obj.project_id as string) ||
          (obj.code as string) ||
          `#${index + 1}`;
        const name =
          (obj.name as string) ||
          (obj.project_name as string) ||
          (obj.title as string) ||
          'Unnamed project';
        const status = (obj.status as string) || (obj.state as string) || 'N/A';
        const projectManager =
          (obj.owner as string) ||
          (obj.project_manager as string) ||
          (obj.owner_name as string) ||
          'N/A';

        lines.push(
          `- **${name}** (${id}) – Status: ${status} – Project Manager: ${projectManager}`
        );
      } else {
        lines.push(`- ${JSON.stringify(item)}`);
      }
    });

    lines.push(
      '',
      '> ℹ️ This list is based on the raw Everest API response. Field names may be adjusted once the final API contract is known.'
    );

    return lines.join('\n');
  }

  // Fallback: pretty-print object
  return `Everest response for **${username}**:\n\n\`\`\`json\n${JSON.stringify(
    data,
    null,
    2
  )}\n\`\`\``;
}

export function formatProjectDetail(
  project: unknown,
  username: string,
  projectId: string
): string {
  if (!project || typeof project !== 'object') {
    return (
      `Project **${projectId}** was not found for user **${username}** in Everest.\n\n` +
      'Verify the project identifier and that the user has access to this project in Everest.'
    );
  }

  const obj = project as Record<string, unknown>;

  const id =
    (obj.id as string) ||
    (obj.project_id as string) ||
    (obj.code as string) ||
    projectId;
  const name =
    (obj.name as string) ||
    (obj.project_name as string) ||
    (obj.title as string) ||
    'Unnamed project';
  const status = (obj.status as string) || (obj.state as string) || 'N/A';
  const projectManager =
    (obj.owner as string) ||
    (obj.project_manager as string) ||
    (obj.owner_name as string) ||
    'N/A';
  const startDate =
    (obj.start_date as string) ||
    (obj.startDate as string) ||
    (obj.planned_start as string) ||
    '';
  const endDate =
    (obj.end_date as string) ||
    (obj.endDate as string) ||
    (obj.planned_end as string) ||
    '';

  const lines: string[] = [];

  lines.push(`**Everest project details – ${name} (${id})**`, '');
  lines.push(`- **Project Manager:** ${projectManager}`);
  lines.push(`- **Status:** ${status}`);

  if (startDate) {
    lines.push(`- **Start date:** ${startDate}`);
  }

  if (endDate) {
    lines.push(`- **Target end date:** ${endDate}`);
  }

  lines.push(
    '',
    '> ℹ️ The fields above are derived from the raw Everest API response. ' +
      'Field names may be adjusted once the final API contract is known.',
    '',
    'Raw Everest payload:',
    '```json',
    JSON.stringify(obj, null, 2),
    '```'
  );

  return lines.join('\n');
}

export function formatProjectResources(data: unknown, projectId: string): string {
  if (data == null) {
    return `No resource data was returned for project **${projectId}** from Everest.`;
  }

  if (typeof data === 'string') {
    return `Everest resource response for project **${projectId}**:\n\n${data}`;
  }

  const items: unknown[] = Array.isArray(data)
    ? data
    : Array.isArray((data as any).results)
    ? (data as any).results
    : [data];

  if (items.length === 0) {
    return `No active resources found for project **${projectId}** in Everest.`;
  }

  const lines: string[] = [];
  lines.push(`**Everest resources for project ${projectId}**`, '');

  items.forEach((item, index) => {
    if (!item || typeof item !== 'object') {
      lines.push(`- ${JSON.stringify(item)}`);
      return;
    }

    const obj = item as Record<string, unknown>;

    const resourceName =
      (obj.resource_name as string) + ' (' + (obj.resource_id as string) + ')' ||
      `Resource #${index + 1}`;

    const role =
      (obj.role as string) || '';

    const allocationPct =
      (obj.allocation as number) || 0;

    const startDate =
      (obj.start_date as string) || '';

    const endDate =
      (obj.end_date as string) || '';

    // status need to calculate based on startDate and endDate and today's date, active, inactive, future
    const status =
      (startDate && endDate && new Date(startDate) < new Date() && new Date(endDate) > new Date()) ? 'Active' :
      (startDate && new Date(startDate) > new Date()) ? 'Future' :
      (endDate && new Date(endDate) < new Date()) ? 'Inactive' :
      'N/A';
    const parts: string[] = [];
    parts.push(`- **${resourceName}**`);
    if (resourceName) parts.push(`Resource Name: ${resourceName}`);
    if (role) parts.push(`Role: ${role}`);
    if (allocationPct) parts.push(`Allocation: ${allocationPct}%`);
    if (startDate) parts.push(`Start date: ${startDate}`);
    if (endDate) parts.push(`End date: ${endDate}`);
    if (status) parts.push(`Status: ${status}`);

    lines.push(parts.join(' – '));
  });

  lines.push(
    '',
    '> ℹ️ The fields above are inferred from the raw Everest resource API response. ' +
      'Field names may be adjusted once the final API contract is known.'
  );

  return lines.join('\n');
}

export function formatProjectCloudResources(data: unknown, projectId: string): string {
  if (data == null) {
    return `No cloud VM data was returned for project **${projectId}** from Everest.`;
  }

  if (typeof data === 'string') {
    return `Everest cloud VM response for project **${projectId}**:\n\n${data}`;
  }

  const items: unknown[] = Array.isArray(data)
    ? data
    : Array.isArray((data as Record<string, unknown>).results)
      ? ((data as Record<string, unknown>).results as unknown[])
      : [data];

  if (items.length === 0) {
    return `No cloud VMs found for project **${projectId}** in Everest.`;
  }

  const lines: string[] = [];
  lines.push(`**Everest cloud VMs for project ${projectId}**`, '');

  items.forEach((item, index) => {
    if (!item || typeof item !== 'object') {
      lines.push(`- ${JSON.stringify(item)}`);
      return;
    }

    const obj = item as Record<string, unknown>;

    const vmName =
      (obj.vm_name as string) ||
      (obj.name as string) ||
      `VM #${index + 1}`;
    const ip = (obj.ip_addr as string) || '';
    const statusValue = (obj.status_value as string) || '';

    const flavor = (obj.type as string) || '';
    const os = (obj.os as string) || '';
    const cpu = (obj.cpu as number) || 0;
    const ram = (obj.ram as number) || 0;
    const hdd = (obj.hdd as number) || 0;

    const weeklyCostRaw = (obj.weekly_cost as string) || '';
    const weeks = (obj.number_of_weeks as number) || 0;
    const weeklyCostNum = parseFloat(weeklyCostRaw || '0');
    const totalCost =
      !Number.isNaN(weeklyCostNum) && weeks > 0
        ? (weeklyCostNum * weeks).toFixed(2)
        : '';

    const costCenter = (obj.cost_center as string) || '';
    const sdId = (obj.servicedesk_id as string) || '';
    const host = (obj.host as string) || '';
    const startDate = (obj.start_date as string) || '';
    const endDate = (obj.end_date as string) || '';
    const projectCode = (obj.p_code as string) || '';
    const snapshot = (obj.snapshot as number) || 0;
    const sharedUsers = obj.sharedvm_users as string | string[] | null;

    const headerParts: string[] = [];
    headerParts.push(`- **${vmName}**`);
    if (ip) headerParts.push(`IP: ${ip}`);
    if (statusValue) headerParts.push(`Status: ${statusValue}`);

    lines.push(headerParts.join(' – '));

    const detailParts: string[] = [];
    if (flavor) detailParts.push(`Type: ${flavor}`);
    if (os) detailParts.push(`OS: ${os}`);
    if (cpu) detailParts.push(`CPU: ${cpu} vCPU`);
    if (ram) detailParts.push(`RAM: ${ram} GB`);
    if (hdd) detailParts.push(`Disk: ${hdd} GB`);
    if (weeklyCostRaw) detailParts.push(`Weekly cost: ${weeklyCostRaw}`);
    if (weeks) detailParts.push(`Weeks: ${weeks}`);
    if (costCenter) detailParts.push(`Cost center: ${costCenter}`);
    if (sdId) detailParts.push(`ServiceDesk: ${sdId}`);
    if (host) detailParts.push(`Host: ${host}`);
    if (startDate) detailParts.push(`Start: ${startDate}`);
    if (endDate) detailParts.push(`End: ${endDate}`);
    if (projectCode) detailParts.push(`Project code: ${projectCode}`);
    detailParts.push(`Snapshot: ${snapshot ? 'Yes' : 'No'}`);
    // sharedvm_users is intentionally not surfaced for now

    if (detailParts.length > 0) {
      lines.push('  ' + detailParts.join(' | '));
    }
  });

  lines.push(
    '',
    '> ℹ️ Fields above are inferred from the Everest RWS VM payload (rwsresources). ' +
      'Adjust as needed if the API contract changes.'
  );

  return lines.join('\n');
}

export function formatProjectAllocatedAssets(data: unknown, projectId: string): string {
  if (data == null) {
    return `No allocated asset data was returned for project **${projectId}** from Everest.`;
  }

  if (typeof data === 'string') {
    return `Everest allocated asset response for project **${projectId}**:\n\n${data}`;
  }

  const items: unknown[] = Array.isArray(data)
    ? data
    : Array.isArray((data as Record<string, unknown>).results)
      ? ((data as Record<string, unknown>).results as unknown[])
      : [data];

  if (items.length === 0) {
    return `No inventory / hardware / software assets found for project **${projectId}** in Everest.`;
  }

  const lines: string[] = [];
  lines.push(`**Everest allocated assets for project ${projectId}**`, '');

  items.forEach((item, index) => {
    if (!item || typeof item !== 'object') {
      lines.push(`- ${JSON.stringify(item)}`);
      return;
    }

    const obj = item as Record<string, unknown>;

    // Prefer flattened Everest fields (assert_*) when present, with fallbacks to generic names
    const name =
      (obj.assert_name as string) ||
      (obj.asset_name as string) ||
      (obj.hardware_name as string) ||
      (obj.software_name as string) ||
      (obj.hostname as string) ||
      (obj.name as string) ||
      `Asset #${index + 1}`;

    const id =
      (obj.assert_id as number | string | undefined)?.toString() ||
      (obj.asset_id as string) ||
      (obj.id as string) ||
      (obj.serial_number as string) ||
      (obj.tag as string) ||
      '';

    const type =
      (obj.type as string) ||
      (obj.assert_type as string) ||
      '';

    const category =
      (obj.category as string) ||
      (obj.asset_type as string) ||
      '';

    const status =
      (obj.status as string) ||
      (obj.state as string) ||
      '';

    const manufacturer =
      (obj.manufacture as string) ||
      (obj.manufacturer as string) ||
      '';

    const model = (obj.model as string) || '';
    const hostname = (obj.hostname as string) || '';

    const serial =
      (obj.assert_serialno as string) ||
      (obj.serial_number as string) ||
      '';

    const inventoryNumber =
      (obj.assert_inventory_number as string) ||
      '';

    const location = (obj.location as string) || '';

    const userFullname =
      (obj.user_fullname as string) ||
      '';

    const ownerFullname =
      (obj.owner_fullname as string) ||
      '';

    const projectName = (obj.projectname as string) || '';
    const projectStatus = (obj.project_status as string) || '';

    const submittedDate = (obj.submitted_date as string) || '';

    const headerParts: string[] = [];
    headerParts.push(`- **${name}**`);
    if (type) headerParts.push(`Type: ${type}`);
    if (status) headerParts.push(`Status: ${status}`);
    if (projectName) {
      headerParts.push(
        `Project: ${projectName}${projectStatus ? ` (${projectStatus})` : ''}`
      );
    }

    lines.push(headerParts.join(' – '));

    const detailParts: string[] = [];
    if (id) detailParts.push(`ID: ${id}`);
    if (serial) detailParts.push(`Serial: ${serial}`);
    if (inventoryNumber) detailParts.push(`Inventory: ${inventoryNumber}`);
    if (manufacturer) detailParts.push(`Manufacturer: ${manufacturer}`);
    if (model) detailParts.push(`Model: ${model}`);
    if (hostname) detailParts.push(`Hostname: ${hostname}`);
    if (location) detailParts.push(`Location: ${location}`);
    if (userFullname) detailParts.push(`User: ${userFullname}`);
    if (ownerFullname) detailParts.push(`Owner: ${ownerFullname}`);
    if (submittedDate) detailParts.push(`Submitted: ${submittedDate}`);

    if (detailParts.length > 0) {
      lines.push('  ' + detailParts.join(' | '));
    }
  });

  lines.push(
    '',
    '> ℹ️ Fields above are inferred from the Everest allocated assets payload (integration/myasset/allocatedassets). ' +
      'Adjust as needed if the API contract changes.'
  );

  return lines.join('\n');
}

export function formatUserAllocations(data: unknown, userId: string): string {
  if (data == null) {
    return `No resource allocations were returned for user **${userId}** from Everest.`;
  }

  if (typeof data === 'string') {
    return `Everest resource allocations for **${userId}**:\n\n${data}`;
  }

  const items: unknown[] = Array.isArray(data)
    ? data
    : Array.isArray((data as any).results)
    ? (data as any).results
    : [data];

  if (items.length === 0) {
    return `No active project allocations found for user **${userId}** in Everest.`;
  }

  const lines: string[] = [];
  lines.push(`**Everest project allocations for user ${userId}**`, '');

  items.forEach((item, index) => {
    if (!item || typeof item !== 'object') {
      lines.push(`- ${JSON.stringify(item)}`);
      return;
    }

    const obj = item as Record<string, unknown>;

    const projectId =
      (obj.project_id as string) ||
      (obj.project_details as string) ||
      ((obj.project_details as Record<string, unknown>)?.id as string) ||
      (obj.project_code as string) ||
      (obj.code as string) ||
      `Project #${index + 1}`;

    const projectName =
      (obj.project_name as string) ||
      (obj.project as string) ||
      (obj.name as string) ||
      ((obj.project_details as Record<string, unknown>)?.name as string) ||
      'Unnamed project';

    const role =
      (obj.role as string) ||
      (obj.designation as string) ||
      (obj.position as string) ||
      '';

    const allocationPct =
      (obj.allocation as number) || 0;

    const startDate =
      (obj.start_date as string) || '';

    const endDate =
      (obj.end_date as string) || '';

    // status need to calculate based on startDate and endDate and today's date, active, inactive, future
    const status =
      (startDate && endDate && new Date(startDate) < new Date() && new Date(endDate) > new Date()) ? 'Active' :
      (startDate && new Date(startDate) > new Date()) ? 'Future' :
      (endDate && new Date(endDate) < new Date()) ? 'Inactive' :
      'N/A';

    const parts: string[] = [];
    parts.push(`- **${projectName}** (${projectId})`);
    if (projectId) parts.push(`Project ID: ${projectId}`);
    if (projectName) parts.push(`Project Name: ${projectName}`);
    if (role) parts.push(`Role: ${role}`);
    if (typeof allocationPct === 'number') parts.push(`Allocation: ${allocationPct}%`);
    if (startDate) parts.push(`Start date: ${startDate}`);
    if (endDate) parts.push(`End date: ${endDate}`);
    if (status) parts.push(`Status: ${status}`);

    lines.push(parts.join(' – '));
  });

  lines.push(
    '',
    '> ℹ️ The fields above are inferred from the raw Everest resource API response. ' +
      'Field names may be adjusted once the final API contract is known.'
  );

  return lines.join('\n');
}

/** Extract list from API response (array or { results: [] }). */
function toItems(data: unknown): unknown[] {
  if (data == null) return [];
  if (Array.isArray(data)) return data;
  const res = (data as Record<string, unknown>).results;
  return Array.isArray(res) ? res : [data];
}

/** Format a single milestone item for display. */
function formatMilestoneItem(obj: Record<string, unknown>, index: number): string {
  const name = (obj.name as string) || `Milestone #${index + 1}`;
  const id = (obj.id as string) || (obj.milestone_id as string) || `Milestone #${index + 1}`;
  const description = (obj.description as string) || (obj.name as string) || `Milestone #${index + 1}`;
  const status = (obj.status as string) || (obj.state as string) || '';
  const state = (obj.state as string) || '';
  const type = (obj.type as string) || '';
  const startDate = (obj.start_date as string) || '';
  const deliveryDate = (obj.delivery_date as string) || '';
  const acceptancedate = (obj.acceptance_date as string) || '';
  const dependencies = ((obj.dependencies as Record<string, unknown>[]) || []).map((dependency: Record<string, unknown>) => dependency.id as string);
  const risks = ((obj.risks as Record<string, unknown>[]) || []).map((risk: Record<string, unknown>) => risk.id as string);
  const parts: string[] = [`- **${name}**`];
  if (id) parts.push(`ID: ${id}`);
  if (description) parts.push(`Description: ${description}`);
  if (status) parts.push(`Status: ${status}`);
  if (state) parts.push(`State: ${state}`);
  if (type) parts.push(`Type: ${type}`);
  if (startDate) parts.push(`Start date: ${startDate}`);
  if (deliveryDate) parts.push(`Delivery Date: ${deliveryDate}`);
  if (acceptancedate) parts.push(`Acceptance Date: ${acceptancedate}`);
  if (dependencies.length > 0) parts.push(`Dependencies: ${dependencies.join(', ')}`);
  if (risks.length > 0) parts.push(`Risks: ${risks.join(', ')}`);
  return parts.join(' – ');
}

function formatDependencyItem(obj: Record<string, unknown>, index: number): string {
  const description = (obj.description as string) || `Dependency #${index + 1}`;
  const dateIdentified = (obj.date_identified as string) || '';
  const targetETADate = (obj.target_eta_date as string) || '';
  const type = (obj.type as string) || '';
  const owner = ((obj.owner as Record<string, unknown>)?.full_name as string) || '';
  const ImpactedMilestones = ((obj.impacted_milestones as Record<string, unknown>[]) || []).map((milestone: Record<string, unknown>) => milestone.id as string);
  const Responsible = ((obj.responsible as Record<string, unknown>)?.full_name as string) || '';
  const Status = (obj.status as string) || '';
  const parts: string[] = [`- **${description}**`];
  if (dateIdentified) parts.push(`Date Identified: ${dateIdentified}`);
  if (targetETADate) parts.push(`Target ETA Date: ${targetETADate}`);
  if (type) parts.push(`Type: ${type}`);
  if (owner) parts.push(`Owner: ${owner}`);
  if (ImpactedMilestones.length > 0) parts.push(`Impacted Milestones: ${ImpactedMilestones.join(', ')}`);
  if (Responsible) parts.push(`Responsible: ${Responsible}`);
  if (Status) parts.push(`Status: ${Status}`);
  return parts.join(' – ');
}

export function formatProjectMilestones(data: unknown, projectId: string): string {
  const items = toItems(data);
  const lines: string[] = [];
  lines.push(`**Everest milestones for project ${projectId}**`, '');
  if (items.length === 0) {
    lines.push('No milestones returned for this project.', '');
  } else {
    items.forEach((item, i) => {
      if (item && typeof item === 'object') {
        lines.push(formatMilestoneItem(item as Record<string, unknown>, i));
      } else {
        lines.push(`- ${JSON.stringify(item)}`);
      }
    });
  }
  lines.push('', '> ℹ️ Fields are inferred from the raw Everest API response.');
  return lines.join('\n');
}

export function formatProjectDependencies(data: unknown, projectId: string): string {
  const items = toItems(data);
  const lines: string[] = [];
  lines.push(`**Everest dependencies for project ${projectId}**`, '');

  if (items.length === 0) {
    lines.push('No dependencies returned for this project.', '');
  } else {
    items.forEach((item, i) => {
      if (item && typeof item === 'object') {
        lines.push(formatDependencyItem(item as Record<string, unknown>, i));
      } else {
        lines.push(`- ${JSON.stringify(item)}`);
      }
    });
  }

  lines.push('', '> ℹ️ Fields are inferred from the raw Everest API response.');
  return lines.join('\n');
}

function formatRiskItem(obj: Record<string, unknown>, index: number): string {
  const description = (obj.risk_description as string) || `Risk #${index + 1}`;
  const status = (obj.status as string) || '';
  const ETA = (obj.eta as string) || '';
  const category = (obj.category as string) || '';
  const source = (obj.source as string) || '';
  const severity = (obj.severity as string) || '';
  const owner = ((obj.owner as Record<string, unknown>)?.full_name as string) || '';
  const ImpactedMilestones = ((obj.impacted_milestones as Record<string, unknown>[]) || []).map((milestone: Record<string, unknown>) => milestone.id as string);
  const contingency_date = (obj.contingency_date as string) || '';
  const contingency_plan = (obj.contingency_plan as string) || '';
  const mitigation_plan = (obj.mitigation_plan as string) || '';
  const mitigation_date = (obj.mitigation_date as string) || '';
  const parts: string[] = [`- **${description}**`];
  if (status) parts.push(`Status: ${status}`);
  if (ETA) parts.push(`ETA: ${ETA}`);
  if (category) parts.push(`Category: ${category}`);
  if (source) parts.push(`Source: ${source}`);
  if (severity) parts.push(`Severity: ${severity}`);
  if (owner) parts.push(`Owner: ${owner}`);
  if (ImpactedMilestones.length > 0) parts.push(`Impacted Milestones: ${ImpactedMilestones.join(', ')}`);
  if (contingency_date) parts.push(`Contingency Date: ${contingency_date}`);
  if (contingency_plan) parts.push(`Contingency Plan: ${contingency_plan}`);
  if (mitigation_plan) parts.push(`Mitigation Plan: ${mitigation_plan}`);
  if (mitigation_date) parts.push(`Mitigation Date: ${mitigation_date}`);
  return parts.join(' – ');
}

export function formatProjectRisks(data: unknown, projectId: string): string {
  const items = toItems(data);
  const lines: string[] = [];
  lines.push(`**Everest risks for project ${projectId}**`, '');
  if (items.length === 0) {
    lines.push('No risks returned for this project.', '');
  } else {
    items.forEach((item, i) => {
      if (item && typeof item === 'object') {
        lines.push(formatRiskItem(item as Record<string, unknown>, i));
      } else {
        lines.push(`- ${JSON.stringify(item)}`);
      }
    });
  }
  lines.push('', '> ℹ️ Fields are inferred from the raw Everest API response.');
  return lines.join('\n');
}

function formatTimesheetEntry(obj: Record<string, unknown>, index: number): string {
  const date = (obj.date as string) || (obj.work_date as string) || (obj.log_date as string) || '';
  const project = (obj.project_name as string) || (obj.project as string) || (obj.project_details as string) || '';
  const hours = (obj.hours as number) ?? (obj.hours_logged as number) ?? (obj.quantity as number);
  const description = (obj.description as string) || (obj.notes as string) || (obj.comment as string) || '';
  const task = (obj.task as string) || (obj.task_name as string) || (obj.activity as string) || '';
  const parts: string[] = [`- **${date || 'N/A'}**`];
  if (project) parts.push(`Project: ${project}`);
  if (typeof hours === 'number') parts.push(`Hours: ${hours}`);
  if (task) parts.push(`Task: ${task}`);
  if (description) parts.push(`Description: ${description}`);
  return parts.join(' – ');
}

/** Get day label "DD DAY" for a date string YYYY-MM-DD */
function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDate();
  const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  return `${day} ${dayName}`;
}

/** List dates between fromDate and toDate (inclusive), YYYY-MM-DD */
function listDatesInRange(fromDate: string, toDate: string): string[] {
  const out: string[] = [];
  const from = new Date(fromDate + 'T12:00:00');
  const to = new Date(toDate + 'T12:00:00');
  const cur = new Date(from);
  while (cur <= to) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/** Parse date_durations_hours_minutes value like "8h 0m" or "8h 30m" to hours (number) */
function parseHoursMinutes(value: unknown): number {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value !== 'string') return 0;
  const match = value.match(/(\d+)\s*h(?:ours?|r?)?\s*(\d*)\s*m(?:in)?/i) || value.match(/(\d+)/);
  if (!match) return 0;
  const hours = parseInt(match[1], 10) || 0;
  const mins = match[2] ? parseInt(match[2], 10) || 0 : 0;
  return hours + mins / 60;
}

/** Build per-day record: logged (white), attendance (green), laptop (yellow) from API maps */
function getLoggedHoursByDate(ud: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {};
  const dateDurations = (ud.date_durations as Record<string, number>) || {};
  const dateDurationsHrsMins = (ud.date_durations_hours_minutes as Record<string, unknown>) || {};
  for (const date of Object.keys(dateDurationsHrsMins)) {
    out[date] = parseHoursMinutes(dateDurationsHrsMins[date]);
  }
  for (const date of Object.keys(dateDurations)) {
    const v = dateDurations[date];
    if (typeof v === 'number' && !(date in out)) {
      out[date] = v > 24 ? v / 3600 : v; // assume seconds if > 24
    }
  }
  return out;
}

export function formatMyTimesheet(
  data: unknown,
  username: string,
  fromDate?: string,
  toDate?: string
): string {
  if (data == null) {
    return `No timesheet data was returned for user **${username}** from Everest.`;
  }
  if (typeof data === 'string') {
    return `Everest timesheet response for **${username}**:\n\n${data}`;
  }

  const obj = data as Record<string, unknown>;
  const results = obj.results as Record<string, unknown> | undefined;
  const userData = results?.[username];
  if (!userData || typeof userData !== 'object') {
    return `No timesheet data found for user **${username}** in the Everest response.`;
  }

  const ud = userData as Record<string, unknown>;
  const totalWorkingHours = (ud.total_working_hours as Record<string, number>) || {};
  const laptopLogs = (ud.laptop_logs as Record<string, number>) || {};
  const attendanceLogs = (ud.attendance_logs as Record<string, number>) || {};
  const loggedByDate = getLoggedHoursByDate(ud);
  const timeoffList = (ud.timeoff as unknown[]) || [];
  const laptopDuration = (ud.laptop_duration as number) ?? 0;
  const duration = (ud.duration as number) ?? 0;
  const date_durations = (ud.date_durations as Record<string, number>) || {};

  const timeoffByDate: Record<string, string> = {};
  for (const t of timeoffList) {
    if (t && typeof t === 'object') {
      const tObj = t as Record<string, unknown>;

      // Support both single-day and ranged timeoff entries.
      const startRaw =
        (tObj.date as string) ||
        (tObj.leave_date as string) ||
        (tObj.startDate as string) ||
        (tObj.physicalStartDate as string);
      const endRaw =
        (tObj.endDate as string) ||
        (tObj.physicalEndDate as string) ||
        startRaw;

      if (!startRaw) continue;

      const start = String(startRaw).slice(0, 10);
      const end = String(endRaw ?? startRaw).slice(0, 10);
      const label = 'PTO';

      const range = listDatesInRange(start, end);
      for (const d of range) {
        timeoffByDate[d] = label;
      }
    }
  }

  const holidayDates = new Set<string>();
  const holidaysList = ((ud.Holidays ?? ud.holidays) as unknown[]) || [];
  for (const h of holidaysList) {
    if (typeof h === 'string') {
      holidayDates.add(h.slice(0, 10));
    } else if (h && typeof h === 'object') {
      const o = h as Record<string, unknown>;
      const d = (o.date ?? o.holiday_date ?? o.Date) as string | undefined;
      if (d) holidayDates.add(String(d).slice(0, 10));
    }
  }

  const allDates = new Set<string>([
    ...Object.keys(totalWorkingHours),
    ...Object.keys(laptopLogs),
    ...Object.keys(attendanceLogs),
    ...Object.keys(loggedByDate),
    ...Object.keys(timeoffByDate),
    ...Object.keys(date_durations),
    ...holidayDates,
  ]);
  let dateRange: string[];
  if (fromDate && toDate) {
    dateRange = listDatesInRange(fromDate, toDate);
  } else if (allDates.size > 0) {
    const sorted = Array.from(allDates).sort();
    dateRange = listDatesInRange(sorted[0], sorted[sorted.length - 1]);
  } else {
    dateRange = [];
  }

  const lines: string[] = [];
  lines.push(`**Everest timesheet for ${username}**`, '');

  if (dateRange.length === 0) {
    lines.push('No date range or entries in the response.', '');
    lines.push('', '> ℹ️ Use `from_date` and `to_date` (YYYY-MM-DD) to set the week range.');
    return lines.join('\n');
  }

  const dayHeaders = dateRange.map((d) => getDayLabel(d));
  const headerRow = [...dayHeaders];
  const separator = headerRow.map(() => '---');
  lines.push('| ' + headerRow.join(' | ') + ' |');
  lines.push('| ' + separator.join(' | ') + ' |');

  const plannedCells: string[] = dateRange.map((d) => {
    const leave = timeoffByDate[d];
    const isHoliday = holidayDates.has(d);
    let cell: string;
    if (leave) {
      cell = leave;
    } else if (isHoliday) {
      cell = 'Holiday';
    } else {
      const hrs = totalWorkingHours[d] || date_durations[d];
      cell = typeof hrs === 'number' ? String(hrs) : ' ';
    }
    return cell;
  });
  lines.push('| ' + plannedCells.join(' | ') + ' |');

  return lines.join('\n');
}

/**
 * Format team timesheet (multiple users under a manager) as a single table.
 * Layout mirrors formatMyTimesheet; extra first column shows user full name (if available) + username.
 * Columns: User Full Name | Username | Total (Hrs) | Leaves | day1 | day2 | ...
 */
export function formatMyTeamTimesheet(
  data: unknown,
  managerUsername: string,
  fromDate?: string,
  toDate?: string
): string {
  if (data == null) {
    return `No team timesheet data was returned for manager **${managerUsername}** from Everest.`;
  }
  if (typeof data === 'string') {
    return `Everest team timesheet response for **${managerUsername}**:\n\n${data}`;
  }

  const obj = data as Record<string, unknown>;
  const results = (obj.results as Record<string, unknown>) || {};
  const usernames = Object.keys(results).filter((k) => results[k] != null && typeof results[k] === 'object');
  if (usernames.length === 0) {
    return `No team timesheet data found for manager **${managerUsername}** in the Everest response.`;
  }

  const allDates = new Set<string>();
  for (const uname of usernames) {
    const ud = results[uname] as Record<string, unknown>;
    const twh = (ud.total_working_hours as Record<string, number>) || {};
    const ll = (ud.laptop_logs as Record<string, number>) || {};
    const al = (ud.attendance_logs as Record<string, number>) || {};
    const timeoffList = (ud.timeoff as unknown[]) || [];
    const holidaysList = ((ud.Holidays ?? ud.holidays) as unknown[]) || [];
    Object.keys(twh).forEach((d) => allDates.add(d));
    Object.keys(ll).forEach((d) => allDates.add(d));
    Object.keys(al).forEach((d) => allDates.add(d));
    let userFullName = fetchEverestUserDetails_field(uname, ['full_name']);
    for (const t of timeoffList) {
      if (t && typeof t === 'object') {
        const d = ((t as Record<string, unknown>).date ?? (t as Record<string, unknown>).leave_date) as string | undefined;
        if (d) allDates.add(d.slice(0, 10));
      }
    }
    for (const h of holidaysList) {
      if (typeof h === 'string') allDates.add(h.slice(0, 10));
      else if (h && typeof h === 'object') {
        const d = ((h as Record<string, unknown>).date ?? (h as Record<string, unknown>).holiday_date) as string | undefined;
        if (d) allDates.add(String(d).slice(0, 10));
      }
    }
  }

  let dateRange: string[];
  if (fromDate && toDate) {
    dateRange = listDatesInRange(fromDate, toDate);
  } else if (allDates.size > 0) {
    const sorted = Array.from(allDates).sort();
    dateRange = listDatesInRange(sorted[0], sorted[sorted.length - 1]);
  } else {
    dateRange = [];
  }

  if (dateRange.length === 0) {
    return `**Everest team timesheet for ${managerUsername}**\n\nNo date range or entries. Use \`from_date\` and \`to_date\` (YYYY-MM-DD).`;
  }

  const dayHeaders = dateRange.map((d) => getDayLabel(d));
  const headerRow = ['User Full Name', 'Username', ...dayHeaders];
  const separator = headerRow.map(() => '---');
  const lines: string[] = [];
  lines.push(`**Everest team timesheet (manager: ${managerUsername})**`, '');
  lines.push('| ' + headerRow.join(' | ') + ' |');
  lines.push('| ' + separator.join(' | ') + ' |');

  for (const username of usernames) {
    const ud = results[username] as Record<string, unknown>;
    const loggedByDate = getLoggedHoursByDate(ud);
    const totalWorkingHours = (ud.total_working_hours as Record<string, number>) || loggedByDate || {};
    const laptopLogs = (ud.laptop_logs as Record<string, number>) || {};
    const attendanceLogs = (ud.attendance_logs as Record<string, number>) || {};
    const timeoffList = (ud.timeoff as unknown[]) || [];
    const laptopDuration = (ud.laptop_duration as number) ?? 0;
    const duration = (ud.duration as number) ?? 0;
    const date_durations = (ud.date_durations as Record<string, number>) || {};
    const timeoffByDate: Record<string, string> = {};
    let userFullName = (ud.user_fullname as string) || '';
    for (const t of timeoffList) {
      if (t && typeof t === 'object') {
        const tObj = t as Record<string, unknown>;

        // Support both single-day and ranged timeoff entries.
        const startRaw =
          (tObj.date as string) ||
          (tObj.leave_date as string) ||
          (tObj.startDate as string) ||
          (tObj.physicalStartDate as string);
        const endRaw =
          (tObj.endDate as string) ||
          (tObj.physicalEndDate as string) ||
          startRaw;

        if (!startRaw) continue;

        const start = String(startRaw).slice(0, 10);
        const end = String(endRaw ?? startRaw).slice(0, 10);
        const label = 'PTO';

        const range = listDatesInRange(start, end);
        for (const d of range) {
          timeoffByDate[d] = label;
        }
      }
    }

    const holidayDates = new Set<string>();
    const holidaysList = ((ud.Holidays ?? ud.holidays) as unknown[]) || [];
    for (const h of holidaysList) {
      if (typeof h === 'string') holidayDates.add(h.slice(0, 10));
      else if (h && typeof h === 'object') {
        const o = h as Record<string, unknown>;
        const d = (o.date ?? o.holiday_date ?? o.Date) as string | undefined;
        if (d) holidayDates.add(String(d).slice(0, 10));
      }
    }

    const dayCells = dateRange.map((d) => {
      const leave = timeoffByDate[d];
      const isHoliday = holidayDates.has(d);
      let cell: string;
      if (leave) {
        cell = leave;
      } else if (isHoliday) {
        cell = 'Holiday';
      } else {
        const hrs = totalWorkingHours[d] || date_durations[d];
        cell = typeof hrs === 'number' ? String(hrs) : '0';
      }
      return cell;
    });

    const row = [userFullName, username, ...dayCells];
    lines.push('| ' + row.join(' | ') + ' |');
  }

  return lines.join('\n');
}

// ─── New formatter functions ────────────────────────────────────────────────

export function formatProjectChangeRequests(data: unknown, projectId: string): string {
  const items = toItems(data);
  const lines: string[] = [];
  lines.push(`**Everest change requests for project ${projectId}**`, '');

  if (items.length === 0) {
    lines.push('No change requests found for this project.', '');
  } else {
    items.forEach((item, i) => {
      if (!item || typeof item !== 'object') {
        lines.push(`- ${JSON.stringify(item)}`);
        return;
      }
      const obj = item as Record<string, unknown>;
      // Backend CR_GET serializer: id, project_details, submitter, assignee, status, CRDetail, submitted_date, reason, description
      const id = (obj.id as string) || `CR #${i + 1}`;
      const crDetail = (obj.CRDetail as string) || (obj.title as string) || (obj.name as string) || 'Untitled';
      const status = (obj.status as string) || '';
      const submitter = (obj.submitter as string) || '';
      const assignee = (obj.assignee as string) || '';
      const submittedDate = (obj.submitted_date as string) || '';
      const reason = (obj.reason as string) || '';
      const description = (obj.description as string) || '';

      const parts: string[] = [`- **${crDetail}** (${id})`];
      if (status) parts.push(`Status: ${status}`);
      if (submitter) parts.push(`Submitter: ${submitter}`);
      if (assignee) parts.push(`Assignee: ${assignee}`);
      if (submittedDate) parts.push(`Submitted: ${submittedDate}`);
      if (reason) parts.push(`Reason: ${reason}`);
      if (description) parts.push(`Description: ${description.slice(0, 100)}${description.length > 100 ? '…' : ''}`);
      lines.push(parts.join(' – '));
    });
  }

  lines.push('', '> ℹ️ Fields are inferred from the raw Everest CR API response.');
  return lines.join('\n');
}

export function formatProjectStakeholders(data: unknown, projectId: string): string {
  const items = toItems(data);
  const lines: string[] = [];
  lines.push(`**Everest stakeholders for project ${projectId}**`, '');

  if (items.length === 0) {
    lines.push('No stakeholders found for this project.', '');
  } else {
    items.forEach((item, i) => {
      if (!item || typeof item !== 'object') {
        lines.push(`- ${JSON.stringify(item)}`);
        return;
      }
      const obj = item as Record<string, unknown>;
      // Backend serializer: id, name, role, project_details, email, type, full_name, employee_id
      const name = (obj.full_name as string) || (obj.name as string) || `Stakeholder #${i + 1}`;
      const role = (obj.role as string) || '';
      const email = (obj.email as string) || '';
      const type = (obj.type as string) || '';
      const employeeId = (obj.employee_id as string) || '';
      const id = (obj.id as string) || '';

      const parts: string[] = [`- **${name}**`];
      if (role) parts.push(`Role: ${role}`);
      if (type) parts.push(`Type: ${type}`);
      if (email) parts.push(`Email: ${email}`);
      if (employeeId) parts.push(`Employee ID: ${employeeId}`);
      if (id) parts.push(`ID: ${id}`);
      lines.push(parts.join(' – '));
    });
  }

  lines.push('', '> ℹ️ Fields are inferred from the raw Everest stakeholders API response.');
  return lines.join('\n');
}

export function formatProjectTimesheet(
  data: unknown,
  projectId: string,
  fromDate?: string,
  toDate?: string
): string {
  if (data == null) {
    return `No timesheet data was returned for project **${projectId}** from Everest.`;
  }
  if (typeof data === 'string') {
    return `Everest project timesheet response for **${projectId}**:\n\n${data}`;
  }

  const obj = data as Record<string, unknown>;
  const results = (obj.results as Record<string, unknown>) || {};
  const usernames = Object.keys(results).filter((k) => results[k] != null && typeof results[k] === 'object');

  if (usernames.length === 0) {
    return `No timesheet data found for project **${projectId}** in the Everest response.`;
  }

  const allDates = new Set<string>();
  for (const uname of usernames) {
    const ud = results[uname] as Record<string, unknown>;
    const twh = (ud.total_working_hours as Record<string, number>) || {};
    const dd = (ud.date_durations as Record<string, number>) || {};
    Object.keys(twh).forEach((d) => allDates.add(d));
    Object.keys(dd).forEach((d) => allDates.add(d));
  }

  let dateRange: string[];
  if (fromDate && toDate) {
    dateRange = listDatesInRange(fromDate, toDate);
  } else if (allDates.size > 0) {
    const sorted = Array.from(allDates).sort();
    dateRange = listDatesInRange(sorted[0], sorted[sorted.length - 1]);
  } else {
    dateRange = [];
  }

  if (dateRange.length === 0) {
    return `**Everest project timesheet for ${projectId}**\n\nNo date range or entries. Use \`from_date\` and \`to_date\` (YYYY-MM-DD).`;
  }

  const dayHeaders = dateRange.map((d) => getDayLabel(d));
  const headerRow = ['Full Name','Username', ...dayHeaders];
  const separator = headerRow.map(() => '---');
  const lines: string[] = [];
  lines.push(`**Everest project timesheet for ${projectId}**`, '');
  lines.push('| ' + headerRow.join(' | ') + ' |');
  lines.push('| ' + separator.join(' | ') + ' |');

  for (const username of usernames) {
    const ud = results[username] as Record<string, unknown>;
    const loggedByDate = getLoggedHoursByDate(ud);
    const dateDurations = (ud.date_durations as Record<string, number>) || {};
    const fullName = (ud.user_fullname as string) || '';
    const dayCells = dateRange.map((d) => {
      const hrs = dateDurations[d] ?? 0;
      return String(hrs);
    });

    const row = [fullName, username, ...dayCells];
    lines.push('| ' + row.join(' | ') + ' |');
  }

  return lines.join('\n');
}

export function formatTimesheetSubmitResult(data: unknown): string {
  if (data == null) {
    return 'No response was returned from the Everest timesheet submission API.';
  }
  if (typeof data === 'string') return data;

  const obj = data as Record<string, unknown>;
  const status = (obj.status as string) || (obj.message as string) || '';
  const id = (obj.id as string) || '';

  const lines: string[] = ['**Timesheet submission result**', ''];
  if (id) lines.push(`- **ID:** ${id}`);
  if (status) lines.push(`- **Status:** ${status}`);
  lines.push('', '```json', JSON.stringify(obj, null, 2), '```');
  return lines.join('\n');
}

export function formatTimesheetApproveResult(data: unknown): string {
  if (data == null) {
    return 'No response was returned from the Everest timesheet approval API.';
  }
  if (typeof data === 'string') return data;

  const obj = data as Record<string, unknown>;
  const status = (obj.status as string) || (obj.message as string) || '';
  const id = (obj.id as string) || '';

  const lines: string[] = ['**Timesheet approval result**', ''];
  if (id) lines.push(`- **ID:** ${id}`);
  if (status) lines.push(`- **Status:** ${status}`);
  lines.push('', '```json', JSON.stringify(obj, null, 2), '```');
  return lines.join('\n');
}

export function formatPendingActions(data: unknown, username: string): string {
  console.log('pending action called with username:', username);
  if (data == null) {
    return `No pending actions data was returned for user **${username}** from Everest.`;
  }
  if (typeof data === 'string') {
    return `Everest pending actions for **${username}**:\n\n${data}`;
  }

  const items = toItems(data);

  if (items.length === 0) {
    return `No pending actions found for user **${username}** in Everest.`;
  }

  // Status codes: 0=Draft, 1=Waiting for Approval, 2=Approved, 3=Rejected, 4=Withdrawn
  const statusMap: Record<number, string> = {
    0: 'Draft',
    1: 'Waiting for Approval',
    2: 'Approved',
    3: 'Rejected',
    4: 'Withdrawn',
  };

  const lines: string[] = [];
  lines.push(`**Everest pending timesheet approvals for ${username}**`, '');

  items.forEach((item, i) => {
    if (!item || typeof item !== 'object') {
      lines.push(`- ${JSON.stringify(item)}`);
      return;
    }
    const obj = item as Record<string, unknown>;
    const id = (obj.id as string) || `#${i + 1}`;
    const rawStatus = obj.status as number | string;
    const statusLabel = typeof rawStatus === 'number' ? (statusMap[rawStatus] || String(rawStatus)) : (rawStatus as string) || 'Pending';
    const userObj = (obj.user as Record<string, unknown>) || {};
    const submitterName = (userObj.full_name as string) || (userObj.username as string) || (obj.user as string) || '';
    const startDate = (obj.start_date as string) || '';
    const endDate = (obj.end_date as string) || '';
    const totalHours = (obj.total_hours as number) ?? '';
    const comment = (obj.comment as string) || '';

    const parts: string[] = [`- **Timesheet Approval** (${id})`];
    if (submitterName) parts.push(`From: ${submitterName}`);
    if (statusLabel) parts.push(`Status: ${statusLabel}`);
    if (startDate) parts.push(`Start: ${startDate}`);
    if (endDate) parts.push(`End: ${endDate}`);
    if (totalHours !== '') parts.push(`Total Hours: ${totalHours}`);
    if (comment) parts.push(`Comment: ${comment}`);
    lines.push(parts.join(' – '));
  });

  lines.push('', '> ℹ️ Fields are inferred from the raw Everest pending actions API response.');
  return lines.join('\n');
}

export function formatAssignedIssues(
  data: unknown,
  username: string,
  statusFilter?: string
): string {
  let items = toItems(data);

  // ── Filter by status ───────────────────────────────────────────
  if (statusFilter) {
    const STATUS_MAP: Record<string, string[]> = {
      'open':        ['submitted', 'in progress', 'open', 'new', 'assigned', 'reopened'],
      'closed':      ['closed', 'completed', 'resolved', 'done'],
      'completed':   ['completed', 'closed', 'resolved', 'done'],
      'in progress': ['in progress'],
      'submitted':   ['submitted'],
    };
    const mapped = STATUS_MAP[statusFilter.toLowerCase()] || [statusFilter.toLowerCase()];
    items = items.filter(item => {
      const obj = item as Record<string, unknown>;
      const s = String(obj.status || '').toLowerCase();
      return mapped.some(m => s.includes(m));
    });
  }

  const lines: string[] = [];

  if (items.length === 0) {
    lines.push(`No **${statusFilter || ''}** issues found for user **${username}** in Everest.`);
    return lines.join('\n');
  }

  lines.push(`**Assigned Issues for ${username}** — ${items.length} total`, '');

  // ── Table header ────────────────────────────────────────────────
  lines.push('| # | Task ID | Project | Title | Status | Priority | Reporter | Assignee |');
  lines.push('|---|---------|---------|-------|--------|----------|----------|----------|');

  items.forEach((item, i) => {
    if (!item || typeof item !== 'object') return;

    const obj = item as Record<string, unknown>;

    // ── Task ID — already full like "AKA-359240" ─────────────────
    const taskId = (obj.task_id as string) || '';
    const numericId = String(obj.id || '');
    const title = (obj.title as string) || 'Untitled';
    const status = (obj.status as string) || '—';
    const priority = (obj.priority as string) || '—';

    // ── Project ──────────────────────────────────────────────────
    const projectObj = obj.project as Record<string, unknown> | null;
    const projectName = (projectObj?.name as string) || '—';

    // ── Reporter — use created_by.full_name ──────────────────────
    const createdByObj = obj.created_by as Record<string, unknown> | null;
    const reporter = (createdByObj?.full_name as string)
      || (createdByObj?.username as string)
      || '—';

    // ── Assignee — use assigned_to.full_name ─────────────────────
    const assigneeObj = obj.assigned_to as Record<string, unknown> | null;
    const assignee = (assigneeObj?.full_name as string)
      || (assigneeObj?.username as string)
      || '—';

    // ── Task detail link ─────────────────────────────────────────
    const taskUrl = `${EVEREST_BASE_URL}/pm#/apps/tasks/${numericId}/details`;
    const taskLink = numericId
      ? `[${taskId}](${taskUrl})`
      : taskId;

    lines.push(
      `| ${i + 1} | ${taskLink} | ${projectName} | ${title} | ${status} | ${priority} | ${reporter} | ${assignee} |`
    );
  });

  lines.push('');
  lines.push(`> 🔗 [View all tasks in Everest](${EVEREST_BASE_URL}/pm#/project)`);

  return lines.join('\n');
}

/** Format a single Everest task/issue record (detail API or list row). */
export function formatTaskDetail(data: unknown, requestedTaskId: string): string {
  if (data == null || typeof data !== 'object') {
    return (
      `Task **${requestedTaskId}** was not found in Everest.\n\n` +
      'Use the numeric task id or the full task key (e.g. PROJ-12345) from Everest.'
    );
  }

  const obj = data as Record<string, unknown>;
  const taskKey = (obj.task_id as string) || requestedTaskId;
  const numericId = String(obj.id ?? '');
  const title = (obj.title as string) || 'Untitled';
  const status = (obj.status as string) || '—';
  const priority = (obj.priority as string) || '—';

  const projectObj = obj.project as Record<string, unknown> | null;
  const projectName = (projectObj?.name as string) || '—';

  const createdByObj = obj.created_by as Record<string, unknown> | null;
  const reporter =
    (createdByObj?.full_name as string) || (createdByObj?.username as string) || '—';

  const assigneeObj = obj.assigned_to as Record<string, unknown> | null;
  const assignee =
    (assigneeObj?.full_name as string) || (assigneeObj?.username as string) || '—';

  const description = (obj.description as string) || (obj.details as string) || '';

  const lines: string[] = [];
  lines.push(`**Everest task – ${title}**`, '');
  lines.push(`- **Task ID:** ${taskKey}`);
  if (numericId) {
    const taskUrl = `${EVEREST_BASE_URL}/pm#/apps/tasks/${numericId}/details`;
    lines.push(`- **Open in Everest:** [View task](${taskUrl})`);
  }
  lines.push(`- **Status:** ${status}`);
  lines.push(`- **Priority:** ${priority}`);
  lines.push(`- **Project:** ${projectName}`);
  lines.push(`- **Reporter:** ${reporter}`);
  lines.push(`- **Assignee:** ${assignee}`);
  if (description.trim()) {
    lines.push('', '**Description**', '', description.trim());
  }

  lines.push(
    '',
    '> ℹ️ Fields above are derived from the Everest API response. Full payload:',
    '',
    '```json',
    JSON.stringify(obj, null, 2),
    '```'
  );

  return lines.join('\n');
}

export function formatLogTimeResult(data: unknown): string {
  if (data == null) {
    return 'No response was returned from the Everest log time API.';
  }
  if (typeof data === 'string') return data;

  const obj = data as Record<string, unknown>;
  const status = (obj.status as string) || (obj.message as string) || 'Success';
  const id = (obj.id as string) || '';

  const lines: string[] = ['**Time log result**', ''];
  if (id) lines.push(`- **ID:** ${id}`);
  lines.push(`- **Status:** ${status}`);
  lines.push('', '```json', JSON.stringify(obj, null, 2), '```');
  return lines.join('\n');
}

export function formatProjectFinance(
  financeData: unknown,
  projectId: string
): string {
  const lines: string[] = [];
  lines.push(`**Everest finance details for project ${projectId}**`, '');

  if (financeData == null) {
    lines.push('No finance details found for this project.', '');
    lines.push('> ℹ️ Fields are inferred from the raw Everest finance API response.');
    return lines.join('\n');
  }

  // The backend returns: { planned, actual, planned_total_cost, actual_total_cost }
  const obj = (typeof financeData === 'object' && !Array.isArray(financeData))
    ? financeData as Record<string, unknown>
    : null;

  if (obj) {
    const plannedTotal = obj.planned_total_cost;
    const actualTotal = obj.actual_total_cost;

    // Planned costs
    const planned = obj.planned as unknown[];
    if (Array.isArray(planned) && planned.length > 0) {
      lines.push('### Planned Costs', '');
      planned.forEach((item) => {
        if (!item || typeof item !== 'object') return;
        const p = item as Record<string, unknown>;
        const text = (p.text as string) || '';
        const cost = p.cost;
        const parts: string[] = [`- **${text || 'Item'}**`];
        if (cost != null) parts.push(`Cost: ${cost}`);
        lines.push(parts.join(' – '));
      });
      if (plannedTotal != null) lines.push(``, `**Planned Total Cost:** ${plannedTotal}`);
      lines.push('');
    }

    // Actual costs
    const actual = obj.actual as unknown[];
    if (Array.isArray(actual) && actual.length > 0) {
      lines.push('### Actual Costs', '');
      actual.forEach((item) => {
        if (!item || typeof item !== 'object') return;
        const a = item as Record<string, unknown>;
        const text = (a.text as string) || '';
        const cost = a.cost;
        const parts: string[] = [`- **${text || 'Item'}**`];
        if (cost != null) parts.push(`Cost: ${cost}`);
        lines.push(parts.join(' – '));
      });
      if (actualTotal != null) lines.push(``, `**Actual Total Cost:** ${actualTotal}`);
      lines.push('');
    }

    if ((!planned || planned.length === 0) && (!actual || actual.length === 0)) {
      // Fallback: print raw if structure doesn't match expected
      lines.push('```json', JSON.stringify(obj, null, 2), '```', '');
    }
  } else {
    // Array or unexpected structure — fall back
    const items = toItems(financeData);
    items.forEach((item, i) => {
      if (!item || typeof item !== 'object') {
        lines.push(`- ${JSON.stringify(item)}`);
        return;
      }
      const fObj = item as Record<string, unknown>;
      const category = (fObj.category as string) || (fObj.type as string) || `Item #${i + 1}`;
      const amount = (fObj.amount as number) ?? (fObj.cost as number) ?? '';
      const currency = (fObj.currency as string) || '';
      const parts: string[] = [`- **${category}**`];
      if (amount !== '') parts.push(`Amount: ${currency ? currency + ' ' : ''}${amount}`);
      lines.push(parts.join(' – '));
    });
    lines.push('');
  }

  lines.push('> ℹ️ Fields are inferred from the raw Everest finance API response.');
  return lines.join('\n');
}
