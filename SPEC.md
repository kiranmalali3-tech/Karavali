# SPEC.md — KARAVALI Fish Supply-Chain Platform Specification

## 1. Executive Summary & Objective
KARAVALI is a clean, minimal, highly reliable fish supply-chain tracking web platform built specifically as the backend and operational layer behind an autonomous AI telephone calling agent.
The AI calling agent operates externally, dialling boat owners and operators at sea or harbour to confirm landings and buyer dispatches, and submitting verified records directly into KARAVALI's validated backend API.

The web application provides a straightforward, human-built operational interface for:
- Boat Owners (monitoring landing batches, dispatch status, real-time proceeds)
- Fish Buyers / Wholesalers (browsing available fresh catches, tracking dispatches & invoices)
- Authorized Harbour Operators / Managers (managing boat & buyer directories, overseeing landings, dispatches, stock balance, and buyer outreach)

## 2. Architectural Guidelines & Constraints
- **UI Aesthetic**: Utilitarian, clean, professional, human-built operational tool. Zero unnecessary animations, zero SaaS marketing landing pages, zero fake AI simulators or gimmicks. Clear navigation, standard data tables, structured forms, and badge indicators.
- **Server-Side Security**: Authentication and role-based access control (RBAC) enforced entirely on server routes and API actions.
- **Data Persistence**: Relational SQLite database managed via Prisma ORM (`file:./karavali.db`). All records persist across application restarts.
- **API for External AI Agent**: Documented REST API endpoints with API key authentication for external telephone calling agents to post verified landings and dispatches, and fetch unsold fish for buyer outreach.

## 3. Data Models Specification

### 1. BOAT OWNER (`BoatOwner`)
- `id`: Unique owner ID (CUID)
- `ownerName`: Owner name
- `registeredMobileNumber`: Unique registered mobile number
- `boatName`: Boat name
- `boatRegistrationNumber`: Unique registration number (if applicable)
- `landingCentre`: Primary landing centre (e.g., Mangaluru Old Port, Malpe Harbour)
- `accountStatus`: "ACTIVE" | "INACTIVE"
- `createdAt`, `updatedAt`: Timestamps

### 2. BUYER (`Buyer`)
- `id`: Unique buyer ID (CUID)
- `contactName`: Business or contact name
- `businessName`: Business name, if applicable
- `buyerType`: "auction agent" | "wholesaler" | "retailer" | "trader"
- `businessPhoneNumber`: Business phone number (unique)
- `preferredContactMethod`: "PHONE" | "WHATSAPP" | "SMS"
- `relevantLocation`: Relevant location / market
- `status`: "ACTIVE" | "INACTIVE"
- `createdAt`, `updatedAt`: Timestamps

### 3. BOAT OWNER'S POTENTIAL BUYERS (`BoatOwnerPotentialBuyer`)
Each boat-owner profile has a list of potential buyers who can be contacted about remaining fish.
Linked to reusable `Buyer` record where available.
- `id`: Unique record ID
- `boatOwnerId`: FK to BoatOwner
- `buyerId`: Optional FK to reusable Buyer
- `contactName`: Buyer contact name
- `phoneNumber`: Contact phone number
- `buyerType`: "auction agent" | "wholesaler" | "retailer" | "trader"
- `speciesPreferences`: Relevant fish species or buying preferences, if known
- `preferredContactMethod`: Preferred contact method
- `consentStatus`: Contact permission or consent status ("CONSENT_GRANTED", "PENDING", "OPTED_OUT")
- `notes`: Specific notes
- `status`: "ACTIVE" | "INACTIVE"
- `createdAt`, `updatedAt`: Timestamps

### 4. LANDING BATCH (`LandingBatch`)
- `id`: Unique batch ID
- `batchNumber`: Human-readable batch number (e.g. `KRV-MAL-000001`, `KRV-MNG-000001`)
- `boatOwnerId`: FK to BoatOwner
- `landingLocation`: Landing location
- `landingDateTime`: Landing date and time
- `confirmationStatus`: "CONFIRMED" | "PARTIALLY_DISPATCHED" | "FULLY_DISPATCHED"
- `source`: "external AI agent" | "authorised manual entry"
- `operatorConfirmedBy`: Operator verification name
- `createdAt`: Timestamp

