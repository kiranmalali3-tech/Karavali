import { prisma } from "@/lib/prisma";

export interface CreateLandingItemInput {
  fishSpecies: string;
  quantityKg: number;
  grade?: string | null;
  floorPricePerKg?: number | null;
  iceCondition?: string | null;
}

export interface CreateLandingBatchInput {
  idempotencyKey?: string;
  boatOwnerId?: string;
  boatOwnerPhone?: string;
  boatRegistrationNumber?: string;
  landingLocation: string;
  landingDateTime?: Date | string;
  operatorConfirmedBy?: string;
  source?: "external AI agent" | "authorised manual entry";
  notes?: string;
  items: CreateLandingItemInput[];
}

export interface CreateDispatchItemInput {
  landingBatchItemId?: string;
  fishSpecies?: string;
  quantityKg: number;
  agreedPricePerKg?: number;
}

export interface CreateDispatchInput {
  idempotencyKey?: string;
  landingBatchId?: string;
  landingBatchNumber?: string;
  buyerId?: string;
  buyerPhone?: string;
  recipientType?: string; // "auction agent" | "wholesaler" | "retailer" | "trader" | "direct buyer"
  recipientName?: string;
  transportReference?: string;
  dispatchDateTime?: Date | string;
  notes?: string;
  items: CreateDispatchItemInput[];
}

export interface OutreachAttemptInput {
  idempotencyKey?: string;
  landingBatchId: string;
  boatOwnerPotentialBuyerId?: string;
  buyerId?: string;
  contactName: string;
  contactPhone: string;
  speciesOffered: string;
  quantityOfferedKg?: number;
  offeredRatePerKg?: number;
  channel?: "AI_PHONE_CALL" | "OPERATOR_CALL";
  status?: string;
  resultNotes?: string;
}

/**
 * Extracts a 3-letter location abbreviation for human-readable IDs
 * e.g., "Malpe Harbour" -> "MAL", "Mangaluru" -> "MNG", "Gangolli" -> "GAN"
 */
function getLocationCode(location: string): string {
  const clean = location.toUpperCase();
  if (clean.includes("MALPE")) return "MAL";
  if (clean.includes("MANGALURU") || clean.includes("BUNDER")) return "MNG";
  if (clean.includes("GANGOLLI")) return "GAN";
  if (clean.includes("TADADI")) return "TAD";
  if (clean.includes("KARWAR")) return "KAR";
  return "KRV";
}

/**
 * Server-side generation of unique human-readable batch numbers
 * Format: KRV-[LOC]-[6-digit sequence] (e.g. KRV-MAL-000001)
 */
export async function generateBatchNumber(location: string): Promise<string> {
  const locCode = getLocationCode(location);
  const totalCount = await prisma.landingBatch.count();
  const seq = String(totalCount + 1).padStart(6, "0");
  return `KRV-${locCode}-${seq}`;
}

/**
 * Server-side generation of unique human-readable dispatch numbers
 * Format: DSP-[LOC]-[6-digit sequence] (e.g. DSP-MAL-000001)
 */
export async function generateDispatchNumber(location: string): Promise<string> {
  const locCode = getLocationCode(location);
  const totalCount = await prisma.dispatch.count();
  const seq = String(totalCount + 1).padStart(6, "0");
  return `DSP-${locCode}-${seq}`;
}

/**
 * Calculates remaining stock inventory for a landing batch
 * Formula: Remaining = Landed - Sum(Confirmed Dispatches)
 */
