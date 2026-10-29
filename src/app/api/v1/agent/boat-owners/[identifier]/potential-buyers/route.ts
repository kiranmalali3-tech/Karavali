import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAgentApiKey } from "@/lib/agentAuth";

export async function GET(
  req: NextRequest,
  { params }: { params: { identifier: string } }
) {
  if (!verifyAgentApiKey(req)) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing API key." },
      { status: 401 }
    );
  }

  const { identifier } = params;
  const decodedId = decodeURIComponent(identifier).trim();

  // Find boat owner first
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
        where: {
          status: "ACTIVE",
          consentStatus: "CONSENT_GRANTED",
        },
        include: {
          buyer: true,
        },
        orderBy: { contactName: "asc" },
      },
    },
  });

  if (!boatOwner) {
    return NextResponse.json(
      { error: `Boat owner not found for identifier '${decodedId}'.` },
      { status: 404 }
    );
  }

  const contacts = boatOwner.potentialBuyers.map((pb) => ({
    contactRecordId: pb.id,
    buyerId: pb.buyerId,
    businessName: pb.buyer?.businessName || null,
    contactName: pb.contactName,
    phoneNumber: pb.phoneNumber,
    buyerType: pb.buyerType,
    speciesPreferences: pb.speciesPreferences,
    preferredContactMethod: pb.preferredContactMethod,
    consentStatus: pb.consentStatus,
    notes: pb.notes,
    relevantLocation: pb.buyer?.relevantLocation || null,
  }));

  return NextResponse.json({
    success: true,
    boatOwnerId: boatOwner.id,
    boatOwnerName: boatOwner.ownerName,
    boatName: boatOwner.boatName,
    landingCentre: boatOwner.landingCentre,
    totalActiveContacts: contacts.length,
    contacts,
  });
}
