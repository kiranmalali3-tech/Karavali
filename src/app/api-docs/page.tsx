import { FileCode, Shield, CheckCircle2, Copy, Terminal, ExternalLink, Activity, AlertCircle, RefreshCw } from "lucide-react";
import { getAgentConnectionStatus } from "@/lib/agentAuth";

export const dynamic = "force-dynamic";

export default async function ApiDocsPage() {
  const apiKey = "karavali_operator_agent_key_2026";
  const agentStatus = await getAgentConnectionStatus();

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
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
            <p className="text-xs mt-1 text-slate-700">
              {agentStatus.description}
            </p>
          </div>
        </div>
        <div className="text-[11px] font-mono text-slate-600 bg-white/80 border border-slate-200 px-2.5 py-1 rounded">
          {agentStatus.lastActiveAt
            ? `Last Active: ${new Date(agentStatus.lastActiveAt).toLocaleString()}`
            : "Awaiting First Call"}
        </div>
      </div>

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded p-6 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-mono font-semibold text-sky-700 bg-sky-50 border border-sky-100 px-2.5 py-1 rounded w-fit mb-3">
          <Terminal className="w-3.5 h-3.5" />
          <span>REST API Specification • v1.0 • Server-to-Server</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">
          Autonomous AI Calling Agent Integration API
        </h1>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
          Documented backend endpoints for external autonomous telephone calling agents to lookup boat owners,
          submit verified landing batches, check live remaining stock balances, record buyer dispatches, and
          execute buyer outreach operations.
        </p>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded">
            <span className="font-semibold text-slate-700 block mb-1">Authentication</span>
            <span className="font-mono text-slate-800 bg-white border border-slate-300 px-1.5 py-0.5 rounded text-[11px]">
              x-api-key: {apiKey}
            </span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded">
            <span className="font-semibold text-slate-700 block mb-1">Rate Limiting</span>
            <span className="text-slate-600">120 req/min sliding window (HTTP 429 on exceed)</span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded">
            <span className="font-semibold text-slate-700 block mb-1">Idempotency Protection</span>
            <span className="font-mono text-[11px] text-slate-800">Idempotency-Key header</span>
          </div>
        </div>

        {/* 3 Workflows Overview */}
        <div className="mt-5 pt-4 border-t border-slate-200">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Supported Workflows</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 border border-sky-100 bg-sky-50/50 rounded">
              <strong className="text-sky-900 block mb-1">1. Landing Workflow</strong>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Agent looks up owner profile &rarr; collects species & quantities &rarr; confirms with operator &rarr; submits confirmed batch &rarr; KARAVALI generates batch # & updates owner dashboard balances.
              </p>
            </div>
            <div className="p-3 border border-purple-100 bg-purple-50/50 rounded">
              <strong className="text-purple-900 block mb-1">2. Dispatch Workflow</strong>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Agent queries batch remaining stock &rarr; collects buyer details & dispatched quantities &rarr; confirms order &rarr; KARAVALI validates stock & generates dispatch receipt & updates buyer/owner dashboards.
              </p>
            </div>
            <div className="p-3 border border-rose-100 bg-rose-50/50 rounded">
              <strong className="text-rose-900 block mb-1">3. Outreach Workflow</strong>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Agent requests unsold batch lots &rarr; KARAVALI retrieves eligible buyer contacts with preferences &rarr; agent dials buyers via external telephony &rarr; submits factual result &rarr; KARAVALI records log.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ENDPOINT 1: GET /api/v1/agent/boat-owners/{identifier} */}
      <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="bg-emerald-700 text-white font-mono font-bold text-xs px-2.5 py-1 rounded">
              GET
            </span>
            <span className="font-mono font-bold text-sm text-slate-900">
              /api/v1/agent/boat-owners/[identifier]
            </span>
          </div>
          <span className="text-xs bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded">
            Lookup Boat Owner Profile
          </span>
        </div>

        <div className="p-5 space-y-3 text-xs">
          <p className="text-slate-600">
            Looks up a boat-owner profile using an authorised identifier (registered mobile number, boat registration number, or ID).
          </p>

          <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
            Example cURL
          </h4>
          <pre className="bg-slate-900 text-sky-200 p-3 rounded font-mono text-xs overflow-x-auto whitespace-pre-wrap">
{`curl -X GET "http://localhost:3000/api/v1/agent/boat-owners/9845012345" \\
  -H "x-api-key: ${apiKey}"`}
          </pre>

          <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
            Response (200 OK)
          </h4>
          <pre className="bg-slate-900 text-slate-200 p-3 rounded font-mono text-xs overflow-x-auto">
{`{
  "success": true,
  "boatOwner": {
    "id": "cmvt...",
    "ownerName": "Anand Kunder",
    "registeredMobileNumber": "9845012345",
    "boatName": "Sea Queen",
    "boatRegistrationNumber": "IND-KA-02-MM-1042",
    "landingCentre": "Mangaluru Old Port (Bunder)",
    "accountStatus": "ACTIVE",
    "activePotentialBuyersCount": 2
  }
}`}
          </pre>
        </div>
      </div>

      {/* ENDPOINT 2: POST /api/v1/agent/landings */}
      <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="bg-sky-700 text-white font-mono font-bold text-xs px-2.5 py-1 rounded">
              POST
            </span>
            <span className="font-mono font-bold text-sm text-slate-900">
              /api/v1/agent/landings
            </span>
          </div>
          <span className="text-xs bg-emerald-100 text-emerald-800 font-medium px-2 py-0.5 rounded">
            Submit Confirmed Landing Batch
          </span>
        </div>

        <div className="p-5 space-y-3 text-xs">
          <p className="text-slate-600">
            Submits a confirmed landing batch with multiple fish species quantities. Generates a unique human-readable batch number (e.g. KRV-MNG-000001) in an atomic transaction.
          </p>

          <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
            Request Body (JSON)
          </h4>
          <pre className="bg-slate-900 text-emerald-300 p-3 rounded font-mono text-xs overflow-x-auto">
{`{
  "boatOwnerPhone": "9845012345",
  "landingLocation": "Mangaluru Old Port (Bunder) - Jetty 2",
  "landingDateTime": "2026-10-29T08:30:00Z",
  "operatorConfirmedBy": "Harbour Supervisor Suresh Rao",
  "source": "external AI agent",
  "items": [
    {
      "fishSpecies": "Kingfish / Surmai (Seer)",
      "quantityKg": 300,
      "grade": "Grade A1 (Export)",
      "floorPricePerKg": 640,
      "iceCondition": "Well Iced (0-2°C) - Flake Ice"
    }
  ],
  "notes": "Verified by autonomous telephony call #CALL-8102 with vessel master."
}`}
          </pre>

          <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
            Example cURL
          </h4>
          <pre className="bg-slate-900 text-sky-200 p-3 rounded font-mono text-xs overflow-x-auto whitespace-pre-wrap">
{`curl -X POST http://localhost:3000/api/v1/agent/landings \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${apiKey}" \\
  -d '{
    "boatOwnerPhone": "9845012345",
    "landingLocation": "Mangaluru Old Port (Bunder)",
    "items": [{ "fishSpecies": "Kingfish / Surmai", "quantityKg": 250, "floorPricePerKg": 620 }]
  }'`}
          </pre>

          <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
            Response (201 Created)
          </h4>
          <pre className="bg-slate-900 text-slate-200 p-3 rounded font-mono text-xs overflow-x-auto">
{`{
  "success": true,
  "message": "Confirmed landing batch recorded successfully.",
  "batchId": "cmvt...",
  "batchNumber": "KRV-MNG-000003",
  "boatName": "Sea Queen",
  "ownerName": "Anand Kunder",
  "confirmationStatus": "CONFIRMED"
}`}
          </pre>
        </div>
      </div>

      {/* ENDPOINT 3: GET /api/v1/agent/batches/{batchIdOrNumber} */}
      <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="bg-emerald-700 text-white font-mono font-bold text-xs px-2.5 py-1 rounded">
              GET
            </span>
            <span className="font-mono font-bold text-sm text-slate-900">
              /api/v1/agent/batches/[batchIdOrNumber]
            </span>
          </div>
          <span className="text-xs bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded">
            Lookup Batch & Remaining Quantity
          </span>
        </div>

        <div className="p-5 space-y-3 text-xs">
          <p className="text-slate-600">
            Looks up a landing batch and calculates exact remaining quantity as confirmed landed quantity minus confirmed dispatched quantity for each species.
          </p>

          <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
            Example cURL
          </h4>
          <pre className="bg-slate-900 text-sky-200 p-3 rounded font-mono text-xs overflow-x-auto whitespace-pre-wrap">
{`curl -X GET "http://localhost:3000/api/v1/agent/batches/KRV-MNG-000001" \\
  -H "x-api-key: ${apiKey}"`}
          </pre>

          <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
            Response (200 OK)
          </h4>
          <pre className="bg-slate-900 text-slate-200 p-3 rounded font-mono text-xs overflow-x-auto">
{`{
  "success": true,
  "batch": {
    "batchId": "cmvt...",
    "batchNumber": "KRV-MNG-000001",
    "landingLocation": "Mangaluru Old Port (Bunder) - Jetty 2",
    "confirmationStatus": "PARTIALLY_DISPATCHED",
    "totalLandedKg": 1850,
    "totalDispatchedKg": 800,
    "totalRemainingKg": 1050,
    "items": [
      {
        "itemId": "cmvt...",
        "fishSpecies": "Kingfish / Surmai (Seer)",
        "landedQuantityKg": 450,
        "dispatchedQuantityKg": 300,
        "remainingQuantityKg": 150
      },
      {
        "itemId": "cmvt...",
        "fishSpecies": "Silver Pomfret",
        "landedQuantityKg": 500,
        "dispatchedQuantityKg": 0,
        "remainingQuantityKg": 500
      }
    ]
  }
}`}
          </pre>
        </div>
      </div>

      {/* ENDPOINT 4: POST /api/v1/agent/dispatches */}
      <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="bg-purple-700 text-white font-mono font-bold text-xs px-2.5 py-1 rounded">
              POST
            </span>
            <span className="font-mono font-bold text-sm text-slate-900">
              /api/v1/agent/dispatches
            </span>
          </div>
          <span className="text-xs bg-emerald-100 text-emerald-800 font-medium px-2 py-0.5 rounded">
            Submit Confirmed Dispatch
          </span>
        </div>

        <div className="p-5 space-y-3 text-xs">
          <p className="text-slate-600">
            Records confirmed dispatch order with buyer. Strictly validates that quantity does not exceed remaining stock, prevents negative balances, and generates unique dispatch number (e.g. DSP-MNG-000001).
          </p>

          <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
            Request Body (JSON)
          </h4>
          <pre className="bg-slate-900 text-emerald-300 p-3 rounded font-mono text-xs overflow-x-auto">
{`{
  "landingBatchNumber": "KRV-MNG-000001",
  "buyerPhone": "9880112233",
  "recipientName": "Coastal Sea Products Ltd",
  "recipientType": "wholesaler",
  "transportReference": "KA-19-AB-4921 (Refrigerated Truck)",
  "items": [
    {
      "fishSpecies": "Kingfish / Surmai",
      "quantityKg": 100,
      "agreedPricePerKg": 620
    }
  ],
  "notes": "Confirmed deal via outreach phone call with buyer Praveen Shetty."
}`}
          </pre>

          <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
            Example cURL
          </h4>
          <pre className="bg-slate-900 text-sky-200 p-3 rounded font-mono text-xs overflow-x-auto whitespace-pre-wrap">
{`curl -X POST http://localhost:3000/api/v1/agent/dispatches \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${apiKey}" \\
  -d '{
    "landingBatchNumber": "KRV-MNG-000001",
    "buyerPhone": "9880112233",
    "items": [{ "fishSpecies": "Kingfish / Surmai", "quantityKg": 50, "agreedPricePerKg": 620 }]
  }'`}
          </pre>

          <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
            Response (201 Created)
          </h4>
          <pre className="bg-slate-900 text-slate-200 p-3 rounded font-mono text-xs overflow-x-auto">
{`{
  "success": true,
  "message": "Confirmed dispatch recorded successfully.",
  "dispatchId": "cmvt...",
  "dispatchNumber": "DSP-MNG-000003",
  "recipientName": "Coastal Sea Products Ltd",
  "totalAmount": 31000,
  "confirmationStatus": "CONFIRMED"
}`}
          </pre>
        </div>
      </div>

      {/* ENDPOINT 5: GET /api/v1/agent/boat-owners/{identifier}/potential-buyers */}
      <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="bg-amber-700 text-white font-mono font-bold text-xs px-2.5 py-1 rounded">
              GET
            </span>
            <span className="font-mono font-bold text-sm text-slate-900">
              /api/v1/agent/boat-owners/[identifier]/potential-buyers
            </span>
          </div>
          <span className="text-xs bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded">
            Retrieve Boat Owner's Potential Buyers
          </span>
        </div>

        <div className="p-5 space-y-3 text-xs">
          <p className="text-slate-600">
            Retrieves the active potential buyers list for an authorised boat owner to know who to call about remaining fish lots.
          </p>

          <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
            Example cURL
          </h4>
          <pre className="bg-slate-900 text-sky-200 p-3 rounded font-mono text-xs overflow-x-auto whitespace-pre-wrap">
{`curl -X GET "http://localhost:3000/api/v1/agent/boat-owners/9845012345/potential-buyers" \\
  -H "x-api-key: ${apiKey}"`}
          </pre>

          <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
            Response (200 OK)
          </h4>
          <pre className="bg-slate-900 text-slate-200 p-3 rounded font-mono text-xs overflow-x-auto">
{`{
  "success": true,
  "boatOwnerName": "Anand Kunder",
  "totalActiveContacts": 2,
  "contacts": [
    {
      "contactRecordId": "cmvt...",
      "contactName": "Praveen Shetty",
      "phoneNumber": "9880112233",
      "buyerType": "wholesaler",
      "speciesPreferences": "Kingfish / Surmai, Silver Pomfret",
      "preferredContactMethod": "PHONE",
      "consentStatus": "CONSENT_GRANTED"
    }
  ]
}`}
          </pre>
        </div>
      </div>

      {/* ENDPOINT 6: GET /api/v1/agent/outreach (Outreach Task Request) */}
      <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="bg-rose-700 text-white font-mono font-bold text-xs px-2.5 py-1 rounded">
              GET
            </span>
            <span className="font-mono font-bold text-sm text-slate-900">
              /api/v1/agent/outreach?batchNumber=[batchNumber]
            </span>
          </div>
          <span className="text-xs bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded">
            Request Outreach Task Handoff
          </span>
        </div>

        <div className="p-5 space-y-3 text-xs">
          <p className="text-slate-600">
            Backend handoff operation for external AI calling agents to request an outreach task for a specific batch and its remaining unsold species quantities. Returns only necessary operational data: batch number, remaining species & quantities, and eligible buyer contacts with contact preferences and permissions.
          </p>

          <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
            Example cURL
          </h4>
          <pre className="bg-slate-900 text-sky-200 p-3 rounded font-mono text-xs overflow-x-auto whitespace-pre-wrap">
{`curl -X GET "http://localhost:3000/api/v1/agent/outreach?batchNumber=KRV-MNG-000001" \\
  -H "x-api-key: ${apiKey}"`}
          </pre>

          <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
            Response (200 OK)
          </h4>
          <pre className="bg-slate-900 text-slate-200 p-3 rounded font-mono text-xs overflow-x-auto">
{`{
  "success": true,
  "task": {
    "batchNumber": "KRV-MNG-000001",
    "batchId": "cmvt...",
    "landingCentre": "Mangaluru Old Port (Bunder)",
    "landingDateTime": "2026-10-29T04:30:00.000Z",
    "boatName": "Sea Queen",
    "status": "READY_FOR_OUTREACH",
    "remainingSpecies": [
      {
        "itemId": "cmvt...",
        "fishSpecies": "Kingfish / Surmai (Seer)",
        "grade": "Grade A1 (Export)",
        "remainingQuantityKg": 150,
        "floorPricePerKg": 620
      }
    ],
    "eligibleBuyerContacts": [
      {
        "potentialBuyerId": "cmvt...",
        "contactName": "Praveen Shetty",
        "phoneNumber": "9880112233",
        "buyerType": "wholesaler",
        "speciesPreferences": "Kingfish / Surmai, Silver Pomfret",
        "preferredContactMethod": "PHONE",
        "consentStatus": "CONSENT_GRANTED",
        "location": "Baikampady Industrial Estate, Mangaluru",
        "lastOutreachResult": "Not yet contacted for this batch"
      }
    ]
  }
}`}
          </pre>
        </div>
      </div>

      {/* ENDPOINT 7: POST /api/v1/agent/outreach (Record Outreach Result) */}
      <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="bg-rose-700 text-white font-mono font-bold text-xs px-2.5 py-1 rounded">
              POST
            </span>
            <span className="font-mono font-bold text-sm text-slate-900">
              /api/v1/agent/outreach
            </span>
          </div>
          <span className="text-xs bg-emerald-100 text-emerald-800 font-medium px-2 py-0.5 rounded">
            Record Outreach Result
          </span>
        </div>

        <div className="p-5 space-y-3 text-xs">
          <p className="text-slate-600">
            Records the factual outcome of an outreach attempt. Supported normalized results:
            <code className="bg-slate-100 px-1.5 py-0.5 rounded ml-1 text-slate-800 font-semibold">Interested</code>, 
            <code className="bg-slate-100 px-1.5 py-0.5 rounded ml-1 text-slate-800 font-semibold">Not interested</code>, 
            <code className="bg-slate-100 px-1.5 py-0.5 rounded ml-1 text-slate-800 font-semibold">Requested a callback</code>, 
            <code className="bg-slate-100 px-1.5 py-0.5 rounded ml-1 text-slate-800 font-semibold">No answer</code>, 
            <code className="bg-slate-100 px-1.5 py-0.5 rounded ml-1 text-slate-800 font-semibold">Invalid contact</code>, 
            <code className="bg-slate-100 px-1.5 py-0.5 rounded ml-1 text-slate-800 font-semibold">Contact attempt not made</code>.
          </p>

          <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
            Request Body (JSON)
          </h4>
          <pre className="bg-slate-900 text-emerald-300 p-3 rounded font-mono text-xs overflow-x-auto">
{`{
  "landingBatchNumber": "KRV-MNG-000001",
  "contactName": "Praveen Shetty",
  "contactPhone": "9880112233",
  "speciesOffered": "Kingfish / Surmai (Seer)",
  "quantityOfferedKg": 150,
  "offeredRatePerKg": 620,
  "status": "Requested a callback",
  "resultNotes": "Buyer was busy in morning auction; asked to call back after 11:30 AM."
}`}
          </pre>

          <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
            Response (201 Created)
          </h4>
          <pre className="bg-slate-900 text-slate-200 p-3 rounded font-mono text-xs overflow-x-auto">
{`{
  "success": true,
  "message": "Outreach result recorded successfully.",
  "outreachId": "cmvt...",
  "status": "Requested a callback",
  "resultNotes": "Buyer was busy in morning auction; asked to call back after 11:30 AM.",
  "attemptedAt": "2026-10-29T12:00:00.000Z"
}`}
          </pre>
        </div>
      </div>
    </div>
  );
}
