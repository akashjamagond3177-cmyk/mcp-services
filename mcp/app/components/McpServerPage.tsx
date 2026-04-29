"use client";

import { useState, useEffect } from "react";
import s from "../page.module.css";
import {
  Server,
  Terminal,
  Copy,
  Check,
  Database,
  Cloud,
  Code,
  Globe,
  Cpu,
  Loader2,
  AlertCircle,
  Puzzle,
  ChevronRight,
  BookOpen,
  ArrowLeft,
  Layers,
  Zap,
  Home,
  MessageSquareText,
} from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────────────── */

interface ToolMeta {
  name: string;
  serverId: string;
  description: string;
}

interface ServerMeta {
  id: string;
  name: string;
  description: string;
  status: "online" | "planned" | "beta";
  endpoint: string;
  icon: string;
  tools: ToolMeta[];
}

/* ─── Helpers ────────────────────────────────────────────────────────── */

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Database, Cloud, Server, Code, Globe, Cpu, Layers,
};

function SIcon({ name, className }: { name: string; className?: string }) {
  const I = ICONS[name] ?? Server;
  return <I className={className} />;
}

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "/mcp";

/* ─── Use‑case examples per tool ─────────────────────────────────────── */
const TOOL_USE_CASES: Record<string, string> = {
  // OpsCenter
  get_ticket_detail: "What is the status of ticket ST-12345?",
  get_ticket_comments: "Show me the comments on ST-12345",
  get_my_tickets: "Show all my open tickets",
  get_assigned_to_me: "What tickets are assigned to me?",
  get_my_change_requests: "Show my change requests",
  get_closed_tickets: "List all my closed tickets",
  get_resolved_by_me: "What tickets have I resolved?",
  search_tickets: "Find all high-priority incidents from last week",
  get_pending_approvals: "What approvals are waiting for me?",
  get_approved_by_me: "Show all requests I've approved",
  get_rejected_by_me: "Show all requests I've rejected",
  get_all_my_approvals: "Show my full approval history",
  add_ticket_comment: "Add a comment to ST-12345 saying 'Fixed and deployed'",
  // Everest
  get_my_everest_projects: "What projects am I working on in Everest?",
  get_everest_project_detail: "Tell me about project EV-1001",
  get_everest_project_resources: "Who is allocated to project EV-1001?",
  get_everest_project_cloud_resources: "Show cloud resources for project EV-1001",
  get_everest_project_assets: "What assets are assigned to project EV-1001?",
  get_everest_user_allocations: "What projects is user sakumar allocated to?",
  get_everest_project_milestones: "What are the milestones for project EV-1001?",
  get_everest_project_dependencies: "What does project EV-1001 depend on?",
  get_everest_project_risks: "Show the risk register for project EV-1001",
  get_my_everest_timesheet: "Show my timesheet for this week",
  get_my_team_everest_timesheet: "Show my team's timesheet for this week",
  // VMware
  list_vms: "Show me all my virtual machines",
  get_vm_detail: "Show hardware details for VM dev-server-01",
  get_vm_power_state: "Is VM dev-server-01 currently running?",
  list_hosts: "List all ESXi hosts in the cluster",
  list_datastores: "How much storage is available on datastores?",
  list_clusters: "What clusters exist and is HA enabled?",
  // XenAutomation
  xen_list_vms: "List all my VMs in XenAutomation",
  vm_power_status_check: "Is my VM dev-box-01 powered on?",
  stop_vm: "Stop my VM dev-box-01",
  start_vm: "Start my VM dev-box-01",
  create_vm_transfer_ticket: "Transfer VM dev-box-01 to user jdoe",
  create_vm_share_request: "Share VM dev-box-01 with user jdoe",
  create_vm_update_request: "Update CPU and memory for my VM dev-box-01",
  list_project_vms: "Show all VMs allocated to project XYZ",
  list_vms_by_manager: "List all VMs managed by sakumar",
  vm_estimated_usage_cost: "What is the estimated cost of VM dev-box-01?",
  project_vms_estimated_usage_cost: "What is the total VM cost for project XYZ?",
  all_my_vms_cost: "What is the total cost of all my VMs?",
  // Salesforce
  salesforce_check_license_status: "Does john.doe@radisys.com have an active Salesforce license?",
  salesforce_get_inactive_users: "Show me all users with deactivated Salesforce licenses",
  salesforce_activate_user_license: "Activate the Salesforce license for john.doe@radisys.com",
};

