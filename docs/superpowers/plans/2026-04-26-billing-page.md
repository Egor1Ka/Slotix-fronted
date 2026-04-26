# Personal Billing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `/[locale]/billing` page in the personal section where logged-in users see their subscription, cancel it (with confirmation + grace period), and review payment history.

**Architecture:** Server-component page guards auth and renders a client `BillingPage` component. The client component loads `subscription`, `payments`, `catalog` in parallel via existing `billingApi`, renders three sections (banner, plan card, payments table). Cancel triggers a confirmation dialog → `billingApi.cancel()` → reload. State is local; no context/store. Each UI piece is its own file.

**Tech Stack:** Next.js 16 App Router, React 19, next-intl, shadcn/ui (Card, Badge, Alert, Dialog, Table, Skeleton, Empty, Button), lucide-react icons, sonner toasts, ESLint, Prettier.

**Spec:** [docs/superpowers/specs/2026-04-26-billing-page-design.md](../specs/2026-04-26-billing-page-design.md)

**Repo:** /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted

---

## File map

| File                                              | Type             | Status                                                                                   |
| ------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------- |
| `i18n/messages/en.json`, `i18n/messages/uk.json`  | data             | Modify (add `billing.page.*`, `billing.events.*`, `billing.status.*`, `sidebar.billing`) |
| `lib/billing/format.ts`                           | module           | Create — pure helpers                                                                    |
| `components/billing/PaymentsTable.tsx`            | client component | Create                                                                                   |
| `components/billing/PlanCard.tsx`                 | client component | Create                                                                                   |
| `components/billing/ScheduledCancelBanner.tsx`    | client component | Create                                                                                   |
| `components/billing/CancelSubscriptionDialog.tsx` | client component | Create                                                                                   |
| `components/billing/BillingPage.tsx`              | client component | Create — orchestrator                                                                    |
| `app/[locale]/(personal)/billing/page.tsx`        | server component | Create — auth + render                                                                   |
| `components/sidebar/PersonalSidebar.tsx`          | client component | Modify — add Billing entry                                                               |

---

### Task 1: i18n strings — add all billing-page keys to both locales

**Files:**

- Modify: `i18n/messages/en.json`
- Modify: `i18n/messages/uk.json`

We add every string upfront so subsequent component tasks can use them without churn.

- [ ] **Step 1: Add `sidebar.billing` to en.json**

In `i18n/messages/en.json`, inside the `sidebar` namespace, add after the existing entries (find the closing brace of `sidebar` and insert before it):

```json
		"billing": "Billing"
```

Make sure to add a comma after the previous last entry to keep JSON valid.

- [ ] **Step 2: Add `sidebar.billing` to uk.json**

```json
		"billing": "Підписка та платежі"
```

- [ ] **Step 3: Add `billing.page.*` namespace to en.json**

In `i18n/messages/en.json`, inside the existing `billing` namespace (find `"billing": {`), add a new sub-namespace at the same level as `plans`, `products`, `period`, `orgCreator`:

```json
		"page": {
			"title": "Billing",
			"subtitle": "Manage your subscription and review payments",
			"currentPeriod": "Current period",
			"cancelAction": "Cancel subscription",
			"cancelScheduled": "Cancellation scheduled for {date}",
			"cancelDialogTitle": "Cancel subscription?",
			"cancelDialogDescription": "Access remains until {date}. After that date, organizations you created will be deactivated.",
			"cancelDialogConfirm": "Cancel subscription",
			"cancelDialogDismiss": "Keep subscription",
			"cancelSuccessToast": "Subscription cancelled. Access until {date}.",
			"paymentsHistoryTitle": "Payment history",
			"paymentsEmpty": "No payments yet",
			"paymentsEmptyHint": "Your future payments will appear here",
			"upgrade": "Upgrade to Business",
			"subscribeAgain": "Subscribe again",
			"bannerScheduledTitle": "Subscription cancelled",
			"bannerScheduledDescription": "Access remains until {date}. After that, your organizations will be deactivated.",
			"loadError": "Could not load billing data. Try refreshing the page.",
			"retry": "Retry",
			"colDate": "Date",
			"colAmount": "Amount",
			"colType": "Type",
			"colEvent": "Event",
			"typeSubscription": "Subscription",
			"typeOneTime": "One-time",
			"pastDueHint": "Payment failed. Update payment details in Creem dashboard.",
			"pausedHint": "Subscription paused.",
			"customPlanLabel": "Custom plan",
			"freeFeatures": "Personal booking page, no organization creation",
			"businessFeatures": "Up to 3 organizations, full staff management, public booking pages"
		}
```

- [ ] **Step 4: Add `billing.page.*` namespace to uk.json (mirror)**

