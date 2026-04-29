/**
 * @file lib/modules/ereq/formatters.ts
 *
 * LLM-friendly response formatters for ereq (P2P Dashboard) tool results.
 */

// ─── Helpers ────────────────────────────────────────────────────────────────────

function currency(val: unknown): string {
  const num = Number(val);
  if (isNaN(num) || val === null || val === undefined) return '$0.00';
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function num(val: unknown): string {
  const n = Number(val);
  if (isNaN(n) || val === null || val === undefined) return '0';
  return n.toLocaleString('en-US');
}

function formatDateNoTimezone(val: unknown): string {
  if (val === null || val === undefined) return 'N/A';
  const s = String(val).trim();
  if (!s) return 'N/A';

  // Prefer date-only portion to avoid timezone day-shift.
  const datePart = s.includes('T') ? s.split('T')[0] : s.split(' ')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    const [y, m, d] = datePart.split('-').map((x) => Number(x));
    const month = new Date(Date.UTC(y, (m || 1) - 1, d || 1)).toLocaleString('en-US', {
      month: 'short',
      timeZone: 'UTC',
    });
    return `${month} ${d}, ${y}`;
  }

  const dt = new Date(s);
  if (!isNaN(dt.getTime())) {
    const month = dt.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
    return `${month} ${dt.getUTCDate()}, ${dt.getUTCFullYear()}`;
  }

  return s;
}

function pickByCaseInsensitiveKeys(rec: Record<string, unknown>, candidateKeys: string[]): unknown {
  const keys = Object.keys(rec);
  const lowerToActual = new Map<string, string>();
  for (const k of keys) lowerToActual.set(k.toLowerCase(), k);

  for (const candidate of candidateKeys) {
    const actualKey = lowerToActual.get(candidate.toLowerCase());
    if (!actualKey) continue;
    const v = rec[actualKey];
    if (v === null || v === undefined) continue;
    const str = String(v).trim();
    if (!str) continue;
    return v;
  }

  return undefined;
}

const StatusChoice: Array<[number, string]> = [
  [0, 'Saved'],
  [1, 'Submitted'],
  [2, 'Approved'],
  [3, 'Rejected'],
  [4, 'AbortedByError'],
  [5, 'AbortedByRequester'],
  [6, 'AbortedByAdmin'],
  [7, 'AbortedByExpiration'],
  [8, 'Completed'],
  [9, 'Submitted for PO Creation'],
];

function mapStatusNumberToLabel(status: unknown): unknown {
  if (status === null || status === undefined) return status;
  if (typeof status === 'number' && Number.isFinite(status)) {
    const found = StatusChoice.find(([n]) => n === status);
    return found ? found[1] : status;
  }

  const s = String(status).trim();
  if (!/^-?\d+$/.test(s)) return status;
  const n = Number(s);
  const found = StatusChoice.find(([code]) => code === n);
  return found ? found[1] : status;
}

// ─── Public Formatters ──────────────────────────────────────────────────────────

export function formatSpendData(rows: Record<string, unknown>[], groupBy: string): string {
  if (!rows || rows.length === 0) {
    return 'No spend data found for the given criteria.';
  }

  const groupLabel = {
    vendor: 'Vendor',
    cost_center: 'Cost Center',
    category: 'Category',
    month: 'Month',
  }[groupBy] || 'Name';

  const lines: string[] = [
    `**Spend Breakdown by ${groupLabel}**`,
    '',
    `| ${groupLabel} | Spend | Count |`,
    `|${'-'.repeat(groupLabel.length + 2)}|-------|-------|`,
  ];

  for (const row of rows) {
    lines.push(`| ${row.name || 'N/A'} | ${currency(row.spend)} | ${num(row.count)} |`);
  }

  const totalSpend = rows.reduce((sum, r) => sum + Number(r.spend || 0), 0);
  lines.push('', `**Total:** ${currency(totalSpend)} across ${rows.length} groups`);

  return lines.join('\n');
}

