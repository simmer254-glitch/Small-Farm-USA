# Handoff: Small Farm USA — Family Farm Management App

## Overview
A mobile app for the Simmons family (Colorado) to run their small farm together: livestock records for cattle, hogs, and poultry (including lots/batches), a separate light profile for pets & working animals, per-business finances mapped to IRS Schedule F lines, receipts and document storage, a shared task calendar with assignees and calendar invites, local auction market prices, equipment logs, an append-only audit trail with filtered CSV/PDF export, and role-based access (Admin / Member / Kid mode).

Target users are a multi-generation family (~10 people) with mixed tech comfort, using phones one-handed at the barn. Big touch targets, minimal typing, and "log it in 10 seconds" flows are core to the product.

## About the Design Files
The file in this bundle (`Small Farm USA App.dc.html` + `support.js`) is a **design reference created in HTML** — a working prototype showing intended look and behavior, not production code to ship. The task is to **recreate this design in a real application environment** (e.g. React Native / Expo, Flutter, or a PWA) with a real backend. No codebase exists yet — choose the most appropriate stack for the requirements below.

Open `Small Farm USA App.dc.html` in a browser to click through every flow. All interactions work with in-memory state.

## Fidelity
**High-fidelity.** Colors, typography, spacing, copy, and interactions are final design intent. Recreate the UI pixel-perfectly using the chosen framework's native components where sensible (date pickers, file pickers) while keeping the visual system below.

## Product Requirements (owner's launch requirements — NOT in the prototype)
These are the reasons this app needs a real build. Treat them as P0:

1. **Shared data, multi-device.** All family members see the same live data. The prototype is single-device in-memory state; the real app needs a synced datastore.
2. **Storage backed by the owner's OneDrive.** Documents (receipts, brand inspections, vet records, insurance) must be stored in the owner's OneDrive under a `/Small Farm USA` folder via Microsoft Graph API (OAuth: `Files.ReadWrite`). Structured data (animals, transactions, tasks, audit log) can live in a conventional database with document files on OneDrive — or, for a low-cost build, as JSON files in the same OneDrive folder with sync/merge handling. The Docs screen already shows the intended "Backed up to OneDrive · last sync" status banner.
3. **Google Calendar sync.** Tasks sync to the owner's Google account (`simmer254@gmail.com`) via the Google Calendar API (OAuth). Creating/completing/deleting a task creates/updates/deletes the calendar event; assignees are attendees. The prototype's fallback (.ics download per task — implemented and working, see `invite:` handler) should remain for family members who don't connect an account.
4. **In-app invites & accounts.** The owner (Admin) invites family members by email or share-link from More › Family members. Each member gets an account with a role: **Admin** (full control incl. deletes), **Member** (add/update everything, no deletes), **Kid** (chore view only). Role gating is already modeled in the prototype (`role` state; try More › Your role · switch).
5. **Audit trail is append-only.** Every animal event, money entry, and chore is recorded with actor + timestamp and cannot be silently edited. Exports (CSV, PDF) are stubbed in the prototype and must be real downloads.
6. **Market prices** pull free USDA AMS auction reports for user-selected sale barns (prototype ships realistic sample data for four Colorado barns).

## Screens / Views
All screens live in one 390×800 phone canvas, 5-tab bottom navigation (Home, Animals, Calendar, Docs, More). Screen routing is a single `screen` state string; find each screen in the HTML by its `<!-- ====== NAME ====== -->` comment.

