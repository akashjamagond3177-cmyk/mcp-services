/**
 * @file lib/modules/ereq/client.ts
 *
 * PostgreSQL client for the P2P Dashboard database.
 * Uses a read-only connection pool. All queries enforce RBAC
 * via cost center filtering from request headers.
 */

import pg from 'pg';
import { getRequestHeaders } from '@/lib/request-context';
import { getUserByUsername } from '@/lib/modules/opscenter/client';
import { formatEreqRequestStatus, formatRecentEreqRequests } from './formatters';

const { Pool } = pg;

// Lazy-init pool — created on first query
let pool: pg.Pool | null = null;
let materialsPool: pg.Pool | null = null;

function getEreqApiHeaders(): Record<string, string> {
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

  headers.accept = 'application/json';
  return headers;
}

export async function resolveEreqRequesterId(requesterId?: string): Promise<string> {
  if (requesterId?.trim()) return requesterId.trim();

  const headers = getEreqApiHeaders();

  // 1. Check headers that carry a numeric employee ID directly.
  const directCandidates = [
    headers['x-user-employee-id'],
    headers['x-user-employeeid'],
    headers['x-employee-id'],
    headers['employee-id'],
    headers['x-user-id'],
    headers['requesterid'],
  ];
  for (const value of directCandidates) {
    if (value && value.trim()) return value.trim();
  }

  // 2. Fall back to looking up the employee ID via OpsCenter using the platform username.
  //    The platform sends x-username (e.g. "ashivana"); OpsCenter returns the numeric employee_id.
  const username = headers['x-username'] || headers['username'] || '';
  if (username.trim()) {
    try {
      console.log(`[ereq:resolveEreqRequesterId] No direct employee-id header found. Looking up employee ID for username: "${username}"`);
      const user = await getUserByUsername(username.trim());
      if (user?.employee_id?.trim()) {
        console.log(`[ereq:resolveEreqRequesterId] Resolved employee_id: "${user.employee_id}" for username: "${username}"`);
        return user.employee_id.trim();
      }
    } catch (err) {
      console.warn(`[ereq:resolveEreqRequesterId] OpsCenter lookup failed for username "${username}": ${err}`);
    }
  }

  console.warn('[ereq:resolveEreqRequesterId] No requester ID could be resolved from any header or user lookup.');
  return '';
}

function getPool(): pg.Pool {
  if (!pool) {
    const connectionString = process.env.EREQ_DATABASE_URL;
    console.log(`[ereq:client] EREQ_DATABASE_URL is ${connectionString ? 'SET' : 'NOT SET'} (length: ${connectionString?.length || 0})`);
    if (!connectionString) {
      throw new Error('EREQ_DATABASE_URL environment variable is not set');
    }
    pool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30000,
    });
    // Test connection on pool creation
    pool.on('error', (err) => {
      console.error('[ereq:client] Pool error:', err.message);
    });
    console.log('[ereq:client] PostgreSQL pool created');
  }
  return pool;
}

function getMaterialsPool(): pg.Pool {
  if (!materialsPool) {
    const connectionString = process.env.MATERIALSDB_DATABASE_URL;
    console.log(
      `[ereq:client] MATERIALSDB_DATABASE_URL is ${connectionString ? 'SET' : 'NOT SET'} (length: ${connectionString?.length || 0})`
    );
    if (!connectionString) {
      throw new Error('MATERIALSDB_DATABASE_URL environment variable is not set');
    }
    materialsPool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30000,
    });
    materialsPool.on('error', (err) => {
      console.error('[ereq:client] Materials DB pool error:', err.message);
    });
    console.log('[ereq:client] Materials PostgreSQL pool created');
  }
  return materialsPool;
}

interface RequestTableMetadata {
  tableName: string;
  columns: string[];
}

async function getRequestsTableMetadata(): Promise<RequestTableMetadata> {
  const sql = `
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND lower(table_name) = 'requests'
    ORDER BY ordinal_position
  `;
  const result = await getMaterialsPool().query(sql);
  if (!result.rows.length) {
    throw new Error('Requests table was not found in Materials DB');
  }

  const tableName = String(result.rows[0].table_name);
  const columns = result.rows.map((row) => String(row.column_name));
  return { tableName, columns };
}

