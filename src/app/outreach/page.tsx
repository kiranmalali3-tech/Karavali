import { prisma } from "@/lib/prisma";
import { createOutreachAction, updateOutreachStatusAction } from "@/app/actions/outreachActions";
import { getAgentConnectionStatus } from "@/lib/agentAuth";
import Link from "next/link";
import { PhoneCall, Layers, PhoneForwarded } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OutreachPage() {
  const [batches, outreachLogs, buyers, agentStatus] = await Promise.all([
    prisma.landingBatch.findMany({
      where: {
        confirmationStatus: { in: ["CONFIRMED", "PARTIALLY_DISPATCHED"] },
      },
      include: {
        boatOwner: {
          include: {
            potentialBuyers: {
              where: { status: "ACTIVE" },
            },
          },
        },
        items: {
          include: {
            dispatchItems: {
              include: { dispatch: true },
            },
          },
        },
      },
      orderBy: { landingDateTime: "desc" },
    }),
    prisma.outreachAttempt.findMany({
      include: {
        landingBatch: {
          include: { boatOwner: true },
        },
        buyer: true,
      },
      orderBy: { attemptedAt: "desc" },
    }),
    prisma.buyer.findMany({
      where: { status: "ACTIVE" },
      orderBy: { contactName: "asc" },
    }),
    getAgentConnectionStatus(),
  ]);

  // Flatten active unsold catch items with calculated remainingKg
  const remainingLots: any[] = [];
  let totalRemainingKg = 0;
  let totalValuation = 0;

  for (const b of batches) {
    for (const item of b.items) {
      const dispatchedKg = item.dispatchItems
        .filter((di) => di.dispatch.confirmationStatus === "CONFIRMED")
        .reduce((s, di) => s + di.quantityKg, 0);

      const remainingKg = Math.max(0, item.quantityKg - dispatchedKg);

      if (remainingKg > 0) {
        const lotVal = remainingKg * (item.floorPricePerKg || 0);
        totalRemainingKg += remainingKg;
        totalValuation += lotVal;

        remainingLots.push({
          itemId: item.id,
          batchId: b.id,
          batchNumber: b.batchNumber,
          boatOwner: b.boatOwner,
          landingLocation: b.landingLocation,
          landingDateTime: b.landingDateTime,
          fishSpecies: item.fishSpecies,
          grade: item.grade || "Standard",
          landedQuantityKg: item.quantityKg,
          dispatchedQuantityKg: dispatchedKg,
          remainingQuantityKg: remainingKg,
          floorPricePerKg: item.floorPricePerKg || 0,
          lotValuation: lotVal,
          iceCondition: item.iceCondition || "Well Iced",
        });
      }
    }
  }

  return (
    <div className="space-y-8">
      {/* Live Factual Agent Connection Status Banner */}
      <div className={`p-4 rounded border flex flex-wrap items-center justify-between gap-4 ${
        agentStatus.isConnected
          ? "bg-emerald-50/90 border-emerald-300 text-emerald-950"
          : "bg-amber-50/90 border-amber-300 text-amber-950"
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-3.5 h-3.5 rounded-full ${agentStatus.isConnected ? "bg-emerald-600 animate-pulse" : "bg-amber-500"}`} />
          <div>
            <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
              <span>External AI Calling Agent Status:</span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                agentStatus.isConnected ? "bg-emerald-200 text-emerald-900" : "bg-amber-200 text-amber-900"
              }`}>
                {agentStatus.status}
              </span>
            </div>
            <p className="text-xs mt-0.5 text-slate-700">
              {agentStatus.description}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/api-docs"
            className="text-xs font-mono bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-2.5 py-1 rounded"
          >
            API Integration Docs &rarr;
          </Link>
        </div>
      </div>

      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <PhoneCall className="w-5 h-5 text-rose-700" />
            <h1 className="text-xl font-bold text-slate-900">
              Remaining Fish Stock & Buyer Outreach Management
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time unsold fish balance reconciliation and commercial buyer outreach logging for rapid dock-side liquidation.
          </p>
        </div>

        {/* Modal / Collapsible to initiate new outreach */}
        <details className="text-right">
          <summary className="cursor-pointer bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium px-3.5 py-2 rounded inline-flex items-center gap-1.5 shadow-sm">
            <PhoneForwarded className="w-4 h-4" />
            <span>Log Buyer Outreach Call</span>
          </summary>
          <div className="absolute right-8 mt-2 w-[440px] bg-white border border-slate-300 rounded shadow-xl p-5 z-20 text-left">
            <h3 className="font-bold text-slate-900 text-xs mb-3 pb-2 border-b border-slate-100 flex items-center justify-between">
              <span>Record Buyer Call / Offer</span>
              <span className="text-[10px] text-slate-400 font-normal">Calling Layer Log</span>
            </h3>
            <form action={createOutreachAction} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                  Select Landing Batch *
                </label>
                <select
                  name="landingBatchId"
                  required
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-sky-500"
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.batchNumber} — {b.boatOwner.boatName || b.boatOwner.ownerName} ({b.landingLocation})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                  Contact Buyer Name *
                </label>
                <input
                  type="text"
                  name="contactName"
                  required
                  placeholder="e.g. Praveen Shetty"
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                  Contact Phone Number *
                </label>
                <input
                  type="tel"
                  name="contactPhone"
                  required
                  placeholder="e.g. 9880112233"
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                    Species Offered *
                  </label>
                  <input
                    type="text"
                    name="speciesOffered"
                    required
                    placeholder="e.g. Silver Pomfret"
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                    Quantity (Kg)
                  </label>
                  <input
                    type="number"
                    name="quantityOfferedKg"
                    min="1"
                    placeholder="e.g. 500"
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                    Offered Rate (₹ / Kg)
                  </label>
                  <input
                    type="number"
                    name="offeredRatePerKg"
                    min="1"
                    placeholder="e.g. 780"
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                    Channel
                  </label>
                  <select
                    name="channel"
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                  >
                    <option value="AI_PHONE_CALL">AI Phone Call Agent</option>
                    <option value="OPERATOR_CALL">Direct Operator Call</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                  Call Status
                </label>
                <select
                  name="status"
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white text-slate-900"
                >
                  <option value="Interested">Interested</option>
                  <option value="Not interested">Not interested</option>
                  <option value="Requested a callback">Requested a callback</option>
                  <option value="No answer">No answer</option>
                  <option value="Invalid contact">Invalid contact</option>
                  <option value="Contact attempt not made">Contact attempt not made</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                  Response / Counter-Offer Notes:
                </label>
                <textarea
                  name="resultNotes"
                  rows={2}
                  placeholder="e.g. Buyer interested, offered Rs 760/kg for complete lot"
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2 rounded text-xs transition mt-2"
              >
                Save Outreach Record
              </button>
            </form>
          </div>
        </details>
      </div>

      {/* Stock Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded p-4">
          <div className="text-xs text-slate-500 font-medium">Total Unsold Fish on Dock</div>
          <div className="text-2xl font-bold text-rose-700 mt-1">
            {totalRemainingKg.toLocaleString()} <span className="text-sm font-normal text-slate-500">Kg</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Across {remainingLots.length} active lots</div>
        </div>

        <div className="bg-white border border-slate-200 rounded p-4">
          <div className="text-xs text-slate-500 font-medium">Estimated Stock Valuation</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            ₹{totalValuation.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Based on dock floor rates</div>
        </div>

        <div className="bg-white border border-slate-200 rounded p-4">
          <div className="text-xs text-slate-500 font-medium">Active Landing Batches</div>
          <div className="text-2xl font-bold text-sky-700 mt-1">
            {batches.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Pending 100% clearance</div>
        </div>

        <div className="bg-white border border-slate-200 rounded p-4">
          <div className="text-xs text-slate-500 font-medium">Outreach Calls Logged</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">
            {outreachLogs.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {outreachLogs.filter((o) => o.status === "COMMITTED").length} buyer commitments
          </div>
        </div>
      </div>

      {/* SECTION 1: LIVE REMAINING FISH STOCK LEDGER */}
      <div className="bg-white border border-slate-200 rounded overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-700" />
            <h2 className="text-sm font-bold text-slate-800">
              1. Live Remaining Fish Stock Ledger
            </h2>
          </div>
          <span className="text-xs bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded">
            Landed - Dispatched = Available Stock
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 uppercase font-semibold">
              <tr>
                <th className="py-2.5 px-4">Fish Species & Grade</th>
                <th className="py-2.5 px-4">Batch Number / Vessel</th>
                <th className="py-2.5 px-4">Landing Location</th>
                <th className="py-2.5 px-4">Landed Time</th>
                <th className="py-2.5 px-4 text-right">Landed Qty</th>
                <th className="py-2.5 px-4 text-right">Dispatched Qty</th>
                <th className="py-2.5 px-4 text-right">Remaining Balance</th>
                <th className="py-2.5 px-4 text-right">Floor Price</th>
                <th className="py-2.5 px-4 text-right">Lot Valuation</th>
                <th className="py-2.5 px-4">Ice Condition</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {remainingLots.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-6 text-slate-400">
                    All landed fish has been 100% dispatched and cleared!
                  </td>
                </tr>
              ) : (
                remainingLots.map((lot) => (
                  <tr key={lot.itemId} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div>{lot.fishSpecies}</div>
                      <div className="text-[11px] text-slate-500 font-normal">{lot.grade}</div>
                    </td>
                    <td className="py-3 px-4">
                      <Link
                        href={`/landings/${lot.batchId}`}
                        className="font-mono text-sky-600 hover:underline font-bold block"
                      >
                        {lot.batchNumber}
                      </Link>
                      <div className="text-[11px] text-slate-700">{lot.boatOwner.boatName || lot.boatOwner.ownerName}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {lot.landingLocation}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(lot.landingDateTime).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-700">
                      {lot.landedQuantityKg} Kg
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500">
                      {lot.dispatchedQuantityKg} Kg
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-bold text-emerald-700 text-sm">
                        {lot.remainingQuantityKg} Kg
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-800">
                      ₹{lot.floorPricePerKg} / Kg
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      ₹{lot.lotValuation.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-sky-50 text-sky-800 border border-sky-100 px-2 py-0.5 rounded text-[11px]">
                        {lot.iceCondition}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/landings/${lot.batchId}`}
                        className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 px-2.5 py-1 rounded font-medium inline-block"
                      >
                        Dispatch
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: BUYER OUTREACH ATTEMPT TRACKING */}
      <div className="bg-white border border-slate-200 rounded overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-rose-700" />
            <h2 className="text-sm font-bold text-slate-800">
              2. Commercial Buyer Outreach & Automated Call Tracking
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            {outreachLogs.length} outreach records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 uppercase font-semibold">
              <tr>
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">Target Buyer</th>
                <th className="py-2.5 px-4">Lot / Species Offered</th>
                <th className="py-2.5 px-4 text-right">Offered Qty</th>
                <th className="py-2.5 px-4 text-right">Offered Rate</th>
                <th className="py-2.5 px-4">Channel</th>
                <th className="py-2.5 px-4">Call Status</th>
                <th className="py-2.5 px-4">Response Notes</th>
                <th className="py-2.5 px-4 text-right">Update Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {outreachLogs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-6 text-slate-400">
                    No outreach calls logged yet.
                  </td>
                </tr>
              ) : (
                outreachLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(log.attemptedAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{log.contactName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {log.contactPhone}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{log.speciesOffered}</div>
                      <div className="text-[11px] text-slate-400 font-mono">Batch: {log.landingBatch.batchNumber}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-900">
                      {log.quantityOfferedKg ? `${log.quantityOfferedKg} Kg` : "—"}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-900">
                      {log.offeredRatePerKg ? `₹${log.offeredRatePerKg} / Kg` : "—"}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {log.channel === "AI_PHONE_CALL" ? "AI Phone Call" : "Operator Call"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          log.status === "COMMITTED"
                            ? "bg-emerald-100 text-emerald-800"
                            : log.status === "CONNECTED"
                            ? "bg-sky-100 text-sky-800"
                            : log.status === "DECLINED"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-slate-100 text-slate-800"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 max-w-xs">
                      {log.resultNotes || "—"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <details className="inline-block text-left">
                        <summary className="cursor-pointer text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 px-2 py-1 rounded font-medium">
                          Update
                        </summary>
                        <div className="absolute right-6 mt-1 w-72 bg-white border border-slate-300 rounded shadow-lg p-3 z-20">
                          <form action={updateOutreachStatusAction} className="space-y-2 text-xs">
                            <input type="hidden" name="outreachId" value={log.id} />
                            <div>
                              <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                                Change Status:
                              </label>
                              <select
                                name="status"
                                defaultValue={log.status}
                                className="w-full border border-slate-300 rounded px-2 py-1 text-xs bg-white text-slate-900"
                              >
                                <option value="Interested">Interested</option>
                                <option value="Not interested">Not interested</option>
                                <option value="Requested a callback">Requested a callback</option>
                                <option value="No answer">No answer</option>
                                <option value="Invalid contact">Invalid contact</option>
                                <option value="Contact attempt not made">Contact attempt not made</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                                Add Response Notes:
                              </label>
                              <textarea
                                name="resultNotes"
                                defaultValue={log.resultNotes || ""}
                                rows={2}
                                className="w-full border border-slate-300 rounded px-2 py-1 text-xs"
                              ></textarea>
                            </div>
                            <button
                              type="submit"
                              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-1 rounded text-xs transition"
                            >
                              Save Status
                            </button>
                          </form>
                        </div>
                      </details>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