export async function getBatchRemainingInventory(batchIdOrNumber: string) {
  const batch = await prisma.landingBatch.findFirst({
    where: {
      OR: [
        { id: batchIdOrNumber },
        { batchNumber: batchIdOrNumber },
      ],
    },
    include: {
      boatOwner: true,
      items: {
        include: {
          dispatchItems: {
            include: {
              dispatch: true,
            },
          },
        },
      },
      dispatches: {
        include: {
          buyer: true,
          items: true,
        },
      },
    },
  });

  if (!batch) {
    throw new Error(`Landing batch not found: '${batchIdOrNumber}'`);
  }

  // Calculate confirmed dispatches per item
  const itemInventory = batch.items.map((item) => {
    const totalDispatchedKg = item.dispatchItems
      .filter((di) => di.dispatch.confirmationStatus === "CONFIRMED")
      .reduce((sum, di) => sum + di.quantityKg, 0);

    const remainingKg = Math.max(0, item.quantityKg - totalDispatchedKg);

    return {
      itemId: item.id,
      fishSpecies: item.fishSpecies,
      grade: item.grade,
      floorPricePerKg: item.floorPricePerKg,
      iceCondition: item.iceCondition,
      landedQuantityKg: item.quantityKg,
      dispatchedQuantityKg: totalDispatchedKg,
      remainingQuantityKg: remainingKg,
      isFullyDispatched: remainingKg <= 0,
    };
  });

  const totalLandedKg = itemInventory.reduce((s, i) => s + i.landedQuantityKg, 0);
  const totalDispatchedKg = itemInventory.reduce((s, i) => s + i.dispatchedQuantityKg, 0);
  const totalRemainingKg = itemInventory.reduce((s, i) => s + i.remainingQuantityKg, 0);

  let calculatedStatus = "CONFIRMED";
  if (totalRemainingKg <= 0) {
    calculatedStatus = "FULLY_DISPATCHED";
  } else if (totalDispatchedKg > 0) {
    calculatedStatus = "PARTIALLY_DISPATCHED";
  }

  return {
    batchId: batch.id,
    batchNumber: batch.batchNumber,
    boatOwner: {
      id: batch.boatOwner.id,
      ownerName: batch.boatOwner.ownerName,
      registeredMobileNumber: batch.boatOwner.registeredMobileNumber,
      boatName: batch.boatOwner.boatName,
      boatRegistrationNumber: batch.boatOwner.boatRegistrationNumber,
      landingCentre: batch.boatOwner.landingCentre,
    },
    landingLocation: batch.landingLocation,
    landingDateTime: batch.landingDateTime,
    confirmationStatus: calculatedStatus,
    source: batch.source,
    operatorConfirmedBy: batch.operatorConfirmedBy,
    notes: batch.notes,
    totalLandedKg,
    totalDispatchedKg,
    totalRemainingKg,
    items: itemInventory,
    dispatchesCount: batch.dispatches.length,
    createdAt: batch.createdAt,
  };
}

/**
 * Creates a landing batch with validated items inside an ACID transaction
 */
export async function createLandingBatch(input: CreateLandingBatchInput) {
  // Check for duplicate request via idempotency key
  if (input.idempotencyKey) {
    const existing = await prisma.landingBatch.findUnique({
      where: { idempotencyKey: input.idempotencyKey.trim() },
      include: {
        items: true,
        boatOwner: true,
      },
    });
    if (existing) {
      return { ...existing, isDuplicate: true };
    }
  }

  // 1. Resolve Boat Owner
  const boatOwner = await prisma.boatOwner.findFirst({
    where: {
      OR: [
        input.boatOwnerId ? { id: input.boatOwnerId } : undefined,
        input.boatOwnerPhone ? { registeredMobileNumber: input.boatOwnerPhone.trim() } : undefined,
        input.boatRegistrationNumber ? { boatRegistrationNumber: input.boatRegistrationNumber.trim() } : undefined,
      ].filter(Boolean) as any,
    },
  });

  if (!boatOwner) {
    throw new Error(
      `Boat owner could not be found with identifier (phone: ${input.boatOwnerPhone || "none"}, reg: ${input.boatRegistrationNumber || "none"}, id: ${input.boatOwnerId || "none"})`
    );
  }

  // 2. Validate items
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new Error("Landing batch must contain at least one fish species item.");
  }

  for (const item of input.items) {
    if (!item.fishSpecies || !item.fishSpecies.trim()) {
      throw new Error("Fish species is required for every landing item.");
    }
    const qty = Number(item.quantityKg);
    if (isNaN(qty) || qty <= 0) {
      throw new Error(`Invalid quantity for species '${item.fishSpecies}'. Quantities must be strictly positive numbers.`);
    }
  }

  // 3. Generate batch number
  const batchNumber = await generateBatchNumber(input.landingLocation);

  const landingDateTime = input.landingDateTime ? new Date(input.landingDateTime) : new Date();

  // 4. Execute atomic database transaction
  return await prisma.$transaction(async (tx) => {
    const batch = await tx.landingBatch.create({
      data: {
        batchNumber,
        idempotencyKey: input.idempotencyKey ? input.idempotencyKey.trim() : null,
        boatOwnerId: boatOwner.id,
        landingLocation: input.landingLocation.trim(),
        landingDateTime,
        confirmationStatus: "CONFIRMED",
        source: input.source || "external AI agent",
        operatorConfirmedBy: input.operatorConfirmedBy || "Harbour Operations In-Charge",
        notes: input.notes || null,
        items: {
          create: input.items.map((item) => ({
            fishSpecies: item.fishSpecies.trim(),
            quantityKg: Number(item.quantityKg),
            grade: item.grade ? item.grade.trim() : null,
            floorPricePerKg: item.floorPricePerKg ? Number(item.floorPricePerKg) : null,
            iceCondition: item.iceCondition ? item.iceCondition.trim() : "Well Iced (0-2°C)",
          })),
        },
      },
      include: {
        items: true,
        boatOwner: true,
      },
    });

    return batch;
  });
}

