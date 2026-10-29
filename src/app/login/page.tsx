import { getAllProfiles } from "@/lib/auth";
import { loginAction, switchUserAction } from "@/app/actions/authActions";
import { Lock, Phone, UserCheck, Shield } from "lucide-react";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const profiles = await getAllProfiles();

  return (
    <div className="max-w-md mx-auto my-8">
      <div className="bg-white border border-slate-200 rounded p-6 shadow-sm">
        <div className="text-center pb-4 border-b border-slate-100">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded bg-sky-700 text-white font-bold text-lg mb-2">
            K
          </div>
          <h1 className="text-xl font-bold text-slate-900">KARAVALI Sign In</h1>
          <p className="text-xs text-slate-500 mt-1">
            Access the fish supply-chain tracking operational system
          </p>
        </div>

        {searchParams?.error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded font-medium">
            {searchParams.error}
          </div>
        )}

        {/* Standard Phone & PIN Form */}
        <form action={loginAction} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Registered Mobile Number
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                name="phone"
                required
                placeholder="e.g. 9845012345"
                defaultValue="9845012345"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-sky-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Account PIN
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                name="pin"
                required
                placeholder="Enter 4-digit PIN"
                defaultValue="1234"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-sky-600 focus:outline-none"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Default PIN for all seed test accounts: 1234</p>
          </div>

          <button
            type="submit"
            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2 text-sm font-medium rounded transition"
          >
            Authenticate & Open System
          </button>
        </form>

        {/* Quick Demo Access Switcher */}
        <div className="mt-8 pt-6 border-t border-slate-200">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-3">
            <UserCheck className="w-4 h-4 text-sky-600" />
            <span>Instant Role Switch / Test Accounts</span>
          </div>

          <div className="space-y-2">
            {profiles.slice(0, 5).map((p) => (
              <form key={p.id} action={switchUserAction} className="w-full">
                <input type="hidden" name="userId" value={p.id} />
                <button
                  type="submit"
                  className="w-full text-left px-3 py-2 text-xs border border-slate-200 hover:border-slate-400 hover:bg-slate-50 rounded flex items-center justify-between transition"
                >
                  <div>
                    <span className="font-semibold text-slate-800">{p.name}</span>
                    <span className="text-slate-500 block text-[11px]">
                      {p.boatName ? `Vessel: ${p.boatName}` : p.companyName || p.phone}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                      p.role === "OPERATOR"
                        ? "bg-purple-100 text-purple-800"
                        : p.role === "BOAT_OWNER"
                        ? "bg-sky-100 text-sky-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {p.role}
                  </span>
                </button>
              </form>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
