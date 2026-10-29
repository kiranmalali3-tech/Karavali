import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { maskName, maskPhone } from "@/lib/masking";
import { getMatchedPotentialBuyers } from "@/lib/services/supplyChainService";
import Link from "next/link";
import { redirect } from "next/navigation";
import { 
  Ship, 
  Anchor, 
  Package, 
  Users, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  Plus, 
  Filter, 
  RefreshCw 
} from "lucide-react";
import { 
  addPotentialBuyerAction, 
  togglePotentialBuyerStatusAction 
} from "@/app/actions/contactActions";

export const dynamic = "force-dynamic";

export default async function BoatOwnerDashboard({
  searchParams,
}: {
  searchParams: { 
    ownerId?: string; 
    filterSpecies?: string;
    buyerType?: string;
    location?: string;
    status?: string;
  };
}) {
  const session = await getSessionUser();

  // 1. Strict Server-Side Access Control
  if (!session) {
    redirect("/login?error=Please%20log%20in%20to%20access%20the%20boat%20owner%20dashboard");
  }

  // A buyer is strictly forbidden from accessing the boat owner dashboard
  if (session.role === "BUYER") {
    return (
      <div className="max-w-2xl mx-auto my-12 bg-white border border-rose-200 rounded p-6 shadow-sm">
        <div className="flex items-center gap-3 text-rose-700">
          <ShieldAlert className="w-6 h-6 flex-shrink-0" />
          <div>
            <h2 className="text-base font-bold">Access Restricted: Buyer Persona</h2>
            <p className="text-xs text-slate-600 mt-1">
              Your account is registered as a verified commercial Buyer. Buyers are not permitted to inspect private boat owner accounts or internal fleet vessel records.
            </p>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
          <Link
            href="/buyer"
            className="text-xs bg-slate-900 text-white px-3 py-1.5 rounded hover:bg-slate-800 font-medium"
          >
            Go to Buyer Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const isOperator = session.role === "OPERATOR";

  // If Boat Owner, strictly enforce their own boatOwnerId (ignore tampering via query parameters)
  let activeBoatOwnerId = session.boatOwnerId;
  if (isOperator) {
    const allOwners = await prisma.boatOwner.findMany({
      orderBy: { ownerName: "asc" },
      select: { id: true, ownerName: true, boatName: true },
    });
    activeBoatOwnerId = searchParams?.ownerId || session.boatOwnerId || allOwners[0]?.id;
  }

  if (!activeBoatOwnerId) {
    return (
      <div className="bg-white border border-slate-200 rounded p-8 text-center max-w-xl mx-auto my-8">
        <Ship className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-800">No Vessel Profile Linked</h2>
        <p className="text-xs text-slate-500 mt-1">
          No boat owner account is currently associated with this login session. Please contact the harbour operator to link your registration.
        </p>
      </div>
    );
  }

  // Fetch verified boat owner records
  const boatOwner = await prisma.boatOwner.findUnique({
    where: { id: activeBoatOwnerId },
    include: {
      landings: {
        include: {
          items: {
            include: {
              dispatchItems: {
                include: { dispatch: true },
              },
            },
          },
          dispatches: {
            include: {
              buyer: true,
              items: {
                include: { landingBatchItem: true },
              },
            },
            orderBy: { dispatchDateTime: "desc" },
          },
        },
        orderBy: { landingDateTime: "desc" },
      },
    },
  });

  if (!boatOwner) {
    return (
      <div className="bg-white border border-slate-200 rounded p-6 text-center">
        <p className="text-xs text-slate-600">No boat owner record found for ID: {activeBoatOwnerId}</p>
      </div>
    );
  }

  // Operator vessel list for switcher
  const operatorVesselList = isOperator
    ? await prisma.boatOwner.findMany({
        orderBy: { ownerName: "asc" },
        select: { id: true, ownerName: true, boatName: true },
      })
    : [];

  // 2. Compute Actual Backend Inventory & Balance Data
  // Exclude cancelled/rejected dispatches and calculate balances separately for each species
  let totalLandedWeightKg = 0;
  let totalDispatchedWeightKg = 0;
  let totalRemainingWeightKg = 0;

  const remainingLots: Array<{
    batchId: string;
    batchNumber: string;
    landingLocation: string;
    landingDateTime: Date;
    species: string;
    grade: string | null;
    floorPricePerKg: number | null;
    landedKg: number;
    dispatchedKg: number;
    remainingKg: number;
    lastUpdated: Date;
  }> = [];

  for (const batch of boatOwner.landings) {
    for (const item of batch.items) {
      totalLandedWeightKg += item.quantityKg;

      // Strictly only count dispatches with CONFIRMED status (exclude CANCELLED/REJECTED/PENDING)
      const confirmedDispatches = item.dispatchItems.filter(
        (di) => di.dispatch.confirmationStatus === "CONFIRMED"
      );

      const dispatchedForItem = confirmedDispatches.reduce(
        (sum, di) => sum + di.quantityKg,
        0
      );

      const remainingForItem = Math.max(0, item.quantityKg - dispatchedForItem);

      totalDispatchedWeightKg += dispatchedForItem;
      totalRemainingWeightKg += remainingForItem;

      // Find latest update time: latest confirmed dispatch date or batch creation date
      const latestDispatch = confirmedDispatches
        .map((di) => di.dispatch.dispatchDateTime)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

      const lastUpdated = latestDispatch || batch.landingDateTime;

      if (remainingForItem > 0) {
        remainingLots.push({
          batchId: batch.id,
          batchNumber: batch.batchNumber,
          landingLocation: batch.landingLocation,
          landingDateTime: batch.landingDateTime,
          species: item.fishSpecies,
          grade: item.grade,
          floorPricePerKg: item.floorPricePerKg,
          landedKg: item.quantityKg,
          dispatchedKg: dispatchedForItem,
          remainingKg: remainingForItem,
          lastUpdated: new Date(lastUpdated),
        });
      }
    }
  }

  // All confirmed dispatches from this boat's batches
  const allDispatches = boatOwner.landings.flatMap((l) => l.dispatches);
  const totalRealizedAmount = allDispatches
    .filter((d) => d.paymentStatus === "FULLY_PAID")
    .reduce((sum, d) => sum + (d.totalAmount || 0), 0);

  // 3. Potential-Buyer Matching with Multi-Attribute Filtering
  const matchedPotentialBuyers = await getMatchedPotentialBuyers({
    boatOwnerId: boatOwner.id,
    fishSpecies: searchParams?.filterSpecies,
    buyerType: searchParams?.buyerType,
    location: searchParams?.location,
    status: searchParams?.status,
  });

  // Extract distinct species caught for filtering dropdown
  const allCaughtSpecies = Array.from(
    new Set(boatOwner.landings.flatMap((l) => l.items.map((i) => i.fishSpecies)))
  ).sort();

  // 4. Build Unified Recent Activity Feed
  type ActivityItem = {
    id: string;
    type: "LANDING" | "DISPATCH";
    date: Date;
    title: string;
    subtitle: string;
    meta: string;
  };

  const activityFeed: ActivityItem[] = [];

  for (const l of boatOwner.landings) {
    const totalKg = l.items.reduce((s, it) => s + it.quantityKg, 0);
    activityFeed.push({
      id: `land-${l.id}`,
      type: "LANDING",
      date: new Date(l.landingDateTime),
      title: `Batch ${l.batchNumber} Landed`,
      subtitle: `${l.landingLocation} • ${l.items.map((i) => i.fishSpecies).join(", ")}`,
      meta: `${totalKg.toLocaleString()} Kg Landed`,
    });
  }

  for (const d of allDispatches) {
    const qty = d.items.reduce((s, it) => s + it.quantityKg, 0);
    activityFeed.push({
      id: `disp-${d.id}`,
      type: "DISPATCH",
      date: new Date(d.dispatchDateTime),
      title: `Dispatch ${d.dispatchNumber} Confirmed`,
      subtitle: `Buyer: ${d.recipientName} • Ref: ${d.transportReference || "Gate Delivery"}`,
      meta: `${qty.toLocaleString()} Kg • ₹${(d.totalAmount || 0).toLocaleString()}`,
    });
  }

  activityFeed.sort((a, b) => b.date.getTime() - a.date.getTime());
  const recentActivities = activityFeed.slice(0, 6);

  // Masked values for privacy
  const displayedOwnerName = maskName(boatOwner.ownerName, isOperator);
  const displayedMobile = maskPhone(boatOwner.registeredMobileNumber, isOperator);

  return (
    <div className="space-y-6">
      {/* 1. Header & Masked Identity Banner */}
      <div className="bg-white border border-slate-200 rounded p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-sky-100 border border-sky-200 flex items-center justify-center text-sky-800 flex-shrink-0">
            <Ship className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-slate-900">
                {boatOwner.boatName || "Coastal Fishing Vessel"}
              </h1>
              {boatOwner.boatRegistrationNumber && (
                <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-medium">
                  {boatOwner.boatRegistrationNumber}
                </span>
              )}
              <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-medium">
                {boatOwner.accountStatus}
              </span>
              {isOperator && (
                <span className="text-[11px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-medium">
                  Operator Clearance
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Owner: <span className="font-semibold text-slate-800">{displayedOwnerName}</span> • 
              Registered Mobile: <span className="font-mono text-slate-700 font-medium">{displayedMobile}</span> • 
              Landing Centre: <span className="text-slate-800">{boatOwner.landingCentre}</span>
            </p>
          </div>
        </div>

        {/* Operator Switcher */}
        {isOperator && operatorVesselList.length > 1 && (
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded">
            <label htmlFor="switch-owner" className="text-xs text-slate-600 font-medium">
              Switch Vessel:
            </label>
            <form method="GET" className="flex items-center gap-1">
              <select
                id="switch-owner"
                name="ownerId"
                defaultValue={boatOwner.id}
                className="text-xs border border-slate-300 rounded px-2 py-1 bg-white text-slate-800 focus:outline-none"
              >
                {operatorVesselList.map((bo) => (
                  <option key={bo.id} value={bo.id}>
                    {bo.boatName ? `${bo.boatName} (${bo.ownerName})` : bo.ownerName}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="text-xs bg-slate-800 text-white px-2.5 py-1 rounded hover:bg-slate-700 font-medium"
              >
                View
              </button>
            </form>
          </div>
        )}
      </div>

      {/* 2. Key Operational Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded p-3.5">
          <div className="text-xs text-slate-500 font-medium">Landing Batches</div>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {boatOwner.landings.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Total recorded</div>
        </div>

        <div className="bg-white border border-slate-200 rounded p-3.5">
          <div className="text-xs text-slate-500 font-medium">Total Landed Catch</div>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {totalLandedWeightKg.toLocaleString()} <span className="text-xs font-normal text-slate-500">Kg</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Original weight</div>
        </div>

        <div className="bg-white border border-slate-200 rounded p-3.5">
          <div className="text-xs text-slate-500 font-medium">Confirmed Dispatched</div>
          <div className="text-xl font-bold text-sky-700 mt-1">
            {totalDispatchedWeightKg.toLocaleString()} <span className="text-xs font-normal text-slate-500">Kg</span>
          </div>
          <div className="text-[11px] text-emerald-600 mt-0.5 font-medium">
            ₹{totalRealizedAmount.toLocaleString()} realized
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded p-3.5">
          <div className="text-xs text-slate-500 font-medium">Unsold Remaining Fish</div>
          <div className="text-xl font-bold text-amber-600 mt-1">
            {totalRemainingWeightKg.toLocaleString()} <span className="text-xs font-normal text-slate-500">Kg</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {remainingLots.length} species lot(s) available
          </div>
        </div>
      </div>

      {/* 3. SECTION: REMAINING FISH (Explicitly displaying all required fields) */}
      <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden" id="remaining-fish">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-amber-600" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Remaining Fish (Unsold Inventory by Batch & Species)
            </h2>
          </div>
          <span className="text-xs font-medium text-slate-500">
            {remainingLots.length} lot(s) awaiting dispatch
          </span>
        </div>

        {remainingLots.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="font-medium text-slate-700">No unsold remaining fish.</p>
            <p className="text-slate-400 mt-0.5">All landed catches for this vessel have been fully dispatched.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="py-2.5 px-4">Batch Number</th>
                  <th className="py-2.5 px-4">Fish Species</th>
                  <th className="py-2.5 px-4 text-right">Original Landed (Kg)</th>
                  <th className="py-2.5 px-4 text-right">Confirmed Dispatched (Kg)</th>
                  <th className="py-2.5 px-4 text-right font-bold">Remaining Quantity (Kg)</th>
                  <th className="py-2.5 px-4">Last Update Time</th>
                  <th className="py-2.5 px-4 text-right">Potential Buyer Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {remainingLots.map((lot, idx) => (
                  <tr key={`${lot.batchId}-${idx}`} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      <Link href={`/landings/${lot.batchId}`} className="hover:text-sky-700 hover:underline">
                        {lot.batchNumber}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{lot.species}</div>
                      {lot.grade && (
                        <div className="text-[10px] text-slate-500">{lot.grade}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700 font-mono">
                      {lot.landedKg.toLocaleString()} Kg
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700 font-mono">
                      {lot.dispatchedKg.toLocaleString()} Kg
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-amber-700">
                      {lot.remainingKg.toLocaleString()} Kg
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {lot.lastUpdated.toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/boat-owner?filterSpecies=${encodeURIComponent(lot.species)}#potential-buyers`}
                        className="inline-block bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 px-2.5 py-1 rounded text-xs font-semibold"
                      >
                        Review Potential Buyers
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. SECTION: POTENTIAL BUYERS & MATCHING (With Multi-Attribute Filtering) */}
      <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden" id="potential-buyers">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-700" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Potential Buyers (Reusable Saved Buyer Contacts for Outreach)
            </h2>
          </div>
          <div className="text-xs text-slate-500">
            {matchedPotentialBuyers.length} matching contact(s)
          </div>
        </div>

        {/* Backend Filter Controls */}
        <div className="p-3 bg-slate-100 border-b border-slate-200">
          <form method="GET" className="flex flex-wrap items-center gap-2 text-xs">
            {isOperator && (
              <input type="hidden" name="ownerId" value={boatOwner.id} />
            )}

            <div className="flex items-center gap-1.5">
              <label htmlFor="filterSpecies" className="font-semibold text-slate-700">Species:</label>
              <select
                id="filterSpecies"
                name="filterSpecies"
                defaultValue={searchParams?.filterSpecies || "ALL"}
                className="border border-slate-300 rounded px-2 py-1 bg-white text-slate-900 focus:outline-none"
              >
                <option value="ALL">All Species</option>
                {allCaughtSpecies.map((sp) => (
                  <option key={sp} value={sp}>
                    {sp}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <label htmlFor="buyerType" className="font-semibold text-slate-700">Buyer Type:</label>
              <select
                id="buyerType"
                name="buyerType"
                defaultValue={searchParams?.buyerType || "ALL"}
                className="border border-slate-300 rounded px-2 py-1 bg-white text-slate-900 focus:outline-none"
              >
                <option value="ALL">All Types</option>
                <option value="wholesaler">Wholesaler</option>
                <option value="auction agent">Auction Agent</option>
                <option value="retailer">Retailer</option>
                <option value="trader">Trader</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <label htmlFor="location" className="font-semibold text-slate-700">Location:</label>
              <input
                id="location"
                name="location"
                type="text"
                placeholder="e.g. Mangaluru, Baikampady"
                defaultValue={searchParams?.location || ""}
                className="border border-slate-300 rounded px-2 py-1 bg-white text-slate-900 focus:outline-none w-36"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <label htmlFor="status" className="font-semibold text-slate-700">Status:</label>
              <select
                id="status"
                name="status"
                defaultValue={searchParams?.status || "ACTIVE"}
                className="border border-slate-300 rounded px-2 py-1 bg-white text-slate-900 focus:outline-none"
              >
                <option value="ALL">All Contacts</option>
                <option value="ACTIVE">Active Only</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            <button
              type="submit"
              className="bg-slate-800 hover:bg-slate-700 text-white font-medium px-3 py-1 rounded transition"
            >
              Filter Contacts
            </button>

            {(searchParams?.filterSpecies || searchParams?.buyerType || searchParams?.location || searchParams?.status) && (
              <Link
                href="/boat-owner#potential-buyers"
                className="text-slate-600 hover:text-slate-900 px-2 py-1 underline font-medium"
              >
                Reset
              </Link>
            )}
          </form>
        </div>

        {/* Potential Buyers Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 uppercase font-semibold text-[11px]">
              <tr>
                <th className="py-2.5 px-4">Buyer Contact</th>
                <th className="py-2.5 px-4">Contact Number</th>
                <th className="py-2.5 px-4">Buyer Type</th>
                <th className="py-2.5 px-4">Recorded Preferences</th>
                <th className="py-2.5 px-4">Method</th>
                <th className="py-2.5 px-4">Consent Status</th>
                <th className="py-2.5 px-4">Contact Status</th>
                <th className="py-2.5 px-4">Factual Outreach History</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {matchedPotentialBuyers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-6 text-slate-400">
                    No saved buyer contacts matched the specified filter criteria.
                  </td>
                </tr>
              ) : (
                matchedPotentialBuyers.map((pb) => {
                  const latestAttempt = pb.outreachAttempts[0];

                  return (
                    <tr key={pb.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{pb.contactName}</div>
                        {pb.buyer?.businessName && (
                          <div className="text-[11px] text-slate-500">{pb.buyer.businessName}</div>
                        )}
                        {pb.buyer?.relevantLocation && (
                          <div className="text-[10px] text-slate-400">{pb.buyer.relevantLocation}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {maskPhone(pb.phoneNumber, isOperator)}
                      </td>
                      <td className="py-3 px-4 capitalize text-slate-700">
                        {pb.buyerType}
                      </td>
                      <td className="py-3 px-4 text-slate-800">
                        {pb.speciesPreferences || "All Fresh Coastal Species"}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {pb.preferredContactMethod}
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-semibold">
                          {pb.consentStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            pb.status === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {pb.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {latestAttempt ? (
                          <div>
                            <span className="bg-sky-50 text-sky-800 border border-sky-200 px-2 py-0.5 rounded text-[10px] font-semibold">
                              {latestAttempt.status}
                            </span>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {new Date(latestAttempt.attemptedAt).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                              })}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Not yet contacted</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <form action={togglePotentialBuyerStatusAction} className="inline-block">
                          <input type="hidden" name="contactRecordId" value={pb.id} />
                          <input type="hidden" name="currentStatus" value={pb.status} />
                          <button
                            type="submit"
                            className={`text-xs px-2 py-1 rounded font-medium border ${
                              pb.status === "ACTIVE"
                                ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            }`}
                          >
                            {pb.status === "ACTIVE" ? "Deactivate" : "Activate"}
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Quick Add Form to save reusable potential buyer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200">
          <h3 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-sky-700" />
            <span>Save New Reusable Buyer Contact to Vessel Profile</span>
          </h3>
          <p className="text-[11px] text-slate-500 mb-3">
            Contacts saved here are persistent and reusable across all future landing batches. You do not need to re-enter buyer details for each new catch.
          </p>

          <form action={addPotentialBuyerAction} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            <input type="hidden" name="boatOwnerId" value={boatOwner.id} />

            <div>
              <label htmlFor="contactName" className="block text-[11px] font-medium text-slate-600 mb-1">
                Buyer Contact Name *
              </label>
              <input
                id="contactName"
                name="contactName"
                type="text"
                required
                placeholder="e.g. Ramesh Hegde"
                className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="phoneNumber" className="block text-[11px] font-medium text-slate-600 mb-1">
                Mobile Number *
              </label>
              <input
                id="phoneNumber"
                name="phoneNumber"
                type="text"
                required
                placeholder="10-digit mobile"
                className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="buyerTypeAdd" className="block text-[11px] font-medium text-slate-600 mb-1">
                Buyer Type
              </label>
              <select
                id="buyerTypeAdd"
                name="buyerType"
                defaultValue="wholesaler"
                className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-900 focus:outline-none"
              >
                <option value="wholesaler">Wholesaler</option>
                <option value="auction agent">Auction Agent</option>
                <option value="retailer">Retailer</option>
                <option value="trader">Trader</option>
              </select>
            </div>

            <div>
              <label htmlFor="businessName" className="block text-[11px] font-medium text-slate-600 mb-1">
                Business Name
              </label>
              <input
                id="businessName"
                name="businessName"
                type="text"
                placeholder="e.g. Hegde Sea Traders"
                className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-900 focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="speciesPreferences" className="block text-[11px] font-medium text-slate-600 mb-1">
                Species Preferences
              </label>
              <input
                id="speciesPreferences"
                name="speciesPreferences"
                type="text"
                placeholder="e.g. Kingfish, Mackerel, Pomfret"
                className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="preferredContactMethod" className="block text-[11px] font-medium text-slate-600 mb-1">
                Preferred Method
              </label>
              <select
                id="preferredContactMethod"
                name="preferredContactMethod"
                defaultValue="PHONE"
                className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-900 focus:outline-none"
              >
                <option value="PHONE">Phone Call</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="SMS">SMS</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-1.5 px-3 rounded transition"
              >
                Save Buyer Contact
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 5. SECTION: RECENT ACTIVITY LIST */}
      <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-700" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Recent Activity Feed
            </h2>
          </div>
          <span className="text-[11px] text-slate-500">Live operational ledger</span>
        </div>

        {recentActivities.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            No recent activity recorded for this vessel.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentActivities.map((act) => (
              <div key={act.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                      act.type === "LANDING"
                        ? "bg-sky-100 text-sky-800 border border-sky-200"
                        : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    }`}
                  >
                    {act.type === "LANDING" ? "L" : "D"}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-900">{act.title}</div>
                    <div className="text-[11px] text-slate-500">{act.subtitle}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold text-slate-800">{act.meta}</div>
                  <div className="text-[10px] text-slate-400">
                    {act.date.toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