function quoteIdent(ident: string): string {
  // Basic identifier quoting to avoid breaking queries; we never accept user-provided identifiers.
  return `"${ident.replace(/"/g, '""')}"`;
}

export async function fetchEreqTrackerRequestsFromDb(opts: EreqTrackerOptions & { requesterId: string }) {
  console.log('[ereq:client] fetchEreqTrackerRequestsFromDb opts:', opts);
  const metadata = await getRequestsTableMetadata();
  const lowerColumns = new Set(metadata.columns.map((c) => c.toLowerCase()));
  const selectedColumns = metadata.columns.map((c) => `"${c}"`).join(', ');

  const identityColumns = [
    'requesterid',
    'requester_id',
    'submitter_id',
    'employee_id',
    'requester',
    'requestername',
    'requester_name',
    'requestorid',
    'requestor_id',
    'requestorname',
    'requestor_name',
    'created_by',
    'createdby',
    'username',
    'user_name',
    'submitter_name',
    'owner',
  ].filter((c) => lowerColumns.has(c));
  if (!identityColumns.length) {
    throw new Error('Requests table does not contain supported requester identity columns');
  }
  console.log('[ereq:client] Requests identity columns detected:', identityColumns);

  const deletedCol = ['isdeleted', 'is_deleted', 'deleted'].find((c) => lowerColumns.has(c));
  const requestedOrderingCol = (opts.ordering || '-id').replace(/^-/, '').toLowerCase();
  const orderingCol =
    [requestedOrderingCol, 'id', 'created_at', 'created_date', 'date_created'].find((c) => lowerColumns.has(c)) || 'id';
  if (!lowerColumns.has(orderingCol)) {
    throw new Error('Requests table does not contain a supported ordering column (id/created_at/created_date/date_created)');
  }
  const orderDirection = (opts.ordering || '-id').startsWith('-') ? 'DESC' : 'ASC';

  const headers = (getRequestHeaders() || {}) as Record<string, string | string[] | undefined>;
  const username = (Array.isArray(headers['x-username']) ? headers['x-username'][0] : headers['x-username']) ||
    (Array.isArray(headers.username) ? headers.username[0] : headers.username) ||
    '';
  const userEmail = (Array.isArray(headers['x-user-email']) ? headers['x-user-email'][0] : headers['x-user-email']) || '';
  let fullName = '';
  if (username) {
    try {
      const user = await getUserByUsername(String(username).trim());
      fullName = String(user.full_name || '').trim();
    } catch (error) {
      console.warn(`[ereq:client] Unable to resolve full_name for username "${username}":`, error);
    }
  }

  const identityValues = Array.from(
    new Set([opts.requesterId, String(username || '').trim(), String(userEmail || '').trim(), fullName].filter(Boolean))
  );
  if (!identityValues.length) {
    throw new Error('Could not resolve requester identity for DB query');
  }
  console.log('[ereq:client] Request identity values used for DB match:', identityValues);

  const params: (string | number | boolean)[] = [];
  const identityClauses: string[] = [];
  for (const col of identityColumns) {
    for (const value of identityValues) {
      params.push(String(value));
      identityClauses.push(`LOWER(COALESCE("${col}"::text, '')) = LOWER($${params.length})`);
    }
  }
  let whereSql = `WHERE (${identityClauses.join(' OR ')})`;

  if (deletedCol && opts.isDeleted !== undefined) {
    if (opts.isDeleted) {
      whereSql += ` AND LOWER(COALESCE("${deletedCol}"::text, 'false')) IN ('true', 't', '1', 'yes')`;
    } else {
      whereSql += ` AND LOWER(COALESCE("${deletedCol}"::text, 'false')) IN ('false', 'f', '0', 'no')`;
    }
  }

  const pageSize = Math.max(1, opts.pageSize ?? 5);
  const page = Math.max(1, opts.page ?? 1);
  const offset = (page - 1) * pageSize;
  params.push(pageSize, offset);

  const sql = `
    SELECT ${selectedColumns}
    FROM "${metadata.tableName}"
    ${whereSql}
    ORDER BY "${orderingCol}" ${orderDirection}
    LIMIT $${params.length - 1}
    OFFSET $${params.length}
  `;

  console.log(`[ereq:client] Querying MaterialsDB table "${metadata.tableName}" for recent requests`);
  console.log('[ereq:client] SQL:', sql.replace(/\s+/g, ' ').trim());
  console.log('[ereq:client] SQL params:', params);
  const result = await getMaterialsPool().query(sql, params);
  console.log(`[ereq:client] Recent requests rows returned: ${result.rows.length}`);

  if (result.rows.length === 0) {
    try {
      const previewCols = metadata.columns.slice(0, 8).map((c) => `"${c}"`).join(', ');
      const sampleSql = `
        SELECT ${previewCols}
        FROM "${metadata.tableName}"
        ORDER BY "${orderingCol}" ${orderDirection}
        LIMIT 3
      `;
      const sampleRows = await getMaterialsPool().query(sampleSql);
      console.log('[ereq:client] Sample latest rows (first 8 columns):', sampleRows.rows);

      for (const col of identityColumns) {
        const countSql = `
          SELECT COUNT(*)::int AS cnt
          FROM "${metadata.tableName}"
          WHERE LOWER(COALESCE("${col}"::text, '')) = ANY($1::text[])
        `;
        const valuesLower = identityValues.map((v) => String(v).toLowerCase());
        const countRes = await getMaterialsPool().query(countSql, [valuesLower]);
        const cnt = Number(countRes.rows?.[0]?.cnt || 0);
        console.log(`[ereq:client] Match count on column "${col}": ${cnt}`);
      }
    } catch (diagError) {
      console.warn('[ereq:client] Zero-row diagnostics failed:', diagError);
    }
  }
  return result.rows;
}

