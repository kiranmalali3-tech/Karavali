import { prisma } from "@/lib/prisma";
import { createLandingBatchAction } from "@/app/actions/landingActions";
import Link from "next/link";
import { Anchor, Plus, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LandingsPage() {
  const [landings, boatOwners] = await Promise.all([
    prisma.landingBatch.findMany({
      include: {
        boatOwner: true,
        items: {
          include: {
            dispatchItems: {
              include: { dispatch: true },
            },
          },
        },
        dispatches: true,
      },
      orderBy: { landingDateTime: "desc" },
    }),
    prisma.boatOwner.findMany({
      where: { accountStatus: "ACTIVE" },
      orderBy: { ownerName: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Anchor className="w-5 h-5 text-blue-700" />
            <h1 className="text-xl font-bold text-slate-900">
              Landing Batch Records & Traceability
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Confirmed catch records collected via AI phone agent or recorded directly by harbour operators upon berthing.
          </p>
        </div>

        {/* Record New Landing Batch Modal / Collapsible */}
        <details className="text-right">
          <summary className="cursor-pointer bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium px-3.5 py-2 rounded inline-flex items-center gap-1.5 shadow-sm">
            <Plus className="w-4 h-4" />
            <span>Record New Landing Batch</span>
          </summary>
          <div className="absolute right-8 mt-2 w-[460px] bg-white border border-slate-300 rounded shadow-xl p-5 z-20 text-left">
            <h3 className="font-bold text-slate-900 text-xs mb-3 pb-2 border-b border-slate-100 flex items-center justify-between">
              <span>Record Fish Landing Slip</span>
              <span className="text-[10px] text-slate-400 font-normal">Server Generates KRV-XXX</span>
            </h3>
            <form action={createLandingBatchAction} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                  Vessel & Boat Owner *
                </label>
                <select
                  name="boatOwnerId"
                  required
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-sky-500"
                >
                  {boatOwners.map((bo) => (
                    <option key={bo.id} value={bo.id}>
                      {bo.boatName || "Boat"} ({bo.boatRegistrationNumber || bo.registeredMobileNumber}) — {bo.ownerName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                    Landing Location *
                  </label>
                  <select
                    name="landingLocation"
                    required
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="Mangaluru Old Port (Bunder) - Jetty 2">Mangaluru Old Port (Bunder)</option>
                    <option value="Malpe Harbour - Deep Water Berth">Malpe Harbour</option>
                    <option value="Gangolli Port">Gangolli Port</option>
                    <option value="Tadadi Port">Tadadi Port</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                    Landing Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    name="landingDateTime"
                    defaultValue={new Date().toISOString().slice(0, 16)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-2.5 mt-2">
                <div className="text-[11px] font-semibold text-slate-700 mb-2">Catch Specifics</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                      Fish Species *
                    </label>
                    <input
                      type="text"
                      name="fishSpecies"
                      required
                      placeholder="e.g. Kingfish / Surmai"
                      defaultValue="Kingfish / Surmai"
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                      Grade
                    </label>
                    <select
                      name="grade"
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-sky-500"
                    >
                      <option value="Grade A1 (Export)">Grade A1 (Export)</option>
                      <option value="Grade A">Grade A</option>
                      <option value="Grade B">Grade B</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                      Quantity (Kg) [Positive] *
                    </label>
                    <input
                      type="number"
                      name="quantityKg"
                      required
                      min="1"
                      step="any"
                      placeholder="e.g. 500"
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                      Floor Rate (₹ / Kg)
                    </label>
                    <input
                      type="number"
                      name="floorPricePerKg"
                      min="1"
                      step="any"
                      placeholder="e.g. 600"
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div className="mt-2">
                  <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                    Ice & Preservation State
                  </label>
                  <select
                    name="iceCondition"
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="Well Iced (0-2°C) - Flake Ice">Well Iced (0-2°C) - Flake Ice</option>
                    <option value="Chilled Slurry Ice">Chilled Slurry Ice</option>
                    <option value="Adequate Crushed Ice">Adequate Crushed Ice</option>
                    <option value="Needs Immediate Re-icing">Needs Immediate Re-icing</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                  Confirming Operator Name
                </label>
                <input
                  type="text"
                  name="operatorConfirmedBy"
                  defaultValue="Suresh Rao (Harbour Operator)"
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2 rounded text-xs transition mt-2"
              >
                Submit Landing Record
              </button>
            </form>
          </div>
        </details>
      </div>

      {/* Landings Table */}
      <div className="bg-white border border-slate-200 rounded overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Anchor className="w-4 h-4 text-blue-700" />
            <h2 className="text-sm font-bold text-slate-800">
              Recorded Fish Landing Batches
            </h2>
          </div>
          <span className="text-xs bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded">
            {landings.length} total batches
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 uppercase font-semibold">
              <tr>
                <th className="py-2.5 px-4">Batch Number</th>
                <th className="py-2.5 px-4">Vessel / Owner</th>
                <th className="py-2.5 px-4">Landing Location</th>
                <th className="py-2.5 px-4">Landing Time</th>
                <th className="py-2.5 px-4">Catch Items (Landed & Remaining)</th>
                <th className="py-2.5 px-4 text-right">Landed Weight</th>
                <th className="py-2.5 px-4">Source</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {landings.map((batch) => {
                const totalLandedWeight = batch.items.reduce((s, it) => s + it.quantityKg, 0);

                return (
                  <tr key={batch.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {batch.batchNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{batch.boatOwner.boatName || "Boat"}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{batch.boatOwner.boatRegistrationNumber || batch.boatOwner.registeredMobileNumber}</div>
                      <div className="text-[11px] text-slate-400">Owner: {batch.boatOwner.ownerName}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {batch.landingLocation}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(batch.landingDateTime).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        {batch.items.map((item) => {
                          const dispatched = item.dispatchItems
                            .filter((di) => di.dispatch.confirmationStatus === "CONFIRMED")
                            .reduce((s, di) => s + di.quantityKg, 0);
                          const remaining = Math.max(0, item.quantityKg - dispatched);

                          return (
                            <div key={item.id} className="text-slate-800">
                              <span className="font-semibold">{item.fishSpecies}</span> {item.grade && `(${item.grade})`}
                              <div className="text-[11px] text-slate-500">
                                Landed: {item.quantityKg} Kg • Available:{" "}
                                <span className="font-bold text-emerald-700">{remaining} Kg</span>
                                {item.floorPricePerKg && ` @ ₹${item.floorPricePerKg}`}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {totalLandedWeight} Kg
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-medium">
                        {batch.source}
                      </span>
                      {batch.operatorConfirmedBy && (
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {batch.operatorConfirmedBy}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          batch.confirmationStatus === "FULLY_DISPATCHED"
                            ? "bg-slate-100 text-slate-700"
                            : batch.confirmationStatus === "PARTIALLY_DISPATCHED"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {batch.confirmationStatus.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/landings/${batch.id}`}
                        className="text-xs bg-slate-900 hover:bg-slate-800 text-white px-3 py-1 rounded font-medium inline-flex items-center gap-1"
                      >
                        <span>View Slip</span>
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