```json
		"page": {
			"title": "Підписка та платежі",
			"subtitle": "Керуйте підпискою та переглядайте історію платежів",
			"currentPeriod": "Поточний період",
			"cancelAction": "Скасувати підписку",
			"cancelScheduled": "Скасування заплановано на {date}",
			"cancelDialogTitle": "Скасувати підписку?",
			"cancelDialogDescription": "Доступ збережеться до {date}. Після цієї дати організації, які ви створили, буде деактивовано.",
			"cancelDialogConfirm": "Скасувати",
			"cancelDialogDismiss": "Передумав",
			"cancelSuccessToast": "Підписку скасовано. Доступ до {date}.",
			"paymentsHistoryTitle": "Історія платежів",
			"paymentsEmpty": "Платежів ще немає",
			"paymentsEmptyHint": "Ваші майбутні платежі з'являться тут",
			"upgrade": "Перейти на Business",
			"subscribeAgain": "Підписатися знову",
			"bannerScheduledTitle": "Підписку скасовано",
			"bannerScheduledDescription": "Доступ збережеться до {date}. Після цієї дати організації буде деактивовано.",
			"loadError": "Не вдалося завантажити дані. Спробуйте оновити сторінку.",
			"retry": "Спробувати знову",
			"colDate": "Дата",
			"colAmount": "Сума",
			"colType": "Тип",
			"colEvent": "Подія",
			"typeSubscription": "Підписка",
			"typeOneTime": "Разовий",
			"pastDueHint": "Платіж не пройшов. Оновіть платіжні дані в Creem dashboard.",
			"pausedHint": "Підписку призупинено.",
			"customPlanLabel": "Спеціальний план",
			"freeFeatures": "Особиста сторінка бронювання, без створення організацій",
			"businessFeatures": "До 3 організацій, повне керування персоналом, публічні сторінки бронювання"
		}
```

- [ ] **Step 5: Add `billing.events.*` and `billing.status.*` namespaces to en.json**

Inside `billing` namespace, alongside `page`:

```json
		"events": {
			"checkoutCompleted": "Initial payment",
			"subscriptionPaid": "Renewal",
			"refundCreated": "Refund",
			"disputeCreated": "Dispute",
			"unknown": "Other"
		},
		"status": {
			"active": "Active",
			"scheduledCancel": "Cancelled",
			"canceled": "Ended",
			"expired": "Expired",
			"pastDue": "Past due",
			"paused": "Paused"
		}
```

Note: keys use camelCase (e.g. `checkoutCompleted`, `scheduledCancel`) because next-intl expects identifiers compatible with JS object lookup. The component will map raw event types like `checkout.completed` → `checkoutCompleted` via a small dictionary.

- [ ] **Step 6: Add `billing.events.*` and `billing.status.*` to uk.json (mirror)**

```json
		"events": {
			"checkoutCompleted": "Перший платіж",
			"subscriptionPaid": "Продовження",
			"refundCreated": "Повернення",
			"disputeCreated": "Спір",
			"unknown": "Інше"
		},
		"status": {
			"active": "Активна",
			"scheduledCancel": "Скасована",
			"canceled": "Завершена",
			"expired": "Прострочена",
			"pastDue": "Прострочений платіж",
			"paused": "Призупинена"
		}
```

- [ ] **Step 7: Validate JSON parses**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
node -e "JSON.parse(require('fs').readFileSync('i18n/messages/en.json','utf8')); console.log('en ok')"
node -e "JSON.parse(require('fs').readFileSync('i18n/messages/uk.json','utf8')); console.log('uk ok')"
```

Expected: `en ok` and `uk ok`. If `SyntaxError`, fix trailing commas / missing commas.

- [ ] **Step 8: Commit**

```bash
git add i18n/messages/en.json i18n/messages/uk.json
git commit -m "$(cat <<'EOF'
chore(i18n): add billing.page strings (en/uk)

Adds keys for upcoming /billing page: page.* (title, banners, dialog,
table copy, hints), events.* (event-type labels), status.* (subscription
status badges), and sidebar.billing.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Pure formatting helpers

**Files:**

- Create: `lib/billing/format.ts`
- Create: `lib/billing/format.test.ts`

These are pure functions reused by PlanCard, PaymentsTable, banner, dialog. Test them with vitest because they have branching logic and date math.

- [ ] **Step 1: Write the failing test**

