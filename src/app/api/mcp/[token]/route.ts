import { NextRequest, NextResponse } from "next/server";
import { resolveMcpPathToken } from "@/lib/mcp/auth";
import {
  PROTOCOL_VERSION,
  JSON_RPC_ERRORS,
  rpcError,
  isValidRpcRequest,
  handleRpc,
  type JsonRpcResponse,
} from "@/lib/mcp/rpc";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function POST(request: NextRequest, ctx: RouteContext) {
  const { token } = await ctx.params;
  const auth = await resolveMcpPathToken(token);
  if (!auth.ok) {
    return NextResponse.json(
      { error: "unauthorized", reason: auth.reason },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      rpcError(null, JSON_RPC_ERRORS.PARSE_ERROR, "Invalid JSON"),
      { status: 400 },
    );
  }

  if (Array.isArray(body)) {
    const responses: JsonRpcResponse[] = [];
    for (const item of body) {
      if (!isValidRpcRequest(item)) continue;
      const r = await handleRpc(auth.userId, item);
      if (r) responses.push(r);
    }
    if (responses.length === 0) {
      return new NextResponse(null, { status: 204 });
    }
    return NextResponse.json(responses);
  }

  if (!isValidRpcRequest(body)) {
    return NextResponse.json(
      rpcError(null, JSON_RPC_ERRORS.INVALID_REQUEST, "Invalid JSON-RPC request"),
      { status: 400 },
    );
  }

  const response = await handleRpc(auth.userId, body);
  if (!response) return new NextResponse(null, { status: 204 });
  return NextResponse.json(response);
}

export async function GET(_request: NextRequest, ctx: RouteContext) {
  const { token } = await ctx.params;
  const auth = await resolveMcpPathToken(token);
  if (!auth.ok) {
    return NextResponse.json(
      { error: "unauthorized", reason: auth.reason },
      { status: 401 },
    );
  }
  return NextResponse.json({
    name: "lre-onboarding",
    description: "Onboarding MCP endpoint. POST JSON-RPC 2.0 requests.",
    protocolVersion: PROTOCOL_VERSION,
  });
}