export function formatInvoiceStatus(rows: Record<string, unknown>[]): string {
  if (!rows || rows.length === 0) {
    return 'No invoice data found for the given criteria.';
  }

  const lines: string[] = [
    '**Invoice Status Breakdown**',
    '',
    '| Status | Amount | Count |',
    '|--------|--------|-------|',
  ];

  for (const row of rows) {
    const status = String(row.status || 'N/A');
    lines.push(`| ${status.charAt(0).toUpperCase() + status.slice(1)} | ${currency(row.total_amount)} | ${num(row.count)} |`);
  }

  return lines.join('\n');
}

export function formatPOStatus(rows: Record<string, unknown>[]): string {
  if (!rows || rows.length === 0) {
    return 'No PO data found for the given criteria.';
  }

  const lines: string[] = [
    '**Purchase Order Status**',
    '',
    '| PO Status | Amount | Count |',
    '|-----------|--------|-------|',
  ];

  for (const row of rows) {
    lines.push(`| ${row.po_status || 'N/A'} | ${currency(row.total_amount)} | ${num(row.count)} |`);
  }

  return lines.join('\n');
}

export function formatAssetDetails(rows: Record<string, unknown>[]): string {
  if (!rows || rows.length === 0) {
    return 'No asset records found for the given criteria.';
  }

  const lines: string[] = [
    `**Asset Details** (${rows.length} records)`,
    '',
    '| Name | Category | Cost | Cost Center | eReq ID |',
    '|------|----------|------|-------------|---------|',
  ];

  for (const row of rows) {
    lines.push(
      `| ${row.name || 'N/A'} | ${row.category || 'N/A'} | ${currency(row.cost)} | ${row.cc || 'N/A'} | ${row.ereq_id || 'N/A'} |`
    );
  }

  return lines.join('\n');
}

export function formatCostCenterDetails(rows: Record<string, unknown>[]): string {
  if (!rows || rows.length === 0) {
    return 'No cost center records found for the given criteria.';
  }

  const lines: string[] = [
    `**Cost Center Details** (${rows.length} records)`,
    '',
    '| Cost Center | Name | Owner |',
    '|-------------|------|-------|',
  ];

  for (const row of rows) {
    lines.push(`| ${row.cc || 'N/A'} | ${row.cc_name || 'N/A'} | ${row.user_id || 'N/A'} |`);
  }

  return lines.join('\n');
}

export function formatDrilldownRecords(rows: Record<string, unknown>[]): string {
  if (!rows || rows.length === 0) {
    return 'No records found for the given drill-down criteria.';
  }

  const lines: string[] = [
    `**Drill-Down Records** (${rows.length} records)`,
    '',
    '| MR ID | Vendor | CC | Amount | Date | CAPEX | OPEX | Invoice Paid | PO# |',
    '|-------|--------|----|--------|------|-------|------|-------------|-----|',
  ];

  for (const row of rows) {
    const date = row.approves_date ? new Date(row.approves_date as string).toLocaleDateString() : 'N/A';
    lines.push(
      `| ${row.mr_id || 'N/A'} | ${row.vendor || 'N/A'} | ${row.cc || 'N/A'} | ${currency(row.requestedtotalmatsusd)} | ${date} | ${currency(row.capex)} | ${currency(row.opex)} | ${currency(row.invoice_paid)} | ${row.sapordernumber || '-'} |`
    );
  }

  return lines.join('\n');
}

export function formatSpendSummary(data: {
  summary: Record<string, unknown>;
  top_vendors: Record<string, unknown>[];
  invoice_status: Record<string, unknown>[];
}): string {
  const s = data.summary || {};

  const lines: string[] = [
    '**Spend Summary Overview**',
    '',
    `- **Total Spend:** ${currency(s.total_spend)}`,
    `- **Total CAPEX:** ${currency(s.total_capex)}`,
    `- **Total OPEX:** ${currency(s.total_opex)}`,
    `- **Total Requests:** ${num(s.total_requests)}`,
    '',
  ];

  if (data.top_vendors && data.top_vendors.length > 0) {
    lines.push('**Top 5 Vendors by Spend:**', '');
    lines.push('| Vendor | Spend |', '|--------|-------|');
    for (const v of data.top_vendors) {
      lines.push(`| ${v.name || 'N/A'} | ${currency(v.spend)} |`);
    }
    lines.push('');
  }

  if (data.invoice_status && data.invoice_status.length > 0) {
    lines.push('**Invoice Status:**', '');
    lines.push('| Status | Count | Amount |', '|--------|-------|--------|');
    for (const inv of data.invoice_status) {
      const status = String(inv.status || 'N/A');
      lines.push(`| ${status.charAt(0).toUpperCase() + status.slice(1)} | ${num(inv.count)} | ${currency(inv.amount)} |`);
    }
  }

  return lines.join('\n');
}

