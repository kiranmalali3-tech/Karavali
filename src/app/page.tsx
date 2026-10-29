import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Ship, ShoppingBag, Users, Anchor, Truck, PhoneCall, FileCode, ArrowRight } from "lucide-react";

export default async function HomePage() {
  const user = await getSessionUser();

  if (user?.role === "BOAT_OWNER") {
    redirect("/boat-owner");
  }

  if (user?.role === "BUYER") {
    redirect("/buyer");
  }

  // If Operator or logged in, show operational dashboard directory
  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              KARAVALI Operational Control
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Backend operational software layer supporting autonomous AI telephone calling agents across coastal Karnataka harbours.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded font-medium">
              System Online & Verified
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <Link
          href="/boat-owner"
          className="bg-white border border-slate-200 rounded p-5 hover:border-slate-400 hover:shadow-sm transition group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-700">
              <Ship className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition" />
          </div>
          <h2 className="text-base font-semibold text-slate-900 mt-3">
            1. Boat Owner Dashboard
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Vessel landings overview, haul weights, dispatch realization, and settlement tracking.
          </p>
        </Link>

        <Link
          href="/buyer"
          className="bg-white border border-slate-200 rounded p-5 hover:border-slate-400 hover:shadow-sm transition group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition" />
          </div>
          <h2 className="text-base font-semibold text-slate-900 mt-3">
            2. Buyer Dashboard
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Browse available fresh landings, place purchase orders, view dispatch receipts and billing.
          </p>
        </Link>

        <Link
          href="/contacts"
          className="bg-white border border-slate-200 rounded p-5 hover:border-slate-400 hover:shadow-sm transition group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700">
              <Users className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition" />
          </div>
          <h2 className="text-base font-semibold text-slate-900 mt-3">
            3. Profiles & Contact Directory
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Directory of registered boat owners, vessels, harbours, and verified wholesale buyers.
          </p>
        </Link>

        <Link
          href="/landings"
          className="bg-white border border-slate-200 rounded p-5 hover:border-slate-400 hover:shadow-sm transition group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700">
              <Anchor className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition" />
          </div>
          <h2 className="text-base font-semibold text-slate-900 mt-3">
            4. Landing Batch Details
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Confirmed fish landings, species breakdown, grade, asking rates, and ice quality logs.
          </p>
        </Link>

        <Link
          href="/dispatches"
          className="bg-white border border-slate-200 rounded p-5 hover:border-slate-400 hover:shadow-sm transition group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700">
              <Truck className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition" />
          </div>
          <h2 className="text-base font-semibold text-slate-900 mt-3">
            5. Dispatches & Purchases
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Dispatch records, vehicle consignment notes, agreed rates, invoice amounts, and payments.
          </p>
        </Link>

        <Link
          href="/outreach"
          className="bg-white border border-slate-200 rounded p-5 hover:border-slate-400 hover:shadow-sm transition group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-700">
              <PhoneCall className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition" />
          </div>
          <h2 className="text-base font-semibold text-slate-900 mt-3">
            6. Stock & Buyer Outreach
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time unsold fish balance reconciliation, buyer call log, and dispatch conversion.
          </p>
        </Link>
      </div>

      <div className="bg-slate-900 text-white rounded p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-sky-400" />
            <h3 className="font-semibold text-sm">External AI Calling Agent Webhook & REST API</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Automated telephone calling agents submit confirmed landings and dispatches via documented backend endpoints.
          </p>
        </div>
        <Link
          href="/api-docs"
          className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium px-4 py-2 rounded transition"
        >
          View API Documentation
        </Link>
      </div>
    </div>
  );
}
