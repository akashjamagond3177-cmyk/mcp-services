/**
 * @file lib/server-registry.ts
 *
 * Server-level metadata only (name, description, status, icon, endpoint).
 * Tool descriptions live in each handler file as a `toolMeta` export — see lib/all-tools.ts.
 *
 * HOW TO ADD A NEW SERVER:
 *   1. Add an entry to SERVER_REGISTRY below.
 *   2. Create handler files in lib/modules/<id>/ with toolMeta exports.
 *   3. Import and register them in lib/all-tools.ts.
 */

export type ServerStatus = 'online' | 'planned' | 'beta';

export interface ServerMeta {
  /** Unique server identifier — also used in the URL path: /server/<id> */
  id: string;
  /** Display name shown in the UI */
  name: string;
  /** Short description of what this server exposes */
  description: string;
  /** Lifecycle status */
  status: ServerStatus;
  /** MCP endpoint path (relative, e.g. "/server/opscenter") */
  endpoint: string;
  /** Icon name for the UI (maps to lucide-react icons) */
  icon: 'Database' | 'Cloud' | 'Server' | 'Code' | 'Globe' | 'Cpu' | 'Layers';
}

export const SERVER_REGISTRY: ServerMeta[] = [
  {
    id: 'opscenter',
    name: 'OpsCenter',
    status: 'online',
    description:
      'Core ticketing and operations management module. Enables AI agents to fetch, ' +
      'search, and manage support tickets, change requests, approvals, and comments.',
    endpoint: '/server/opscenter',
    icon: 'Database',
  },
  {
    id: 'everest',
    name: 'Everest',
    status: 'online',
    description:
      'Integration with Everest for managing projects, resources, and allocations across teams. ' +
      'Provides visibility into project milestones, dependencies, risks, and resource utilization.',
    endpoint: '/server/everest',
    icon: 'Server',
  },
  {
    id: 'vmware',
    name: 'VMware vSphere',
    status: 'online',
    description:
      'Read-only integration with VMware vCenter Server. List and inspect VMs, hosts, datastores, ' +
      'and clusters via the vSphere REST API.',
    endpoint: '/server/vmware',
    icon: 'Cpu',
  },
  {
    id: 'xenautomation',
    name: 'XenAutomation',
    status: 'online',
    description:
      'VM lifecycle and request management. List the user\'s active running VMs, get VM power state, ' +
      'power on VMs, create VM transfer tickets, create VM share requests, create tickets to update VMs, and list VMs allocated to projects.',
    endpoint: '/server/xenautomation',
    icon: 'Layers',
  },
  {
    id: 'ereq',
    name: 'eReq',
    status: 'online',
    description:
      'Procurement and P2P (Procure-to-Pay) analytics. Query spend data by vendor, cost center, ' +
      'or category; check invoice and PO status; look up assets and cost center details; ' +
      'get aggregated spend summaries with CAPEX/OPEX breakdowns.',
    endpoint: '/server/ereq',
    icon: 'Globe',
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    status: 'online',
    description:
      'Salesforce license management for the AI Helpdesk. Check user license status, ' +
      'list deactivated users, and activate existing deactivated licenses via the Salesforce REST API.',
    endpoint: '/server/salesforce',
    icon: 'Cloud',
  },
];
