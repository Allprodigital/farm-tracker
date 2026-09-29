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

## v1.2: Tractor maintenance log (milestone 2, pulled forward)
- Home now has three options: **Find a field** (search), **Or pick from your list** (field dropdown), and **Tractor maintenance log** with **Pick from your tractors**. Picking a tractor shows only that tractor's card: name, current hours, next service due (red OVERDUE / amber DUE SOON / green OK), last entry, "Open maintenance log" and Clear. The last tractor picked is remembered separately from the field (`farmtracker.selectedTractor`).
- Bottom tabs: Home, All Fields, **Tractors**, About. The Tractors tab lists every tractor (most urgent service first) and adds new ones; edit/delete from the tractor's page.
- Tractor page: big hours readout + **Update hours**; **Log service** / **Log repair** quick form (date, hours, what was done, parts, cost, notes; a service can pick a service item, which resets that interval); service intervals with status and **Mark done**; timestamped maintenance history (entries + hours readings).
- Due logic: an interval is due at `lastDoneHours + everyHours` and/or `lastDoneDate + everyDays`, whichever comes first. **Overdue** if past either; **Due soon** within min(25 hrs, 20% of the interval) or min(14 days, 25% of the interval).
- Sample tractors (John Deere 8335R, John Deere 4440) are tagged SAMPLE; their hours, intervals and entries are made-up examples, not John Deere specs. "Remove sample data" removes sample fields and tractors together.
- Still to come in M2: link a field status change to the tractor/implement used; implements (disc, planter, shredder) as equipment too; reminders.

## Later milestones
- **M2 Equipment**: tractors, hours, service intervals and maintenance log shipped in v1.2 (above). Remaining: implements, link equipment to field work, reminders.
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

### Milestone 2: Equipment (built in v1.2)
**Tractor** (Equipment): `id`, `name` ("John Deere 8335R"), `make`, `model`, `year`, `serial` (serial/VIN, optional), `currentHours` (number), `hoursUpdatedAt`, `notes`, `sample`, `createdAt`, `updatedAt`. Later: `type` (tractor, combine, sprayer, implement) to cover all equipment.

**HoursReading**: `id`, `tractorId`, `date` (date), `hours` (number), `at` (datetime logged), `note`.

**ServiceInterval**: `id`, `tractorId`, `name` ("Engine oil & filter"), `everyHours?` (number), `everyDays?` (number), `lastDoneHours?`, `lastDoneDate?`, `createdAt`, `updatedAt`. Computed (not stored): next due hours/date, hours/days left, status `over | soon | ok | none`.

**MaintenanceEntry** (RepairLog): `id`, `tractorId`, `date`, `hours?` (at service), `type` (`service | repair`), `work` (what was done), `parts`, `cost?` (USD), `notes`, `intervalId?` (a service that satisfies an interval resets its last-done hours/date), `createdAt`. Later: `expenseId?` (M3).

Later link: `StatusChange.equipmentIds?` (what was run on the field).

### Milestone 3: Expenses and sales
**Expense**: `id`, `date`, `category` (seed, chemical, fertilizer, fuel, parts/repairs, labor, custom hire, rent, insurance, other), `vendor`, `description`, `amount` (number, USD), `fieldId?`, `equipmentId?`, `sprayRecordId?`, `receiptPhoto?`, `createdAt`.

**Sale**: `id`, `date`, `crop`, `buyer` (elevator/gin), `quantity` (number), `unit` (bu, cwt, lb, tons, bales), `price` (per unit), `amount` (total), `fieldId?`, `harvestRecordId?`, `ticketNo?`, `notes`, `createdAt`.

## Tech (M1)
Static PWA: `index.html`, `styles.css`, `app.js`, `sw.js`, `manifest.webmanifest`, `icons/`. No build step, no server. Data key `farmtracker.v1` in localStorage (last Home selections: `farmtracker.selectedField`, `farmtracker.selectedTractor`) (move to IndexedDB when photos arrive). Hosted on GitHub Pages.
