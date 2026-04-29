/**
 * @file lib/tool-meta.ts
 *
 * Shared ToolMeta interface used by every handler file.
 * Each handler exports a `toolMeta` constant that implements this interface.
 *
 * HOW TO ADD A NEW TOOL:
 *   1. Create lib/modules/<server>/<tool-name>.ts
 *   2. Add the JSDoc @tool / @server tags and export a `toolMeta` constant
 *   3. Import and register the handler in lib/register-tools.ts using toolMeta.description
 *
 * That's it — the API endpoint and the UI pick it up automatically.
 */

export interface ToolMeta {
    /** MCP tool name (snake_case, e.g. "get_ticket_detail") */
    name: string;
    /** Which server this tool belongs to (matches SERVER_REGISTRY id) */
    serverId: string;
    /**
     * Human-readable description used BOTH as the AI model tool description
     * (what the LLM sees to decide when to call this tool)
     * AND as the landing page card description (what developers see in the UI).
     *
     * Write this as if you are explaining to an AI when and why to use this tool.
     */
    description: string;
}