Create `lib/billing/format.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
	formatAmount,
	formatPeriod,
	formatDate,
	getEffectiveCancelDate,
	getEventLabelKey,
	canCancelSubscription,
} from './format'

describe('formatAmount', () => {
	it('renders cents as USD with two decimals', () => {
		expect(formatAmount(499, 'USD')).toBe('$4.99')
	})

	it('renders zero amount', () => {
		expect(formatAmount(0, 'USD')).toBe('$0.00')
	})

	it('uses currency code prefix when not USD', () => {
		expect(formatAmount(1200, 'UAH')).toBe('UAH 12.00')
	})
})

describe('formatPeriod', () => {
	it('formats start–end as DD.MM.YYYY — DD.MM.YYYY', () => {
		const start = '2026-04-01T00:00:00Z'
		const end = '2026-05-01T00:00:00Z'
		const result = formatPeriod(start, end, 'en-CA')
		expect(result).toMatch(/2026-04-01.+2026-05-01/)
	})

	it('returns null when either date missing', () => {
		expect(formatPeriod(null, '2026-05-01T00:00:00Z', 'en-CA')).toBeNull()
		expect(formatPeriod('2026-04-01T00:00:00Z', null, 'en-CA')).toBeNull()
	})
})

describe('formatDate', () => {
	it('formats ISO string in given locale', () => {
		const result = formatDate('2026-04-26T10:00:00Z', 'en-CA')
		expect(result).toMatch(/2026-04-26/)
	})
})

describe('getEffectiveCancelDate', () => {
	it('returns cancelAt when present', () => {
		const sub = {
			cancelAt: '2026-05-01T00:00:00Z',
			currentPeriodEnd: '2026-05-15T00:00:00Z',
		}
		expect(getEffectiveCancelDate(sub)).toBe('2026-05-01T00:00:00Z')
	})

	it('falls back to currentPeriodEnd when cancelAt is null', () => {
		const sub = { cancelAt: null, currentPeriodEnd: '2026-05-15T00:00:00Z' }
		expect(getEffectiveCancelDate(sub)).toBe('2026-05-15T00:00:00Z')
	})

	it('returns null when both are missing', () => {
		const sub = { cancelAt: null, currentPeriodEnd: '' }
		expect(getEffectiveCancelDate(sub)).toBeNull()
	})
})

describe('getEventLabelKey', () => {
	it('maps known events to camelCase keys', () => {
		expect(getEventLabelKey('checkout.completed')).toBe('checkoutCompleted')
		expect(getEventLabelKey('subscription.paid')).toBe('subscriptionPaid')
		expect(getEventLabelKey('refund.created')).toBe('refundCreated')
		expect(getEventLabelKey('dispute.created')).toBe('disputeCreated')
	})

	it('returns "unknown" for anything else', () => {
		expect(getEventLabelKey('subscription.paused')).toBe('unknown')
		expect(getEventLabelKey('')).toBe('unknown')
	})
})

describe('canCancelSubscription', () => {
	it('returns true only for active status', () => {
		expect(canCancelSubscription({ status: 'active' })).toBe(true)
		expect(canCancelSubscription({ status: 'scheduled_cancel' })).toBe(false)
		expect(canCancelSubscription({ status: 'canceled' })).toBe(false)
		expect(canCancelSubscription({ status: 'past_due' })).toBe(false)
		expect(canCancelSubscription({ status: 'paused' })).toBe(false)
		expect(canCancelSubscription({ status: 'expired' })).toBe(false)
	})

	it('returns false when subscription is null', () => {
		expect(canCancelSubscription(null)).toBe(false)
	})
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
npx vitest run lib/billing/format.test.ts
```

Expected: FAIL with module not found error for `./format`.

- [ ] **Step 3: Implement `lib/billing/format.ts`**

```ts
import type { BillingSubscription } from '@/services/configs/billing.config'

const EVENT_LABEL_MAP: Record<string, string> = {
	'checkout.completed': 'checkoutCompleted',
	'subscription.paid': 'subscriptionPaid',
	'refund.created': 'refundCreated',
	'dispute.created': 'disputeCreated',
}

const formatAmount = (amountCents: number, currency: string): string => {
	const value = (amountCents / 100).toFixed(2)
	if (currency === 'USD') return `$${value}`
	return `${currency} ${value}`
}

const formatDate = (iso: string, locale: string): string => {
	const formatter = new Intl.DateTimeFormat(locale, {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	})
	return formatter.format(new Date(iso))
}

const formatPeriod = (
	start: string | null,
	end: string | null,
	locale: string,
): string | null => {
	if (!start || !end) return null
	return `${formatDate(start, locale)} — ${formatDate(end, locale)}`
}

type CancelInput = Pick<BillingSubscription, 'cancelAt' | 'currentPeriodEnd'>

const getEffectiveCancelDate = (sub: CancelInput): string | null => {
	if (sub.cancelAt) return sub.cancelAt
	if (sub.currentPeriodEnd) return sub.currentPeriodEnd
	return null
}

const getEventLabelKey = (eventType: string): string =>
	EVENT_LABEL_MAP[eventType] ?? 'unknown'

const canCancelSubscription = (
	sub: Pick<BillingSubscription, 'status'> | null,
): boolean => {
	if (!sub) return false
	return sub.status === 'active'
}

export {
	formatAmount,
	formatDate,
	formatPeriod,
	getEffectiveCancelDate,
	getEventLabelKey,
	canCancelSubscription,
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run lib/billing/format.test.ts
```

