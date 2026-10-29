import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Truck, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DispatchesPage() {
  const dispatches = await prisma.dispatch.findMany({
    include: {
      landingBatch: {
        include: {
          boatOwner: true,
        },
      },
      buyer: true,
      items: {
        include: { landingBatchItem: true },
      },
    },
    orderBy: { dispatchDateTime: "desc" },
  });

  let totalVolumeKg = 0;
  let totalValue = 0;
  for (const d of dispatches) {
    const qty = d.items.reduce((s, it) => s + it.quantityKg, 0);
    totalVolumeKg += qty;
    totalValue += d.totalAmount || 0;
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-purple-700" />
            <h1 className="text-xl font-bold text-slate-900">
              Dispatch & Purchase Consignment Records
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Confirmed commercial dispatches, transport vehicle consignments, price realizations, and payment settlements.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded">
            <span className="text-slate-500">Total Volume Dispatched: </span>
            <span className="font-bold text-slate-900">{totalVolumeKg.toLocaleString()} Kg</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded">
            <span className="text-slate-500">Total Invoiced: </span>
            <span className="font-bold text-slate-900">₹{totalValue.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Dispatches Table */}
      <div className="bg-white border border-slate-200 rounded overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">
            Consignment Dispatch Slips
          </h2>
          <span className="text-xs bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded">
            {dispatches.length} records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 uppercase font-semibold">
              <tr>
                <th className="py-2.5 px-4">Dispatch Number</th>
                <th className="py-2.5 px-4">Date & Time</th>
                <th className="py-2.5 px-4">Landing Batch & Vessel</th>
                <th className="py-2.5 px-4">Recipient Name</th>
                <th className="py-2.5 px-4">Dispatched Items</th>
                <th className="py-2.5 px-4">Transport</th>
                <th className="py-2.5 px-4 text-right">Quantity</th>
                <th className="py-2.5 px-4 text-right">Amount</th>
                <th className="py-2.5 px-4">Payment</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dispatches.map((dsp) => {
                const totalQty = dsp.items.reduce((s, it) => s + it.quantityKg, 0);

                return (
                  <tr key={dsp.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {dsp.dispatchNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(dsp.dispatchDateTime).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <Link
                        href={`/landings/${dsp.landingBatchId}`}
                        className="text-sky-600 hover:underline font-mono font-medium block"
                      >
                        {dsp.landingBatch.batchNumber}
                      </Link>
                      <div className="text-[11px] text-slate-700 font-medium">{dsp.landingBatch.boatOwner.boatName}</div>
                      <div className="text-[10px] text-slate-400">{dsp.landingBatch.landingLocation}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{dsp.recipientName}</div>
                      <div className="text-[11px] text-slate-500 capitalize">{dsp.recipientType}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        {dsp.items.map((i) => (
                          <div key={i.id} className="text-slate-800">
                            <span className="font-medium">{i.landingBatchItem.fishSpecies}</span>: {i.quantityKg} Kg @ ₹{i.agreedPricePerKg}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {dsp.transportReference || "Gate Dispatch"}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-900">
                      {totalQty} Kg
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      ₹{(dsp.totalAmount || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          dsp.paymentStatus === "FULLY_PAID"
                            ? "bg-emerald-100 text-emerald-800"
                            : dsp.paymentStatus === "ADVANCE_PAID"
                            ? "bg-sky-100 text-sky-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {dsp.paymentStatus.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/dispatches/${dsp.id}`}
                        className="text-xs bg-slate-900 hover:bg-slate-800 text-white px-3 py-1 rounded font-medium inline-flex items-center gap-1"
                      >
                        <span>Slip</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