### 5. LANDING BATCH ITEMS (`LandingBatchItem`)
- `id`: Unique item ID
- `landingBatchId`: FK to LandingBatch
- `fishSpecies`: Fish species name
- `quantityKg`: Quantity in kilograms (strictly > 0)
- `grade`: Grade (e.g., Grade A1 Export, Grade A, Grade B), if available
- `floorPricePerKg`: Expected or asking floor price per kg

### 6. DISPATCH (`Dispatch`)
- `id`: Unique dispatch ID
- `dispatchNumber`: Human-readable dispatch number (e.g. `DSP-MAL-000001`)
- `landingBatchId`: Original landing batch ID
- `buyerId`: Optional FK to Buyer when known and confirmed
- `recipientType`: "auction agent" | "wholesaler" | "retailer" | "trader" | "direct buyer"
- `recipientName`: Recipient business or person name
- `dispatchDateTime`: Dispatch date and time
- `transportReference`: Vehicle number / consignment note
- `confirmationStatus`: "CONFIRMED" | "PENDING"
- `agreedRatePerKg`: Agreed rate per kg
- `totalAmount`: Gross total value

### 7. DISPATCH ITEMS (`DispatchItem`)
- `id`: Unique item ID
- `dispatchId`: FK to Dispatch
- `landingBatchItemId`: Original landing batch item ID
- `quantityKg`: Quantity dispatched in kilograms (strictly > 0)

### 8. OUTREACH ATTEMPT (`OutreachAttempt`)
- `id`: Unique ID
- `landingBatchId`: FK to LandingBatch
- `boatOwnerPotentialBuyerId`: FK to BoatOwnerPotentialBuyer (optional)
- `buyerId`: FK to Buyer (optional)
- `contactName`, `contactPhone`: Contact details
- `speciesOffered`: Species offered
- `quantityOfferedKg`, `offeredRatePerKg`: Offer details
- `channel`: "AI_PHONE_CALL" | "OPERATOR_CALL"
- `status`: "ATTEMPTED" | "CONNECTED" | "COMMITTED" | "DECLINED" | "NO_ANSWER"
- `resultNotes`: Notes on buyer response
- `attemptedAt`, `createdAt`: Timestamps

## 4. Backend Rules & Invariants
- **Sequential Human-Readable Identifiers**: Generated on server (`KRV-[LOC]-[SEQ]` and `DSP-[LOC]-[SEQ]`).
- **Strict Positive Quantities**: Validated server-side; reject zero or negative quantities.
- **Reference Integrity**: Every dispatch item points to an existing batch item.
- **Stock Reconciliation Formula**: `Remaining Quantity = Landed Quantity - Sum(Confirmed Dispatches)`.
- **Over-Dispatch & Negative Balance Prevention**: Dispatches that exceed remaining balance fail atomically.
- **ACID Transactions**: Database transactions (`prisma.$transaction`) for all landing, dispatch, and balance operations.
- **Historical Record Preservation**: Soft deactivation preserves all historical landings, dispatches, and audit trail.

## 5. External AI Agent API Endpoints
All protected with `x-api-key: karavali_operator_agent_key_2026`:
1. `GET /api/v1/agent/boat-owners/[identifier]`: Lookup boat-owner profile by phone, boat registration, or ID.
2. `POST /api/v1/agent/landings`: Submit confirmed landing batch and species quantities.
3. `GET /api/v1/agent/batches/[batchIdOrNumber]`: Lookup batch details and exact remaining quantity per species.
4. `POST /api/v1/agent/dispatches`: Submit confirmed dispatch with over-dispatch checks.
5. `GET /api/v1/agent/boat-owners/[identifier]/potential-buyers`: Retrieve active potential buyers for automated outreach.
6. `POST /api/v1/agent/outreach`: Record an outreach attempt and result.

## 6. Seed Data & Local Realism
- Coastal Karnataka ports: Mangaluru Old Port (Bunder), Malpe, Gangolli, Tadadi, Karwar.
- Typical species: Kingfish / Surmai (Seer), Indian Mackerel (Bangude), Silver Pomfret, White Prawns, Sardines (Tarle), Yellowfin Tuna.
- Realistic boat owners, buyers, active landings, and dispatches.

## 7. Status: FINALIZED
This specification is finalized and locked for implementation.