// ─── RBAC helpers ───────────────────────────────────────────────────────────

interface UserAccess {
  costCenters: string[];
  isAdmin: boolean;
}

export function getUserAccess(): UserAccess {
  const headers = getRequestHeaders() || {};
  const ccHeader = headers['x-user-costcenters'];
  const adminHeader = headers['x-user-isadmin'];

  console.log(`[ereq:RBAC] Headers received — x-user-costcenters: "${ccHeader || '(not set)'}", x-user-isadmin: "${adminHeader || '(not set)'}"`);

  const costCenters = ccHeader
    ? String(ccHeader).split(',').map(c => c.trim()).filter(Boolean)
    : [];
  const isAdmin = String(adminHeader).toLowerCase() === 'true';

  console.log(`[ereq:RBAC] Resolved access — isAdmin: ${isAdmin}, costCenters: [${costCenters.join(', ')}] (${costCenters.length} total)`);

  return { costCenters, isAdmin };
}

/**
 * Build a WHERE clause fragment for cost center RBAC.
 * Returns { clause, params, nextParamIndex }.
 * If admin, clause is empty (no restriction).
 * If no cost centers, returns '1=0' to block all data.
 */
function buildCCFilter(
  alias: string,
  access: UserAccess,
  startParamIndex: number
): { clause: string; params: string[]; nextParamIndex: number } {
  if (access.isAdmin) {
    return { clause: '', params: [], nextParamIndex: startParamIndex };
  }
  if (access.costCenters.length === 0) {
    return { clause: 'AND 1=0', params: [], nextParamIndex: startParamIndex };
  }

  const placeholders = access.costCenters.map((_, i) => `$${startParamIndex + i}`);
  return {
    clause: `AND ${alias}.cc IN (${placeholders.join(', ')})`,
    params: access.costCenters,
    nextParamIndex: startParamIndex + access.costCenters.length,
  };
}

// ─── Query functions ────────────────────────────────────────────────────────

export interface SpendQueryOptions {
  vendor?: string;
  cost_center?: string;
  category?: string;
  date_from?: string;
  date_to?: string;
  group_by?: 'vendor' | 'cost_center' | 'category' | 'month';
  limit?: number;
}