/**
 * Creates a dispatch with strict positive quantity checks and over-dispatch prevention
 */
export async function createDispatch(input: CreateDispatchInput) {
  // Check for duplicate dispatch via idempotency key
  if (input.idempotencyKey) {
    const existing = await prisma.dispatch.findUnique({
      where: { idempotencyKey: input.idempotencyKey.trim() },
      include: {
        items: true,
        buyer: true,
        landingBatch: {
          include: { boatOwner: true },
        },
      },
    });
    if (existing) {
      return { ...existing, isDuplicate: true };
    }
  }

  // 1. Locate landing batch
  const batch = await prisma.landingBatch.findFirst({
    where: {
      OR: [
        input.landingBatchId ? { id: input.landingBatchId } : undefined,
        input.landingBatchNumber ? { batchNumber: input.landingBatchNumber.trim() } : undefined,
      ].filter(Boolean) as any,
    },
    include: {
      items: {
        include: {
          dispatchItems: {
            include: { dispatch: true },
          },
        },
      },
    },
  });

  if (!batch) {
    throw new Error(`Landing batch not found (${input.landingBatchNumber || input.landingBatchId})`);
  }

  // 2. Validate dispatch items
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new Error("Dispatch must contain at least one item.");
  }

  // Resolve buyer if supplied
  let buyer = null;
  if (input.buyerId || input.buyerPhone) {
    buyer = await prisma.buyer.findFirst({
      where: {
        OR: [
          input.buyerId ? { id: input.buyerId } : undefined,
          input.buyerPhone ? { businessPhoneNumber: input.buyerPhone.trim() } : undefined,
        ].filter(Boolean) as any,
      },
    });
  }

  const recipientName = input.recipientName?.trim() || buyer?.businessName || buyer?.contactName || "Direct Market Wholesaler";
  const recipientType = input.recipientType?.trim() || buyer?.buyerType || "wholesaler";

  // 3. Pre-validate quantities and calculate current remaining balances
  const itemsToDispatch: Array<{
    batchItemId: string;
    species: string;
    quantityKg: number;
    agreedPricePerKg: number;
    totalAmount: number;
  }> = [];

  for (const itemInput of input.items) {
    const qty = Number(itemInput.quantityKg);
    if (isNaN(qty) || qty <= 0) {
      throw new Error("Dispatched quantity must be a strictly positive number.");
    }

    // Match batch item by ID or Species
    let targetBatchItem = null;
    if (itemInput.landingBatchItemId) {
      targetBatchItem = batch.items.find((bi) => bi.id === itemInput.landingBatchItemId);
    } else if (itemInput.fishSpecies) {
      const search = itemInput.fishSpecies.toLowerCase().trim();
      targetBatchItem = batch.items.find((bi) => bi.fishSpecies.toLowerCase().includes(search));
    }

    if (!targetBatchItem) {
      throw new Error(`Species '${itemInput.fishSpecies || itemInput.landingBatchItemId}' does not exist in batch '${batch.batchNumber}'.`);
    }

    // Calculate current confirmed dispatched quantity for this specific batch item
    const alreadyDispatchedKg = targetBatchItem.dispatchItems
      .filter((di) => di.dispatch.confirmationStatus === "CONFIRMED")
      .reduce((s, di) => s + di.quantityKg, 0);

    const availableKg = targetBatchItem.quantityKg - alreadyDispatchedKg;

    if (qty > availableKg) {
      throw new Error(
        `Insufficient remaining quantity for '${targetBatchItem.fishSpecies}'. Requested: ${qty} Kg, Available: ${availableKg} Kg (Landed: ${targetBatchItem.quantityKg} Kg, Already Dispatched: ${alreadyDispatchedKg} Kg). Over-dispatch prevented.`
      );
    }

    const price = itemInput.agreedPricePerKg || targetBatchItem.floorPricePerKg || 0;
    const lineTotal = qty * price;

    itemsToDispatch.push({
      batchItemId: targetBatchItem.id,
      species: targetBatchItem.fishSpecies,
      quantityKg: qty,
      agreedPricePerKg: price,
      totalAmount: lineTotal,
    });
  }

  // 4. Generate unique dispatch number
  const dispatchNumber = await generateDispatchNumber(batch.landingLocation);
  const totalAmount = itemsToDispatch.reduce((s, it) => s + it.totalAmount, 0);

  // 5. Execute atomic transaction
  return await prisma.$transaction(async (tx) => {
    // Create dispatch record
    const createdDispatch = await tx.dispatch.create({
      data: {
        dispatchNumber,
        idempotencyKey: input.idempotencyKey ? input.idempotencyKey.trim() : null,
        landingBatchId: batch.id,
        buyerId: buyer?.id || null,
        recipientType,
        recipientName,
        dispatchDateTime: input.dispatchDateTime ? new Date(input.dispatchDateTime) : new Date(),
        transportReference: input.transportReference?.trim() || "Dock Consignment Gate Clearance",
        confirmationStatus: "CONFIRMED",
        agreedRatePerKg: itemsToDispatch[0]?.agreedPricePerKg || 0,
        totalAmount,
        notes: input.notes || null,
        items: {
          create: itemsToDispatch.map((it) => ({
            landingBatchItemId: it.batchItemId,
            quantityKg: it.quantityKg,
            agreedPricePerKg: it.agreedPricePerKg,
            totalAmount: it.totalAmount,
          })),
        },
      },
      include: {
        items: true,
        buyer: true,
        landingBatch: {
          include: { boatOwner: true },
        },
      },
    });

    // 6. Recalculate whole batch remaining status to keep batch status accurate
    const allBatchItems = await tx.landingBatchItem.findMany({
      where: { landingBatchId: batch.id },
      include: {
        dispatchItems: {
          include: { dispatch: true },
        },
      },
    });

    let totalLanded = 0;
    let totalDispatched = 0;

    for (const bi of allBatchItems) {
      totalLanded += bi.quantityKg;
      const dispatched = bi.dispatchItems
        .filter((di) => di.dispatch.confirmationStatus === "CONFIRMED")
        .reduce((s, di) => s + di.quantityKg, 0);
      totalDispatched += dispatched;
    }

    let newStatus = "CONFIRMED";
    if (totalDispatched >= totalLanded) {
      newStatus = "FULLY_DISPATCHED";
    } else if (totalDispatched > 0) {
      newStatus = "PARTIALLY_DISPATCHED";
    }

    await tx.landingBatch.update({
      where: { id: batch.id },
      data: { confirmationStatus: newStatus },
    });

    return createdDispatch;
  });
}

