# Personal Billing Page

**Date:** 2026-04-26
**Type:** New feature (frontend only)
**Scope:** Logged-in user's personal billing surface — subscription overview, cancellation, payment history

## Goal

Give every authenticated user a single page where they can see their current subscription state, cancel it (with grace period until period end), and review their payment history. The page lives in the personal section of the app because subscriptions are owned by the user, not by individual organizations.

## Why

The backend (`POST /api/billing/cancel`, `GET /api/billing/subscription`, `GET /api/billing/payments`, `GET /api/billing/catalog`) is fully implemented but has zero consumers in the UI. Users currently cannot cancel a subscription from inside the app or see what they have been charged. The previous behaviour ("user must contact support" / "user must dig in Creem dashboard") is unacceptable for a self-service product.

## Out of scope

- **Resume / un-cancel.** No backend endpoint exists for reverting a `scheduled_cancel`. If a user changes their mind they must go through a fresh checkout. The page does not advertise a Resume button.
- **Receipt / invoice download.** Backend does not currently expose receipt PDFs. Adding "download receipt" is YAGNI; we wait for a real ask.
- **Plan comparison on this page.** Free → Business upgrade is a single CTA that reuses the existing checkout/paywall flow. We do not duplicate the plan-comparison cards from `landing/pricing` here.
- **Per-organization billing.** Subscriptions are user-scoped (`org_creator` plan grants the right to create up to N orgs). No org-level subscription concept exists. The page is in the personal sidebar only.
- **Confirmation dialog before cancel was originally optional.** Decision: include it. Cancel is irreversible from inside the app (no Resume API), so a destructive-confirmation dialog is mandatory.
- **Refund / dispute UI.** Refunds and disputes flow into the `Payment` collection via webhooks but are not surfaced as actionable items.
- **Pagination / infinite scroll on payment history.** Realistic users have ≤ 24 monthly payments per year. A flat table is sufficient until proven otherwise.

## Architecture

### Files

| File                                              | Type             | Responsibility                                                                                               |
| ------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------ |
| `app/[locale]/(personal)/billing/page.tsx`        | Server Component | Auth guard (redirect `/login` if no user), render `<BillingPage />`                                          |
| `components/billing/BillingPage.tsx`              | Client           | Orchestrates data load (subscription + payments + catalog), passes data to children, handles cancel callback |
| `components/billing/PlanCard.tsx`                 | Client           | Renders plan name, status badge, price, period, CTA button                                                   |
| `components/billing/CancelSubscriptionDialog.tsx` | Client           | Confirmation modal with `cancelAt` warning, calls `billingApi.cancel()`, returns success/failure to parent   |
| `components/billing/PaymentsTable.tsx`            | Client           | Renders shadcn Table with payment rows, skeleton loading, empty state                                        |
| `components/billing/ScheduledCancelBanner.tsx`    | Client           | Top-of-page Alert when `status === 'scheduled_cancel'`                                                       |
| `components/sidebar/PersonalSidebar.tsx`          | Client (modify)  | Add "Billing" entry to existing `groupAccount` group                                                         |
| `i18n/messages/en.json`, `i18n/messages/uk.json`  | Data (modify)    | New `billing.page.*` namespace plus sidebar entry                                                            |

### Data flow

`BillingPage` mounts → effect dispatches `Promise.all([billingApi.subscription(), billingApi.payments(), billingApi.catalog()])`. Loading state is rendered first (skeletons in PlanCard and PaymentsTable). On resolve, state holds `{ subscription, payments, catalog, loading: false }`. On error, the existing toast interceptor surfaces a message; page shows a single inline error stub instead of skeletons.

`subscription` may be `null` for users on the free plan. `PlanCard` handles that: shows "Free" preset, CTA "Upgrade to Business" → routes to existing checkout entry (`/billing/checkout?plan=org_creator` or whatever the existing paywall uses; the page reuses, does not reimplement).