export function formatRecentEreqRequests(raw: unknown, limit = 5): string {
  const rows =
    raw && typeof raw === 'object' && Array.isArray((raw as { results?: unknown[] }).results)
      ? (raw as { results: unknown[] }).results
      : Array.isArray(raw)
        ? raw
        : [];

  if (!rows.length) {
    return 'No eReq requests found for the requester.';
  }

  const slice = rows.slice(0, Math.max(1, limit));
  const lines: string[] = [
    `**Latest ${slice.length} eReq Requests**`,
    '',
    '| Request ID | Status | Requester | Created | Vendor | Amount |',
    '|------------|--------|-----------|---------|--------|--------|',
  ];

  for (const row of slice) {
    const rec = (row || {}) as Record<string, unknown>;
    const id = rec.id ?? rec.mr_id ?? rec.request_id ?? 'N/A';
    const statusRaw =
      rec.status ?? rec.request_status ?? rec.current_status ?? rec.workflow_status ?? rec.requeststatus ?? rec.statuscode;
    const status = mapStatusNumberToLabel(statusRaw ?? 'N/A');

    // DB uses requesterid/requestername; API may use different keys.
    const requester =
      pickByCaseInsensitiveKeys(rec, [
        'requestername',
        'requester_name',
        'submitter_name',
        'requestorname',
        'requestor_name',
        'requestername',
        'requester',
        'requesterid',
        'requester_id',
      ]) ?? 'N/A';

    const created = formatDateNoTimezone(
      rec.created_at ?? rec.created_date ?? rec.created ?? rec.date_created ?? rec.createdAt
    );

    const vendor =
      pickByCaseInsensitiveKeys(rec, [
        'vendorname',
        'vendor_name',
        'vendor',
        'supplier',
      ]) ?? 'N/A';
    const amount = rec.requestedtotalmatsusd ?? rec.amount ?? rec.total_amount ?? rec.total ?? '-';
    lines.push(
      `| ${String(id)} | ${String(status)} | ${String(requester)} | ${String(created)} | ${String(vendor)} | ${String(amount)} |`
    );
  }

  return lines.join('\n');
}

export function formatEreqRequestStatus(raw: unknown, requestId: string): string {
  if (!raw || typeof raw !== 'object') {
    return `No status found for eReq request **${requestId}**.`;
  }

  const rec = raw as Record<string, unknown>;
  const id = rec.id ?? rec.mr_id ?? rec.request_id ?? requestId;
  const statusRaw =
    rec.status ?? rec.request_status ?? rec.current_status ?? rec.workflow_status ?? rec.requeststatus ?? rec.statuscode;
  const status = mapStatusNumberToLabel(statusRaw ?? 'N/A');

  const requester =
    pickByCaseInsensitiveKeys(rec, [
      'requestername',
      'requester_name',
      'submitter_name',
      'requestorname',
      'requestor_name',
      'requester',
      'requesterid',
      'requester_id',
    ]) ?? 'N/A';
  const created = formatDateNoTimezone(
    rec.created_at ?? rec.created_date ?? rec.created ?? rec.date_created ?? rec.createdAt
  );
  const updatedRaw =
    rec.updated_at ?? rec.modified_at ?? rec.last_updated ?? rec.lastsaved ?? rec.last_saved ?? rec.approvedat ?? rec.completedat;
  const updated = formatDateNoTimezone(updatedRaw);
  const total = rec.requestedtotalmatsusd ?? rec.amount ?? rec.total_amount ?? rec.total ?? 'N/A';

  const lines: string[] = [
    `**eReq Request Status (${String(id)})**`,
    '',
    `- **Status:** ${String(status)}`,
    `- **Requester ID:** ${String(requester)}`,
    `- **Created:** ${String(created)}`,
    `- **Last Updated:** ${String(updated)}`,
    `- **Total Amount:** ${String(total)}`,
  ];

  return lines.join('\n');
}