/**
 * Adds or links a potential buyer to a boat owner profile without creating unnecessary duplicates
 */
export async function addOrLinkPotentialBuyer(
  boatOwnerId: string,
  data: {
    contactName: string;
    phoneNumber: string;
    buyerType: string;
    businessName?: string;
    speciesPreferences?: string;
    preferredContactMethod?: string;
    consentStatus?: string;
    notes?: string;
  }
) {
  const phone = data.phoneNumber.trim();

  // Find or create reusable Buyer record
  let buyer = await prisma.buyer.findUnique({
    where: { businessPhoneNumber: phone },
  });

  if (!buyer) {
    buyer = await prisma.buyer.create({
      data: {
        contactName: data.contactName.trim(),
        businessName: data.businessName ? data.businessName.trim() : null,
        buyerType: data.buyerType.trim(),
        businessPhoneNumber: phone,
        preferredContactMethod: data.preferredContactMethod || "PHONE",
        relevantLocation: "Coastal Karnataka Markets",
        status: "ACTIVE",
      },
    });
  }

  // Create or update boat owner's potential buyer link
  const link = await prisma.boatOwnerPotentialBuyer.upsert({
    where: {
      boatOwnerId_phoneNumber: {
        boatOwnerId,
        phoneNumber: phone,
      },
    },
    update: {
      buyerId: buyer.id,
      contactName: data.contactName.trim(),
      buyerType: data.buyerType.trim(),
      speciesPreferences: data.speciesPreferences ? data.speciesPreferences.trim() : undefined,
      preferredContactMethod: data.preferredContactMethod || "PHONE",
      consentStatus: data.consentStatus || "CONSENT_GRANTED",
      notes: data.notes || undefined,
      status: "ACTIVE",
    },
    create: {
      boatOwnerId,
      buyerId: buyer.id,
      contactName: data.contactName.trim(),
      phoneNumber: phone,
      buyerType: data.buyerType.trim(),
      speciesPreferences: data.speciesPreferences ? data.speciesPreferences.trim() : null,
      preferredContactMethod: data.preferredContactMethod || "PHONE",
      consentStatus: data.consentStatus || "CONSENT_GRANTED",
      notes: data.notes || null,
      status: "ACTIVE",
    },
    include: {
      buyer: true,
      boatOwner: true,
    },
  });

  return link;
}

