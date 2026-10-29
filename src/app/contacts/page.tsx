import { prisma } from "@/lib/prisma";
import {
  addBoatOwnerAction,
  addBuyerAction,
  addPotentialBuyerAction,
  togglePotentialBuyerStatusAction,
  updatePotentialBuyerAction,
  removePotentialBuyerAction,
} from "@/app/actions/contactActions";
import Link from "next/link";
import { Users, Ship, ShoppingBag, Plus, Phone, Trash2, Power } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: { selectedOwnerId?: string };
}) {
  const [boatOwners, buyers] = await Promise.all([
    prisma.boatOwner.findMany({
      include: {
        potentialBuyers: {
          include: { buyer: true },
          orderBy: { contactName: "asc" },
        },
        _count: {
          select: { landings: true, potentialBuyers: true },
        },
      },
      orderBy: { ownerName: "asc" },
    }),
    prisma.buyer.findMany({
      include: {
        _count: {
          select: { dispatches: true, potentialBuyers: true },
        },
      },
      orderBy: { contactName: "asc" },
    }),
  ]);

  const selectedOwner =
    boatOwners.find((b) => b.id === searchParams?.selectedOwnerId) || boatOwners[0];

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div className="bg-white border border-slate-200 rounded p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-600" />
            <h1 className="text-xl font-bold text-slate-900">
              Boat Owner Profiles, Potential Buyers & Buyer Registry
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage boat owner profiles, each boat owner's designated list of potential buyers for remaining fish, and reusable commercial buyers.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="bg-slate-100 text-slate-700 font-medium px-2.5 py-1 rounded">
            {boatOwners.length} Vessels Registered
          </span>
          <span className="bg-slate-100 text-slate-700 font-medium px-2.5 py-1 rounded">
            {buyers.length} Reusable Buyers
          </span>
        </div>
      </div>

      {/* SECTION 1: BOAT OWNER REGISTRY */}
      <div className="bg-white border border-slate-200 rounded overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ship className="w-4 h-4 text-sky-700" />
            <h2 className="text-sm font-bold text-slate-800">
              1. Boat Owner & Vessel Registry
            </h2>
          </div>
          <details className="text-right">
            <summary className="cursor-pointer bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium px-3 py-1 rounded inline-flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" />
              <span>Register New Boat Owner</span>
            </summary>
            <div className="absolute right-8 mt-2 w-96 bg-white border border-slate-300 rounded shadow-xl p-5 z-20 text-left">
              <h3 className="font-bold text-slate-900 text-xs mb-3 pb-2 border-b border-slate-100">
                Register Boat Owner Profile
              </h3>
              <form action={addBoatOwnerAction} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                    Owner Full Name *
                  </label>
                  <input
                    type="text"
                    name="ownerName"
                    required
                    placeholder="e.g. Anand Kunder"
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                    Registered Mobile Number *
                  </label>
                  <input
                    type="tel"
                    name="registeredMobileNumber"
                    required
                    placeholder="e.g. 9845012345"
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-sky-500 font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                      Boat Name
                    </label>
                    <input
                      type="text"
                      name="boatName"
                      placeholder="e.g. Sea Queen"
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                      Registration #
                    </label>
                    <input
                      type="text"
                      name="boatRegistrationNumber"
                      placeholder="IND-KA-02-MM-..."
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-sky-500 font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                    Landing Centre *
                  </label>
                  <select
                    name="landingCentre"
                    required
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="Mangaluru Old Port (Bunder)">Mangaluru Old Port (Bunder)</option>
                    <option value="Malpe Harbour">Malpe Harbour</option>
                    <option value="Gangolli Port">Gangolli Port</option>
                    <option value="Tadadi Port">Tadadi Port</option>
                    <option value="Karwar Commercial Berth">Karwar Commercial Berth</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2 rounded text-xs transition mt-2"
                >
                  Save Profile
                </button>
              </form>
            </div>
          </details>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 uppercase font-semibold">
              <tr>
                <th className="py-2.5 px-4">Owner Name</th>
                <th className="py-2.5 px-4">Registered Mobile</th>
                <th className="py-2.5 px-4">Boat Name</th>
                <th className="py-2.5 px-4">Registration #</th>
                <th className="py-2.5 px-4">Landing Centre</th>
                <th className="py-2.5 px-4 text-center">Potential Buyers</th>
                <th className="py-2.5 px-4 text-center">Landings</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {boatOwners.map((owner) => (
                <tr key={owner.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {owner.ownerName}
                  </td>
                  <td className="py-3 px-4 text-slate-700 font-mono">
                    {owner.registeredMobileNumber}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800">
                    {owner.boatName || "—"}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600">
                    {owner.boatRegistrationNumber || "—"}
                  </td>
                  <td className="py-3 px-4 text-slate-700">
                    {owner.landingCentre}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Link
                      href={`/contacts?selectedOwnerId=${owner.id}`}
                      className="font-bold text-sky-700 hover:underline"
                    >
                      {owner._count.potentialBuyers} buyers
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-center text-slate-800">
                    {owner._count.landings} batches
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                      {owner.accountStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right space-x-1">
                    <Link
                      href={`/contacts?selectedOwnerId=${owner.id}#potential-buyers-section`}
                      className="text-xs bg-sky-50 text-sky-700 border border-sky-200 px-2 py-1 rounded font-medium inline-block hover:bg-sky-100"
                    >
                      Buyers List
                    </Link>
                    <Link
                      href={`/boat-owner?ownerId=${owner.id}`}
                      className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 px-2 py-1 rounded font-medium inline-block"
                    >
                      Dashboard
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: BOAT OWNER'S POTENTIAL BUYERS LIST */}
      <div id="potential-buyers-section" className="bg-white border border-slate-200 rounded overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-700" />
              <h2 className="text-sm font-bold text-slate-800">
                2. Potential Buyers for {selectedOwner?.ownerName}'s Vessel ({selectedOwner?.boatName || "Boat"})
              </h2>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Authorised contact list used by AI calling agent when remaining fish is available for this vessel.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <details className="text-right">
              <summary className="cursor-pointer bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium px-3 py-1 rounded inline-flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" />
                <span>Add / Link Potential Buyer</span>
              </summary>
              <div className="absolute right-8 mt-2 w-[420px] bg-white border border-slate-300 rounded shadow-xl p-5 z-20 text-left">
                <h3 className="font-bold text-slate-900 text-xs mb-3 pb-2 border-b border-slate-100">
                  Add Potential Buyer Contact for {selectedOwner?.ownerName}
                </h3>
                <form action={addPotentialBuyerAction} className="space-y-3 text-xs">
                  <input type="hidden" name="boatOwnerId" value={selectedOwner?.id} />

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                        Contact Person Name *
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
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        name="phoneNumber"
                        required
                        placeholder="e.g. 9880112233"
                        className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                        Buyer Type *
                      </label>
                      <select
                        name="buyerType"
                        className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                      >
                        <option value="wholesaler">Wholesaler</option>
                        <option value="auction agent">Auction Agent</option>
                        <option value="retailer">Retailer</option>
                        <option value="trader">Trader</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                        Business / Firm Name
                      </label>
                      <input
                        type="text"
                        name="businessName"
                        placeholder="Optional firm name"
                        className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                      Species Preferences (If Known)
                    </label>
                    <input
                      type="text"
                      name="speciesPreferences"
                      placeholder="e.g. Kingfish / Surmai, Pomfret, White Prawns"
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                        Preferred Contact Method
                      </label>
                      <select
                        name="preferredContactMethod"
                        className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                      >
                        <option value="PHONE">Phone Call</option>
                        <option value="WHATSAPP">WhatsApp</option>
                        <option value="SMS">SMS Alert</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                        Consent Status
                      </label>
                      <select
                        name="consentStatus"
                        className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                      >
                        <option value="CONSENT_GRANTED">Consent Granted</option>
                        <option value="PENDING">Pending</option>
                        <option value="OPTED_OUT">Opted Out</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                      Operational Notes
                    </label>
                    <textarea
                      name="notes"
                      rows={2}
                      placeholder="e.g. Call early morning for lots > 200kg"
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-medium py-2 rounded text-xs transition mt-2"
                  >
                    Save Potential Buyer Contact
                  </button>
                </form>
              </div>
            </details>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 uppercase font-semibold">
              <tr>
                <th className="py-2.5 px-4">Buyer Contact</th>
                <th className="py-2.5 px-4">Phone Number</th>
                <th className="py-2.5 px-4">Buyer Type</th>
                <th className="py-2.5 px-4">Preferred Species</th>
                <th className="py-2.5 px-4">Method</th>
                <th className="py-2.5 px-4">Consent Status</th>
                <th className="py-2.5 px-4">Notes</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!selectedOwner || selectedOwner.potentialBuyers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-6 text-slate-400">
                    No potential buyers currently linked for {selectedOwner?.ownerName}. Use the button above to add contacts.
                  </td>
                </tr>
              ) : (
                selectedOwner.potentialBuyers.map((pb) => (
                  <tr key={pb.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div>{pb.contactName}</div>
                      {pb.buyer?.businessName && (
                        <div className="text-[11px] text-slate-500 font-normal">{pb.buyer.businessName}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700 font-medium">
                      {pb.phoneNumber}
                    </td>
                    <td className="py-3 px-4 capitalize text-slate-700">
                      {pb.buyerType}
                    </td>
                    <td className="py-3 px-4 text-slate-800">
                      {pb.speciesPreferences || "All Species"}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {pb.preferredContactMethod}
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-semibold">
                        {pb.consentStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                      {pb.notes || "—"}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${pb.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                        {pb.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <details className="inline-block text-left">
                        <summary className="cursor-pointer text-[11px] bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 px-2 py-1 rounded font-medium inline-block list-none">
                          Edit
                        </summary>
                        <div className="absolute right-12 mt-1 w-80 bg-white border border-slate-300 rounded shadow-xl p-4 z-30 text-left">
                          <h4 className="font-bold text-slate-900 text-xs mb-2 pb-1 border-b border-slate-100">
                            Edit Preferences for {pb.contactName}
                          </h4>
                          <form action={updatePotentialBuyerAction} className="space-y-2.5 text-xs">
                            <input type="hidden" name="contactRecordId" value={pb.id} />
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                                Species Preferences
                              </label>
                              <input
                                type="text"
                                name="speciesPreferences"
                                defaultValue={pb.speciesPreferences || ""}
                                placeholder="e.g. Kingfish, Mackerel, Pomfret"
                                className="w-full border border-slate-300 rounded px-2 py-1 text-xs"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                                  Method
                                </label>
                                <select
                                  name="preferredContactMethod"
                                  defaultValue={pb.preferredContactMethod}
                                  className="w-full border border-slate-300 rounded px-2 py-1 text-xs"
                                >
                                  <option value="PHONE">Phone</option>
                                  <option value="WHATSAPP">WhatsApp</option>
                                  <option value="SMS">SMS</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                                  Consent
                                </label>
                                <select
                                  name="consentStatus"
                                  defaultValue={pb.consentStatus}
                                  className="w-full border border-slate-300 rounded px-2 py-1 text-xs"
                                >
                                  <option value="CONSENT_GRANTED">Granted</option>
                                  <option value="PENDING">Pending</option>
                                  <option value="OPTED_OUT">Opted Out</option>
                                </select>
                              </div>
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                                Operational Notes
                              </label>
                              <input
                                type="text"
                                name="notes"
                                defaultValue={pb.notes || ""}
                                placeholder="Notes for calling agent"
                                className="w-full border border-slate-300 rounded px-2 py-1 text-xs"
                              />
                            </div>
                            <div className="pt-2 flex justify-end gap-1.5">
                              <button
                                type="submit"
                                className="bg-sky-700 hover:bg-sky-800 text-white font-medium px-3 py-1 rounded text-xs"
                              >
                                Save Changes
                              </button>
                            </div>
                          </form>
                        </div>
                      </details>
                      <form action={togglePotentialBuyerStatusAction} className="inline-block">
                        <input type="hidden" name="contactRecordId" value={pb.id} />
                        <input type="hidden" name="currentStatus" value={pb.status} />
                        <button
                          type="submit"
                          title="Toggle Active/Inactive"
                          className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded font-medium"
                        >
                          {pb.status === "ACTIVE" ? "Deactivate" : "Activate"}
                        </button>
                      </form>
                      <form action={removePotentialBuyerAction} className="inline-block">
                        <input type="hidden" name="contactRecordId" value={pb.id} />
                        <button
                          type="submit"
                          title="Remove from Boat Owner's List"
                          className="text-[11px] bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-2 py-1 rounded font-medium"
                        >
                          Remove
                        </button>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: COMMERCIAL BUYER DIRECTORY */}
      <div className="bg-white border border-slate-200 rounded overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-emerald-700" />
            <h2 className="text-sm font-bold text-slate-800">
              3. Master Commercial Buyer Registry
            </h2>
          </div>
          <details className="text-right">
            <summary className="cursor-pointer bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium px-3 py-1 rounded inline-flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" />
              <span>Add Master Buyer</span>
            </summary>
            <div className="absolute right-8 mt-2 w-96 bg-white border border-slate-300 rounded shadow-xl p-5 z-20 text-left">
              <h3 className="font-bold text-slate-900 text-xs mb-3 pb-2 border-b border-slate-100">
                Register Master Commercial Buyer
              </h3>
              <form action={addBuyerAction} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                    Contact Person Name *
                  </label>
                  <input
                    type="text"
                    name="contactName"
                    required
                    placeholder="e.g. Vikram Shenoy"
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                    Business / Firm Name
                  </label>
                  <input
                    type="text"
                    name="businessName"
                    placeholder="e.g. Sagarika Cold Chain Hub"
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                      Buyer Type
                    </label>
                    <select
                      name="buyerType"
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                    >
                      <option value="wholesaler">Wholesaler</option>
                      <option value="auction agent">Auction Agent</option>
                      <option value="retailer">Retailer</option>
                      <option value="trader">Trader</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                      Business Phone *
                    </label>
                    <input
                      type="tel"
                      name="businessPhoneNumber"
                      required
                      placeholder="e.g. 9880334455"
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                    Relevant Location *
                  </label>
                  <input
                    type="text"
                    name="relevantLocation"
                    required
                    placeholder="e.g. Baikampady Industrial Area, Mangaluru"
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                    Preferred Contact Method
                  </label>
                  <select
                    name="preferredContactMethod"
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                  >
                    <option value="PHONE">Phone</option>
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="SMS">SMS</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2 rounded text-xs transition mt-2"
                >
                  Save Master Buyer Profile
                </button>
              </form>
            </div>
          </details>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 uppercase font-semibold">
              <tr>
                <th className="py-2.5 px-4">Contact Name</th>
                <th className="py-2.5 px-4">Business / Firm</th>
                <th className="py-2.5 px-4">Buyer Type</th>
                <th className="py-2.5 px-4">Phone Number</th>
                <th className="py-2.5 px-4">Preferred Method</th>
                <th className="py-2.5 px-4">Location</th>
                <th className="py-2.5 px-4 text-center">Linked Owners</th>
                <th className="py-2.5 px-4 text-center">Dispatches</th>
                <th className="py-2.5 px-4 text-right">Dashboard</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {buyers.map((buyer) => (
                <tr key={buyer.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {buyer.contactName}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800">
                    {buyer.businessName || "—"}
                  </td>
                  <td className="py-3 px-4 capitalize text-slate-700">
                    {buyer.buyerType}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-700">
                    {buyer.businessPhoneNumber}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {buyer.preferredContactMethod}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {buyer.relevantLocation}
                  </td>
                  <td className="py-3 px-4 text-center font-medium text-slate-800">
                    {buyer._count.potentialBuyers} boat lists
                  </td>
                  <td className="py-3 px-4 text-center font-medium text-slate-800">
                    {buyer._count.dispatches} orders
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/buyer?buyerId=${buyer.id}`}
                      className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 px-2.5 py-1 rounded font-medium inline-block"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
