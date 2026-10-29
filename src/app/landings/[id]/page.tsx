import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createDispatchAction } from "@/app/actions/dispatchActions";
import { getBatchRemainingInventory } from "@/lib/services/supplyChainService";
import { Ship, Truck, CheckCircle2, ArrowLeft, Printer } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LandingBatchDetailPage({
  params,
}: {
  params: { id: string };
}) {
  let batchData;
  try {
    batchData = await getBatchRemainingInventory(params.id);
  } catch {
    notFound();
  }

  const [dispatches, buyers] = await Promise.all([
    prisma.dispatch.findMany({
      where: { landingBatchId: batchData.batchId },
      include: {
        buyer: true,
        items: {
          include: { landingBatchItem: true },
        },
      },
      orderBy: { dispatchDateTime: "desc" },
    }),
    prisma.buyer.findMany({
      where: { status: "ACTIVE" },
      orderBy: { contactName: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/landings"
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Landing Batches</span>
        </Link>
        <button
          type="button"
          className="text-xs bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded font-medium inline-flex items-center gap-1.5"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print Landing Slip</span>
        </button>
      </div>

      {/* Official Landing Slip Card */}
      <div className="bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
        {/* Header Header */}
        <div className="bg-slate-900 text-white p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs text-sky-400 font-mono tracking-wider uppercase font-semibold">
              Official Landing Receipt & Traceability Slip
            </div>
            <h1 className="text-2xl font-bold font-mono tracking-tight mt-1">
              {batchData.batchNumber}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Landing Location: <span className="text-white font-medium">{batchData.landingLocation}</span>
            </p>
          </div>
          <div className="text-right">
            <span
              className={`px-3 py-1 rounded text-xs font-bold tracking-wider ${
                batchData.confirmationStatus === "FULLY_DISPATCHED"
                  ? "bg-slate-800 text-slate-300 border border-slate-700"
                  : batchData.confirmationStatus === "PARTIALLY_DISPATCHED"
                  ? "bg-amber-900 text-amber-200 border border-amber-700"
                  : "bg-emerald-900 text-emerald-200 border border-emerald-700"
              }`}
            >
              {batchData.confirmationStatus.replace("_", " ")}
            </span>
            <div className="text-xs text-slate-400 mt-2">
              Landed: {new Date(batchData.landingDateTime).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        </div>

        {/* Vessel & Reporting Origin Details */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-slate-200 bg-slate-50/50">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Ship className="w-4 h-4 text-sky-700" />
              <span>Fishing Vessel & Owner Information</span>
            </h3>
            <div className="space-y-1.5 text-xs text-slate-700">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Boat Name:</span>
                <span className="font-semibold text-slate-900">{batchData.boatOwner.boatName || "—"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Registration Number:</span>
                <span className="font-mono font-medium text-slate-900">{batchData.boatOwner.boatRegistrationNumber || "—"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Owner Full Name:</span>
                <span className="font-medium text-slate-900">{batchData.boatOwner.ownerName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Registered Phone:</span>
                <span className="font-mono text-slate-900">{batchData.boatOwner.registeredMobileNumber}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Landing Centre:</span>
                <span className="font-medium text-slate-800">{batchData.boatOwner.landingCentre}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>Verification & Operator Confirmation</span>
            </h3>
            <div className="space-y-1.5 text-xs text-slate-700">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Source:</span>
                <span className="font-medium text-slate-900">{batchData.source}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Confirmed By Operator:</span>
                <span className="font-semibold text-slate-900">
                  {batchData.operatorConfirmedBy || "Harbour Operations In-Charge"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Total Landed Catch:</span>
                <span className="font-bold text-slate-900">{batchData.totalLandedKg} Kg</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Remaining Balance:</span>
                <span className="font-bold text-emerald-700">{batchData.totalRemainingKg} Kg</span>
              </div>
              <div className="py-1">
                <span className="text-slate-500 block text-[11px] mb-0.5">Notes:</span>
                <span className="text-slate-800 text-xs italic">
                  {batchData.notes || "Catch verified upon berthing. Handled according to coastal hygiene standards."}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Catch Items Table */}
        <div className="p-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
            Catch Composition & Stock Reconciliation
          </h3>
          <div className="overflow-x-auto border border-slate-200 rounded">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Fish Species</th>
                  <th className="py-2.5 px-4">Grade</th>
                  <th className="py-2.5 px-4 text-right">Landed Qty</th>
                  <th className="py-2.5 px-4 text-right">Dispatched Qty</th>
                  <th className="py-2.5 px-4 text-right">Remaining Stock</th>
                  <th className="py-2.5 px-4 text-right">Floor Price</th>
                  <th className="py-2.5 px-4">Preservation State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batchData.items.map((item) => (
                  <tr key={item.itemId} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {item.fishSpecies}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {item.grade || "Standard"}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-800">
                      {item.landedQuantityKg} Kg
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500">
                      {item.dispatchedQuantityKg} Kg
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-bold ${item.remainingQuantityKg > 0 ? "text-emerald-700" : "text-slate-400"}`}>
                        {item.remainingQuantityKg} Kg
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-900">
                      {item.floorPricePerKg ? `₹${item.floorPricePerKg} / Kg` : "—"}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <span className="bg-sky-50 text-sky-800 border border-sky-100 px-2 py-0.5 rounded text-[11px]">
                        {item.iceCondition || "Chilled"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Dispatches from this batch */}
        <div className="p-6 bg-slate-50 border-t border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-purple-700" />
              <span>Dispatches Recorded from this Landing Batch</span>
            </h3>
            <span className="text-xs text-slate-500">
              {dispatches.length} dispatches recorded
            </span>
          </div>

          {dispatches.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-2">
              No dispatches generated yet. All fish currently in dock balance.
            </p>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded bg-white">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 uppercase font-semibold">
                  <tr>
                    <th className="py-2 px-3">Dispatch Number</th>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Recipient Name</th>
                    <th className="py-2 px-3">Transport</th>
                    <th className="py-2 px-3 text-right">Quantity</th>
                    <th className="py-2 px-3 text-right">Amount</th>
                    <th className="py-2 px-3">Payment</th>
                    <th className="py-2 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dispatches.map((dsp) => {
                    const totalQty = dsp.items.reduce((s, it) => s + it.quantityKg, 0);

                    return (
                      <tr key={dsp.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">
                          {dsp.dispatchNumber}
                        </td>
                        <td className="py-2 px-3 text-slate-600">
                          {new Date(dsp.dispatchDateTime).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                          })}
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-800">
                          {dsp.recipientName}
                        </td>
                        <td className="py-2 px-3 text-slate-600">
                          {dsp.transportReference}
                        </td>
                        <td className="py-2 px-3 text-right font-medium">
                          {totalQty} Kg
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">
                          ₹{(dsp.totalAmount || 0).toLocaleString()}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              dsp.paymentStatus === "FULLY_PAID"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {dsp.paymentStatus}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <Link
                            href={`/dispatches/${dsp.id}`}
                            className="text-sky-600 hover:underline font-medium"
                          >
                            View Slip
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Quick Dispatch Creation Form if there is remaining stock */}
          {batchData.totalRemainingKg > 0 && (
            <div className="mt-6 p-4 bg-white border border-slate-200 rounded">
              <h4 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-sky-600" />
                <span>Create Dispatch Order for Remaining Stock</span>
              </h4>
              <form action={createDispatchAction} className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                <input type="hidden" name="landingBatchId" value={batchData.batchId} />

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                    Select Available Fish:
                  </label>
                  <select
                    name="landingBatchItemId"
                    required
                    className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs"
                  >
                    {batchData.items
                      .filter((i) => i.remainingQuantityKg > 0)
                      .map((i) => (
                        <option key={i.itemId} value={i.itemId}>
                          {i.fishSpecies} ({i.remainingQuantityKg} Kg remaining @ ₹{i.floorPricePerKg || 0})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                    Buyer / Recipient:
                  </label>
                  <select
                    name="buyerId"
                    required
                    className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs"
                  >
                    {buyers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.businessName ? `${b.businessName} (${b.contactName})` : b.contactName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                    Dispatch Qty (Kg) [Positive]:
                  </label>
                  <input
                    type="number"
                    name="quantityKg"
                    required
                    min="1"
                    placeholder="Kg"
                    className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                    Agreed Rate (₹/Kg):
                  </label>
                  <input
                    type="number"
                    name="agreedPricePerKg"
                    required
                    min="1"
                    placeholder="Rate"
                    className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                    Transport Vehicle / Reference:
                  </label>
                  <input
                    type="text"
                    name="transportReference"
                    required
                    defaultValue="KA-19-AB-4921 (Refrigerated Truck)"
                    className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-1.5 rounded text-xs transition"
                  >
                    Record Dispatch
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
