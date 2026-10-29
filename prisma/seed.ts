import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning existing database records...");
  await prisma.outreachAttempt.deleteMany();
  await prisma.dispatchItem.deleteMany();
  await prisma.dispatch.deleteMany();
  await prisma.landingBatchItem.deleteMany();
  await prisma.landingBatch.deleteMany();
  await prisma.boatOwnerPotentialBuyer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.boatOwner.deleteMany();
  await prisma.buyer.deleteMany();

  console.log("Seeding Operators...");
  await prisma.user.create({
    data: {
      name: "Suresh Rao (Harbour Operator)",
      phone: "9900112233",
      role: "OPERATOR",
      pin: "1234",
    },
  });

  console.log("Seeding Boat Owners...");
  const owner1 = await prisma.boatOwner.create({
    data: {
      ownerName: "Anand Kunder",
      registeredMobileNumber: "9845012345",
      boatName: "Sea Queen",
      boatRegistrationNumber: "IND-KA-02-MM-1042",
      landingCentre: "Mangaluru Old Port (Bunder)",
      accountStatus: "ACTIVE",
      user: {
        create: {
          name: "Anand Kunder",
          phone: "9845012345",
          role: "BOAT_OWNER",
          pin: "1234",
        },
      },
    },
  });

  const owner2 = await prisma.boatOwner.create({
    data: {
      ownerName: "Jagadish Mendon",
      registeredMobileNumber: "9845023456",
      boatName: "Karavali Sagar",
      boatRegistrationNumber: "IND-KA-02-MM-2189",
      landingCentre: "Malpe Harbour",
      accountStatus: "ACTIVE",
      user: {
        create: {
          name: "Jagadish Mendon",
          phone: "9845023456",
          role: "BOAT_OWNER",
          pin: "1234",
        },
      },
    },
  });

  const owner3 = await prisma.boatOwner.create({
    data: {
      ownerName: "Dinesh Suvarna",
      registeredMobileNumber: "9845034567",
      boatName: "Matsya Deepa",
      boatRegistrationNumber: "IND-KA-02-MM-3055",
      landingCentre: "Mangaluru Old Port (Bunder)",
      accountStatus: "ACTIVE",
      user: {
        create: {
          name: "Dinesh Suvarna",
          phone: "9845034567",
          role: "BOAT_OWNER",
          pin: "1234",
        },
      },
    },
  });

  console.log("Seeding Commercial Buyers...");
  const buyer1 = await prisma.buyer.create({
    data: {
      contactName: "Praveen Shetty",
      businessName: "Coastal Sea Products Ltd",
      buyerType: "wholesaler",
      businessPhoneNumber: "9880112233",
      preferredContactMethod: "PHONE",
      relevantLocation: "Baikampady Industrial Estate, Mangaluru",
      status: "ACTIVE",
      user: {
        create: {
          name: "Praveen Shetty (Coastal Sea Products)",
          phone: "9880112233",
          role: "BUYER",
          pin: "1234",
        },
      },
    },
  });

  const buyer2 = await prisma.buyer.create({
    data: {
      contactName: "Abdul Rasheed",
      businessName: "Bunder Fresh Fish Traders",
      buyerType: "wholesaler",
      businessPhoneNumber: "9880223344",
      preferredContactMethod: "PHONE",
      relevantLocation: "Central Fish Market, Mangaluru Old Port",
      status: "ACTIVE",
      user: {
        create: {
          name: "Abdul Rasheed (Bunder Traders)",
          phone: "9880223344",
          role: "BUYER",
          pin: "1234",
        },
      },
    },
  });

  const buyer3 = await prisma.buyer.create({
    data: {
      contactName: "Vikram Shenoy",
      businessName: "Sagarika Cold Chain Hub",
      buyerType: "auction agent",
      businessPhoneNumber: "9880334455",
      preferredContactMethod: "PHONE",
      relevantLocation: "Panambur Port Road Cold Storage, Mangaluru",
      status: "ACTIVE",
      user: {
        create: {
          name: "Vikram Shenoy (Sagarika Hub)",
          phone: "9880334455",
          role: "BUYER",
          pin: "1234",
        },
      },
    },
  });

  console.log("Seeding Boat Owner's Potential Buyers (List of contacts for remaining fish)...");
  // Anand Kunder's potential buyers
  const pot1 = await prisma.boatOwnerPotentialBuyer.create({
    data: {
      boatOwnerId: owner1.id,
      buyerId: buyer1.id,
      contactName: "Praveen Shetty",
      phoneNumber: "9880112233",
      buyerType: "wholesaler",
      speciesPreferences: "Kingfish / Surmai, Silver Pomfret, White Prawns",
      preferredContactMethod: "PHONE",
      consentStatus: "CONSENT_GRANTED",
      notes: "High capacity exporter. Prefers immediate call if Kingfish > 200kg available.",
      status: "ACTIVE",
    },
  });

  await prisma.boatOwnerPotentialBuyer.create({
    data: {
      boatOwnerId: owner1.id,
      buyerId: buyer2.id,
      contactName: "Abdul Rasheed",
      phoneNumber: "9880223344",
      buyerType: "wholesaler",
      speciesPreferences: "Indian Mackerel / Bangude, Sardine, Silver Pomfret",
      preferredContactMethod: "PHONE",
      consentStatus: "CONSENT_GRANTED",
      notes: "Daily dock buyer. Takes mid-sized lots for local Mangaluru markets.",
      status: "ACTIVE",
    },
  });

  // Jagadish Mendon's potential buyers
  await prisma.boatOwnerPotentialBuyer.create({
    data: {
      boatOwnerId: owner2.id,
      buyerId: buyer3.id,
      contactName: "Vikram Shenoy",
      phoneNumber: "9880334455",
      buyerType: "auction agent",
      speciesPreferences: "White Prawns, Mackerel, Squid",
      preferredContactMethod: "PHONE",
      consentStatus: "CONSENT_GRANTED",
      notes: "Primary auction agent at Malpe commercial berth.",
      status: "ACTIVE",
    },
  });

  console.log("Seeding Landing Batches...");
  // Batch 1: Anand Kunder at Mangaluru Bunder
  const batch1 = await prisma.landingBatch.create({
    data: {
      batchNumber: "KRV-MNG-000001",
      boatOwnerId: owner1.id,
      landingLocation: "Mangaluru Old Port (Bunder) - Jetty 2",
      landingDateTime: new Date("2026-10-29T04:30:00Z"),
      confirmationStatus: "PARTIALLY_DISPATCHED",
      source: "external AI agent",
      operatorConfirmedBy: "Suresh Rao (Harbour Operator)",
      notes: "Confirmed by AI telephone calling agent check-in #CALL-7102 at 05:15 AM.",
      items: {
        create: [
          {
            fishSpecies: "Kingfish / Surmai (Seer)",
            quantityKg: 450,
            grade: "Grade A1 (Export)",
            floorPricePerKg: 620,
            iceCondition: "Well Iced (0-2°C) - Flake Ice",
          },
          {
            fishSpecies: "Indian Mackerel / Bangude",
            quantityKg: 900,
            grade: "Grade A (Large 100-150g)",
            floorPricePerKg: 180,
            iceCondition: "Well Iced (0-2°C)",
          },
          {
            fishSpecies: "Silver Pomfret",
            quantityKg: 500,
            grade: "Grade A (Medium 300-500g)",
            floorPricePerKg: 780,
            iceCondition: "Well Iced (0-2°C)",
          },
        ],
      },
    },
    include: { items: true },
  });

  // Batch 2: Jagadish Mendon at Malpe
  await prisma.landingBatch.create({
    data: {
      batchNumber: "KRV-MAL-000002",
      boatOwnerId: owner2.id,
      landingLocation: "Malpe Harbour - Deep Water Berth",
      landingDateTime: new Date("2026-10-29T06:00:00Z"),
      confirmationStatus: "CONFIRMED",
      source: "external AI agent",
      operatorConfirmedBy: "Suresh Rao (Harbour Operator)",
      notes: "Night purse-seine haul. Stored in insulated dock seawater containers.",
      items: {
        create: [
          {
            fishSpecies: "Indian Mackerel / Bangude",
            quantityKg: 1600,
            grade: "Grade A (Medium)",
            floorPricePerKg: 165,
            iceCondition: "Well Iced (0-2°C)",
          },
          {
            fishSpecies: "White Prawns (Export Quality)",
            quantityKg: 800,
            grade: "Grade A1 (Count 20-30)",
            floorPricePerKg: 540,
            iceCondition: "Chilled Flake Ice Crated",
          },
        ],
      },
    },
  });

  console.log("Seeding Dispatches...");
  // Dispatch 1 from Batch 1: 300kg Kingfish to Coastal Sea Products
  const surmaiBatchItem = batch1.items.find((i) => i.fishSpecies.includes("Kingfish"))!;
  await prisma.dispatch.create({
    data: {
      dispatchNumber: "DSP-MNG-000001",
      landingBatchId: batch1.id,
      buyerId: buyer1.id,
      recipientType: "wholesaler",
      recipientName: "Coastal Sea Products Ltd",
      dispatchDateTime: new Date("2026-10-29T06:15:00Z"),
      transportReference: "KA-19-AB-4921 (Refrigerated Van)",
      confirmationStatus: "CONFIRMED",
      agreedRatePerKg: 620,
      totalAmount: 300 * 620, // 186,000 INR
      paymentStatus: "FULLY_PAID",
      paymentReference: "RTGS-HDFC261029-49102",
      notes: "Direct dispatch to factory processing cold room. Inspected at gate.",
      items: {
        create: [
          {
            landingBatchItemId: surmaiBatchItem.id,
            quantityKg: 300,
            agreedPricePerKg: 620,
            totalAmount: 186000,
          },
        ],
      },
    },
  });

  // Dispatch 2 from Batch 1: 500kg Mackerel to Bunder Fresh Fish Traders
  const mackerelBatchItem = batch1.items.find((i) => i.fishSpecies.includes("Mackerel"))!;
  await prisma.dispatch.create({
    data: {
      dispatchNumber: "DSP-MNG-000002",
      landingBatchId: batch1.id,
      buyerId: buyer2.id,
      recipientType: "wholesaler",
      recipientName: "Bunder Fresh Fish Traders",
      dispatchDateTime: new Date("2026-10-29T07:00:00Z"),
      transportReference: "KA-19-C-8820 (Insulated Mini Truck)",
      confirmationStatus: "CONFIRMED",
      agreedRatePerKg: 180,
      totalAmount: 500 * 180, // 90,000 INR
      paymentStatus: "PENDING",
      notes: "Dispatched to local retail market stalls. Bill submitted for weekly clearance.",
      items: {
        create: [
          {
            landingBatchItemId: mackerelBatchItem.id,
            quantityKg: 500,
            agreedPricePerKg: 180,
            totalAmount: 90000,
          },
        ],
      },
    },
  });

  console.log("Seeding Outreach Attempts...");
  await prisma.outreachAttempt.create({
    data: {
      landingBatchId: batch1.id,
      boatOwnerPotentialBuyerId: pot1.id,
      buyerId: buyer1.id,
      contactName: "Praveen Shetty",
      contactPhone: "9880112233",
      speciesOffered: "Silver Pomfret (500 Kg remaining)",
      quantityOfferedKg: 500,
      offeredRatePerKg: 780,
      channel: "AI_PHONE_CALL",
      status: "COMMITTED",
      resultNotes: "Automated phone calling agent contacted buyer. Buyer agreed to purchase lot at Rs 780/kg.",
    },
  });

  console.log("Database seeded successfully with core data models!");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