Expected: PASS — all describe blocks green.

- [ ] **Step 5: Commit**

```bash
git add lib/billing/format.ts lib/billing/format.test.ts
git commit -m "$(cat <<'EOF'
feat(billing): add pure formatting helpers for billing page

Adds lib/billing/format.ts with formatAmount, formatDate, formatPeriod,
getEffectiveCancelDate, getEventLabelKey, canCancelSubscription. Each is
a single-purpose function consumed by upcoming PlanCard, PaymentsTable,
banner and dialog components. Covered by vitest unit tests.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: PaymentsTable component

**Files:**

- Create: `components/billing/PaymentsTable.tsx`

Renders the payment history table with skeleton/empty states.

- [ ] **Step 1: Implement `PaymentsTable.tsx`**

```tsx
'use client'

import { useTranslations, useLocale } from 'next-intl'
import { Receipt } from 'lucide-react'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '@/components/ui/empty'
import {
	formatAmount,
	formatDate,
	getEventLabelKey,
} from '@/lib/billing/format'
import type { BillingPayment } from '@/services/configs/billing.config'

interface PaymentsTableProps {
	payments: BillingPayment[]
	loading: boolean
}

const SKELETON_ROWS = [1, 2, 3]

const renderSkeletonRow = (i: number) => (
	<TableRow key={i}>
		<TableCell>
			<Skeleton className="h-4 w-24" />
		</TableCell>
		<TableCell>
			<Skeleton className="h-4 w-16" />
		</TableCell>
		<TableCell>
			<Skeleton className="h-5 w-20 rounded-full" />
		</TableCell>
		<TableCell>
			<Skeleton className="h-4 w-32" />
		</TableCell>
	</TableRow>
)

function PaymentsTable({ payments, loading }: PaymentsTableProps) {
	const t = useTranslations('billing.page')
	const tEvents = useTranslations('billing.events')
	const locale = useLocale()

	const renderRow = (payment: BillingPayment) => {
		const typeLabel =
			payment.type === 'subscription' ? t('typeSubscription') : t('typeOneTime')
		const eventLabel = tEvents(getEventLabelKey(payment.eventType))

		return (
			<TableRow key={payment.id}>
				<TableCell className="font-medium">
					{formatDate(payment.createdAt, locale)}
				</TableCell>
				<TableCell>{formatAmount(payment.amount, payment.currency)}</TableCell>
				<TableCell>
					<Badge variant="secondary">{typeLabel}</Badge>
				</TableCell>
				<TableCell className="text-muted-foreground">{eventLabel}</TableCell>
			</TableRow>
		)
	}

	if (!loading && payments.length === 0) {
		return (
			<Empty className="bg-card border-border min-h-[200px] border shadow-sm">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<Receipt />
					</EmptyMedia>
					<EmptyTitle>{t('paymentsEmpty')}</EmptyTitle>
					<EmptyDescription>{t('paymentsEmptyHint')}</EmptyDescription>
				</EmptyHeader>
			</Empty>
		)
	}

	return (
		<div className="bg-card overflow-x-auto rounded-xl border shadow-sm">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>{t('colDate')}</TableHead>
						<TableHead>{t('colAmount')}</TableHead>
						<TableHead>{t('colType')}</TableHead>
						<TableHead>{t('colEvent')}</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{loading
						? SKELETON_ROWS.map(renderSkeletonRow)
						: payments.map(renderRow)}
				</TableBody>
			</Table>
		</div>
	)
}

export { PaymentsTable }
```

- [ ] **Step 2: Lint**

```bash
npx eslint components/billing/PaymentsTable.tsx
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/billing/PaymentsTable.tsx
git commit -m "$(cat <<'EOF'
feat(billing): PaymentsTable component

Renders payment history as shadcn Table with date / amount / type
badge / event label. Handles skeleton loading (3 rows) and empty
state (Empty component with Receipt icon).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: ScheduledCancelBanner component

**Files:**

- Create: `components/billing/ScheduledCancelBanner.tsx`

- [ ] **Step 1: Implement**

```tsx
'use client'

import { useLocale, useTranslations } from 'next-intl'
import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { formatDate } from '@/lib/billing/format'

interface ScheduledCancelBannerProps {
	cancelDate: string
}

function ScheduledCancelBanner({ cancelDate }: ScheduledCancelBannerProps) {
	const t = useTranslations('billing.page')
	const locale = useLocale()
	const formatted = formatDate(cancelDate, locale)

	return (
		<Alert className="border-yellow-500/50 bg-yellow-500/5 text-yellow-900 dark:text-yellow-100">
			<AlertTriangle className="size-4" />
			<AlertTitle>{t('bannerScheduledTitle')}</AlertTitle>
			<AlertDescription>
				{t('bannerScheduledDescription', { date: formatted })}
			</AlertDescription>
		</Alert>
	)
}

export { ScheduledCancelBanner }
```

