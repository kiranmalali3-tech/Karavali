import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updatePaymentStatusAction } from "@/app/actions/dispatchActions";
import { Truck, ShoppingBag, ArrowLeft, Printer, CreditCard } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DispatchDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const dispatch = await prisma.dispatch.findUnique({
    where: { id: params.id },
    include: {
      landingBatch: {
        include: { boatOwner: true },
      },
      buyer: true,
      items: {
        include: {
          landingBatchItem: true,
        },
      },
    },
  });

  if (!dispatch) {
    notFound();
  }

  const totalQty = dispatch.items.reduce((s, it) => s + it.quantityKg, 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/dispatches"
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dispatches</span>
        </Link>
        <button
          type="button"
          className="text-xs bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded font-medium inline-flex items-center gap-1.5"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print Consignment Slip</span>
        </button>
      </div>

      {/* Official Consignment Document */}
      <div className="bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs text-sky-400 font-mono tracking-wider uppercase font-semibold">
              Consignment & Purchase Delivery Slip
            </div>
            <h1 className="text-2xl font-bold font-mono tracking-tight mt-1">
              {dispatch.dispatchNumber}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Source Landing:{" "}
              <Link
                href={`/landings/${dispatch.landingBatchId}`}
                className="text-sky-300 hover:underline font-mono"
              >
                {dispatch.landingBatch.batchNumber}
              </Link>
              {" "}({dispatch.landingBatch.boatOwner.boatName})
            </p>
          </div>
          <div className="text-right">
            <span
              className={`px-3 py-1 rounded text-xs font-bold tracking-wider ${
                dispatch.paymentStatus === "FULLY_PAID"
                  ? "bg-emerald-900 text-emerald-200 border border-emerald-700"
                  : dispatch.paymentStatus === "ADVANCE_PAID"
                  ? "bg-sky-900 text-sky-200 border border-sky-700"
                  : "bg-amber-900 text-amber-200 border border-amber-700"
              }`}
            >
              {dispatch.paymentStatus.replace("_", " ")}
            </span>
            <div className="text-xs text-slate-400 mt-2">
              Dispatch Time:{" "}
              {new Date(dispatch.dispatchDateTime).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        </div>

        {/* Consignee & Transport Info */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-slate-200 bg-slate-50/50">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-emerald-700" />
              <span>Consignee & Recipient Details</span>
            </h3>
            <div className="space-y-1.5 text-xs text-slate-700">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Recipient Name:</span>
                <span className="font-bold text-slate-900">{dispatch.recipientName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Recipient Type:</span>
                <span className="capitalize font-medium text-slate-800">{dispatch.recipientType}</span>
              </div>
              {dispatch.buyer && (
                <>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Buyer Phone:</span>
                    <span className="font-mono text-slate-900">{dispatch.buyer.businessPhoneNumber}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Location:</span>
                    <span className="text-slate-800">{dispatch.buyer.relevantLocation}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Confirmation Status:</span>
                <span className="font-medium text-emerald-700">{dispatch.confirmationStatus}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-purple-700" />
              <span>Transport & Consignment Logistics</span>
            </h3>
            <div className="space-y-1.5 text-xs text-slate-700">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Transport Reference:</span>
                <span className="font-mono font-bold text-slate-900">{dispatch.transportReference || "Gate Dispatch"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Origin Loading Berth:</span>
                <span className="font-medium text-slate-800">{dispatch.landingBatch.landingLocation}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Source Vessel:</span>
                <span className="font-medium text-slate-900">{dispatch.landingBatch.boatOwner.boatName}</span>
              </div>
              <div className="py-1">
                <span className="text-slate-500 block text-[11px] mb-0.5">Consignment Notes:</span>
                <span className="text-slate-800 text-xs italic">
                  {dispatch.notes || "Weighed and verified on dock scale prior to transport gate clearance."}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="p-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
            Consignment Goods & Valuation
          </h3>
          <div className="overflow-x-auto border border-slate-200 rounded">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Species Description</th>
                  <th className="py-2.5 px-4 text-right">Quantity (Kg)</th>
                  <th className="py-2.5 px-4 text-right">Agreed Rate (₹ / Kg)</th>
                  <th className="py-2.5 px-4 text-right">Line Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dispatch.items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {item.landingBatchItem.fishSpecies}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-800">
                      {item.quantityKg} Kg
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-900">
                      ₹{item.agreedPricePerKg || 0}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      ₹{(item.totalAmount || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-900">
                <tr>
                  <td className="py-3 px-4 uppercase text-slate-600">Total Consignment</td>
                  <td className="py-3 px-4 text-right">{totalQty} Kg</td>
                  <td className="py-3 px-4 text-right">Gross Total:</td>
                  <td className="py-3 px-4 text-right text-base text-emerald-800">
                    ₹{(dispatch.totalAmount || 0).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Payment Reconciliation & Status Update Form */}
        <div className="p-6 bg-slate-50 border-t border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-slate-700" />
                <span>Payment Settlement & Reference</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Current Status: <span className="font-bold text-slate-800">{dispatch.paymentStatus}</span>
                {dispatch.paymentReference && (
                  <span className="ml-2 font-mono text-slate-600">
                    (Ref: {dispatch.paymentReference})
                  </span>
                )}
              </p>
            </div>
          </div>

          <form action={updatePaymentStatusAction} className="bg-white border border-slate-200 rounded p-4 flex flex-wrap items-end gap-3 text-xs">
            <input type="hidden" name="dispatchId" value={dispatch.id} />
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                Update Payment Status:
              </label>
              <select
                name="paymentStatus"
                defaultValue={dispatch.paymentStatus}
                className="border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-sky-500"
              >
                <option value="PENDING">PENDING</option>
                <option value="ADVANCE_PAID">ADVANCE_PAID</option>
                <option value="FULLY_PAID">FULLY_PAID</option>
              </select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                Payment / RTGS Reference Number:
              </label>
              <input
                type="text"
                name="paymentReference"
                defaultValue={dispatch.paymentReference || ""}
                placeholder="e.g. RTGS-HDFC261029-49102"
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-sky-500 font-mono"
              />
            </div>

            <button
              type="submit"
              className="bg-slate-900 hover:bg-slate-800 text-white font-medium px-4 py-1.5 rounded text-xs transition"
            >
              Update Payment Record
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
