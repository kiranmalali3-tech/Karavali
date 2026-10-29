import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAgentApiKey, checkRateLimit, logAgentActivity } from "@/lib/agentAuth";

export async function GET(req: NextRequest) {
  try {
    const rateLimit = checkRateLimit(req);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too Many Requests: Rate limit exceeded. Try again in " + rateLimit.resetInSeconds + " seconds." },
        { status: 429, headers: { "Retry-After": String(rateLimit.resetInSeconds) } }
      );
    }

    if (!verifyAgentApiKey(req)) {
      await logAgentActivity("/api/v1/agent/remaining-stock", "GET", 401, "Unauthorized access attempt");
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing API key." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const harbour = searchParams.get("harbour");
    const species = searchParams.get("species");

    const batches = await prisma.landingBatch.findMany({
      where: {
        confirmationStatus: { in: ["CONFIRMED", "PARTIALLY_DISPATCHED"] },
        landingLocation: harbour ? { contains: harbour } : undefined,
      },
      include: {
        boatOwner: true,
        items: {
          where: species ? { fishSpecies: { contains: species } } : undefined,
          include: {
            dispatchItems: {
              include: { dispatch: true },
            },
          },
        },
      },
      orderBy: { landingDateTime: "desc" },
    });

    const lots: any[] = [];

    for (const b of batches) {
      for (const item of b.items) {
        const dispatchedKg = item.dispatchItems
          .filter((di) => di.dispatch.confirmationStatus === "CONFIRMED")
          .reduce((s, di) => s + di.quantityKg, 0);

        const remainingKg = Math.max(0, item.quantityKg - dispatchedKg);

        if (remainingKg > 0) {
          lots.push({
            landingBatchItemId: item.id,
            landingBatchId: b.id,
            batchNumber: b.batchNumber,
            fishSpecies: item.fishSpecies,
            grade: item.grade,
            landedQuantityKg: item.quantityKg,
            dispatchedQuantityKg: dispatchedKg,
            remainingQuantityKg: remainingKg,
            floorPricePerKg: item.floorPricePerKg,
            iceCondition: item.iceCondition,
            landingLocation: b.landingLocation,
            landingDateTime: b.landingDateTime,
            boatName: b.boatOwner.boatName,
            boatOwnerName: b.boatOwner.ownerName,
            boatOwnerPhone: b.boatOwner.registeredMobileNumber,
          });
        }
      }
    }

    await logAgentActivity("/api/v1/agent/remaining-stock", "GET", 200, `Retrieved ${lots.length} active lots`);

    return NextResponse.json({
      success: true,
      totalLots: lots.length,
      lots,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
