"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { recordOutreachAttempt } from "@/lib/services/supplyChainService";

export async function createOutreachAction(formData: FormData) {
  const landingBatchId = formData.get("landingBatchId") as string;
  const buyerId = formData.get("buyerId") as string;
  const boatOwnerPotentialBuyerId = formData.get("boatOwnerPotentialBuyerId") as string;
  const contactName = formData.get("contactName") as string;
  const contactPhone = formData.get("contactPhone") as string;
  const speciesOffered = formData.get("speciesOffered") as string;
  const quantityOfferedKg = parseFloat(formData.get("quantityOfferedKg") as string);
  const offeredRatePerKg = parseFloat(formData.get("offeredRatePerKg") as string);
  const channel = (formData.get("channel") as "AI_PHONE_CALL" | "OPERATOR_CALL") || "AI_PHONE_CALL";
  const status = (formData.get("status") as any) || "ATTEMPTED";
  const resultNotes = formData.get("resultNotes") as string;

  if (!landingBatchId || !contactName || !contactPhone || !speciesOffered) {
    throw new Error("Missing required outreach fields (landingBatchId, contactName, contactPhone, speciesOffered)");
  }

  await recordOutreachAttempt({
    landingBatchId,
    buyerId: buyerId || undefined,
    boatOwnerPotentialBuyerId: boatOwnerPotentialBuyerId || undefined,
    contactName,
    contactPhone,
    speciesOffered,
    quantityOfferedKg: isNaN(quantityOfferedKg) ? undefined : quantityOfferedKg,
    offeredRatePerKg: isNaN(offeredRatePerKg) ? undefined : offeredRatePerKg,
    channel,
    status,
    resultNotes: resultNotes || undefined,
  });

  revalidatePath("/outreach");
}

export async function updateOutreachStatusAction(formData: FormData) {
  const outreachId = formData.get("outreachId") as string;
  const status = formData.get("status") as string;
  const resultNotes = formData.get("resultNotes") as string;

  if (!outreachId || !status) return;

  await prisma.outreachAttempt.update({
    where: { id: outreachId },
    data: {
      status,
      resultNotes: resultNotes || undefined,
    },
  });

  revalidatePath("/outreach");
}