- [ ] **Step 2: Lint**

```bash
npx eslint components/billing/ScheduledCancelBanner.tsx
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/billing/ScheduledCancelBanner.tsx
git commit -m "$(cat <<'EOF'
feat(billing): ScheduledCancelBanner component

Top-of-page Alert with AlertTriangle icon and yellow palette, shown
when subscription.status === 'scheduled_cancel'. Displays the date
until access remains.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: CancelSubscriptionDialog component

**Files:**

- Create: `components/billing/CancelSubscriptionDialog.tsx`

Wraps confirmation modal + Cancel API call. Owns its own loading state.

- [ ] **Step 1: Implement**

```tsx
'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { billingApi } from '@/services'
import { formatDate } from '@/lib/billing/format'

interface CancelSubscriptionDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	cancelDate: string
	onCancelled: () => void
}

function CancelSubscriptionDialog({
	open,
	onOpenChange,
	cancelDate,
	onCancelled,
}: CancelSubscriptionDialogProps) {
	const t = useTranslations('billing.page')
	const locale = useLocale()
	const [submitting, setSubmitting] = useState(false)
	const formatted = formatDate(cancelDate, locale)

	const handleConfirm = async () => {
		setSubmitting(true)
		try {
			await billingApi.cancel()
			toast.success(t('cancelSuccessToast', { date: formatted }))
			onCancelled()
			onOpenChange(false)
		} catch {
			// toast interceptor handles errors
		} finally {
			setSubmitting(false)
		}
	}

	const handleDismiss = () => {
		if (submitting) return
		onOpenChange(false)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t('cancelDialogTitle')}</DialogTitle>
					<DialogDescription>
						{t('cancelDialogDescription', { date: formatted })}
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button
						variant="outline"
						onClick={handleDismiss}
						disabled={submitting}
					>
						{t('cancelDialogDismiss')}
					</Button>
					<Button
						variant="destructive"
						onClick={handleConfirm}
						disabled={submitting}
					>
						{submitting && <Spinner className="size-4" />}
						{t('cancelDialogConfirm')}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}

export { CancelSubscriptionDialog }
```

- [ ] **Step 2: Lint**

```bash
npx eslint components/billing/CancelSubscriptionDialog.tsx
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/billing/CancelSubscriptionDialog.tsx
git commit -m "$(cat <<'EOF'
feat(billing): CancelSubscriptionDialog component

Confirmation modal with date-aware warning, calls billingApi.cancel(),
disables buttons while in flight, toasts success and invokes onCancelled
callback so parent can reload subscription state. Errors handled by
existing toast interceptor.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: PlanCard component

**Files:**

- Create: `components/billing/PlanCard.tsx`

Renders plan name, status, price, period, and a context-sensitive CTA (Cancel / Upgrade / Subscribe again / status hint). Triggers cancel dialog open.

- [ ] **Step 1: Implement**

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
	canCancelSubscription,
	formatAmount,
	formatPeriod,
	getEffectiveCancelDate,
	formatDate,
} from '@/lib/billing/format'
import { CancelSubscriptionDialog } from './CancelSubscriptionDialog'
import type {
	BillingSubscription,
	CatalogPlan,
} from '@/services/configs/billing.config'

interface PlanCardProps {
	subscription: BillingSubscription | null
	catalog: CatalogPlan[]
	upgradeHref: string
	onCancelled: () => void
}

const STATUS_BADGE_VARIANT: Record<
	string,
	'default' | 'secondary' | 'destructive' | 'outline'
> = {
	active: 'default',
	scheduled_cancel: 'outline',
	canceled: 'secondary',
	expired: 'secondary',
	past_due: 'destructive',
	paused: 'outline',
}

const STATUS_LABEL_KEY: Record<string, string> = {
	active: 'active',
	scheduled_cancel: 'scheduledCancel',
	canceled: 'canceled',
	expired: 'expired',
	past_due: 'pastDue',
	paused: 'paused',
}

const PLAN_LABEL_KEY: Record<string, string> = {
	free: 'plans.free.name',
	org_creator: 'plans.org_creator.name',
}

const findCatalogPlan = (
	catalog: CatalogPlan[],
	planKey: string,
): CatalogPlan | null => catalog.find((p) => p.key === planKey) ?? null

