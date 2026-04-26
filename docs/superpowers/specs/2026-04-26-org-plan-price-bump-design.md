# Org Plan Price Bump: $2 → $4.99

**Date:** 2026-04-26
**Type:** Config change (frontend + backend)
**Scope:** Single subscription plan (`org_creator`), monthly recurring

## Goal

Raise the displayed and authoritative price of the `org_creator` subscription plan from `$2/month` to `$4.99/month` across the codebase, and align with the matching update in the Creem dashboard.

## Why

Business decision to lift the org plan tier. Existing pricing was a placeholder.

## Out of scope

- **Creem product configuration.** The actual charged price lives in the Creem dashboard, not in code. The user will update the price of the existing product (option a — keep the same product ID, change its price to $4.99). No env-var changes required.
- **Migration of existing $2 subscriptions.** Active subscribers continue at their current rate per Creem's billing rules. No proration logic is added.
- **Currency changes / multi-currency support.** Stays USD-only.
- **UI redesign of pricing/paywall pages.** Only string content changes.

## Where the price lives

A search across `BackendTemplate/src` and `Slotix-fronted` for `"$2"`, `"price": 200`, and the `org_creator` key surfaced exactly 7 occurrences — all listed below. Unrelated `1200` UAH amounts in `seed.js` and `mock.ts` are sample event-type prices, not plan prices.

### Backend (1 line)

| File                                                       | Line | Old          | New          |
| ---------------------------------------------------------- | ---- | ------------ | ------------ |
| `BackendTemplate/src/modules/billing/constants/billing.js` | 46   | `price: 200` | `price: 499` |

`PLAN_CATALOG.org_creator.price` is denominated in **cents**. `200 → 499` means $2.00 → $4.99. This value is exposed via `GET /billing/catalog` and consumed by the frontend pricing/paywall surfaces that prefer it over the i18n string.

### Frontend i18n (6 strings)

Both locales mirror each other. All strings live under the existing pricing/paywall namespaces.

| File                    | Line | Old                      | New                         |
| ----------------------- | ---- | ------------------------ | --------------------------- |
| `i18n/messages/en.json` | 91   | `"$2"`                   | `"$4.99"`                   |
| `i18n/messages/en.json` | 195  | `"$2/month"`             | `"$4.99/month"`             |
| `i18n/messages/en.json` | 197  | `"Subscribe — $2/mo"`    | `"Subscribe — $4.99/mo"`    |
| `i18n/messages/uk.json` | 91   | `"$2"`                   | `"$4.99"`                   |
| `i18n/messages/uk.json` | 195  | `"$2/місяць"`            | `"$4.99/місяць"`            |
| `i18n/messages/uk.json` | 197  | `"Підписатися — $2/міс"` | `"Підписатися — $4.99/міс"` |

## Coupling between backend price and frontend strings

Frontend treats the i18n strings as marketing copy and the backend `PLAN_CATALOG.price` as the authoritative checkout figure. A divergence (e.g. UI says $4.99, backend still 200, Creem still $2) would mislead users. Therefore all three (Creem dashboard, backend constant, frontend strings) must move together. The plan applies all 7 code edits in a single commit so the frontend and backend never disagree in version control. The Creem dashboard update is performed by the user manually and is the one out-of-band step.

## Verification

After the changes:

1. Backend: `GET /billing/catalog` returns `org_creator.price: 499`.
2. Frontend: pricing card and paywall display `$4.99` / `$4.99/month` / `Subscribe — $4.99/mo` (and Ukrainian equivalents).
3. End-to-end (manual): start a checkout from the paywall — Creem hosted page should show $4.99. If it still shows $2, the dashboard update was missed.

## Risk and rollback

- Risk: Creem dashboard not updated → user sees $4.99 in UI but is charged $2. Mitigation: explicit verification step #3 above.
- Rollback: revert the single commit; revert price in Creem dashboard.
