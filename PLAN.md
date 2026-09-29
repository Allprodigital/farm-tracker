# Farm Tracker: Plan and Data Model

**Farm Tracker** by **All Pro Digital** (a Valley Pro Logistics LLC company). Sister app of Service Tracker.
Built for a working farm in the Rio Grande Valley: a phone-first way to see every field, what's happening on it, and what comes next.

Branding: app/PWA name and page title "Farm Tracker"; the launch (splash) screen shows "by All Pro Digital"; the About screen says "Farm Tracker by All Pro Digital, a Valley Pro Logistics LLC company". Icon: original sorghum grain head on a stalk (`icons/icon.svg`, PNGs at 512/192/180/32 + maskable).

## Goals
- Open the app in the cab or at the turnrow and see every field's status at a glance.
- Update a field in two taps, with one hand, in bright sun (big buttons, high contrast, 18px+ text).
- Keep a dated record: status changes, notes, sprays, harvests. No paperwork later.
- Grow into equipment (hours, service, repairs) and money (expenses, sales), all tied back to fields.

## Three areas
1. **Fields and crops** (milestone 1): what's planted where, what operation it's in, what's next, spray and harvest records.
2. **Equipment** (milestone 2): hours, service intervals, repairs (e.g. the JD 8335R).
3. **Farm expenses and sales** (milestone 3): costs and income, optionally linked to a field.

## Milestone 1 (this demo, shippable)
- Bottom tab bar: **Home**, **All Fields**, **About** (big tap targets).
- Home: clean screen with a big search bar (filters by field name/crop/variety as you type, with suggestions) and a dropdown of all fields. Picking one shows just that field's card (operation badge, Now, Next up, last updated) with "Open full detail". Remembers the last field picked. Friendly empty state; "+ Add field" always reachable.
- All Fields: every field card (name, crop, acres, current operation badge, "Now", "Next up", last updated).
- Add / edit / delete a field (name, acres, crop, variety, planting date).
- Field detail: status picker with presets (Discing, Plowing, Cultivating, Planting, Spraying, Fertilizing, Irrigating, Harvesting, Shredding, Idle/Fallow) plus **Add custom operation** (saved for all fields; removable on About if unused).
- "Where it stands now" and "Next to do": free text in the farmer's own words, each with an Edit button and an updated time.
- Notes with timestamps. Status history timeline with timestamps (plus optional note per change).
- Simple spray log (date, product, rate + unit, notes) and harvest entries (date, yield + unit, notes).
- Stored on the phone (localStorage). 4 sample fields, clearly marked SAMPLE, removable in one tap. Export to JSON.
- Installable PWA (Add to Home Screen), works offline.

## Later milestones
- **M2 Equipment**: equipment list, hours readings, service intervals with "due soon/overdue", repair log; link a status change to the tractor/implement used.
- **M3 Expenses and sales**: expense and sale entries, optional field link, per-field and per-season totals, CSV export.
- **M4 Accounts and sync**: sign-in, cloud backup, use on multiple phones; shared with Service Tracker's server stack.
- **M5 Multiple users**: owner + hands, who-did-what on each entry, permissions.
- **M6 Maps and acreage**: draw field boundaries on a map, auto acres, "fields near me".
- Also considered: seasons/crop years, weather/rain log, reminders, inputs inventory, reports for FSA/insurance.

## Data model
Times are ISO 8601 strings (UTC); dates are `YYYY-MM-DD`. IDs are short random strings.

### Milestone 1
**Field**
| field | type | notes |
|---|---|---|
| id | string | |
| name | string | required, e.g. "North 80" |
| acres | number? | |
| crop | string | e.g. "Grain sorghum" |
| variety | string | hybrid/variety |
| plantedOn | date? | |
| operationId | string | → OperationType.id (current status) |
| statusChangedAt | datetime | |
| currentState | string | "Where it stands now", farmer's words |
| stateUpdatedAt | datetime? | |
| nextTodo | string | "Next to do" |
| nextUpdatedAt | datetime? | |
| sample | boolean | true for demo seed data |
| createdAt, updatedAt | datetime | updatedAt bumps on any change to the field or its records |

**OperationType**: `id`, `name`, `color` (hex), `builtIn` (bool; presets can't be removed), `createdAt?`.

**StatusChange** (history entry): `id`, `fieldId`, `fromOpId` (string?, null for first), `toOpId`, `at` (datetime), `note` (string).

**Note**: `id`, `fieldId`, `text`, `createdAt`, `editedAt?`.

**SprayRecord**: `id`, `fieldId`, `date`, `product`, `rate` (string/number), `unit` (oz/ac, pt/ac, qt/ac, gal/ac, lb/ac, fl oz/ac), `notes`, `createdAt`.

**HarvestRecord**: `id`, `fieldId`, `date`, `yield` (number), `unit` (bu/ac, lb/ac, cwt/ac, tons/ac, bales/ac, total bu/lb/tons), `notes`, `createdAt`.

Later: `Season`/crop year on Field so a field keeps a crop history year to year.

### Milestone 2: Equipment
**Equipment**: `id`, `name` ("8335R"), `make` ("John Deere"), `model`, `year?`, `serial?`, `type` (tractor, combine, sprayer, implement...), `currentHours` (number), `notes`, `createdAt`, `updatedAt`.

**HoursReading**: `id`, `equipmentId`, `hours` (number), `at` (datetime), `note`.

**ServiceInterval**: `id`, `equipmentId`, `task` ("Engine oil & filter"), `everyHours?` (number), `everyDays?` (number), `lastDoneHours?`, `lastDoneAt?` → app computes next due and due-soon/overdue.

**RepairLog**: `id`, `equipmentId`, `date`, `hours?`, `problem`, `work` (what was done), `parts` (text or list), `cost?` (number), `laborHours?`, `doneBy`, `serviceIntervalId?` (if it satisfied a scheduled service), `expenseId?`.

Link: `StatusChange.equipmentIds?` (what was run on the field).

### Milestone 3: Expenses and sales
**Expense**: `id`, `date`, `category` (seed, chemical, fertilizer, fuel, parts/repairs, labor, custom hire, rent, insurance, other), `vendor`, `description`, `amount` (number, USD), `fieldId?`, `equipmentId?`, `sprayRecordId?`, `receiptPhoto?`, `createdAt`.

**Sale**: `id`, `date`, `crop`, `buyer` (elevator/gin), `quantity` (number), `unit` (bu, cwt, lb, tons, bales), `price` (per unit), `amount` (total), `fieldId?`, `harvestRecordId?`, `ticketNo?`, `notes`, `createdAt`.

## Tech (M1)
Static PWA: `index.html`, `styles.css`, `app.js`, `sw.js`, `manifest.webmanifest`, `icons/`. No build step, no server. Data key `farmtracker.v1` in localStorage (last Home selection: `farmtracker.selectedField`) (move to IndexedDB when photos arrive). Hosted on GitHub Pages.