When user clicks Cancel:

1. `CancelSubscriptionDialog` opens, shows the date until access remains (`cancelAt ?? currentPeriodEnd`).
2. On confirm: call `billingApi.cancel()`. While in flight, dialog button is disabled with spinner.
3. On success: dialog closes, parent calls a `reload()` callback that re-fetches `subscription` and `payments`. The new state has `status === 'scheduled_cancel'`, so the page now renders the banner and the PlanCard CTA changes to disabled hint.
4. On failure: ApiError → toast (interceptor). Dialog stays open with error state so the user can retry.

### State management

Local `useState` inside `BillingPage`. No context, no global store. The page does not share state with anything else; introducing context would be over-engineering.

### Key derived helpers (extracted, named functions per code rules)

- `getPlanLabel(planKey, t)` — maps `free` / `org_creator` to translated names.
- `getStatusBadgeVariant(status)` — config object mapping the 6 subscription statuses to shadcn Badge variants (`active → default`, `scheduled_cancel → warning`, `canceled → secondary`, `expired → secondary`, `past_due → destructive`, `paused → outline`).
- `formatPeriod(start, end, locale)` — single string `"DD.MM.YYYY — DD.MM.YYYY"` via `Intl.DateTimeFormat`. Dates in DB are UTC ISO; here they represent calendar dates so naive formatting is acceptable per the project timezone contract (this is display, not booking time).
- `canCancel(subscription)` — `subscription !== null && subscription.status === 'active'`.
- `getEffectiveCancelDate(subscription)` — returns `subscription.cancelAt ?? subscription.currentPeriodEnd`.

These live as module-level constants/functions inside `BillingPage.tsx` since they are only used there. If reuse appears later, they move to `lib/billing/`.

## UI specification

### Page header

`<h1>` with text from `t('billing.page.title')` ("Підписка та платежі" / "Billing"). Subtitle paragraph (`text-muted-foreground`) from `t('billing.page.subtitle')`.

### Banner (conditional)