/**
 * Normalizes outreach attempt results to standardized business statuses
 */
export function normalizeOutreachStatus(rawStatus?: string): string {
  if (!rawStatus) return "Contact attempt not made";
  const clean = rawStatus.trim().toLowerCase();
  if (clean.includes("not interested") || clean.includes("declined") || clean === "rejected") {
    return "Not interested";
  }
  if (clean.includes("callback") || clean.includes("requested a callback")) {
    return "Requested a callback";
  }
  if (clean.includes("no answer") || clean.includes("busy") || clean.includes("unreachable")) {
    return "No answer";
  }
  if (clean.includes("invalid") || clean.includes("wrong number")) {
    return "Invalid contact";
  }
  if (clean.includes("not made") || clean.includes("not attempted") || clean.includes("skipped")) {
    return "Contact attempt not made";
  }
  if (clean.includes("interested") || clean.includes("committed") || clean.includes("order placed")) {
    return "Interested";
  }
  return rawStatus.trim();
}

/**
 * Records an outreach attempt for an automated calling session or operator call.
 * Stores batch, buyer, timestamp, result, and authorised notes without recording audio files.
 */
export async function recordOutreachAttempt(input: OutreachAttemptInput) {
  // Check for duplicate outreach submission via idempotency key
  if (input.idempotencyKey) {
    const existing = await prisma.outreachAttempt.findUnique({
      where: { idempotencyKey: input.idempotencyKey.trim() },
    });
    if (existing) {
      return { ...existing, isDuplicate: true };
    }
  }

  const normalizedStatus = normalizeOutreachStatus(input.status);

  return await prisma.outreachAttempt.create({
    data: {
      landingBatchId: input.landingBatchId,
      idempotencyKey: input.idempotencyKey ? input.idempotencyKey.trim() : null,
      boatOwnerPotentialBuyerId: input.boatOwnerPotentialBuyerId || null,
      buyerId: input.buyerId || null,
      contactName: input.contactName.trim(),
      contactPhone: input.contactPhone.trim(),
      speciesOffered: input.speciesOffered.trim(),
      quantityOfferedKg: input.quantityOfferedKg ? Number(input.quantityOfferedKg) : null,
      offeredRatePerKg: input.offeredRatePerKg ? Number(input.offeredRatePerKg) : null,
      channel: input.channel || "AI_PHONE_CALL",
      status: normalizedStatus,
      resultNotes: input.resultNotes ? input.resultNotes.trim() : null,
      attemptedAt: new Date(),
    },
  });
}

export interface PotentialBuyerFilterOptions {
  boatOwnerId: string;
  fishSpecies?: string;
  buyerType?: string;
  location?: string;
  status?: string;
}

/**
 * Retrieves the boat owner's saved active buyer contacts with multi-attribute filtering.
 * Never invents demand or claims interest without evidence.
 */