function PlanCard({
	subscription,
	catalog,
	upgradeHref,
	onCancelled,
}: PlanCardProps) {
	const t = useTranslations('billing.page')
	const tBilling = useTranslations('billing')
	const tStatus = useTranslations('billing.status')
	const locale = useLocale()
	const [dialogOpen, setDialogOpen] = useState(false)

	const planKey = subscription?.planKey ?? 'free'
	const planLabelKey = PLAN_LABEL_KEY[planKey]
	const planLabel = planLabelKey ? tBilling(planLabelKey) : t('customPlanLabel')

	const catalogEntry = findCatalogPlan(catalog, planKey)
	const priceText = catalogEntry
		? formatAmount(catalogEntry.price, catalogEntry.currency)
		: '—'
	const periodSuffix = catalogEntry
		? `/${tBilling(`period.${catalogEntry.period}`)}`
		: ''

	const periodText = subscription
		? formatPeriod(
				subscription.currentPeriodStart,
				subscription.currentPeriodEnd,
				locale,
			)
		: null

	const featuresText =
		planKey === 'free' ? t('freeFeatures') : t('businessFeatures')

	const status = subscription?.status ?? null
	const statusLabel = status ? tStatus(STATUS_LABEL_KEY[status]) : null
	const statusVariant = status ? STATUS_BADGE_VARIANT[status] : 'default'

	const cancelDate = subscription ? getEffectiveCancelDate(subscription) : null

	const handleCancelClick = () => setDialogOpen(true)

	const renderCta = () => {
		if (!subscription) {
			return (
				<Link href={upgradeHref} className={cn(buttonVariants())}>
					{t('upgrade')}
				</Link>
			)
		}

		if (canCancelSubscription(subscription)) {
			return (
				<Button
					variant="outline"
					className="text-destructive hover:text-destructive"
					onClick={handleCancelClick}
				>
					{t('cancelAction')}
				</Button>
			)
		}

		if (status === 'scheduled_cancel' && cancelDate) {
			return (
				<p className="text-muted-foreground text-sm">
					{t('cancelScheduled', { date: formatDate(cancelDate, locale) })}
				</p>
			)
		}

		if (status === 'canceled' || status === 'expired') {
			return (
				<Link href={upgradeHref} className={cn(buttonVariants())}>
					{t('subscribeAgain')}
				</Link>
			)
		}

		if (status === 'past_due') {
			return <p className="text-muted-foreground text-sm">{t('pastDueHint')}</p>
		}

		if (status === 'paused') {
			return <p className="text-muted-foreground text-sm">{t('pausedHint')}</p>
		}

		return null
	}

	return (
		<>
			<Card className="rounded-xl shadow-sm">
				<CardHeader className="flex flex-row items-start justify-between gap-4">
					<div className="flex flex-col gap-2">
						<CardTitle className="text-2xl font-semibold">
							{planLabel}
						</CardTitle>
						{statusLabel && (
							<Badge variant={statusVariant}>{statusLabel}</Badge>
						)}
					</div>
				</CardHeader>
				<CardContent className="grid gap-6 md:grid-cols-2">
					<div className="flex flex-col gap-2">
						<div className="flex items-baseline gap-1">
							<span className="text-3xl font-bold">{priceText}</span>
							{periodSuffix && (
								<span className="text-muted-foreground text-sm">
									{periodSuffix}
								</span>
							)}
						</div>
						{periodText && (
							<p className="text-muted-foreground text-sm">
								{t('currentPeriod')}: {periodText}
							</p>
						)}
					</div>
					<p className="text-muted-foreground text-sm leading-relaxed">
						{featuresText}
					</p>
				</CardContent>
				<CardFooter>{renderCta()}</CardFooter>
			</Card>

			{subscription && cancelDate && (
				<CancelSubscriptionDialog
					open={dialogOpen}
					onOpenChange={setDialogOpen}
					cancelDate={cancelDate}
					onCancelled={onCancelled}
				/>
			)}
		</>
	)
}

export { PlanCard }
```

- [ ] **Step 2: Lint**

```bash
npx eslint components/billing/PlanCard.tsx
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/billing/PlanCard.tsx
git commit -m "$(cat <<'EOF'
feat(billing): PlanCard component with status-aware CTA

Renders plan name, status badge, price/period, feature blurb. CTA
varies by subscription state: free → Upgrade, active → Cancel
(de-emphasized destructive outline), scheduled_cancel → muted hint
with date, canceled/expired → Subscribe again, past_due/paused →
muted hint. Owns CancelSubscriptionDialog and reload callback.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: BillingPage orchestrator

**Files:**

- Create: `components/billing/BillingPage.tsx`

- [ ] **Step 1: Implement**

```tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import { billingApi } from '@/services'
import type {
	BillingSubscription,
	BillingPayment,
	CatalogPlan,
} from '@/services/configs/billing.config'
import { PlanCard } from './PlanCard'
import { PaymentsTable } from './PaymentsTable'
import { ScheduledCancelBanner } from './ScheduledCancelBanner'
import { getEffectiveCancelDate } from '@/lib/billing/format'

interface BillingState {
	subscription: BillingSubscription | null
	payments: BillingPayment[]
	catalog: CatalogPlan[]
	loading: boolean
	error: boolean
}

const INITIAL_STATE: BillingState = {
	subscription: null,
	payments: [],
	catalog: [],
	loading: true,
	error: false,
}

function BillingPage() {
	const t = useTranslations('billing.page')
	const locale = useLocale()
	const [state, setState] = useState<BillingState>(INITIAL_STATE)

	const upgradeHref = `/${locale}/billing/checkout`

	const loadAll = useCallback(async () => {
		setState((prev) => ({ ...prev, loading: true, error: false }))
		try {
			const [subRes, paymentsRes, catalogRes] = await Promise.all([
				billingApi.subscription(),
				billingApi.payments(),
				billingApi.catalog(),
			])
			setState({
				subscription: subRes.data,
				payments: paymentsRes.data,
				catalog: catalogRes.data.plans,
				loading: false,
				error: false,
			})
		} catch {
			setState((prev) => ({ ...prev, loading: false, error: true }))
		}
	}, [])

	useEffect(() => {
		loadAll()
	}, [loadAll])

	const handleCancelled = () => {
		loadAll()
	}

	if (state.loading) {
		return (
			<main className="container mx-auto max-w-4xl px-4 py-8">
				<div className="flex items-center justify-center py-20">
					<Spinner />
				</div>
			</main>
		)
	}

	if (state.error) {
		return (
			<main className="container mx-auto max-w-4xl px-4 py-8">
				<div className="bg-card flex flex-col items-center gap-4 rounded-xl border p-8 text-center shadow-sm">
					<p className="text-muted-foreground">{t('loadError')}</p>
					<Button onClick={loadAll}>{t('retry')}</Button>
				</div>
			</main>
		)
	}

	const cancelDate = state.subscription
		? getEffectiveCancelDate(state.subscription)
		: null
	const showBanner =
		state.subscription?.status === 'scheduled_cancel' && cancelDate

	return (
		<main className="container mx-auto max-w-4xl space-y-6 px-4 py-8">
			<header className="space-y-1">
				<h1 className="text-2xl font-bold">{t('title')}</h1>
				<p className="text-muted-foreground">{t('subtitle')}</p>
			</header>

			{showBanner && cancelDate && (
				<ScheduledCancelBanner cancelDate={cancelDate} />
			)}

			<PlanCard
				subscription={state.subscription}
				catalog={state.catalog}
				upgradeHref={upgradeHref}
				onCancelled={handleCancelled}
			/>

			<section className="space-y-3">
				<h2 className="text-xl font-semibold">{t('paymentsHistoryTitle')}</h2>
				<PaymentsTable payments={state.payments} loading={state.loading} />
			</section>
		</main>
	)
}

export { BillingPage }
```

- [ ] **Step 2: Lint**

```bash
npx eslint components/billing/BillingPage.tsx
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/billing/BillingPage.tsx
git commit -m "$(cat <<'EOF'
feat(billing): BillingPage orchestrator

Loads subscription + payments + catalog in parallel via billingApi,
renders header + (conditional) ScheduledCancelBanner + PlanCard +
PaymentsTable section. Local useState, no context. Spinner on load,
inline retry stub on error. Reload callback wired to PlanCard for
post-cancel refresh.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Server route + sidebar entry

**Files:**

- Create: `app/[locale]/(personal)/billing/page.tsx`
- Modify: `components/sidebar/PersonalSidebar.tsx`

- [ ] **Step 1: Create the server page**

Create `app/[locale]/(personal)/billing/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth/get-user'
import { BillingPage } from '@/components/billing/BillingPage'

export default async function PersonalBillingPage() {
	const user = await getUser()
	if (!user) redirect('/login')
	return <BillingPage />
}
```

- [ ] **Step 2: Add sidebar entry to PersonalSidebar**

In `components/sidebar/PersonalSidebar.tsx`:

a. At the top of the file, add `CreditCard` to the lucide-react import:

```tsx
import {
	Building2,
	Calendar,
	CalendarCog,
	CircleDot,
	CreditCard,
	Settings2,
	UserCircle,
} from 'lucide-react'
```

b. After the existing href constants (`profileHref`, `bookingStatusesHref`, `orgsHref`) add:

```tsx
const billingHref = buildHref('/billing')
```

c. Inside the `groupAccount` `<SidebarGroup>` (the one with `myProfile` and `myOrganizations`), add a new `<SidebarMenuItem>` after `myProfile` and before `myOrganizations`:

```tsx
<SidebarMenuItem>
	<SidebarMenuButton
		render={<Link href={billingHref} />}
		isActive={isActive(billingHref)}
	>
		<CreditCard className="size-4" />
		<span>{t('billing')}</span>
	</SidebarMenuButton>