export async function querySpendData(opts: SpendQueryOptions) {
  const access = getUserAccess();
  const params: (string | number)[] = [];
  let paramIdx = 1;

  const groupCol = {
    vendor: 'p.vendor',
    cost_center: 'p.cc',
    category: 'a.category',
    month: "TO_CHAR(p.approves_date, 'YYYY-MM')",
  }[opts.group_by || 'vendor'];

  const needsAssetJoin = opts.group_by === 'category' || !!opts.category;

  let sql = `SELECT ${groupCol} AS name, SUM(p.requestedtotalmatsusd) AS spend, COUNT(*) AS count
    FROM dashboard_p2p p`;

  if (needsAssetJoin) {
    sql += ` LEFT JOIN dashboard_assets a ON a.ereq_id = p.mr_id`;
  }

  sql += ` WHERE 1=1`;

  // RBAC
  const ccFilter = buildCCFilter('p', access, paramIdx);
  sql += ` ${ccFilter.clause}`;
  params.push(...ccFilter.params);
  paramIdx = ccFilter.nextParamIndex;

  // Optional filters
  if (opts.vendor) {
    sql += ` AND LOWER(p.vendor) LIKE $${paramIdx}`;
    params.push(`%${opts.vendor.toLowerCase()}%`);
    paramIdx++;
  }
  if (opts.cost_center) {
    sql += ` AND p.cc = $${paramIdx}`;
    params.push(opts.cost_center);
    paramIdx++;
  }
  if (opts.category && needsAssetJoin) {
    sql += ` AND LOWER(a.category) LIKE $${paramIdx}`;
    params.push(`%${opts.category.toLowerCase()}%`);
    paramIdx++;
  }
  if (opts.date_from) {
    sql += ` AND p.approves_date >= $${paramIdx}`;
    params.push(opts.date_from);
    paramIdx++;
  }
  if (opts.date_to) {
    sql += ` AND p.approves_date < $${paramIdx}`;
    params.push(opts.date_to);
    paramIdx++;
  }

  sql += ` GROUP BY ${groupCol} ORDER BY spend DESC`;

  const limit = opts.limit || 20;
  sql += ` LIMIT $${paramIdx}`;
  params.push(limit);

  console.log(`[ereq:querySpendData] SQL: ${sql}`);
  console.log(`[ereq:querySpendData] Params: ${JSON.stringify(params)}`);
  const result = await getPool().query(sql, params);
  console.log(`[ereq:querySpendData] Returned ${result.rows.length} rows`);
  return result.rows;
}

export interface InvoiceStatusOptions {
  status?: 'paid' | 'due' | 'overdue' | 'all';
  cost_center?: string;
  date_from?: string;
  date_to?: string;
}

export async function queryInvoiceStatus(opts: InvoiceStatusOptions) {
  const access = getUserAccess();
  const params: (string | number)[] = [];
  let paramIdx = 1;

  const ccFilter = buildCCFilter('p', access, paramIdx);
  params.push(...ccFilter.params);
  paramIdx = ccFilter.nextParamIndex;

  let dateFilter = '';
  if (opts.cost_center) {
    dateFilter += ` AND p.cc = $${paramIdx}`;
    params.push(opts.cost_center);
    paramIdx++;
  }
  if (opts.date_from) {
    dateFilter += ` AND p.approves_date >= $${paramIdx}`;
    params.push(opts.date_from);
    paramIdx++;
  }
  if (opts.date_to) {
    dateFilter += ` AND p.approves_date < $${paramIdx}`;
    params.push(opts.date_to);
    paramIdx++;
  }

  const baseWhere = `WHERE 1=1 ${ccFilter.clause} ${dateFilter}`;

  if (opts.status && opts.status !== 'all') {
    const statusConditions: Record<string, string> = {
      paid: 'AND p.invoice_paid >= p.requestedtotalmatsusd',
      due: 'AND p.invoice_paid < p.requestedtotalmatsusd AND p.invoice_due = 0',
      overdue: 'AND p.invoice_overdue > 0',
    };
    const sql = `SELECT '${opts.status}' AS status,
      SUM(p.requestedtotalmatsusd) AS total_amount,
      COUNT(*) AS count
      FROM dashboard_p2p p ${baseWhere} ${statusConditions[opts.status]}`;
    const result = await getPool().query(sql, params);
    return result.rows;
  }

  // Return all statuses
  const sql = `
    SELECT 'paid' AS status, SUM(p.requestedtotalmatsusd) AS total_amount, COUNT(*) AS count
    FROM dashboard_p2p p ${baseWhere} AND p.invoice_paid >= p.requestedtotalmatsusd
    UNION ALL
    SELECT 'due' AS status, SUM(p.requestedtotalmatsusd) AS total_amount, COUNT(*) AS count
    FROM dashboard_p2p p ${baseWhere} AND p.invoice_paid < p.requestedtotalmatsusd AND p.invoice_due = 0
    UNION ALL
    SELECT 'overdue' AS status, SUM(p.invoice_overdue) AS total_amount, COUNT(*) AS count
    FROM dashboard_p2p p ${baseWhere} AND p.invoice_overdue > 0
  `;
  const result = await getPool().query(sql, params);
  return result.rows;
}

