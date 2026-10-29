"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createDispatch } from "@/lib/services/supplyChainService";

export async function createDispatchAction(formData: FormData) {
  const landingBatchId = formData.get("landingBatchId") as string;
  const landingBatchItemId = formData.get("landingBatchItemId") as string;
  const buyerId = formData.get("buyerId") as string;
  const recipientName = formData.get("recipientName") as string;
  const recipientType = (formData.get("recipientType") as string) || "wholesaler";
  const quantityKg = parseFloat(formData.get("quantityKg") as string);
  const agreedPricePerKg = parseFloat(formData.get("agreedPricePerKg") as string);
  const transportReference = (formData.get("transportReference") as string) || "Dock Consignment Gate Clearance";
  const notes = formData.get("notes") as string;

  if ((!landingBatchId && !landingBatchItemId) || isNaN(quantityKg) || quantityKg <= 0) {
    throw new Error("Invalid parameters for dispatch. Quantities must be positive.");
  }

  // Resolve landingBatchId if only landingBatchItemId is provided
  let batchId = landingBatchId;
  if (!batchId && landingBatchItemId) {
    const item = await prisma.landingBatchItem.findUnique({
      where: { id: landingBatchItemId },
    });
    batchId = item?.landingBatchId || "";
  }

  const session = await (await import("@/lib/auth")).getSessionUser();
  if (!session) {
    throw new Error("Authentication required to execute dispatches");
  }

  // If role is BUYER, ensure buyerId is strictly their own verified account
  let verifiedBuyerId = buyerId;
  let verifiedRecipientName = recipientName;
  if (session.role === "BUYER") {
    verifiedBuyerId = session.buyerId || buyerId;
    if (session.companyName) {
      verifiedRecipientName = session.companyName;
    }
  }

  await createDispatch({
    landingBatchId: batchId,
    buyerId: verifiedBuyerId || undefined,
    recipientName: verifiedRecipientName || undefined,
    recipientType,
    transportReference,
    notes: notes || undefined,
    items: [
      {
        landingBatchItemId: landingBatchItemId || undefined,
        quantityKg,
        agreedPricePerKg: isNaN(agreedPricePerKg) ? 0 : agreedPricePerKg,
      },
    ],
  });

  revalidatePath("/buyer");
  revalidatePath("/boat-owner");
  revalidatePath("/landings");
  revalidatePath("/dispatches");
  revalidatePath("/outreach");
}

export async function updatePaymentStatusAction(formData: FormData) {
  const dispatchId = formData.get("dispatchId") as string;
  const paymentStatus = formData.get("paymentStatus") as string;
  const paymentReference = formData.get("paymentReference") as string;

  if (!dispatchId || !paymentStatus) return;

  await prisma.dispatch.update({
    where: { id: dispatchId },
    data: {
      paymentStatus,
      paymentReference: paymentReference || null,
    },
  });

  revalidatePath("/dispatches");
  revalidatePath("/buyer");
  revalidatePath("/boat-owner");
}
