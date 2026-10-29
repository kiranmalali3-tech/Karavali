import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { 
  verifyAgentApiKey, 
  checkRateLimit, 
  extractIdempotencyKey, 
  logAgentActivity 
} from "@/lib/agentAuth";
import { 
  recordOutreachAttempt, 
  getOutreachHandoffTask 
} from "@/lib/services/supplyChainService";

/**
 * GET /api/v1/agent/outreach?batchNumber=KRV-MNG-000001&species=Kingfish
 * Backend operation for external AI calling agent to request an outreach task
 * for a specific batch and its remaining unsold species quantities.
 * Returns only necessary operational data: batch number, remaining species & quantities,
 * and eligible buyer contacts with contact preferences and permissions.
 */
export async function GET(req: NextRequest) {
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

  try {
    const { searchParams } = new URL(req.url);
    const batchNumber = searchParams.get("batchNumber");
    const batchId = searchParams.get("batchId");
    const species = searchParams.get("species") || undefined;

    const identifier = batchNumber || batchId;

    if (!identifier) {
      return NextResponse.json(
        { 
          error: "Query parameter 'batchNumber' or 'batchId' is required to request an outreach task.",
          code: "MISSING_IDENTIFIER" 
        },
        { status: 400 }
      );
    }

    const task = await getOutreachHandoffTask(identifier, species);

    await logAgentActivity(
      "/api/v1/agent/outreach",
      "GET",
      200,
      `Outreach task requested for batch ${task.batchNumber}`
    );

    return NextResponse.json({
      success: true,
      task,
    });
  } catch (error: any) {
    console.error("API error retrieving outreach task:", error);

    await logAgentActivity(
      "/api/v1/agent/outreach",
      "GET",
      404,
      error.message
    );

    return NextResponse.json(
      { 
        error: error.message || "Failed to retrieve outreach task.",
        code: "BATCH_NOT_FOUND" 
      },
      { status: 404 }
    );
  }
}

/**
 * POST /api/v1/agent/outreach
 * Records the factual result of an attempted outreach from external AI calling agent.
 * Supported normalized results:
 * - Interested
 * - Not interested
 * - Requested a callback
 * - No answer
 * - Invalid contact
 * - Contact attempt not made
 * Stores batch, buyer, timestamp, result and authorised notes without audio recordings.
 */
export async function POST(req: NextRequest) {
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

  try {
    const body = await req.json();
    const idempotencyKey = extractIdempotencyKey(req, body);

    const {
      landingBatchId,
      landingBatchNumber,
      boatOwnerPotentialBuyerId,
      buyerId,
      contactName,
      contactPhone,
      speciesOffered,
      quantityOfferedKg,
      offeredRatePerKg,
      channel,
      status,
      resultNotes,
    } = body;

    let targetBatchId = landingBatchId;
    if (!targetBatchId && landingBatchNumber) {
      const batch = await prisma.landingBatch.findUnique({
        where: { batchNumber: String(landingBatchNumber).trim() },
      });
      targetBatchId = batch?.id;
    }

    if (!targetBatchId) {
      return NextResponse.json(
        { 
          error: "Either 'landingBatchNumber' or 'landingBatchId' must be provided to link outreach to an existing batch.",
          code: "MISSING_BATCH_IDENTIFIER" 
        },
        { status: 400 }
      );
    }

    if (!contactName || !contactPhone || !speciesOffered) {
      return NextResponse.json(
        { 
          error: "Missing required contact details: 'contactName', 'contactPhone', and 'speciesOffered'.",
          code: "MISSING_CONTACT_DETAILS" 
        },
        { status: 400 }
      );
    }

    const outreach: any = await recordOutreachAttempt({
      idempotencyKey: idempotencyKey || undefined,
      landingBatchId: targetBatchId,
      boatOwnerPotentialBuyerId,
      buyerId,
      contactName,
      contactPhone,
      speciesOffered,
      quantityOfferedKg: quantityOfferedKg ? Number(quantityOfferedKg) : undefined,
      offeredRatePerKg: offeredRatePerKg ? Number(offeredRatePerKg) : undefined,
      channel: channel || "AI_PHONE_CALL",
      status: status || "Contact attempt not made",
      resultNotes,
    });

    const isDuplicate = !!outreach.isDuplicate;
    const statusCode = isDuplicate ? 200 : 201;

    await logAgentActivity(
      "/api/v1/agent/outreach",
      "POST",
      statusCode,
      `Outreach attempt for ${outreach.contactName} (${isDuplicate ? "duplicate replay" : outreach.status})`
    );

    return NextResponse.json(
      {
        success: true,
        isDuplicate,
        message: isDuplicate
          ? "Duplicate request detected with matching idempotency key. Existing outreach result returned."
          : "Outreach result recorded successfully.",
        outreachId: outreach.id,
        batchId: outreach.landingBatchId,
        contactName: outreach.contactName,
        contactPhone: outreach.contactPhone,
        speciesOffered: outreach.speciesOffered,
        status: outreach.status,
        resultNotes: outreach.resultNotes,
        attemptedAt: outreach.attemptedAt,
      },
      { status: statusCode }
    );
  } catch (error: any) {
    console.error("API error recording outreach attempt:", error);

    await logAgentActivity(
      "/api/v1/agent/outreach",
      "POST",
      400,
      error.message
    );

    return NextResponse.json(
      { 
        error: error.message || "Failed to record outreach attempt.",
        code: "VALIDATION_FAILED" 
      },
      { status: 400 }
    );
  }
}
