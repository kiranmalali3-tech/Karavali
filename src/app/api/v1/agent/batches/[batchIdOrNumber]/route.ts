import { NextRequest, NextResponse } from "next/server";
import { verifyAgentApiKey, checkRateLimit, logAgentActivity } from "@/lib/agentAuth";
import { getBatchRemainingInventory } from "@/lib/services/supplyChainService";

/**
 * GET /api/v1/agent/batches/[batchIdOrNumber]
 * Look up landing batch details and exact remaining quantity per species.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { batchIdOrNumber: string } }
) {
  if (!verifyAgentApiKey(req)) {
    return NextResponse.json(
      { 
        error: "Unauthorized: Invalid or missing API key in Authorization / x-api-key header.",
        code: "UNAUTHORIZED" 
      },
      { status: 401 }
    );
  }

  const rateLimit = checkRateLimit(req);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { 
        error: "Rate limit exceeded. Too many requests.",
        code: "RATE_LIMIT_EXCEEDED",
        retryAfterSeconds: rateLimit.resetInSeconds 
      },
      { status: 429, headers: { "Retry-After": String(rateLimit.resetInSeconds) } }
    );
  }

  const { batchIdOrNumber } = params;
  if (!batchIdOrNumber) {
    return NextResponse.json(
      { error: "Batch ID or Batch Number parameter is required.", code: "MISSING_IDENTIFIER" },
      { status: 400 }
    );
  }

  try {
    const decoded = decodeURIComponent(batchIdOrNumber).trim();
    const inventory = await getBatchRemainingInventory(decoded);

    await logAgentActivity(
      `/api/v1/agent/batches/${decoded}`,
      "GET",
      200,
      `Batch inventory queried for ${inventory.batchNumber}`
    );

    return NextResponse.json({
      success: true,
      batch: inventory,
    });
  } catch (error: any) {
    return NextResponse.json(
      { 
        error: error.message || "Failed to lookup batch.",
        code: "BATCH_NOT_FOUND" 
      },
      { status: 404 }
    );
  }
}
