import Link from "next/link";
import { getSessionUser, getAllProfiles } from "@/lib/auth";
import { switchUserAction, logoutAction } from "@/app/actions/authActions";
import { Ship, ShoppingBag, Users, Anchor, Truck, PhoneCall, FileCode, LogOut, CheckCircle2 } from "lucide-react";

export async function Navbar() {
  const currentUser = await getSessionUser();
  const allProfiles = await getAllProfiles();

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50">
      {/* Top Banner: Status & Quick Role Switcher */}
      <div className="bg-slate-950 px-4 py-1.5 text-xs border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="text-slate-300 font-medium tracking-wide">
            KARAVALI OPERATIONAL SYSTEM • MANGALURU COASTAL FISHERIES
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400">
            Backend for Autonomous Calling Agent
          </span>
        </div>

        {/* Quick User Switcher for verification */}
        <div className="flex items-center gap-3">
          <form action={switchUserAction} className="flex items-center gap-1.5">
            <label htmlFor="user-select" className="text-slate-400">Switch View / User:</label>
            <select
              id="user-select"
              name="userId"
              defaultValue={currentUser?.id || ""}
              className="bg-slate-800 border border-slate-700 text-white text-xs rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
            >
              <optgroup label="Harbour Operators">
                {allProfiles
                  .filter((p) => p.role === "OPERATOR")
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      Operator: {p.name}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Boat Owners">
                {allProfiles
                  .filter((p) => p.role === "BOAT_OWNER")
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      Boat Owner: {p.name} ({p.boatName})
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Buyers / Wholesalers">
                {allProfiles
                  .filter((p) => p.role === "BUYER")
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      Buyer: {p.companyName || p.name}
                    </option>
                  ))}
              </optgroup>
            </select>
            <button
              type="submit"
              className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium px-2 py-0.5 rounded transition"
            >
              Switch
            </button>
          </form>

          {currentUser ? (
            <form action={logoutAction}>
              <button
                type="submit"
                title="Log Out"
                className="text-slate-400 hover:text-slate-200 flex items-center gap-1 text-xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Exit</span>
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="text-xs text-sky-400 hover:text-sky-300 font-medium px-2 py-0.5 rounded border border-slate-700 bg-slate-800"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-sky-700 flex items-center justify-center font-bold text-white shadow-sm">
              K
            </div>
            <div>
              <div className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                KARAVALI <span className="text-xs font-normal text-sky-400 font-sans">(ಕರಾವಳಿ)</span>
              </div>
              <div className="text-[11px] text-slate-400">
                Fish Supply-Chain Tracking
              </div>
            </div>
          </Link>
        </div>

        {/* Dynamic Role-Based Navigation: Minimal navigation per privacy & simplicity rules */}
        <nav className="flex items-center gap-1 overflow-x-auto py-1 text-xs font-medium">
          {(!currentUser || currentUser.role === "OPERATOR" || currentUser.role === "BOAT_OWNER") && (
            <Link
              href="/boat-owner"
              className="px-2.5 py-1.5 rounded hover:bg-slate-800 text-slate-200 hover:text-white flex items-center gap-1.5 transition"
            >
              <Ship className="w-3.5 h-3.5 text-sky-400" />
              <span>Boat Owner</span>
            </Link>
          )}

          {(!currentUser || currentUser.role === "OPERATOR" || currentUser.role === "BUYER") && (
            <Link
              href="/buyer"
              className="px-2.5 py-1.5 rounded hover:bg-slate-800 text-slate-200 hover:text-white flex items-center gap-1.5 transition"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
              <span>Buyer Dashboard</span>
            </Link>
          )}

          {/* Operator-Only Directory */}
          {(!currentUser || currentUser.role === "OPERATOR") && (
            <Link
              href="/contacts"
              className="px-2.5 py-1.5 rounded hover:bg-slate-800 text-slate-200 hover:text-white flex items-center gap-1.5 transition"
            >
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>Contacts & Profiles</span>
            </Link>
          )}

          {/* Landings: Visible to Operator and Boat Owner */}
          {(!currentUser || currentUser.role === "OPERATOR" || currentUser.role === "BOAT_OWNER") && (
            <Link
              href="/landings"
              className="px-2.5 py-1.5 rounded hover:bg-slate-800 text-slate-200 hover:text-white flex items-center gap-1.5 transition"
            >
              <Anchor className="w-3.5 h-3.5 text-blue-400" />
              <span>Landing Batches</span>
            </Link>
          )}

          {/* Dispatches: Accessible to all authenticated personas */}
          <Link
            href="/dispatches"
            className="px-2.5 py-1.5 rounded hover:bg-slate-800 text-slate-200 hover:text-white flex items-center gap-1.5 transition"
          >
            <Truck className="w-3.5 h-3.5 text-purple-400" />
            <span>Dispatches & Receipts</span>
          </Link>

          {/* Stock & Outreach: Operator & Boat Owner */}
          {(!currentUser || currentUser.role === "OPERATOR" || currentUser.role === "BOAT_OWNER") && (
            <Link
              href="/outreach"
              className="px-2.5 py-1.5 rounded hover:bg-slate-800 text-slate-200 hover:text-white flex items-center gap-1.5 transition"
            >
              <PhoneCall className="w-3.5 h-3.5 text-rose-400" />
              <span>Stock & Outreach</span>
            </Link>
          )}

          {(!currentUser || currentUser.role === "OPERATOR") && (
            <>
              <div className="h-4 w-px bg-slate-700 mx-1"></div>
              <Link
                href="/api-docs"
                className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 font-mono text-[11px] flex items-center gap-1 transition border border-slate-700"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>AI Agent API</span>
              </Link>
            </>
          )}
        </nav>

        {/* Current Active User Badge */}
        {currentUser && (
          <div className="hidden lg:flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 px-2.5 py-1 rounded text-xs">
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wider ${
                currentUser.role === "OPERATOR"
                  ? "bg-purple-900 text-purple-200 border border-purple-700"
                  : currentUser.role === "BOAT_OWNER"
                  ? "bg-sky-900 text-sky-200 border border-sky-700"
                  : "bg-emerald-900 text-emerald-200 border border-emerald-700"
              }`}
            >
              {currentUser.role}
            </span>
            <div className="text-slate-300">
              <span className="font-medium text-white">{currentUser.name}</span>
              {currentUser.boatName && (
                <span className="text-slate-400 text-[11px]"> • {currentUser.boatName}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
