import { NextRequest } from "next/server";
import { prisma } from "./prisma";

// Secured server-to-server API key (retrieved from server environment variable, never exposed to client)
export const AGENT_API_KEY = process.env.AGENT_API_KEY || "karavali_operator_agent_key_2026";

// Rate limiting in-memory store: Map<key, { count: number, resetAt: number }>
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 120; // 120 requests per minute

/**
 * Validates the API key from the request header (Authorization: Bearer <key> or x-api-key: <key>)
 */
export function verifyAgentApiKey(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization") || req.headers.get("x-api-key");
  if (!authHeader) return false;

  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader.trim();
  return token === AGENT_API_KEY;
}

/**
 * Enforces rate limiting per client IP or API key
 */
export function checkRateLimit(req: NextRequest): { allowed: boolean; remaining: number; resetInSeconds: number } {
  const clientIdentifier = req.ip || req.headers.get("x-forwarded-for") || "external-agent";
  const now = Date.now();

  const record = rateLimitMap.get(clientIdentifier);
  if (!record || now > record.resetAt) {
    rateLimitMap.set(clientIdentifier, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return {
      allowed: true,
      remaining: MAX_REQUESTS_PER_WINDOW - 1,
      resetInSeconds: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
    };
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return {
      allowed: false,
      remaining: 0,
      resetInSeconds: Math.max(1, Math.ceil((record.resetAt - now) / 1000)),
    };
  }

  record.count += 1;
  return {
    allowed: true,
    remaining: MAX_REQUESTS_PER_WINDOW - record.count,
    resetInSeconds: Math.max(1, Math.ceil((record.resetAt - now) / 1000)),
  };
}

/**
 * Extracts the idempotency key from headers (Idempotency-Key or x-idempotency-key) or body
 */
export function extractIdempotencyKey(req: NextRequest, body?: any): string | null {
  const headerKey = req.headers.get("idempotency-key") || req.headers.get("x-idempotency-key");
  if (headerKey) return headerKey.trim();
  if (body?.idempotencyKey) return String(body.idempotencyKey).trim();
  if (body?.callSessionId) return String(body.callSessionId).trim();
  return null;
}

/**
 * Records an authenticated call from the external agent to maintain factual connectivity state
 */
export async function logAgentActivity(endpoint: string, method: string, statusCode: number, message?: string) {
  try {
    await prisma.agentActivityLog.create({
      data: {
        endpoint,
        method,
        statusCode,
        source: "external AI agent",
        message: message ? message.slice(0, 255) : null,
      },
    });
  } catch (err) {
    console.error("Failed to log agent activity:", err);
  }
}

/**
 * Factually determines whether an external AI agent has ever successfully connected
 */
export async function getAgentConnectionStatus() {
  const latestLog = await prisma.agentActivityLog.findFirst({
    where: { statusCode: { gte: 200, lt: 300 } },
    orderBy: { timestamp: "desc" },
  });

  if (!latestLog) {
    return {
      isConnected: false,
      status: "Awaiting Integration",
      description: "No authenticated requests have been received from the external AI telephone calling agent yet. Website operational via authorized manual harbour records.",
      lastActiveAt: null,
    };
  }

  return {
    isConnected: true,
    status: "Connected & Active",
    description: `External AI calling agent active. Last verified call on ${new Date(latestLog.timestamp).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })} (${latestLog.method} ${latestLog.endpoint}).`,
    lastActiveAt: latestLog.timestamp,
  };
}
