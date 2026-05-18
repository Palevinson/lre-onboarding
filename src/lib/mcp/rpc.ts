import { TOOL_DEFINITIONS, runTool } from "./tools";

export const PROTOCOL_VERSION = "2025-06-18";

export type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: unknown;
};

export type JsonRpcResponse =
  | { jsonrpc: "2.0"; id: string | number | null; result: unknown }
  | {
      jsonrpc: "2.0";
      id: string | number | null;
      error: { code: number; message: string; data?: unknown };
    };

export const JSON_RPC_ERRORS = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const;

export function rpcError(
  id: string | number | null,
  code: number,
  message: string,
): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

export function rpcOk(
  id: string | number | null,
  result: unknown,
): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

export function isValidRpcRequest(value: unknown): value is JsonRpcRequest {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (v.jsonrpc !== "2.0") return false;
  if (typeof v.method !== "string") return false;
  return true;
}

export async function handleRpc(
  userId: string,
  req: JsonRpcRequest,
): Promise<JsonRpcResponse | null> {
  const id = req.id ?? null;
  const isNotification = req.id === undefined || req.id === null;

  try {
    switch (req.method) {
      case "initialize":
        return rpcOk(id, {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: { name: "lre-onboarding", version: "1.0.0" },
        });

      case "notifications/initialized":
      case "notifications/cancelled":
        return null;

      case "ping":
        return rpcOk(id, {});

      case "tools/list":
        return rpcOk(id, { tools: TOOL_DEFINITIONS });

      case "tools/call": {
        const params = req.params as
          | { name?: unknown; arguments?: unknown }
          | undefined;
        const name = typeof params?.name === "string" ? params.name : null;
        const args = params?.arguments ?? {};
        if (!name) {
          return rpcError(
            id,
            JSON_RPC_ERRORS.INVALID_PARAMS,
            "tools/call requires params.name",
          );
        }
        const result = await runTool(userId, name, args);
        return rpcOk(id, result);
      }

      default:
        if (isNotification) return null;
        return rpcError(
          id,
          JSON_RPC_ERRORS.METHOD_NOT_FOUND,
          `Method not found: ${req.method}`,
        );
    }
  } catch (e) {
    if (isNotification) return null;
    const msg = e instanceof Error ? e.message : String(e);
    return rpcError(id, JSON_RPC_ERRORS.INTERNAL_ERROR, msg);
  }
}