export interface POStatusOptions {
  with_po?: boolean;
  cost_center?: string;
  date_from?: string;
  date_to?: string;
}

export async function queryPOStatus(opts: POStatusOptions) {
  const access = getUserAccess();
  const params: (string | number)[] = [];
  let paramIdx = 1;

  const ccFilter = buildCCFilter('p', access, paramIdx);
  params.push(...ccFilter.params);
  paramIdx = ccFilter.nextParamIndex;

  let extraWhere = '';
  if (opts.cost_center) {
    extraWhere += ` AND p.cc = $${paramIdx}`;
    params.push(opts.cost_center);
    paramIdx++;
  }
  if (opts.date_from) {
    extraWhere += ` AND p.approves_date >= $${paramIdx}`;
    params.push(opts.date_from);
    paramIdx++;
  }
  if (opts.date_to) {
    extraWhere += ` AND p.approves_date < $${paramIdx}`;
    params.push(opts.date_to);
    paramIdx++;
  }

  const baseWhere = `WHERE 1=1 ${ccFilter.clause} ${extraWhere}`;

  if (opts.with_po !== undefined) {
    const poCondition = opts.with_po
      ? "AND p.sapordernumber IS NOT NULL AND p.sapordernumber != ''"
      : "AND (p.sapordernumber IS NULL OR p.sapordernumber = '')";
    const label = opts.with_po ? 'with PO' : 'without PO';
    const sql = `SELECT '${label}' AS po_status,
      SUM(p.requestedtotalmatsusd) AS total_amount, COUNT(*) AS count
      FROM dashboard_p2p p ${baseWhere} ${poCondition}`;
    const result = await getPool().query(sql, params);
    return result.rows;
  }

  const sql = `
    SELECT 'with PO' AS po_status, SUM(p.requestedtotalmatsusd) AS total_amount, COUNT(*) AS count
    FROM dashboard_p2p p ${baseWhere} AND p.sapordernumber IS NOT NULL AND p.sapordernumber != ''
    UNION ALL
    SELECT 'without PO' AS po_status, SUM(p.requestedtotalmatsusd) AS total_amount, COUNT(*) AS count
    FROM dashboard_p2p p ${baseWhere} AND (p.sapordernumber IS NULL OR p.sapordernumber = '')
  `;
  const result = await getPool().query(sql, params);
  return result.rows;
}

export interface AssetDetailsOptions {
  ereq_id?: string;
  cost_center?: string;
  category?: string;
}

export async function getAssetDetails(opts: AssetDetailsOptions) {
  const access = getUserAccess();
  const params: (string | number)[] = [];
  let paramIdx = 1;

  let sql = `SELECT a.name, a.cost, a.category, a.ereq_id, a.cc
    FROM dashboard_assets a WHERE 1=1`;

  const ccFilter = buildCCFilter('a', access, paramIdx);
  sql += ` ${ccFilter.clause}`;
  params.push(...ccFilter.params);
  paramIdx = ccFilter.nextParamIndex;

  if (opts.ereq_id) {
    sql += ` AND a.ereq_id = $${paramIdx}`;
    params.push(opts.ereq_id);
    paramIdx++;
  }
  if (opts.cost_center) {
    sql += ` AND a.cc = $${paramIdx}`;
    params.push(opts.cost_center);
    paramIdx++;
  }
  if (opts.category) {
    sql += ` AND LOWER(a.category) LIKE $${paramIdx}`;
    params.push(`%${opts.category.toLowerCase()}%`);
    paramIdx++;
  }

  sql += ` ORDER BY a.cost DESC LIMIT 50`;

  const result = await getPool().query(sql, params);
  return result.rows;
}