Renders only when `subscription?.status === 'scheduled_cancel'`. Uses shadcn `Alert` with `variant="warning"` (or `default` with custom warning palette if we don't have a warning variant). Icon: `AlertTriangle`. Title: "Підписка скасована". Description: "Доступ збережеться до {date}. Після цієї дати організації, які ви створили, буде деактивовано." with `{date}` formatted via `formatPeriod` from `getEffectiveCancelDate`.

### PlanCard

shadcn `Card` with the existing visual language (rounded-xl, border, shadow-sm). Layout:

- **CardHeader:** plan name as `h2` (`text-2xl font-semibold`). Below it: `<Badge>` showing status (text + color via `getStatusBadgeVariant`).
- **CardContent:** two-column grid on `md+`, single column on mobile.
  - Left column: price `text-3xl font-bold` (`$4.99` for org_creator, `$0` for free) + `/month` muted suffix; below it the period text "Поточний період: DD.MM — DD.MM" (only if subscription exists).
  - Right column: short feature list (3 bullets max) for the active plan. For free: "Створення особистого розкладу, без можливості створювати організації"; for org_creator: "До 3 організацій, повне керування персоналом, публічні сторінки бронювання".
- **CardFooter:**
  - `subscription === null` (free user) → `<Button>Upgrade to Business</Button>` linking to existing checkout flow.
  - `subscription.status === 'active'` → `<Button variant="outline" className="text-destructive hover:text-destructive">Cancel subscription</Button>`. Visually de-emphasized — destructive action should not be the primary CTA on the page.
  - `subscription.status === 'scheduled_cancel'` → no button, instead `<p class="text-muted-foreground text-sm">Cancellation scheduled for {date}</p>`.
  - `subscription.status` in `['canceled', 'expired']` → `<Button>Subscribe again</Button>` linking to the same checkout flow as the free upgrade.
  - `subscription.status === 'past_due'` → muted hint "Платіж не пройшов, оновіть платіжні дані в Creem" (no inline action — Creem handles retry; we do not have an "update card" UI).
  - `subscription.status === 'paused'` → muted hint "Підписку призупинено" (no action — we don't issue pause; if it appears, Creem did it).

### PaymentsTable

`<h2>` "Історія платежів" / "Payment history" + `<p.muted>` count or empty descriptor.

shadcn `Table` with columns:

1. **Дата** — `formatDate(payment.createdAt, locale)`.
2. **Сума** — `{(payment.amount / 100).toFixed(2)} {payment.currency}` (amounts are stored in cents per project convention; this is the only place we render them).
3. **Тип** — `<Badge>` "Підписка" / "Разовий" based on `payment.type`.
4. **Подія** — small text from `payment.eventType` mapped through `t('billing.events.<eventType>')` (e.g. `checkout.completed → "Перший платіж"`, `subscription.paid → "Продовження"`, `refund.created → "Повернення"`, `dispute.created → "Спір"`).

Empty state when `payments.length === 0`: shadcn `<Empty>` (already used in SlotListView) with `Receipt` icon, title "Платежів ще немає", description "Ваші майбутні платежі з'являться тут".

Loading state: 3 skeleton rows mimicking the table structure.

Mobile: table wraps in `<div class="overflow-x-auto">`. Row heights stay consistent. We accept horizontal scroll on small phones; the data is reference-only and doesn't justify a separate card layout right now.

### Sidebar entry

In `components/sidebar/PersonalSidebar.tsx`, inside the existing `groupAccount` group (after `myProfile`, before `myOrganizations`), add a new `SidebarMenuItem` with icon `CreditCard` (lucide), label `t('sidebar.billing')`, href `/${locale}/billing`. `isActive` matches `/billing` exactly.

### Empty state for free users

When `subscription === null` and `payments.length === 0`, the page still has structure: PlanCard shows free preset with Upgrade CTA, PaymentsTable shows the Receipt empty-state. This is intentional — the user lands on a page that explains what billing is and how to upgrade.

### i18n keys to add

Under `billing.page` (both locales):

- `title` — "Підписка та платежі" / "Billing"
- `subtitle` — "Керуйте підпискою та переглядайте історію платежів" / "Manage your subscription and review payments"
- `currentPeriod` — "Поточний період" / "Current period"
- `cancelAction` — "Скасувати підписку" / "Cancel subscription"
- `cancelScheduled` — "Скасування заплановано на {date}" / "Cancellation scheduled for {date}"
- `cancelDialogTitle` — "Скасувати підписку?" / "Cancel subscription?"
- `cancelDialogDescription` — "Доступ збережеться до {date}. Після цієї дати організації, які ви створили, буде деактивовано." / "Access remains until {date}. After that date, organizations you created will be deactivated."
- `cancelDialogConfirm` — "Скасувати" / "Cancel subscription"
- `cancelDialogDismiss` — "Передумав" / "Keep subscription"
- `cancelSuccessToast` — "Підписку скасовано. Доступ до {date}." / "Subscription cancelled. Access until {date}."
- `paymentsHistoryTitle` — "Історія платежів" / "Payment history"
- `paymentsEmpty` — "Платежів ще немає" / "No payments yet"
- `paymentsEmptyHint` — "Ваші майбутні платежі з'являться тут" / "Your future payments will appear here"
- `upgrade` — "Перейти на Business" / "Upgrade to Business"
- `subscribeAgain` — "Підписатися знову" / "Subscribe again"
- `bannerScheduledTitle` — "Підписку скасовано" / "Subscription cancelled"
- `bannerScheduledDescription` — "Доступ збережеться до {date}. Після цієї дати організації буде деактивовано." / "Access remains until {date}. After that, your organizations will be deactivated."

Under `billing.events`:

- `checkout.completed` — "Перший платіж" / "Initial payment"
- `subscription.paid` — "Продовження" / "Renewal"
- `refund.created` — "Повернення" / "Refund"
- `dispute.created` — "Спір" / "Dispute"

Under `billing.status` (used by status badge text):

- `active` — "Активна" / "Active"
- `scheduled_cancel` — "Скасовано" / "Cancelled"
- `canceled` — "Завершена" / "Ended"
- `expired` — "Прострочена" / "Expired"
- `past_due` — "Прострочений платіж" / "Past due"
- `paused` — "Призупинено" / "Paused"

Under `sidebar`:

- `billing` — "Підписка та платежі" / "Billing"

## Error handling

The existing toast interceptor (`createToastInterceptor`) covers all unhandled API errors. The page does not add custom error UI for transient failures. For initial-load failure (network) we render a small inline state in the page body: "Не вдалося завантажити дані. Спробуйте оновити сторінку." with a `Retry` button that re-runs the load effect.

## Routing and auth

- Path: `/[locale]/billing` (e.g., `/en/billing`, `/uk/billing`).
- Auth: server-side `getUser()` in `page.tsx`; redirect to `/login` if `null`. Same pattern as `(personal)/profile/page.tsx`.
- Next.js group: `(personal)` — uses `PersonalLayout` which already wraps in `UserProvider`, sidebar, header, footer.
- Locale: standard next-intl handling, no special config.

## Edge cases

- **`subscription` returns 404 / null** — treat as "free user", no error.
- **`payments` returns empty** — render Empty state.
- **`catalog` request fails but `subscription` succeeds** — fall back to displaying the subscription's `productId` instead of plan label; log a console warning. Catalog is for cosmetic price/period info, not load-bearing.
- **User has subscription on plan that no longer exists in catalog** — show generic "Custom plan" label with raw `productId` as a tooltip, do not crash.
- **Subscription with no `currentPeriodStart`/`currentPeriodEnd` (legacy or scheduled_cancel partial state)** — hide the "Current period" line; keep the rest.
- **Status `'past_due'`** — page still works, banner does not appear (only for scheduled_cancel), CTA shows muted hint instead of Cancel button.
- **Race condition between Cancel click and Cancel API completion** — disable the button while in flight; ignore double-clicks via existing form-state pattern.

## Testing strategy

Manual end-to-end is sufficient for this iteration. The risky paths:

1. Free user lands on page → sees PlanCard "Free", Upgrade button works.
2. Active subscriber lands → sees PlanCard "Business", status "Active", payments table.
3. Active subscriber clicks Cancel → dialog → confirm → page reloads → banner appears → status badge "Cancelled".
4. Scheduled-cancel user lands → banner visible, no Cancel button, hint instead.
5. Network failure during load → inline retry stub.
6. i18n: switch locale → all strings render correctly in both EN and UK.

No new automated tests are added in this iteration. The page is presentation logic over existing API; the API has its own backend tests.

## Risk and rollback

- **Risk: Cancel API call succeeds but page reload races and shows stale data.** Mitigated by always re-fetching `subscription` after a successful cancel before closing the dialog.
- **Risk: User on free plan navigates here and is confused.** Mitigated by Upgrade CTA + Empty state for payments.
- **Risk: i18n keys missing in one locale.** Mitigated by adding all keys to both locales in the same commit.
- **Rollback:** revert the feature commit; the sidebar entry disappears, page returns 404, all backend endpoints remain operational and unused.

## Visual style

Follow the existing booking design refresh:

- `bg-card`, `rounded-xl`, `border`, `shadow-sm`, `hover:shadow-md` for cards.
- Status badges via shadcn Badge variants (custom warning variant if needed).
- Spacing: `space-y-6` between sections, `gap-4` inside cards.
- No custom colors hardcoded — all through CSS variables (`--primary`, `--destructive`, `--muted-foreground`, etc.).
- Typography: `h1` page title, `h2` section headers, `text-muted-foreground` for hints.
