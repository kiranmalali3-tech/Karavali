import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAgentApiKey, checkRateLimit, logAgentActivity } from "@/lib/agentAuth";

/**
 * GET /api/v1/agent/boat-owners/[identifier]
 * Look up boat-owner profile by phone number, vessel registration, or ID.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { identifier: string } }
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

  const { identifier } = params;
  if (!identifier) {
    return NextResponse.json(
      { error: "Identifier parameter is required.", code: "MISSING_IDENTIFIER" },
      { status: 400 }
    );
  }

  const decodedId = decodeURIComponent(identifier).trim();

  const boatOwner = await prisma.boatOwner.findFirst({
    where: {
      OR: [
        { id: decodedId },
        { registeredMobileNumber: decodedId },
        { boatRegistrationNumber: decodedId },
      ],
    },
    include: {
      potentialBuyers: {
        where: { status: "ACTIVE" },
      },
      landings: {
        take: 5,
        orderBy: { landingDateTime: "desc" },
        include: {
          items: true,
        },
      },
    },
  });

  if (!boatOwner) {
    await logAgentActivity(
      `/api/v1/agent/boat-owners/${decodedId}`,
      "GET",
      404,
      `Boat owner not found: ${decodedId}`
    );

    return NextResponse.json(
      { 
        error: `Boat owner profile not found for identifier '${decodedId}'. Please confirm registration with harbour operator.`,
        code: "OWNER_NOT_FOUND" 
      },
      { status: 404 }
    );
  }

  await logAgentActivity(
    `/api/v1/agent/boat-owners/${decodedId}`,
    "GET",
    200,
    `Profile identified for ${boatOwner.ownerName} (${boatOwner.boatName})`
  );

  return NextResponse.json({
    success: true,
    boatOwner: {
      id: boatOwner.id,
      ownerName: boatOwner.ownerName,
      registeredMobileNumber: boatOwner.registeredMobileNumber,
      boatName: boatOwner.boatName,
      boatRegistrationNumber: boatOwner.boatRegistrationNumber,
      landingCentre: boatOwner.landingCentre,
      accountStatus: boatOwner.accountStatus,
      activePotentialBuyersCount: boatOwner.potentialBuyers.length,
      recentLandingsCount: boatOwner.landings.length,
      createdAt: boatOwner.createdAt,
      updatedAt: boatOwner.updatedAt,
    },
  });
}