/* ─── ToolRow ────────────────────────────────────────────────────────── */

function ToolRow({ tool, idx }: { tool: ToolMeta; idx: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={s.toolRow}>
      <div style={{ width: "100%" }}>
        <button className={s.toolToggle} onClick={() => setOpen(!open)} aria-expanded={open}>
          <ChevronRight
            size={12}
            className={`${s.toolChevron} ${open ? s.toolChevronOpen : ""}`}
          />
          <span className={s.toolFnName}>{tool.name}</span>
          <span className={s.toolIdx}>{String(idx + 1).padStart(2, "0")}</span>
        </button>
        {open && (
          <div className={s.toolExpand}>
            <div className={s.toolExpandInner}>{tool.description}</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────────────────────── */

export default function McpServersPage() {
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState("service_desk_agent");
  const [baseUrl, setBaseUrl] = useState("http://localhost:3001");
  const [servers, setServers] = useState<ServerMeta[]>([]);
  const [active, setActive] = useState<string | null>(null); // null = overview
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") setBaseUrl(window.location.origin);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const r = await fetch(`${BASE}/api/tools`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d: { servers: ServerMeta[] } = await r.json();
        setServers(d.servers);
      } catch {
        setError("Failed to load servers. Refresh to retry.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const ep = (path: string) => `${baseUrl}${BASE}${path}`;
  const copy = (t: string) => { navigator.clipboard.writeText(t); setCopied(true); setTimeout(() => setCopied(false), 1800); };

  const online = servers.filter((x) => x.status === "online" || x.status === "beta");
  const planned = servers.filter((x) => x.status === "planned");
  const totalTools = servers.reduce((n, x) => n + x.tools.length, 0);
  const sel = servers.find((x) => x.id === active) ?? null;

  /* Loading / Error */
  if (loading) return <div className={s.fullCenter}><Loader2 className={s.spinner} size={24} /><p>Loading…</p></div>;
  if (error) return <div className={s.fullCenter}><AlertCircle size={24} /><p>{error}</p></div>;

  /* ═══════════════════════════════════════════════════════════════════════
     LAYOUT: Topbar + Sidebar + Content
     ═══════════════════════════════════════════════════════════════════════ */
  return (
    <div className={s.page}>
      {/* ── Top Bar ── */}
      <header className={s.topbar}>
        <div className={s.logo}>
          <img src={`${BASE}/Radisys Logo.png`} alt="Radisys Logo" className={s.logoImage} />
        MCP
        </div>

        {sel && (
          <>
            <ChevronRight size={12} className={s.topSep} />
            <button className={s.backBtn} onClick={() => setActive(null)}>
              <ArrowLeft size={12} /> Servers
            </button>
            <ChevronRight size={12} className={s.topSep} />
            <span className={s.breadCurrent}>{sel.name}</span>
          </>
        )}
      </header>

      <div className={s.landing}>
        {/* ── Sidebar ── */}
        <nav className={s.sidebar}>
          {/* Overview item */}
          <button
            className={`${s.sidebarItem} ${active === null ? s.sidebarItemActive : ""}`}
            onClick={() => setActive(null)}
          >
            <span className={s.sidebarItemIcon}><Home size={14} /></span>
            Overview
          </button>

          {online.length > 0 && <div className={s.sidebarLabel}>Servers</div>}
          {online.map((srv) => (
            <button
              key={srv.id}
              className={`${s.sidebarItem} ${active === srv.id ? s.sidebarItemActive : ""}`}
              onClick={() => setActive(srv.id)}
            >
              <span className={s.sidebarItemIcon}><SIcon name={srv.icon} /></span>
              {srv.name}
              <span className={`${s.sidebarBadge} ${srv.status === "online" ? s.badgeOn : s.badgeBeta}`}>
                {srv.status === "online" ? "Live" : "Beta"}
              </span>
            </button>
          ))}

          {planned.length > 0 && <div className={s.sidebarLabel}>Coming Soon</div>}
          {planned.map((srv) => (
            <div key={srv.id} className={`${s.sidebarItem} ${s.sidebarItemDisabled}`}>
              <span className={s.sidebarItemIcon} style={{ opacity: .35 }}><SIcon name={srv.icon} /></span>
              {srv.name}
              <span className={`${s.sidebarBadge} ${s.badgeSoon}`}>Soon</span>
            </div>
          ))}
        </nav>

        {/* ── Content Area ── */}
        <main className={s.mainContent}>
          {!sel ? (
            /* ─────── OVERVIEW ─────── */
            <div className={s.overview}>
              <div className={s.overviewPill}><Zap size={10} /> Documentation</div>
              <h1 className={s.overviewTitle}>MCP Server Hub</h1>
              <p className={s.overviewDesc}>
                Connect AI agents to Radisys enterprise services through the Model Context Protocol.
                Select a server from the sidebar to view its tools, endpoint, and integration guide.
              </p>

              <div className={s.statCards}>
                <div className={s.statCard}>
                  <div className={s.statVal}>{servers.length}</div>
                  <div className={s.statKey}>Servers</div>
                </div>
                <div className={s.statCard}>
                  <div className={s.statVal}>{totalTools}</div>
                  <div className={s.statKey}>Tools</div>
                </div>
                <div className={s.statCard}>
                  <div className={s.statVal}>{online.length}</div>
                  <div className={s.statKey}>Online</div>
                </div>
              </div>

              <div className={s.quickSection}>
                <div className={s.quickTitle}><Layers size={14} /> Available Servers</div>
                <div className={s.quickList}>
                  {online.map((srv) => (
                    <button key={srv.id} className={s.quickRow} onClick={() => setActive(srv.id)}>
                      <div className={s.quickRowIcon}><SIcon name={srv.icon} /></div>
                      <div className={s.quickRowText}>
                        <div className={s.quickRowName}>{srv.name}</div>
                        <div className={s.quickRowSub}>{srv.description}</div>
                      </div>
                      <div className={s.quickRowMeta}>
                        <span className={s.quickRowTools}>{srv.tools.length} tools</span>
                        <ChevronRight size={14} className={s.quickRowArrow} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {planned.length > 0 && (
                <div className={s.quickSection}>
                  <div className={s.quickTitle} style={{ color: "var(--text-tertiary)" }}>Planned</div>
                  <div className={s.quickList}>
                    {planned.map((srv) => (
                      <div key={srv.id} className={s.quickRow} style={{ opacity: .4, cursor: "default" }}>
                        <div className={s.quickRowIcon} style={{ opacity: .4 }}><SIcon name={srv.icon} /></div>
                        <div className={s.quickRowText}>
                          <div className={s.quickRowName}>{srv.name}</div>
                          <div className={s.quickRowSub}>{srv.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ─────── SERVER DETAIL — 2 Column ─────── */
            <div className={s.detailSplit}>
              {/* ── LEFT PANE: Info + Integration Guide ── */}
              <div className={s.detailLeft}>
                {/* Header */}
                <div className={s.detailHead}>
                  <div className={s.detailRow}>
                    <div className={s.detailIcon}><SIcon name={sel.icon} /></div>
                    <h1 className={s.detailH1}>{sel.name}</h1>
                    {sel.status === "online" && <span className={`${s.chip} ${s.chipOn}`}>Online</span>}
                    {sel.status === "beta" && <span className={`${s.chip} ${s.chipBeta}`}>Beta</span>}
                  </div>
                  <p className={s.detailSub}>{sel.description}</p>
                  <div className={s.detailMeta}>
                    <span><Layers size={12} /> <strong>{sel.tools.length}</strong> tools</span>
                    <span><Zap size={12} /> MCP {sel.status === "online" ? "Active" : "Beta"}</span>
                  </div>
                </div>

                {/* Endpoint */}
                {sel.status !== "planned" && (
                  <div className={s.section}>
                    <h2 className={s.sectionHead}><Server size={14} /> Endpoint</h2>
                    <div className={s.endpoint}>
                      <span className={s.epVerb}>POST</span>
                      <span className={s.epPath}>{ep(sel.endpoint)}</span>
                      <button className={s.epCopy} onClick={() => copy(ep(sel.endpoint))}>
                        {copied ? <Check size={13} /> : <Copy size={13} />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Integration Guide */}
                {(sel.status === "online" || sel.status === "beta") && (
                  <div className={s.section}>
                    <h2 className={s.sectionHead}><BookOpen size={14} /> Integration Guide</h2>

                    <div className={s.tabs}>
                      {(["service_desk_agent", "copilot", "cursor", "claude"] as const).map((k) => (
                        <button
                          key={k}
                          className={`${s.tab} ${tab === k ? s.tabActive : ""}`}
                          onClick={() => setTab(k)}
                        >
                          {k === "service_desk_agent" ? "Service Desk Agent" : k === "copilot" ? "GitHub Copilot" : k === "cursor" ? "Cursor IDE" : "Claude Desktop"}
                        </button>
                      ))}
                    </div>

                    <div className={s.tabBody}>
                      {tab === "copilot" && (
                        <>
                          <div className={s.steps}>
                            <div className={s.step}>Install the <strong>GitHub Copilot Chat</strong> extension in VS Code.</div>
                            <div className={s.step}>Open your <code className={s.ic}>settings.json</code>.</div>
                            <div className={s.step}>Add this configuration:</div>
                          </div>
                          <pre className={s.code}>{`"github.copilot.advanced": {
  "mcpServers": {
    "${sel.name.toLowerCase()}": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-sse",
        "${baseUrl}${BASE}${sel.endpoint}"
      ],
      "env": {
        "X-MCP-TYPE": "${sel.id}",
        "X-User-Email": "{{useremail}}",
        "X-Username": "{{username}}",
        "Authorization": "Token {{usertoken}}"
      }
    }
  }
}`}</pre>
                          <p className={s.muted}>Restart VS Code. Ask Copilot: <em>&quot;What tools can you access from {sel.name}?&quot;</em></p>
                        </>
                      )}

                      {tab === "cursor" && (
                        <div className={s.steps}>
                          <div className={s.step}>Open Cursor Settings (<span className={s.kbd}>Cmd/Ctrl + ,</span>)</div>
                          <div className={s.step}>Go to <strong>Features</strong> → <strong>MCP Servers</strong></div>
                          <div className={s.step}>
                            Click <strong>+ Add new MCP server</strong>:
                            <ul className={s.subList}>
                              <li><strong>Name:</strong> {sel.name}</li>
                              <li><strong>Type:</strong> HTTP</li>
                              <li><strong>URL:</strong> {ep(sel.endpoint)}</li>
                            </ul>
                          </div>
                          <div className={s.step}>
                            Set <strong>Auth Headers (JSON)</strong>:
                            <pre className={s.code} style={{ marginTop: ".35rem" }}>{`{
  "X-MCP-TYPE": "${sel.id}",
  "X-User-Email": "{{useremail}}",
  "X-Username": "{{username}}",
  "Authorization": "Token {{usertoken}}"
}`}</pre>
                          </div>
                          <div className={s.step}>Click <strong>Save</strong>. Status should turn green.</div>
                        </div>
                      )}

                      {tab === "claude" && (
                        <>
                          <div className={s.steps}>
                            <div className={s.step}>Add this to your <code className={s.ic}>claude_desktop_config.json</code>:</div>
                          </div>
                          <pre className={s.code}>{`{
  "mcpServers": {
    "${sel.name.toLowerCase()}": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-sse",
        "${baseUrl}${BASE}${sel.endpoint}"
      ]
    }
  }
}`}</pre>
                          <p className={s.muted}>Restart Claude Desktop for changes to take effect.</p>
                        </>
                      )}

                      {tab === "service_desk_agent" && (
                        <div className={s.steps}>
                          <div className={s.step}>Navigate to <strong>Admin</strong> → <strong>MCP Servers</strong> in the Service Desk portal.</div>
                          <div className={s.step}>Click <strong>+ Add MCP Server</strong> (or edit an existing one). A dialog will appear.</div>
                          <div className={s.step}>
                            Fill in the following fields:
                            <div className={s.fieldTable}>
                              <div className={s.fieldRow}>
                                <span className={s.fieldLabel}>Name :</span>
                                <span className={s.fieldValue}>{sel.name}</span>
                              </div>
                              <div className={s.fieldRow}>
                                <span className={s.fieldLabel}>Description :</span>
                                <span className={s.fieldValue}>{sel.name}</span>
                              </div>
                              <div className={s.fieldRow}>
                                <span className={s.fieldLabel}>Endpoint URL :</span>
                                <code className={s.fieldCode}>{ep(sel.endpoint)}</code>
                              </div>
                              <div className={s.fieldRow}>
                                <span className={s.fieldLabel}>Transport :  </span>
                                <span className={s.fieldValue}>HTTP</span>
                              </div>
                            </div>
                          </div>
                          <div className={s.step}>
                            Expand <strong>Auth Headers (JSON)</strong> and paste:
                            <pre className={s.code} style={{ marginTop: ".35rem" }}>{`{
  "X-MCP-TYPE": "${sel.id}",
  "X-User-Email": "{{useremail}}",
  "X-Username": "{{username}}",
  "Authorization": "Token {{usertoken}}"
}`}</pre>
                          </div>
                          <div className={s.step}>Click <strong>Save Changes</strong>. The server status should show <strong>Active</strong> with a green indicator.</div>
                          <div className={s.step}>Click <strong>Test</strong> to verify the connection and confirm the tool count matches.</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Use Cases */}
                {sel.tools.length > 0 && (
                  <div className={s.section}>
                    <h2 className={s.sectionHead}><MessageSquareText size={14} /> Use Cases</h2>
                    <p className={s.muted} style={{ marginBottom: ".6rem" }}>Example prompts you can ask the AI agent:</p>
                    <div className={s.useCaseList}>
                      {sel.tools.map((t) => {
                        const uc = TOOL_USE_CASES[t.name];
                        if (!uc) return null;
                        return (
                          <div key={t.name} className={s.useCaseItem}>
                            <div className={s.useCaseQ}>“{uc}”</div>
                            <div className={s.useCaseTool}>{t.name}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>

              {/* ── RIGHT PANE: Tools ── */}
              <div className={s.detailRight}>
                <div className={s.rightHeader}>
                  <Terminal size={14} />
                  <span>Tools</span>
                  <span className={s.sectionCount}>{sel.tools.length}</span>
                </div>
                {sel.tools.length === 0 ? (
                  <p className={s.muted} style={{ padding: ".75rem" }}>No tools registered yet.</p>
                ) : (
                  <div className={s.rightToolList}>
                    {sel.tools.map((t, i) => <ToolRow key={t.name} tool={t} idx={i} />)}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