### 1. Home (`screen: 'home'`, role ≠ kid)
- Greeting header: "Good morning, Simmons Family", date · total head · role label; 40px avatar square (#5a6b3b, radius 12).
- Species count chips (🐄 🐖 🐔 + Add) — tap filters the Animals list.
- **Needs attention** card list: auto-generated husbandry suggestions (see Business Logic) + tasks due within 14 days. Empty state: "All caught up".
- **Markets** strip: 3 quote mini-cards from the selected auction; header links to Markets screen.
- **This year so far**: Income / Expenses / Net YTD, links to Money. "Schedule F ›" affordance.
- Floating action button (52px, radius 18, #5a6b3b, bottom-right) opens a 6-action speed-dial over a scrim: Expense + receipt, Income, Upload a doc, New animal, Schedule a task, Send feedback.

### 2. Kid Home (`screen: 'home'`, role = kid)
- "Hi, helper! 👋" heading; 2×2 grid of large chore buttons (🥚 Collected eggs, 🌾 Fed & watered, 💧 Filled water, 👀 Checked animals). Tapping logs a chore instantly (no confirm) → increments the "⭐ N done today" banner and lands in the audit trail.
- **My tasks**: tasks assigned to "Kids" or "Everyone" with big 28px checkboxes.
- Kid mode hides money, deletes, and all admin surfaces.

### 3. Animals (`screen: 'animals'`)
- Filter chips (All / Cattle / Pigs / Chickens), search input (tag, name, or dam).
- Livestock list rows: emoji avatar, "Name · #tag", sub line "Lot of N · Sex · age · color", status badge — OK (green), Action (orange, has suggestion), Sold (purple), Butchered (brown).
- **Pets & working animals** section, visually distinct (blue-tinted #f3f6fa card, "Pet" badge) — dogs, cats, horses.
- "+ New animal" full-width button (#5a6b3b).

### 4. Animal detail (`screen: 'detail'`)
- Header card: emoji, name · #tag, subtitle (lot, sex, born, dam, status); stat grid: Age / Last weighed / Color.
- Suggestion callout (💡, #f0f3e6 bg, #d5ddbf border) when husbandry logic fires.
- Quick-log buttons: + Weight, + Vaccination (pets: + Vet visit), + Note → inline input + Save. Weight entries update "Last weighed".
- **Life record**: reverse-chron event list (born, tagged, weighed, vaccinated, notes, sold, butchered) each with date + actor.
- Livestock only: **Mark sold** (opens buyer + price form; confirm logs the sale event AND auto-creates an income transaction on Schedule F Line 2 under the right business) and **Mark butchered**.
- Pets: banner "🐾 Pet / working animal — never sold or eaten. No lifecycle tracking."
- Delete record — Admin only; non-admins see "Only an admin can delete records".

### 5. Add animal (`screen: 'add'`)
- TYPE toggle: Livestock / Pet-working.
- Livestock: species (Calf/Piglet/Chick(s)), sex options per species (Heifer-Bull-Steer / Gilt-Boar-Barrow / Pullet-Cockerel-Straight run), tag #, name (opt), born date, birth weight (opt), color/markings, dam, **count (lot/batch)** — one tag covers a whole chick batch or pig litter.
- Pet: species (Dog/Cat/Horse), name, born (approx ok), color/breed. No tag/lot/sale fields.
- Save appends "Born" + "Tagged" events (or "Added to the family" for pets).

### 6. Calendar (`screen: 'calendar'`)
- Month grid (prev/next), today highlighted #5a6b3b, orange dot on days with open tasks; tapping a day opens the task form pre-dated.
- Task form: type chips (🥩 Butcher, 🔧 Maintenance, 💉 Vaccination, 📌 Other), FOR assignee chips (Everyone/Dad/Mom/Kids), title, date.
- Task rows: checkbox toggle, "date (in Nd)" relative label, "for {assignee} · by {creator}", **📆 Invite** button → downloads an RFC-5545 .ics file (working in prototype; real app also pushes to Google Calendar), admin-only ✕ delete.

### 7. Markets (`screen: 'markets'`)
- Auction picker chips (4 Colorado barns), meta line (location · sale date · head count), quote rows (label, grade note, price, ▲/▼ delta in green #5a8a3b / red #b5502a).

### 8. Money (`screen: 'money'`)
- Business filter chips: **All / Cattle / Poultry / Hogs / General** — every view below re-computes for the selected business.
- Dark summary card (#2c3320): Income YTD / Expenses YTD / Net (net green #b8d18f or red #e0a48a).
- + Expense / + Income buttons; entry rows with Schedule F line + business tag + 📎 receipt indicator.

### 9. Add transaction (`screen: 'addtxn'`)
- Description, amount, date, BUSINESS chips (Cattle/Poultry/Hogs/General), Schedule F category dropdown (15 expense lines, 4 income lines — exact strings in code), receipt photo capture (dashed drop area; attaching also files a copy into Docs › Receipts).

### 10. Docs (`screen: 'docs'`)
- OneDrive status banner (blue, "Backed up to OneDrive · /Small Farm USA · last sync …").
- 2×2 folder grid: Brand inspections, Receipts, Vet records, Insurance & titles (live file counts).
- Recent uploads list; dashed "Snap or upload a document" area.

### 11. Reports & audit (`screen: 'audit'`)
- Range chips (30 days / YTD / All) + business chips (All/Cattle/Poultry/Hogs/General).
- "N records in view" count; unified trail of money entries, animal events, and kid chores, each with actor attribution.
- Export CSV / Export PDF buttons (stubbed — must be real in production).

### 12. More (`screen: 'more'`)
- Money teaser card (dark), Reports & audit link.
- **Equipment**: add (name + hours/mi), rows with inline "Update" editor (new hours + service note → stamps a dated service record).
- **Family feedback**: in-app suggestion box with name, status badges (New/Planned/Done).
- **Farm & account**: Your role (tap cycles Admin → Member → Kid for demo; real app: fixed per user, admin-managed), Family members (10 · manage — invite flow goes here), Security & encryption, OneDrive backup status.

## Interactions & Behavior
- Navigation is instant state swap, no route transitions. Tab bar highlights the owning tab per screen (e.g. Animal detail highlights Animals; Money highlights More).
- Chips everywhere follow one pattern: selected = #5a6b3b bg / #fff text; unselected = #eceadd bg / #4a4636 text; radius 18–20, padding 6-7px 12-14px.
- Cards: #fff, radius 16, shadow `0 1px 4px rgba(44,51,32,.08)`; row dividers `1px solid #f0eee4`; hover rows tint #faf8f2.
- Primary buttons: #5a6b3b, hover #4c5b31, radius 12–16, weight 700.
- Save confirmations are inline green text (✓ Saved…), not toasts.
- Empty states: every list has one (icon, bold line, helper sentence) — copy is final, reuse verbatim.
- Validation is presence-only (no error states shown; save is a no-op if required fields empty). Production should add inline errors.
- .ics generation: `BEGIN:VCALENDAR/VERSION:2.0/PRODID:-//Small Farm USA//EN` + all-day `DTSTART;VALUE=DATE`, UID `{taskId}@smallfarmusa` — see `invite:` in the code.

## Business Logic (port exactly — see `suggestionFor()` and `renderVals()`)
- **Husbandry suggestions**: cattle heifer/steer 6–8.5 mo → "In the weaning window" (450–600 lb guidance); steer ≥18 mo → "Near typical finish age" (1,100–1,400 lb @ 18–22 mo); pig ≥5.5 mo or last weight ≥250 lb → "Near market weight" (250–290 lb); chicken 1.8–6 mo → "Check processing age" (Cornish Cross 8–10 wk). Suggestions never fire for pets or sold/butchered animals, feed both the animal badge ("Action") and Home attention list, and reference the last logged weight when available.
- **Business attribution**: species → business (cattle→Cattle, pig→Hogs, chicken→Poultry, everything else→General). A sale auto-creates income under the animal's business.
- **Age display**: <3 mo → weeks; <24 mo → months (1 decimal); else years (1 decimal).
- **Audit trail** = union of transactions + all animal events + chores, filtered by date range and business.

## State Management (production data model)
Entities: **Animal** (id, cls: livestock|pet, species, tag, name, sex, born, color, dam, count, status: active|sold|butchered, events[]), **AnimalEvent** (date, type: born|tag|weight|vax|note|sold|butchered, title, lb?, actor), **Transaction** (kind: income|expense, desc, amount, date, scheduleFLine, business, receiptDocId?), **Task** (title, date, type, assignee, creator, done, gcalEventId?), **Equipment** (name, hours, unit, lastService), **Chore** (icon, title, date, actor), **Doc** (name, folder, oneDriveId, uploadedBy), **Feedback** (who, date, text, status), **User** (name, email, role). All mutations append audit entries with actor + timestamp.

## Design Tokens
Colors — background app: #e5e2d8; surface: #faf8f2; card: #fff; ink: #2c3320; muted: #8a8672; faint: #b3af9d; divider: #f0eee4; chip bg: #eceadd; **primary: #5a6b3b** (hover #4c5b31, deep #3e4a29); primary tint: #f0f3e6 / #e3ecd7; dark card: #2c3320; success: #4a7a2e; danger/down: #a3401e, #b5502a; up: #5a8a3b; alert tint: #f5e3d7 / #a35422; butcher brown: #7a4a2e; sold purple: #e8e4f0 / #5b4a8a; pet blue family: #f3f6fa bg, #dde6f0 border, #22436b ink, #5b789c muted, #2a63a8 accent, #e2eaf4 chip.

Typography — Display: **Archivo** 700/800 (headings 21px, section labels 13px uppercase +0.8px tracking, stat numbers 15–19px). Body: **Public Sans** 400–700 (rows 13–13.5px, sub 11–12px, chips 12px 600). Both on Google Fonts.

Shape & space — screen padding 22px (44px top); card radius 16–18; input radius 10–12, border #ddd9c8, bg #faf8f2 or #fff, focus outline #5a6b3b; list row padding 12-14px 16px; gaps 8–12px. Minimum hit target 44px on primary actions.

## Assets
No image assets. Icons are emoji throughout (intentional — friendly, zero icon-font weight); keep emoji or swap to a single icon set consistently. Fonts via Google Fonts (Archivo, Public Sans).

## Files
- `Small Farm USA App.dc.html` — the full prototype: template markup (top) + logic class (bottom `<script>`). Every behavior above is implemented here.
- `support.js` — prototype runtime only; ignore for implementation.

## Suggested Implementation Notes (non-binding)
- A PWA (installable, camera access for receipts) or React Native/Expo both fit; offline-first with sync matters — barns have bad signal. Consider a local-first store (e.g. SQLite/IndexedDB) syncing to the backend.
- Microsoft Graph for OneDrive, Google Calendar API for sync, magic-link email auth keeps onboarding easy for a family.
- Keep the demo "role switch" behind a dev flag; production roles come from the user record.