export interface CostCenterOptions {
  cost_center?: string;
}

export async function getCostCenterDetails(opts: CostCenterOptions) {
  const access = getUserAccess();
  const params: (string | number)[] = [];
  let paramIdx = 1;

  let sql = `SELECT c.cc, c.cc_name, c.user_id FROM dashboard_ccowner c WHERE 1=1`;

  if (!access.isAdmin && access.costCenters.length > 0) {
    const placeholders = access.costCenters.map((_, i) => `$${paramIdx + i}`);
    sql += ` AND c.cc IN (${placeholders.join(', ')})`;
    params.push(...access.costCenters);
    paramIdx += access.costCenters.length;
  } else if (!access.isAdmin && access.costCenters.length === 0) {
    sql += ` AND 1=0`;
  }

  if (opts.cost_center) {
    sql += ` AND c.cc = $${paramIdx}`;
    params.push(opts.cost_center);
    paramIdx++;
  }

  sql += ` ORDER BY c.cc_name LIMIT 50`;

  const result = await getPool().query(sql, params);
  return result.rows;
}

export interface DrilldownOptions {
  dimension: string;
  value: string;
  cost_center?: string;
  date_from?: string;
  date_to?: string;
}

export async function drilldownRecords(opts: DrilldownOptions) {
  const access = getUserAccess();
  const params: (string | number)[] = [];
  let paramIdx = 1;

  const dimensionCol: Record<string, string> = {
    vendor: 'p.vendor',
    cost_center: 'p.cc',
    category: 'a.category',
  };

  const col = dimensionCol[opts.dimension];
  if (!col) throw new Error(`Invalid dimension: ${opts.dimension}`);

  const needsAssetJoin = opts.dimension === 'category';

  let sql = `SELECT p.mr_id, p.vendor, p.cc, p.requestedtotalmatsusd, p.approves_date,
    p.capex, p.opex, p.invoice_paid, p.invoice_due, p.invoice_overdue, p.sapordernumber
    FROM dashboard_p2p p`;

  if (needsAssetJoin) {
    sql += ` LEFT JOIN dashboard_assets a ON a.ereq_id = p.mr_id`;
  }

  sql += ` WHERE ${col} = $${paramIdx}`;
  params.push(opts.value);
  paramIdx++;

  const ccFilter = buildCCFilter('p', access, paramIdx);
  sql += ` ${ccFilter.clause}`;
  params.push(...ccFilter.params);
  paramIdx = ccFilter.nextParamIndex;

  if (opts.cost_center) {
    sql += ` AND p.cc = $${paramIdx}`;
    params.push(opts.cost_center);
    paramIdx++;
  }
  if (opts.date_from) {
    sql += ` AND p.approves_date >= $${paramIdx}`;
    params.push(opts.date_from);
    paramIdx++;
  }
  if (opts.date_to) {
    sql += ` AND p.approves_date < $${paramIdx}`;
    params.push(opts.date_to);
    paramIdx++;
  }

  sql += ` ORDER BY p.approves_date DESC LIMIT 50`;

  const result = await getPool().query(sql, params);
  return result.rows;
}

export interface SpendSummaryOptions {
  date_from?: string;
  date_to?: string;
  cost_center?: string;
}

