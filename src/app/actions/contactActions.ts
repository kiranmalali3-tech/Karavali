"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { addOrLinkPotentialBuyer } from "@/lib/services/supplyChainService";

export async function addBoatOwnerAction(formData: FormData) {
  const ownerName = formData.get("ownerName") as string;
  const registeredMobileNumber = formData.get("registeredMobileNumber") as string;
  const boatName = formData.get("boatName") as string;
  const boatRegistrationNumber = formData.get("boatRegistrationNumber") as string;
  const landingCentre = formData.get("landingCentre") as string;

  if (!ownerName || !registeredMobileNumber || !landingCentre) {
    throw new Error("Missing required boat owner fields");
  }

  await prisma.boatOwner.create({
    data: {
      ownerName: ownerName.trim(),
      registeredMobileNumber: registeredMobileNumber.trim(),
      boatName: boatName ? boatName.trim() : null,
      boatRegistrationNumber: boatRegistrationNumber ? boatRegistrationNumber.trim() : null,
      landingCentre: landingCentre.trim(),
      accountStatus: "ACTIVE",
      user: {
        create: {
          name: ownerName.trim(),
          phone: registeredMobileNumber.trim(),
          role: "BOAT_OWNER",
          pin: "1234",
        },
      },
    },
  });

  revalidatePath("/contacts");
  revalidatePath("/boat-owner");
}

export async function addBuyerAction(formData: FormData) {
  const contactName = formData.get("contactName") as string;
  const businessName = formData.get("businessName") as string;
  const buyerType = (formData.get("buyerType") as string) || "wholesaler";
  const businessPhoneNumber = formData.get("businessPhoneNumber") as string;
  const preferredContactMethod = (formData.get("preferredContactMethod") as string) || "PHONE";
  const relevantLocation = formData.get("relevantLocation") as string;

  if (!contactName || !businessPhoneNumber || !relevantLocation) {
    throw new Error("Missing required buyer fields (contactName, phone, location)");
  }

  await prisma.buyer.create({
    data: {
      contactName: contactName.trim(),
      businessName: businessName ? businessName.trim() : null,
      buyerType: buyerType.trim(),
      businessPhoneNumber: businessPhoneNumber.trim(),
      preferredContactMethod,
      relevantLocation: relevantLocation.trim(),
      status: "ACTIVE",
      user: {
        create: {
          name: businessName ? `${businessName.trim()} (${contactName.trim()})` : contactName.trim(),
          phone: businessPhoneNumber.trim(),
          role: "BUYER",
          pin: "1234",
        },
      },
    },
  });

  revalidatePath("/contacts");
  revalidatePath("/buyer");
}

export async function addPotentialBuyerAction(formData: FormData) {
  const session = await (await import("@/lib/auth")).getSessionUser();
  if (!session) {
    throw new Error("Authentication required");
  }

  const boatOwnerId = formData.get("boatOwnerId") as string;
  const contactName = formData.get("contactName") as string;
  const phoneNumber = formData.get("phoneNumber") as string;
  const buyerType = (formData.get("buyerType") as string) || "wholesaler";
  const businessName = formData.get("businessName") as string;
  const speciesPreferences = formData.get("speciesPreferences") as string;
  const preferredContactMethod = (formData.get("preferredContactMethod") as string) || "PHONE";
  const consentStatus = (formData.get("consentStatus") as string) || "CONSENT_GRANTED";
  const notes = formData.get("notes") as string;

  if (!boatOwnerId || !contactName || !phoneNumber) {
    throw new Error("Missing required potential buyer fields");
  }

  // Server-side authorization check: Only the boat owner themselves or an OPERATOR can add contacts
  if (session.role === "BOAT_OWNER" && session.boatOwnerId !== boatOwnerId) {
    throw new Error("Unauthorized: Cannot add contacts to another boat owner profile");
  }
  if (session.role === "BUYER") {
    throw new Error("Unauthorized: Buyers cannot modify boat owner contact lists");
  }

  await addOrLinkPotentialBuyer(boatOwnerId, {
    contactName,
    phoneNumber,
    buyerType,
    businessName,
    speciesPreferences,
    preferredContactMethod,
    consentStatus,
    notes,
  });

  revalidatePath("/contacts");
  revalidatePath("/boat-owner");
  revalidatePath("/outreach");
}

export async function togglePotentialBuyerStatusAction(formData: FormData) {
  const session = await (await import("@/lib/auth")).getSessionUser();
  if (!session) throw new Error("Authentication required");

  const contactRecordId = formData.get("contactRecordId") as string;
  const currentStatus = formData.get("currentStatus") as string;

  if (!contactRecordId) return;

  const record = await prisma.boatOwnerPotentialBuyer.findUnique({
    where: { id: contactRecordId },
  });

  if (!record) return;

  // Authorization check
  if (session.role === "BOAT_OWNER" && session.boatOwnerId !== record.boatOwnerId) {
    throw new Error("Unauthorized: Cannot edit contacts for another boat owner");
  }
  if (session.role === "BUYER") {
    throw new Error("Unauthorized");
  }

  const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";

  await prisma.boatOwnerPotentialBuyer.update({
    where: { id: contactRecordId },
    data: { status: newStatus },
  });

  revalidatePath("/contacts");
  revalidatePath("/boat-owner");
  revalidatePath("/outreach");
}

export async function updatePotentialBuyerAction(formData: FormData) {
  const session = await (await import("@/lib/auth")).getSessionUser();
  if (!session) throw new Error("Authentication required");

  const contactRecordId = formData.get("contactRecordId") as string;
  const speciesPreferences = formData.get("speciesPreferences") as string;
  const preferredContactMethod = formData.get("preferredContactMethod") as string;
  const consentStatus = formData.get("consentStatus") as string;
  const notes = formData.get("notes") as string;

  if (!contactRecordId) return;

  const record = await prisma.boatOwnerPotentialBuyer.findUnique({
    where: { id: contactRecordId },
  });

  if (!record) return;

  // Authorization check
  if (session.role === "BOAT_OWNER" && session.boatOwnerId !== record.boatOwnerId) {
    throw new Error("Unauthorized");
  }
  if (session.role === "BUYER") {
    throw new Error("Unauthorized");
  }

  await prisma.boatOwnerPotentialBuyer.update({
    where: { id: contactRecordId },
    data: {
      speciesPreferences: speciesPreferences?.trim() || null,
      preferredContactMethod: preferredContactMethod || record.preferredContactMethod,
      consentStatus: consentStatus || record.consentStatus,
      notes: notes?.trim() || null,
    },
  });

  revalidatePath("/contacts");
  revalidatePath("/boat-owner");
  revalidatePath("/outreach");
}

export async function removePotentialBuyerAction(formData: FormData) {
  const session = await (await import("@/lib/auth")).getSessionUser();
  if (!session) throw new Error("Authentication required");

  const contactRecordId = formData.get("contactRecordId") as string;
  if (!contactRecordId) return;

  const record = await prisma.boatOwnerPotentialBuyer.findUnique({
    where: { id: contactRecordId },
  });

  if (!record) return;

  if (session.role === "BOAT_OWNER" && session.boatOwnerId !== record.boatOwnerId) {
    throw new Error("Unauthorized");
  }
  if (session.role === "BUYER") {
    throw new Error("Unauthorized");
  }

  await prisma.boatOwnerPotentialBuyer.delete({
    where: { id: contactRecordId },
  });

  revalidatePath("/contacts");
  revalidatePath("/boat-owner");
}
