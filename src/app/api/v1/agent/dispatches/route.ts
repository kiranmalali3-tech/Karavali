import { NextRequest, NextResponse } from "next/server";
import { 
  verifyAgentApiKey, 
  checkRateLimit, 
  extractIdempotencyKey, 
  logAgentActivity 
} from "@/lib/agentAuth";
import { createDispatch } from "@/lib/services/supplyChainService";

/**
 * POST /api/v1/agent/dispatches
 * Authenticated server-to-server endpoint for external AI calling agent to submit confirmed fish dispatches.
 * Strictly prevents over-dispatch and guarantees duplicate protection using idempotency keys.
 */
export async function POST(req: NextRequest) {
  // 1. API Key Authentication
  if (!verifyAgentApiKey(req)) {
    return NextResponse.json(
      { 
        error: "Unauthorized: Invalid or missing API key in Authorization / x-api-key header.",
        code: "UNAUTHORIZED" 
      },
      { status: 401 }
    );
  }

  // 2. Server-side Rate Limiting
  const rateLimit = checkRateLimit(req);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { 
        error: "Rate limit exceeded. Too many requests from this client.",
        code: "RATE_LIMIT_EXCEEDED",
        retryAfterSeconds: rateLimit.resetInSeconds 
      },
      { 
        status: 429, 
        headers: { "Retry-After": String(rateLimit.resetInSeconds) } 
      }
    );
  }

  try {
    const body = await req.json();
    const idempotencyKey = extractIdempotencyKey(req, body);

    const {
      landingBatchId,
      landingBatchNumber,
      buyerId,
      buyerPhone,
      recipientType,
      recipientName,
      transportReference,
      dispatchDateTime,
      notes,
      items,
      species,
      quantityKg,
      agreedPricePerKg,
    } = body;

    // 3. Resolve Items Input
    let dispatchItems = items;
    if (!Array.isArray(dispatchItems) || dispatchItems.length === 0) {
      if (species && quantityKg) {
        dispatchItems = [
          {
            fishSpecies: String(species).trim(),
            quantityKg: Number(quantityKg),
            agreedPricePerKg: agreedPricePerKg ? Number(agreedPricePerKg) : 0,
          },
        ];
      } else {
        return NextResponse.json(
          { 
            error: "Missing required fields: Specify 'landingBatchNumber' (or 'landingBatchId') and either an 'items' array or 'species' & 'quantityKg'.",
            code: "MISSING_DISPATCH_ITEMS" 
          },
          { status: 400 }
        );
      }
    }

    if (!landingBatchNumber && !landingBatchId) {
      return NextResponse.json(
        { 
          error: "Either 'landingBatchNumber' or 'landingBatchId' must be provided to identify the target batch.",
          code: "MISSING_BATCH_IDENTIFIER" 
        },
        { status: 400 }
      );
    }

    // 4. Create Dispatch (or return existing if duplicate idempotency key)
    const dispatch: any = await createDispatch({
      idempotencyKey: idempotencyKey || undefined,
      landingBatchId,
      landingBatchNumber,
      buyerId,
      buyerPhone,
      recipientType,
      recipientName,
      transportReference,
      dispatchDateTime,
      notes,
      items: dispatchItems,
    });

    const isDuplicate = !!dispatch.isDuplicate;
    const statusCode = isDuplicate ? 200 : 201;

    // 5. Log Real Integration Activity
    await logAgentActivity(
      "/api/v1/agent/dispatches",
      "POST",
      statusCode,
      `Dispatch consignment ${dispatch.dispatchNumber} (${isDuplicate ? "duplicate replay" : "created"})`
    );

    return NextResponse.json(
      {
        success: true,
        isDuplicate,
        message: isDuplicate
          ? "Duplicate request detected with matching idempotency key. Existing dispatch consignment returned."
          : "Confirmed dispatch recorded successfully and stock balances deducted.",
        dispatchId: dispatch.id,
        dispatchNumber: dispatch.dispatchNumber,
        landingBatchId: dispatch.landingBatchId,
        landingBatchNumber: dispatch.landingBatch?.batchNumber,
        recipientName: dispatch.recipientName,
        recipientType: dispatch.recipientType,
        totalAmount: dispatch.totalAmount,
        confirmationStatus: dispatch.confirmationStatus,
        itemsCount: dispatch.items.length,
        items: dispatch.items.map((i: any) => ({
          itemId: i.id,
          quantityKg: i.quantityKg,
          agreedPricePerKg: i.agreedPricePerKg,
          totalAmount: i.totalAmount,
        })),
      },
      { status: statusCode }
    );
  } catch (error: any) {
    console.error("API error creating dispatch:", error);

    const errorMessage = error.message || "Failed to record dispatch.";
    let statusCode = 400;
    let errorCode = "VALIDATION_FAILED";

    if (errorMessage.includes("Landing batch not found") || errorMessage.includes("not found")) {
      statusCode = 404;
      errorCode = "BATCH_NOT_FOUND";
    } else if (errorMessage.includes("Over-dispatch prevented") || errorMessage.includes("Insufficient remaining quantity")) {
      statusCode = 400;
      errorCode = "OVER_DISPATCH_PREVENTED";
    } else if (errorMessage.includes("does not exist in batch")) {
      statusCode = 400;
      errorCode = "INVALID_SPECIES";
    } else if (errorMessage.includes("positive number")) {
      statusCode = 400;
      errorCode = "INVALID_QUANTITY";
    }

    await logAgentActivity(
      "/api/v1/agent/dispatches",
      "POST",
      statusCode,
      errorMessage
    );

    return NextResponse.json(
      { 
        error: errorMessage,
        code: errorCode 
      },
      { status: statusCode }
    );
  }
}