export async function getSpendSummary(opts: SpendSummaryOptions) {
  const access = getUserAccess();
  const params: (string | number)[] = [];
  let paramIdx = 1;

  const ccFilter = buildCCFilter('p', access, paramIdx);
  params.push(...ccFilter.params);
  paramIdx = ccFilter.nextParamIndex;

  let extraWhere = '';
  if (opts.cost_center) {
    extraWhere += ` AND p.cc = $${paramIdx}`;
    params.push(opts.cost_center);
    paramIdx++;
  }
  if (opts.date_from) {
    extraWhere += ` AND p.approves_date >= $${paramIdx}`;
    params.push(opts.date_from);
    paramIdx++;
  }
  if (opts.date_to) {
    extraWhere += ` AND p.approves_date < $${paramIdx}`;
    params.push(opts.date_to);
    paramIdx++;
  }

  const baseWhere = `WHERE 1=1 ${ccFilter.clause} ${extraWhere}`;

  // Total spend + CAPEX/OPEX
  const summarySQL = `SELECT
    SUM(p.requestedtotalmatsusd) AS total_spend,
    SUM(CASE WHEN p.capex > 0 THEN p.capex ELSE 0 END) AS total_capex,
    SUM(CASE WHEN p.opex > 0 THEN p.opex ELSE 0 END) AS total_opex,
    COUNT(*) AS total_requests
    FROM dashboard_p2p p ${baseWhere}`;

  // Top 5 vendors
  const topVendorsSQL = `SELECT p.vendor AS name, SUM(p.requestedtotalmatsusd) AS spend
    FROM dashboard_p2p p ${baseWhere}
    GROUP BY p.vendor ORDER BY spend DESC LIMIT 5`;

  // Invoice status breakdown
  const invoiceSQL = `
    SELECT 'paid' AS status, COUNT(*) AS count, SUM(p.requestedtotalmatsusd) AS amount
    FROM dashboard_p2p p ${baseWhere} AND p.invoice_paid >= p.requestedtotalmatsusd
    UNION ALL
    SELECT 'due', COUNT(*), SUM(p.requestedtotalmatsusd)
    FROM dashboard_p2p p ${baseWhere} AND p.invoice_paid < p.requestedtotalmatsusd AND p.invoice_due = 0
    UNION ALL
    SELECT 'overdue', COUNT(*), SUM(p.invoice_overdue)
    FROM dashboard_p2p p ${baseWhere} AND p.invoice_overdue > 0`;

  const [summaryResult, vendorsResult, invoiceResult] = await Promise.all([
    getPool().query(summarySQL, params),
    getPool().query(topVendorsSQL, params),
    getPool().query(invoiceSQL, params),
  ]);

  return {
    summary: summaryResult.rows[0] || {},
    top_vendors: vendorsResult.rows,
    invoice_status: invoiceResult.rows,
  };
}

export interface EreqTrackerOptions {
  requesterId?: string;
  page?: number;
  pageSize?: number;
  ordering?: string;
  isDeleted?: boolean;
}

export async function fetchEreqTrackerRequests(opts: EreqTrackerOptions) {
  const requesterId = await resolveEreqRequesterId(opts.requesterId);
  console.log(`[fetchEreqTrackerRequests] Resolved requesterId: "${requesterId || '(none)'}" from input: "${opts.requesterId || '(none)'}"`);
  if (!requesterId) {
    throw new Error(
      'requesterId is required. Pass requesterId explicitly or provide one in request headers (e.g. x-user-employee-id).'
    );
  }

  return fetchEreqTrackerRequestsFromDb({
    ...opts,
    requesterId,
  });
}

export interface EreqRequestStatusOptions {
  requestId: string;
  requesterId?: string;
}

