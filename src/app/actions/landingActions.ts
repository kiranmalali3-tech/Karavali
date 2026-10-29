"use server";

import { revalidatePath } from "next/cache";
import { createLandingBatch } from "@/lib/services/supplyChainService";

export async function createLandingBatchAction(formData: FormData) {
  const boatOwnerId = formData.get("boatOwnerId") as string;
  const landingLocation = formData.get("landingLocation") as string;
  const landingDateTime = formData.get("landingDateTime") as string;
  const operatorConfirmedBy = formData.get("operatorConfirmedBy") as string;
  const notes = formData.get("notes") as string;

  const fishSpecies = formData.get("fishSpecies") as string;
  const grade = formData.get("grade") as string;
  const quantityKg = parseFloat(formData.get("quantityKg") as string);
  const floorPricePerKg = parseFloat(formData.get("floorPricePerKg") as string);
  const iceCondition = (formData.get("iceCondition") as string) || "Well Iced (0-2°C)";

  if (!boatOwnerId || !landingLocation || !fishSpecies || isNaN(quantityKg) || quantityKg <= 0) {
    throw new Error("Missing required landing batch details. Quantities must be positive.");
  }

  await createLandingBatch({
    boatOwnerId,
    landingLocation,
    landingDateTime: landingDateTime || undefined,
    operatorConfirmedBy: operatorConfirmedBy || "Harbour Operations In-Charge",
    source: "authorised manual entry",
    notes: notes || undefined,
    items: [
      {
        fishSpecies,
        grade: grade || null,
        quantityKg,
        floorPricePerKg: isNaN(floorPricePerKg) ? null : floorPricePerKg,
        iceCondition,
      },
    ],
  });

  revalidatePath("/landings");
  revalidatePath("/boat-owner");
  revalidatePath("/buyer");
  revalidatePath("/outreach");
}
