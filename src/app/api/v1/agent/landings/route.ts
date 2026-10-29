import { NextRequest, NextResponse } from "next/server";
import { 
  verifyAgentApiKey, 
  checkRateLimit, 
  extractIdempotencyKey, 
  logAgentActivity 
} from "@/lib/agentAuth";
import { createLandingBatch } from "@/lib/services/supplyChainService";

/**
 * POST /api/v1/agent/landings
 * Authenticated server-to-server endpoint for external AI calling agent to submit confirmed fish landings.
 * Supports idempotency keys to prevent duplicate batch creation on network retries.
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
      boatOwnerId,
      boatOwnerPhone,
      boatRegistrationNumber,
      landingLocation,
      landingDateTime,
      operatorConfirmedBy,
      notes,
      items,
      source,
    } = body;

    // 3. Request Validation
    if (!landingLocation || !landingLocation.trim()) {
      return NextResponse.json(
        { 
          error: "Missing required field 'landingLocation'. Location is required for harbour allocation.",
          code: "MISSING_LOCATION" 
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { 
          error: "Missing or empty 'items' array. At least one species lot must be specified.",
          code: "EMPTY_ITEMS" 
        },
        { status: 400 }
      );
    }

    for (const item of items) {
      if (!item.fishSpecies || !item.fishSpecies.trim()) {
        return NextResponse.json(
          { 
            error: "Every item in the landing batch must specify a non-empty 'fishSpecies'.",
            code: "MISSING_SPECIES" 
          },
          { status: 400 }
        );
      }
      const qty = Number(item.quantityKg);
      if (isNaN(qty) || qty <= 0) {
        return NextResponse.json(
          { 
            error: `Invalid quantity '${item.quantityKg}' for species '${item.fishSpecies}'. Quantities must be strictly positive numbers.`,
            code: "INVALID_QUANTITY" 
          },
          { status: 400 }
        );
      }
    }

    // 4. Create Landing Batch (or return existing if idempotencyKey matched)
    const batch: any = await createLandingBatch({
      idempotencyKey: idempotencyKey || undefined,
      boatOwnerId,
      boatOwnerPhone,
      boatRegistrationNumber,
      landingLocation,
      landingDateTime,
      operatorConfirmedBy,
      source: source || "external AI agent",
      notes,
      items,
    });

    const isDuplicate = !!batch.isDuplicate;
    const statusCode = isDuplicate ? 200 : 201;

    // 5. Log Real Integration Activity
    await logAgentActivity(
      "/api/v1/agent/landings",
      "POST",
      statusCode,
      `Landing batch ${batch.batchNumber} (${isDuplicate ? "duplicate replay" : "created"})`
    );

    return NextResponse.json(
      {
        success: true,
        isDuplicate,
        message: isDuplicate
          ? "Duplicate request detected with matching idempotency key. Existing landing batch returned."
          : "Confirmed landing batch recorded and inventory ledger initialized successfully.",
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        boatName: batch.boatOwner.boatName,
        ownerName: batch.boatOwner.ownerName,
        landingLocation: batch.landingLocation,
        landingDateTime: batch.landingDateTime,
        confirmationStatus: batch.confirmationStatus,
        source: batch.source,
        totalItemsCount: batch.items.length,
        items: batch.items.map((i: any) => ({
          itemId: i.id,
          fishSpecies: i.fishSpecies,
          quantityKg: i.quantityKg,
          grade: i.grade,
          floorPricePerKg: i.floorPricePerKg,
        })),
      },
      { status: statusCode }
    );
  } catch (error: any) {
    console.error("API error creating landing batch:", error);

    const errorMessage = error.message || "Failed to record landing batch.";
    const isNotFound = errorMessage.includes("could not be found") || errorMessage.includes("not found");
    const statusCode = isNotFound ? 404 : 400;

    await logAgentActivity(
      "/api/v1/agent/landings",
      "POST",
      statusCode,
      errorMessage
    );

    return NextResponse.json(
      { 
        error: errorMessage,
        code: isNotFound ? "OWNER_NOT_FOUND" : "VALIDATION_FAILED" 
      },
      { status: statusCode }
    );
  }
}