export async function fetchEreqRequestStatusFromDb(
  opts: EreqRequestStatusOptions
): Promise<Record<string, unknown> | null> {
  const requestId = opts.requestId?.trim();
  if (!requestId) {
    throw new Error('requestId is required');
  }

  const metadata = await getRequestsTableMetadata();
  const lowerColumns = new Set(metadata.columns.map((c) => c.toLowerCase()));

  const idCol = (['id', 'mr_id', 'request_id', 'ereq_id'] as const).find((c) => lowerColumns.has(c)) || null;
  if (!idCol) {
    throw new Error('Requests table does not contain a supported request id column');
  }

  const lowerToActual = new Map(metadata.columns.map((c) => [c.toLowerCase(), c]));

  const desired = [
    'id',
    'requesttype',
    'requesterid',
    'requestername',
    'requester_name',
    'requesterid',
    'submitter_id',
    'submitter_name',
    'requestorid',
    'requestorname',
    'requestor_name',
    'status',
    'statusname',
    'status_name',
    'statusdesc',
    'status_desc',
    'statusdescription',
    'status_description',
    'statuslabel',
    'status_label',
    'created',
    'created_at',
    'created_date',
    'date_created',
    'lastsaved',
    'last_saved',
    'updated_at',
    'modified_at',
    'last_updated',
    'approvedat',
    'approved_at',
    'completedat',
    'completed_at',
    'requestedtotalmatsusd',
    'amount',
    'total_amount',
    'total',
    'vendorname',
    'vendor_name',
    'vendor',
    'supplier',
  ];

  const selectedCols = desired
    .map((c) => c.toLowerCase())
    .filter((lc) => lowerColumns.has(lc))
    .map((lc) => lowerToActual.get(lc) || lc);

  // Ensure we always select the id column used in WHERE.
  if (lowerToActual.has(idCol.toLowerCase())) {
    const actualIdCol = lowerToActual.get(idCol.toLowerCase()) as string;
    if (!selectedCols.includes(actualIdCol)) selectedCols.unshift(actualIdCol);
  }

  const selectedSql = selectedCols.map((c) => quoteIdent(c)).join(', ');

  // Optional RBAC restriction if requesterId is provided and we can resolve identity columns.
  const requesterId = opts.requesterId?.trim();
  let extraWhere = '';
  let extraParams: (string | number | boolean)[] = [];

  if (requesterId) {
    // Best-effort identity matching using likely requester-related columns.
    const headers = (getRequestHeaders() || {}) as Record<string, string | string[] | undefined>;
    const username =
      (Array.isArray(headers['x-username']) ? headers['x-username'][0] : headers['x-username']) ||
      (Array.isArray(headers.username) ? headers.username[0] : headers.username) ||
      '';
    const userEmail =
      (Array.isArray(headers['x-user-email']) ? headers['x-user-email'][0] : headers['x-user-email']) || '';

    let fullName = '';
    if (username) {
      try {
        const user = await getUserByUsername(String(username).trim());
        fullName = String(user.full_name || '').trim();
      } catch {
        // ignore
      }
    }

    const identityColumns = [
      'requesterid',
      'requester_id',
      'employee_id',
      'submitter_id',
      'requester',
      'requestername',
      'requester_name',
      'requestorid',
      'requestor_id',
      'requestorname',
      'requestor_name',
      'created_by',
      'createdby',
      'username',
      'user_name',
      'submitter_name',
      'owner',
    ].filter((c) => lowerColumns.has(c));

    const identityValues = Array.from(
      new Set([requesterId, String(username || '').trim(), String(userEmail || '').trim(), fullName].filter(Boolean))
    ).map(String);

    if (identityColumns.length && identityValues.length) {
      const identityClauses: string[] = [];
      for (const col of identityColumns) {
        for (const value of identityValues) {
          extraParams.push(value);
          // +1 because $1 is reserved for requestId in this query.
          identityClauses.push(`LOWER(COALESCE(${quoteIdent(col)}::text, '')) = LOWER($${extraParams.length + 1})`);
        }
      }
      if (identityClauses.length) {
        extraWhere = ` AND (${identityClauses.join(' OR ')})`;
      }
    }
  }

  const sql = `
    SELECT ${selectedSql}
    FROM "${metadata.tableName}"
    WHERE ${quoteIdent(idCol)}::text = $1
    ${extraWhere}
    LIMIT 1
  `;

  const params: (string | number | boolean)[] = [requestId, ...extraParams];

  const row = await getMaterialsPool().query(sql, params);
  const rec = row.rows?.[0] ? (row.rows[0] as Record<string, unknown>) : null;
  if (!rec) return null;

  return rec;
}

/**
 * Tool helper: "show my last N eReq requests" formatted for the LLM response.
 * Kept here so tool handlers stay minimal.
 */
export async function getMyRecentEreqRequestsText(opts: {
  requesterId?: string;
  limit?: number;
}): Promise<string> {
  const limit = Math.max(1, Number(opts.limit ?? 5) || 5);
  const raw = await fetchEreqTrackerRequests({
    requesterId: opts.requesterId,
    page: 1,
    pageSize: limit,
    ordering: '-id',
    isDeleted: false,
  });
  return formatRecentEreqRequests(raw, limit);
}

/**
 * Tool helper: "what is the status of eReq <id>" formatted for the LLM response.
 */
export async function getEreqRequestStatusText(opts: {
  requestId: string;
  requesterId?: string;
}): Promise<string> {
  const raw = await fetchEreqRequestStatusFromDb({
    requestId: String(opts.requestId),
    requesterId: opts.requesterId,
  });
  return formatEreqRequestStatus(raw, String(opts.requestId));
}
