import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { maskName, maskPhone } from "@/lib/masking";
import { createDispatchAction } from "@/app/actions/dispatchActions";
import Link from "next/link";
import { redirect } from "next/navigation";
import { 
  ShoppingBag, 
  Truck, 
  CheckCircle2, 
  Clock, 
  PackageCheck, 
  ShieldAlert, 
  Receipt, 
  History, 
  Building2 
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BuyerDashboard({
  searchParams,
}: {
  searchParams: { buyerId?: string };
}) {
  const session = await getSessionUser();

  // 1. Strict Server-Side Access Control
  if (!session) {
    redirect("/login?error=Please%20log%20in%20to%20access%20the%20buyer%20dashboard");
  }

  // A boat owner is strictly forbidden from accessing the commercial buyer dashboard
  if (session.role === "BOAT_OWNER") {
    return (
      <div className="max-w-2xl mx-auto my-12 bg-white border border-rose-200 rounded p-6 shadow-sm">
        <div className="flex items-center gap-3 text-rose-700">
          <ShieldAlert className="w-6 h-6 flex-shrink-0" />
          <div>
            <h2 className="text-base font-bold">Access Restricted: Boat Owner Persona</h2>
            <p className="text-xs text-slate-600 mt-1">
              Your account is registered as a Boat Owner. Boat owners are not permitted to access commercial buyer procurement portals or other buyers' private purchase ledgers.
            </p>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
          <Link
            href="/boat-owner"
            className="text-xs bg-slate-900 text-white px-3 py-1.5 rounded hover:bg-slate-800 font-medium"
          >
            Go to Boat Owner Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const isOperator = session.role === "OPERATOR";

  // If Buyer, strictly enforce their own verified buyerId (prevent tampering with ?buyerId=...)
  let activeBuyerId = session.buyerId;
  if (isOperator) {
    const allBuyers = await prisma.buyer.findMany({
      orderBy: { contactName: "asc" },
      select: { id: true, contactName: true, businessName: true },
    });
    activeBuyerId = searchParams?.buyerId || session.buyerId || allBuyers[0]?.id;
  }

  if (!activeBuyerId) {
    return (
      <div className="bg-white border border-slate-200 rounded p-8 text-center max-w-xl mx-auto my-8">
        <Building2 className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-800">No Buyer Record Linked</h2>
        <p className="text-xs text-slate-500 mt-1">
          No commercial buyer profile is currently associated with this login session. Please contact the harbour operator to link your verified business record.
        </p>
      </div>
    );
  }

  // Fetch verified buyer record
  const buyer = await prisma.buyer.findUnique({
    where: { id: activeBuyerId },
    include: {
      dispatches: {
        include: {
          landingBatch: {
            select: {
              id: true,
              batchNumber: true,
              landingLocation: true,
              landingDateTime: true,
            },
          },
          items: {
            include: {
              landingBatchItem: {
                select: {
                  id: true,
                  fishSpecies: true,
                  grade: true,
                },
              },
            },
          },
        },
        orderBy: { dispatchDateTime: "desc" },
      },
    },
  });

  if (!buyer) {
    return (
      <div className="bg-white border border-slate-200 rounded p-6 text-center">
        <p className="text-xs text-slate-600">No buyer record found for ID: {activeBuyerId}</p>
      </div>
    );
  }

  // Operator list for switching buyers
  const operatorBuyerList = isOperator
    ? await prisma.buyer.findMany({
        orderBy: { contactName: "asc" },
        select: { id: true, contactName: true, businessName: true },
      })
    : [];

  // 2. Fetch available fresh fish batches without exposing boat owners' private info
  const activeBatches = await prisma.landingBatch.findMany({
    where: {
      confirmationStatus: { in: ["CONFIRMED", "PARTIALLY_DISPATCHED"] },
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
    orderBy: { landingDateTime: "desc" },
  });

  const availableCatches: Array<{
    itemId: string;
    batchId: string;
    batchNumber: string;
    landingLocation: string;
    landingDateTime: Date;
    fishSpecies: string;
    grade: string | null;
    remainingKg: number;
    floorPricePerKg: number | null;
  }> = [];

  for (const b of activeBatches) {
    for (const item of b.items) {
      const dispatched = item.dispatchItems
        .filter((di) => di.dispatch.confirmationStatus === "CONFIRMED")
        .reduce((s, di) => s + di.quantityKg, 0);
      const remaining = item.quantityKg - dispatched;

      if (remaining > 0) {
        availableCatches.push({
          itemId: item.id,
          batchId: b.id,
          batchNumber: b.batchNumber,
          landingLocation: b.landingLocation,
          landingDateTime: b.landingDateTime,
          fishSpecies: item.fishSpecies,
          grade: item.grade || "Standard",
          remainingKg: remaining,
          floorPricePerKg: item.floorPricePerKg || 150,
        });
      }
    }
  }

  // 3. Compute Real Backend Metrics
  let totalPurchasedKg = 0;
  let totalSpend = 0;
  let settledSpend = 0;
  let pendingSpend = 0;

  for (const d of buyer.dispatches) {
    const qty = d.items.reduce((s, it) => s + it.quantityKg, 0);
    totalPurchasedKg += qty;
    const amt = d.totalAmount || 0;
    totalSpend += amt;
    if (d.paymentStatus === "FULLY_PAID") {
      settledSpend += amt;
    } else {
      pendingSpend += amt;
    }
  }

  // Masked values for privacy
  const displayedContactName = maskName(buyer.contactName, isOperator);
  const displayedPhone = maskPhone(buyer.businessPhoneNumber, isOperator);

  return (
    <div className="space-y-6">
      {/* 1. Header & Masked Identity Banner */}
      <div className="bg-white border border-slate-200 rounded p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-800 flex-shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-slate-900">
                {buyer.businessName || buyer.contactName}
              </h1>
              <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded capitalize font-medium">
                {buyer.buyerType}
              </span>
              <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-medium">
                {buyer.status}
              </span>
              {isOperator && (
                <span className="text-[11px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-medium">
                  Operator Clearance
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Contact: <span className="font-semibold text-slate-800">{displayedContactName}</span> • 
              Business Phone: <span className="font-mono text-slate-700 font-medium">{displayedPhone}</span> • 
              Market Location: <span className="text-slate-800">{buyer.relevantLocation}</span> • 
              Preferred Contact: <span className="text-slate-700 font-medium">{buyer.preferredContactMethod}</span>
            </p>
          </div>
        </div>

        {/* Operator Switcher (Only visible to verified operators) */}
        {isOperator && operatorBuyerList.length > 1 && (
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded">
            <label htmlFor="switch-buyer" className="text-xs text-slate-600 font-medium">
              Switch Buyer:
            </label>
            <form method="GET" className="flex items-center gap-1">
              <select
                id="switch-buyer"
                name="buyerId"
                defaultValue={buyer.id}
                className="text-xs border border-slate-300 rounded px-2 py-1 bg-white text-slate-800 focus:outline-none"
              >
                {operatorBuyerList.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.businessName ? `${b.businessName} (${b.contactName})` : b.contactName}
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
          <div className="text-xs text-slate-500 font-medium">Confirmed Purchases</div>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {buyer.dispatches.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Dispatches received</div>
        </div>

        <div className="bg-white border border-slate-200 rounded p-3.5">
          <div className="text-xs text-slate-500 font-medium">Total Volume Purchased</div>
          <div className="text-xl font-bold text-emerald-700 mt-1">
            {totalPurchasedKg.toLocaleString()} <span className="text-xs font-normal text-slate-500">Kg</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Net weight received</div>
        </div>

        <div className="bg-white border border-slate-200 rounded p-3.5">
          <div className="text-xs text-slate-500 font-medium">Settled Payments</div>
          <div className="text-xl font-bold text-slate-900 mt-1">
            ₹{settledSpend.toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-600 mt-0.5 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Fully cleared
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded p-3.5">
          <div className="text-xs text-slate-500 font-medium">Pending Invoices</div>
          <div className="text-xl font-bold text-amber-700 mt-1">
            ₹{pendingSpend.toLocaleString()}
          </div>
          <div className="text-[11px] text-amber-600 mt-0.5 font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" /> Under settlement
          </div>
        </div>
      </div>

      {/* 3. SECTION: CONFIRMED PURCHASES & DISPATCH RECORDS */}
      <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-700" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Confirmed Purchases & Dispatch Records
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            {buyer.dispatches.length} consignment(s)
          </span>
        </div>

        {buyer.dispatches.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No confirmed purchases recorded yet.</p>
            <p className="text-slate-400 mt-0.5">
              Purchases and dispatches allotted to your account will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="py-2.5 px-4">Dispatch Number</th>
                  <th className="py-2.5 px-4">Related Batch Number</th>
                  <th className="py-2.5 px-4">Landing Harbour</th>
                  <th className="py-2.5 px-4">Species & Quantities Purchased</th>
                  <th className="py-2.5 px-4">Purchase / Dispatch Date</th>
                  <th className="py-2.5 px-4">Status & Transport Ref</th>
                  <th className="py-2.5 px-4 text-right">Agreed Rate</th>
                  <th className="py-2.5 px-4 text-right">Total Amount</th>
                  <th className="py-2.5 px-4 text-right">Delivery Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {buyer.dispatches.map((dsp) => {
                  const totalKg = dsp.items.reduce((s, it) => s + it.quantityKg, 0);

                  return (
                    <tr key={dsp.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {dsp.dispatchNumber}
                      </td>
                      <td className="py-3 px-4 font-mono text-sky-700 font-semibold">
                        <Link href={`/landings/${dsp.landingBatch.id}`} className="hover:underline">
                          {dsp.landingBatch.batchNumber}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {dsp.landingBatch.landingLocation}
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {dsp.items.map((item) => (
                            <div key={item.id} className="text-slate-800">
                              <span className="font-semibold">{item.landingBatchItem.fishSpecies}</span>: 
                              <span className="ml-1 font-mono font-bold">{item.quantityKg} Kg</span>
                              {item.agreedPricePerKg && (
                                <span className="text-slate-400 text-[10px] ml-1">@ ₹{item.agreedPricePerKg}/kg</span>
                              )}
                            </div>
                          ))}
                        </div>
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
                        <div className="flex items-center gap-1.5">
                          <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-semibold">
                            {dsp.confirmationStatus}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {dsp.transportReference || "Harbour Gate Release"}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-700">
                        {dsp.agreedRatePerKg ? `₹${dsp.agreedRatePerKg}/Kg` : "Market"}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        ₹{(dsp.totalAmount || 0).toLocaleString()}
                        <div className="text-[10px] font-normal text-slate-500">
                          {dsp.paymentStatus.replace("_", " ")}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/dispatches/${dsp.id}`}
                          className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 px-2.5 py-1 rounded font-medium inline-block"
                        >
                          View Receipt
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. SECTION: SIMPLE TRANSACTION HISTORY */}
      <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-700" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Transaction History
            </h2>
          </div>
          <span className="text-[11px] text-slate-500">Audited procurement ledger</span>
        </div>

        {buyer.dispatches.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            No transaction history recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {buyer.dispatches.map((dsp) => {
              const qty = dsp.items.reduce((s, it) => s + it.quantityKg, 0);
              const speciesNames = Array.from(
                new Set(dsp.items.map((it) => it.landingBatchItem.fishSpecies))
              ).join(", ");

              return (
                <div key={`hist-${dsp.id}`} className="p-3.5 flex items-center justify-between hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 font-bold text-xs flex-shrink-0">
                      ₹
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-900">
                        Consignment #{dsp.dispatchNumber} • {speciesNames}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Batch: <span className="font-mono">{dsp.landingBatch.batchNumber}</span> • 
                        Location: {dsp.landingBatch.landingLocation} • 
                        Vehicle: {dsp.transportReference || "Direct Release"}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-900">
                      ₹{(dsp.totalAmount || 0).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {qty} Kg • {new Date(dsp.dispatchDateTime).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. SECTION: AVAILABLE FRESH CATCHES & DIRECT ALLOTMENT (Marketplace without leaking boat owners) */}
      <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-sky-700" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Available Fresh Catches Across Harbours
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            {availableCatches.length} lot(s) available for purchase
          </span>
        </div>

        {availableCatches.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            No unsold fresh catches available at this time. All landed lots have been committed.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="py-2.5 px-4">Batch Number</th>
                  <th className="py-2.5 px-4">Harbour / Berth</th>
                  <th className="py-2.5 px-4">Species & Grade</th>
                  <th className="py-2.5 px-4 text-right">Available Balance</th>
                  <th className="py-2.5 px-4 text-right">Floor Price</th>
                  <th className="py-2.5 px-4 text-right">Quick Order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {availableCatches.map((lot) => (
                  <tr key={lot.itemId} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {lot.batchNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <div>{lot.landingLocation}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(lot.landingDateTime).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{lot.fishSpecies}</div>
                      <div className="text-[10px] text-slate-500">{lot.grade}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                      {lot.remainingKg} Kg
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700">
                      ₹{lot.floorPricePerKg}/Kg
                    </td>
                    <td className="py-3 px-4 text-right">
                      {/* Direct Allotment Form */}
                      <form action={createDispatchAction} className="inline-flex items-center gap-1.5 justify-end">
                        <input type="hidden" name="landingBatchId" value={lot.batchId} />
                        <input type="hidden" name="landingBatchItemId" value={lot.itemId} />
                        <input type="hidden" name="buyerId" value={buyer.id} />
                        <input type="hidden" name="recipientName" value={buyer.businessName || buyer.contactName} />
                        <input type="hidden" name="recipientType" value={buyer.buyerType} />
                        <input type="hidden" name="agreedRatePerKg" value={lot.floorPricePerKg || 150} />
                        <input type="hidden" name="transportReference" value={`Pickup by ${buyer.contactName}`} />
                        <input
                          type="number"
                          name="quantityKg"
                          min="1"
                          max={lot.remainingKg}
                          defaultValue={Math.min(50, lot.remainingKg)}
                          className="w-16 text-xs border border-slate-300 rounded px-1.5 py-1 text-right bg-white text-slate-900"
                        />
                        <button
                          type="submit"
                          className="bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs px-2.5 py-1 rounded transition"
                        >
                          Request Allotment
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