export async function getMatchedPotentialBuyers(options: PotentialBuyerFilterOptions) {
  const whereClause: any = {
    boatOwnerId: options.boatOwnerId,
  };

  if (options.status && options.status !== "ALL") {
    whereClause.status = options.status;
  }

  if (options.buyerType && options.buyerType !== "ALL") {
    whereClause.buyerType = options.buyerType.trim();
  }

  const contacts = await prisma.boatOwnerPotentialBuyer.findMany({
    where: whereClause,
    include: {
      buyer: true,
      outreachAttempts: {
        orderBy: { attemptedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { contactName: "asc" },
  });

  return contacts.filter((c) => {
    // 1. Filter by fish species if specified
    if (options.fishSpecies && options.fishSpecies.trim() && options.fishSpecies !== "ALL") {
      const targetSpecies = options.fishSpecies.toLowerCase().trim();
      const prefs = (c.speciesPreferences || "").toLowerCase();
      // If contact recorded specific preferences, check for match; if "all", matches everything
      if (prefs && !prefs.includes("all") && !prefs.includes(targetSpecies)) {
        return false;
      }
    }

    // 2. Filter by location if specified
    if (options.location && options.location.trim() && options.location !== "ALL") {
      const targetLocation = options.location.toLowerCase().trim();
      const buyerLocation = (c.buyer?.relevantLocation || "").toLowerCase();
      const notes = (c.notes || "").toLowerCase();
      if (!buyerLocation.includes(targetLocation) && !notes.includes(targetLocation)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Backend operation for external AI calling agents to request an outreach task.
 * Returns only necessary operational data: batch number, remaining species & quantities,
 * and eligible buyer contacts with contact preferences and permissions.
 */
export async function getOutreachHandoffTask(batchIdOrNumber: string, filterSpecies?: string) {
  const inventory = await getBatchRemainingInventory(batchIdOrNumber);

  // Filter only unsold species items
  let unsoldItems = inventory.items.filter((item) => item.remainingQuantityKg > 0);
  if (filterSpecies && filterSpecies !== "ALL") {
    unsoldItems = unsoldItems.filter((item) =>
      item.fishSpecies.toLowerCase().includes(filterSpecies.toLowerCase())
    );
  }

  if (unsoldItems.length === 0) {
    return {
      batchNumber: inventory.batchNumber,
      landingCentre: inventory.landingLocation,
      landingDateTime: inventory.landingDateTime,
      status: "COMPLETED",
      message: "No unsold remaining fish in this batch. All catches have been fully dispatched.",
      remainingSpecies: [],
      eligibleBuyerContacts: [],
    };
  }

  // Retrieve eligible contacts with active consent and status
  const potentialBuyers = await prisma.boatOwnerPotentialBuyer.findMany({
    where: {
      boatOwnerId: inventory.boatOwner.id,
      status: "ACTIVE",
      consentStatus: { not: "OPTED_OUT" },
    },
    include: {
      buyer: true,
      outreachAttempts: {
        where: { landingBatchId: inventory.batchId },
        orderBy: { attemptedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { contactName: "asc" },
  });

  const eligibleContacts = potentialBuyers.map((pb) => {
    const lastAttempt = pb.outreachAttempts[0];
    return {
      potentialBuyerId: pb.id,
      buyerId: pb.buyerId,
      contactName: pb.contactName,
      phoneNumber: pb.phoneNumber,
      buyerType: pb.buyerType,
      speciesPreferences: pb.speciesPreferences || "All Fresh Coastal Species",
      preferredContactMethod: pb.preferredContactMethod,
      consentStatus: pb.consentStatus,
      location: pb.buyer?.relevantLocation || "Coastal Karnataka",
      lastOutreachResult: lastAttempt ? lastAttempt.status : "Not yet contacted for this batch",
      notes: pb.notes,
    };
  });

  return {
    batchNumber: inventory.batchNumber,
    batchId: inventory.batchId,
    landingCentre: inventory.landingLocation,
    landingDateTime: inventory.landingDateTime,
    boatName: inventory.boatOwner.boatName,
    boatOwnerName: inventory.boatOwner.ownerName,
    status: "READY_FOR_OUTREACH",
    remainingSpecies: unsoldItems.map((item) => ({
      itemId: item.itemId,
      fishSpecies: item.fishSpecies,
      grade: item.grade,
      floorPricePerKg: item.floorPricePerKg,
      remainingQuantityKg: item.remainingQuantityKg,
      originalLandedKg: item.landedQuantityKg,
      dispatchedQuantityKg: item.dispatchedQuantityKg,
    })),
    eligibleBuyerContacts: eligibleContacts,
  };
}