</SidebarMenuItem>
```

- [ ] **Step 3: Run lint**

```bash
npx eslint app/\[locale\]/\(personal\)/billing/page.tsx components/sidebar/PersonalSidebar.tsx
```

Expected: zero errors. (If pre-existing lint warnings exist in PersonalSidebar.tsx unrelated to this change, ignore them.)

- [ ] **Step 4: Build dev verification**

```bash
npm run dev
```

Open http://localhost:3000/en/billing in a browser. Expected:

- Sidebar has new "Billing" entry under Account group with credit card icon.
- Page loads, shows header, PlanCard (Free for current test user without subscription, or Business if subscribed), PaymentsTable (empty for free user, populated otherwise).
- No console errors.
- Sidebar item highlights when on /billing.

Stop the dev server with Ctrl+C when done.

- [ ] **Step 5: Commit**

```bash
git add app/\[locale\]/\(personal\)/billing/page.tsx components/sidebar/PersonalSidebar.tsx
git commit -m "$(cat <<'EOF'
feat(billing): /billing route + personal sidebar entry

Adds server route at app/[locale]/(personal)/billing/page.tsx with
getUser() guard, rendering the BillingPage client component. Adds a
new "Billing" entry to PersonalSidebar groupAccount group between
"My profile" and "My organizations" with CreditCard icon.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Manual end-to-end verification

This task is a checklist; no code changes.

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Free user path**

Sign in with a user that has no active subscription. Navigate to /en/billing. Verify:

- Page header with title and subtitle.
- PlanCard shows "Free" plan, $0 / month, no period text, "Upgrade to Business" CTA.
- PaymentsTable shows Empty state with Receipt icon and "No payments yet" / "Платежів ще немає".
- No banner.

Switch locale to /uk/billing. Verify all strings render in Ukrainian.

- [ ] **Step 3: Active subscriber path**

Sign in (or simulate via DB) as a user with status `active`. Verify:

- PlanCard shows "Business", $4.99 / month, status badge "Active", current period DD.MM.YYYY — DD.MM.YYYY.
- CTA is outline-styled "Cancel subscription" in destructive color.
- PaymentsTable populated with one or more rows from real payments.
- No banner.

- [ ] **Step 4: Cancel flow**

Click "Cancel subscription". Verify:

- Dialog opens with title, description showing date until access remains.
- "Keep subscription" closes the dialog without action.
- "Cancel subscription" disables both buttons during in-flight, then closes dialog on success.
- Toast "Subscription cancelled. Access until DD.MM.YYYY." appears.
- Page reloads and now shows: ScheduledCancelBanner at top, PlanCard with status badge "Cancelled", muted text "Cancellation scheduled for DD.MM.YYYY" instead of Cancel button.

- [ ] **Step 5: Cancelled / expired user**

Simulate a user with status `canceled`. Verify CTA is "Subscribe again" linking to /en/billing/checkout.

- [ ] **Step 6: Past-due user**

Simulate a user with status `past_due`. Verify status badge "Past due" (destructive) and CTA replaced by muted hint about updating payment details in Creem.

- [ ] **Step 7: Network failure**

Throttle requests in DevTools or stop the backend, reload the page. Verify the inline error stub appears with "Could not load billing data..." and a Retry button. Click Retry and confirm it re-fetches.

- [ ] **Step 8: Sidebar active state**

While on /billing, the sidebar entry "Billing" should be highlighted as active. Navigate to another page, verify it's no longer highlighted.

- [ ] **Step 9: Done**

If any step failed, capture the failure and return to the relevant earlier task to fix. If all passed, the feature is verified.

---

## Notes for the implementer

- **No new API code.** The frontend `billingApi` is already complete; this plan is pure UI consumption. If a method does not behave as documented, that is a backend bug and out of scope.
- **No tests beyond format helpers.** Components are presentational; manual verification is the agreed approach. Do not add component-level tests unless the feature evolves.
- **Existing patterns first.** Look at `components/booking/SlotListView.tsx` for Empty usage, `app/[locale]/(personal)/profile/page.tsx` for client-component data-load pattern, `components/sidebar/PersonalSidebar.tsx` for sidebar entry shape.
- **Errors.** All API errors flow through the existing toast interceptor. Do not add try/catch to bubble up custom messages — `defaultErrorMessage` on each endpoint config is enough.
- **Cancel reload.** After cancel, ALWAYS re-fetch subscription before closing the dialog so the UI reflects the new state on next render.
- **Currency display.** Amounts are stored in cents per project convention. `formatAmount` divides by 100. Do not reformat anywhere else.
- **Pre-existing lint errors** (`components/landing/hero-video.tsx`, `components/positions/PositionsTabs.tsx`, `components/shared/TimezoneSelector.tsx`) are out of scope for this plan; do not fix them.
