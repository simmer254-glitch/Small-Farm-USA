# Small Farm USA

A family farm-management app for the Simmons family (Colorado): livestock and pet records, per-business finances mapped to IRS Schedule F, receipts/document storage, a shared task calendar, local auction market prices, equipment logs, an append-only audit trail, and role-based access (Admin / Member / Kid mode).

Built with Expo (React Native + TypeScript) — targets iOS, Android, and web from one codebase.

## Status

**Phase 1 in progress**: full app UI/business logic running on local device data (Zustand + AsyncStorage), no backend yet. See `_design_src/design_handoff_small_farm_usa/` for the original design handoff (prototype HTML + README) this build is based on, and `docs/PLAN.md` (once added) for the phased build plan (local data → Supabase shared backend/accounts → OneDrive documents → Google Calendar sync).

## Get started

```bash
npm install
npx expo start
```

Then press `w` for web, or scan the QR code with Expo Go on a phone.

## Project layout

```
src/app/        # Expo Router screens (file-based routing)
src/theme/      # design tokens + typography
src/components/ # shared UI primitives
src/domain/     # entity types + pure business logic (ages, suggestions, Schedule F, .ics)
src/store/      # Zustand store + seed data + mutators
```
