# Paid Organization Creation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make organization creation a paid feature ($2/mo `org_creator` plan), with deactivation on cancellation and paywall UI.

**Architecture:** Replace existing `pro` plan and `export_pack` product with a single `org_creator` subscription plan. Use existing `requireFeature()` middleware for access control. Add `active` field to Organization model with lifecycle hooks for activation/deactivation.

**Tech Stack:** Express.js + Mongoose (backend), Next.js + React + Tailwind (frontend), Creem.io (payments), next-intl (i18n)

---

## File Structure

### Backend (`/Users/egorzozula/Desktop/BackendTemplate`)

| Action | File                                            | Responsibility                                       |
| ------ | ----------------------------------------------- | ---------------------------------------------------- |
| Modify | `src/modules/billing/constants/billing.js`      | Replace pro/export_pack with org_creator plan config |
| Modify | `src/modules/billing/hooks/productHooks.js`     | Org activation/deactivation hooks                    |
| Modify | `src/models/Organization.js`                    | Add `active` field                                   |
| Modify | `src/dto/orgDto.js`                             | Include `active` in DTOs                             |
| Modify | `src/routes/subroutes/orgRoutes.js`             | Add `requireFeature` middleware                      |
| Modify | `src/services/orgServices.js`                   | Add org limit check                                  |
| Modify | `.env.example`                                  | Replace env var names                                |
| Modify | `src/modules/billing/__tests__/helpers.js`      | Update test constants                                |
| Modify | `src/modules/billing/__tests__/billing.test.js` | Update tests for org_creator                         |

### Frontend (`/Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted`)

| Action | File                                                | Responsibility                                 |
| ------ | --------------------------------------------------- | ---------------------------------------------- |
| Modify | `services/configs/billing.config.ts`                | Update Plan type for new features/limits       |
| Modify | `components/billing-plan-tab.tsx`                   | Show org_creator plan, remove products section |
| Modify | `components/organizations/CreateOrgDialog.tsx`      | Add paywall check before showing form          |
| Create | `components/organizations/OrgPaywall.tsx`           | Paywall UI component                           |
| Create | `components/organizations/OrgDeactivatedBanner.tsx` | Deactivation banner component                  |
| Modify | `app/[locale]/(personal)/organizations/page.tsx`    | Pass plan data to CreateOrgDialog              |
| Modify | `app/[locale]/(public)/org/[orgId]/page.tsx`        | Handle deactivated org                         |
| Modify | `app/[locale]/(org)/manage/[orgId]/layout.tsx`      | Check org active status                        |
| Modify | `i18n/messages/en.json`                             | Add org_creator keys, remove pro/export_pack   |
| Modify | `i18n/messages/uk.json`                             | Add org_creator keys, remove pro/export_pack   |

---

### Task 1: Backend — Update billing constants

**Files:**

- Modify: `/Users/egorzozula/Desktop/BackendTemplate/src/modules/billing/constants/billing.js`
- Modify: `/Users/egorzozula/Desktop/BackendTemplate/.env.example`

- [ ] **Step 1: Replace billing.js with org_creator plan**

Replace the entire content of `src/modules/billing/constants/billing.js`:

```js
// Filters out entries with undefined env var keys to prevent "undefined" string keys
const fromEnvEntries = (...entries) =>
	Object.fromEntries(entries.filter(([productId]) => productId !== undefined))

// ── Подписочные продукты → ключ плана ────────────────────────────────────────

export const SUBSCRIPTION_PRODUCTS = fromEnvEntries([
	process.env.CREEM_PRODUCT_ORG_CREATOR,
	'org_creator',
])

// ── Одноразовые продукты → ключ продукта ─────────────────────────────────────

export const ONE_TIME_PRODUCTS = fromEnvEntries()

// ── Определения продуктов (фичи и лимиты) ───────────────────────────────────

export const PRODUCTS = {}

// ── Plan hierarchy (weakest → strongest) ─────────────────────────────────────

export const PLAN_HIERARCHY = ['free', 'org_creator']

// ── Plan features & limits ───────────────────────────────────────────────────

export const PLANS = {
	free: {
		features: { dashboard: true, createOrg: false },
		limits: { organizations: 0 },
	},
	org_creator: {
		features: { dashboard: true, createOrg: true },
		limits: { organizations: 3 },
	},
}

// ── Plan catalog (UI/checkout data) ────────────────────────────────────────

export const PLAN_CATALOG = {
	free: {
		price: 0,
		currency: 'USD',
		period: 'month',
		productId: null,
	},
	org_creator: {
		price: 200,
		currency: 'USD',
		period: 'month',
		productId: process.env.CREEM_PRODUCT_ORG_CREATOR,
	},
}

// ── Product catalog (UI/checkout data) ─────────────────────────────────────

export const PRODUCT_CATALOG = {}

// ── Startup validation ─────────────────────────────────────────────────────────

const requiredProductEnvVars = ['CREEM_PRODUCT_ORG_CREATOR']

const missingVars = requiredProductEnvVars.filter((key) => !process.env[key])
if (missingVars.length > 0) {
	console.warn(
		`⚠️ Missing billing product IDs: ${missingVars.join(', ')}. Billing features may not work correctly. Add them to .env`,
	)
}

// ── Subscription statuses ────────────────────────────────────────────────────

export const SUBSCRIPTION_STATUS = {
	ACTIVE: 'active',
	PAST_DUE: 'past_due',
	CANCELED: 'canceled',
	EXPIRED: 'expired',
	PAUSED: 'paused',
	SCHEDULED_CANCEL: 'scheduled_cancel',
}

export const ACCESS_GRANTING_STATUSES = [
	SUBSCRIPTION_STATUS.ACTIVE,
	SUBSCRIPTION_STATUS.PAST_DUE,
	SUBSCRIPTION_STATUS.SCHEDULED_CANCEL,
]

// ── Webhook event types ──────────────────────────────────────────────────────

export const WEBHOOK_EVENT = {
	CHECKOUT_COMPLETED: 'checkout.completed',
	SUBSCRIPTION_ACTIVE: 'subscription.active',
	SUBSCRIPTION_PAID: 'subscription.paid',
	SUBSCRIPTION_PAST_DUE: 'subscription.past_due',
	SUBSCRIPTION_CANCELED: 'subscription.canceled',
	SUBSCRIPTION_EXPIRED: 'subscription.expired',
	SUBSCRIPTION_PAUSED: 'subscription.paused',
	SUBSCRIPTION_SCHEDULED_CANCEL: 'subscription.scheduled_cancel',
	REFUND_CREATED: 'refund.created',
	DISPUTE_CREATED: 'dispute.created',
}

// ── Webhook event → subscription status ──────────────────────────────────────

export const WEBHOOK_STATUS_MAP = {
	[WEBHOOK_EVENT.SUBSCRIPTION_ACTIVE]: SUBSCRIPTION_STATUS.ACTIVE,
	[WEBHOOK_EVENT.SUBSCRIPTION_PAID]: SUBSCRIPTION_STATUS.ACTIVE,
	[WEBHOOK_EVENT.SUBSCRIPTION_PAST_DUE]: SUBSCRIPTION_STATUS.PAST_DUE,
	[WEBHOOK_EVENT.SUBSCRIPTION_CANCELED]: SUBSCRIPTION_STATUS.CANCELED,
	[WEBHOOK_EVENT.SUBSCRIPTION_EXPIRED]: SUBSCRIPTION_STATUS.EXPIRED,
	[WEBHOOK_EVENT.SUBSCRIPTION_PAUSED]: SUBSCRIPTION_STATUS.PAUSED,
	[WEBHOOK_EVENT.SUBSCRIPTION_SCHEDULED_CANCEL]:
		SUBSCRIPTION_STATUS.SCHEDULED_CANCEL,
}
```

- [ ] **Step 2: Update .env.example**

In `/Users/egorzozula/Desktop/BackendTemplate/.env.example`, replace the Creem product lines:

```
# Creem.io Billing
CREEM_API_KEY=creem_test_...
CREEM_WEBHOOK_SECRET=whsec_...
CREEM_TEST_MODE=true
CREEM_PRODUCT_ORG_CREATOR=prod_your_org_creator_product_id
```

Remove lines `CREEM_PRODUCT_PRO` and `CREEM_PRODUCT_EXPORT_PACK`.

- [ ] **Step 3: Commit**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
git add src/modules/billing/constants/billing.js .env.example
git commit -m "feat: заменить pro/export_pack на org_creator план"
```

---

### Task 2: Backend — Organization model + DTO

**Files:**

- Modify: `/Users/egorzozula/Desktop/BackendTemplate/src/models/Organization.js`
- Modify: `/Users/egorzozula/Desktop/BackendTemplate/src/dto/orgDto.js`

- [ ] **Step 1: Add `active` field to Organization model**

In `src/models/Organization.js`, add `active` field to the schema (after the `settings` block, before the options):

```js
import mongoose from 'mongoose'

const { Schema, model } = mongoose

const OrganizationSchema = new Schema(
	{
		name: { type: String, required: true },
		currency: { type: String, enum: ['UAH', 'USD'], default: 'UAH' },
		description: { type: String, default: null },
		address: { type: String, default: null },
		phone: { type: String, default: null },
		website: { type: String, default: null },
		active: { type: Boolean, default: true },
		settings: {
			defaultTimezone: { type: String, default: 'Europe/Kyiv' },
			defaultCountry: { type: String, default: 'UA' },
			brandColor: { type: String },
			logoUrl: { type: String },
			hideBranding: { type: Boolean, default: false },
		},
	},
	{ timestamps: true },
)

export default model('Organization', OrganizationSchema)
```

- [ ] **Step 2: Add `active` to DTOs**

Replace `src/dto/orgDto.js`:

```js
const toOrgDto = (doc) => ({
	id: doc._id.toString(),
	name: doc.name,
	logo: doc.settings ? doc.settings.logoUrl || null : null,
	description: doc.description || null,
	address: doc.address || null,
	phone: doc.phone || null,
	website: doc.website || null,
	active: doc.active !== false,
})

const toOrgListItemDto = (org, membership) => ({
	id: org._id.toString(),
	name: org.name,
	logo: org.settings ? org.settings.logoUrl || null : null,
	role: membership.role,
	status: membership.status,
	active: org.active !== false,
})

export { toOrgDto, toOrgListItemDto }
```

- [ ] **Step 3: Commit**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
git add src/models/Organization.js src/dto/orgDto.js
git commit -m "feat: добавить поле active в модель Organization и DTO"
```

---

### Task 3: Backend — Product hooks for org activation/deactivation

**Files:**

- Modify: `/Users/egorzozula/Desktop/BackendTemplate/src/modules/billing/hooks/productHooks.js`

- [ ] **Step 1: Replace productHooks.js with org_creator hooks**

```js
import Membership from '../../../models/Membership.js'
import Organization from '../../../models/Organization.js'

// ── Helpers ─────────────────────────────────────────────────────────────────

const getOwnerOrgIds = async (userId) => {
	const memberships = await Membership.find({
		userId,
		role: 'owner',
		status: 'active',
	})
		.select('orgId')
		.lean()

	const toOrgId = (m) => m.orgId
	return memberships.map(toOrgId)
}

const setOrgsActive = async (userId, active) => {
	const orgIds = await getOwnerOrgIds(userId)
	if (orgIds.length === 0) return
	await Organization.updateMany({ _id: { $in: orgIds } }, { active })
}

// ── Product lifecycle hooks ──────────────────────────────────────────────────

const PRODUCT_HOOKS = {
	org_creator: {
		onActivate: async (user) => {
			await setOrgsActive(user._id || user.id, true)
		},
		onDeactivate: async (user) => {
			await setOrgsActive(user._id || user.id, false)
		},
		onRenew: async () => {},
	},
}

const getHooksForPlan = (planKey) => PRODUCT_HOOKS[planKey]

export { PRODUCT_HOOKS, getHooksForPlan }
```

- [ ] **Step 2: Commit**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
git add src/modules/billing/hooks/productHooks.js
git commit -m "feat: добавить хуки активации/деактивации организаций для org_creator"
```

---

### Task 4: Backend — Protect org creation route + limit check

**Files:**

- Modify: `/Users/egorzozula/Desktop/BackendTemplate/src/routes/subroutes/orgRoutes.js`
- Modify: `/Users/egorzozula/Desktop/BackendTemplate/src/services/orgServices.js`

- [ ] **Step 1: Add requireFeature middleware to org creation route**

Replace `src/routes/subroutes/orgRoutes.js`:

```js
import express from 'express'
import {
	handleGetOrg,
	handleGetOrgStaff,
	handleCreateOrg,
	handleUpdateOrg,
	handleUpdateStaffBio,
	handleGetUserOrgs,
	handleAddStaff,
	handleAcceptInvitation,
	handleDeclineInvitation,
	handleGetMyMembership,
} from '../../controllers/orgController.js'
import { authMiddleware } from '../../modules/auth/index.js'
import { requireOrgAdmin } from '../../middleware/orgMiddleware.js'
import { requireFeature } from '../../modules/billing/middleware/plan.js'

const router = express.Router()

router.get('/user-orgs', authMiddleware, handleGetUserOrgs)
router.post('/', authMiddleware, requireFeature('createOrg'), handleCreateOrg)
router.get('/:id', handleGetOrg)
router.get('/:id/my-membership', authMiddleware, handleGetMyMembership)
router.put(
	'/:id',
	authMiddleware,
	requireOrgAdmin((req) => req.params.id),
	handleUpdateOrg,
)
router.get('/:id/staff', handleGetOrgStaff)
router.post(
	'/:id/staff',
	authMiddleware,
	requireOrgAdmin((req) => req.params.id),
	handleAddStaff,
)
router.patch('/:id/staff/:staffId', authMiddleware, handleUpdateStaffBio)
router.patch('/:id/membership/accept', authMiddleware, handleAcceptInvitation)
router.delete(
	'/:id/membership/decline',
	authMiddleware,
	handleDeclineInvitation,
)

export default router
```

- [ ] **Step 2: Add org limit check in orgServices.js**

In `src/services/orgServices.js`, update the `createOrganization` function. Add imports at the top:

```js
import { getUserBillingProfile } from '../modules/billing/services/planServices.js'
```

Replace the `createOrganization` function:

```js
const createOrganization = async (data, userId) => {
	const plan = await getUserBillingProfile(userId)
	const orgLimit = plan.limits.organizations || 0

	const ownedOrgsCount = await Membership.countDocuments({
		userId,
		role: 'owner',
	})

	if (ownedOrgsCount >= orgLimit) {
		throw new HttpError({ statusCode: 402, status: 'limitReached' })
	}

	const orgData = {
		name: data.name,
		currency: data.currency || 'UAH',
		settings: {
			defaultTimezone: data.defaultTimezone || 'Europe/Kyiv',
			defaultCountry: data.defaultCountry || 'UA',
			brandColor: data.brandColor || undefined,
			logoUrl: data.logoUrl || undefined,
		},
	}

	const org = await createOrg(orgData)

	await createMembership({
		userId,
		orgId: org.id,
		role: 'owner',
		status: MEMBERSHIP_STATUS.ACTIVE,
	})

	await createDefaultSchedule(userId, org.id).catch((err) =>
		console.error('[createDefaultSchedule] org creation failed:', err.message),
	)

	return org
}
```

Note: `Membership` model is already imported via `membershipRepository` functions, but we need the direct model for `countDocuments`. Add this import at the top of the file:

```js
import Membership from '../models/Membership.js'
```

- [ ] **Step 3: Commit**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
git add src/routes/subroutes/orgRoutes.js src/services/orgServices.js
git commit -m "feat: защитить создание организаций через requireFeature и лимит"
```

---

### Task 5: Backend — Handle deactivated org in public endpoints

**Files:**

- Modify: `/Users/egorzozula/Desktop/BackendTemplate/src/controllers/orgController.js`

- [ ] **Step 1: Update handleGetOrg to return active status**

The DTO already includes `active` field (from Task 2), so `handleGetOrg` will automatically return it. No changes needed in the controller — the frontend will check `active` field in the response.

However, we need to ensure `getOrgById` in the repository returns the `active` field. Check if it uses `.lean()` or a projection that might exclude it. Since the DTO now maps `active`, and the repository returns the full document, this should work automatically.

- [ ] **Step 2: Verify — no code changes needed here**

The `toOrgDto` change in Task 2 already adds `active` to the response. The public endpoint `GET /api/org/:id` will now return `{ ..., active: true/false }`.

- [ ] **Step 3: Commit (skip if no changes)**

No commit needed — this was verification only.

---

### Task 6: Backend — Update billing tests

**Files:**

- Modify: `/Users/egorzozula/Desktop/BackendTemplate/src/modules/billing/__tests__/helpers.js`
- Modify: `/Users/egorzozula/Desktop/BackendTemplate/src/modules/billing/__tests__/billing.test.js`

- [ ] **Step 1: Update test helpers**

Replace `src/modules/billing/__tests__/helpers.js`:

```js
import http from 'node:http'
import User from '../../user/model/User.js'
import Subscription from '../model/Subscription.js'

// ── Test constants ───────────────────────────────────────────────────────────

const TEST_PRODUCT_ORG_CREATOR = 'test_product_org_creator'
const TEST_SUBSCRIPTION_ID = 'sub_test_123'
const TEST_CUSTOMER_ID = 'cus_test_456'
const TEST_ORDER_ID = 'ord_test_789'
const TEST_EMAIL = 'test@example.com'

// ── User helper ──────────────────────────────────────────────────────────────

const createTestUser = async (email = TEST_EMAIL) => {
	const doc = await User.create({ name: 'Test User', email })
	return doc
}

// ── Subscription helper ──────────────────────────────────────────────────────

const createActiveSubscription = async (userId, overrides = {}) => {
	const defaults = {
		userId,
		providerSubscriptionId: TEST_SUBSCRIPTION_ID,
		providerCustomerId: TEST_CUSTOMER_ID,
		productId: TEST_PRODUCT_ORG_CREATOR,
		planKey: 'org_creator',
		status: 'active',
		currentPeriodStart: new Date('2026-03-01'),
		currentPeriodEnd: new Date('2026-04-01'),
	}
	const doc = await Subscription.create({ ...defaults, ...overrides })
	return doc
}

// ── Webhook payload builders ─────────────────────────────────────────────────

const buildCheckoutPayload = (overrides = {}) => {
	const defaults = {
		order: { id: TEST_ORDER_ID, amount: 200, currency: 'USD' },
		subscription: { id: TEST_SUBSCRIPTION_ID },
		customer: { id: TEST_CUSTOMER_ID, email: TEST_EMAIL },
		product: { id: TEST_PRODUCT_ORG_CREATOR },
		status: 'completed',
	}
	return { ...defaults, ...overrides }
}

const buildSubscriptionEventPayload = (overrides = {}) => {
	const defaults = {
		id: TEST_SUBSCRIPTION_ID,
		product: { id: TEST_PRODUCT_ORG_CREATOR },
		customer: { id: TEST_CUSTOMER_ID, email: TEST_EMAIL },
		current_period_start_date: '2026-04-01T00:00:00Z',
		current_period_end_date: '2026-05-01T00:00:00Z',
		status: 'active',
		canceled_at: null,
	}
	return { ...defaults, ...overrides }
}

const buildRenewalPayload = (overrides = {}) => ({
	...buildSubscriptionEventPayload(overrides),
	last_transaction: {
		order: 'ord_renewal_001',
		amount: 200,
		currency: 'USD',
		...(overrides.last_transaction || {}),
	},
})

// ── HTTP helper ──────────────────────────────────────────────────────────────

const sendWebhook = (baseUrl, eventType, objectData) => {
	const body = JSON.stringify({ eventType, object: objectData })
	const url = new URL('/billing/webhook', baseUrl)

	return new Promise((resolve, reject) => {
		const options = {
			hostname: url.hostname,
			port: url.port,
			path: url.pathname,
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'creem-signature': 'test-signature',
				'Content-Length': Buffer.byteLength(body),
			},
		}

		const req = http.request(options, (res) => {
			let data = ''
			res.on('data', (chunk) => {
				data += chunk
			})
			res.on('end', () => {
				resolve({
					statusCode: res.statusCode,
					body: data ? JSON.parse(data) : null,
				})
			})
		})

		req.on('error', reject)
		req.write(body)
		req.end()
	})
}

export {
	TEST_PRODUCT_ORG_CREATOR,
	TEST_SUBSCRIPTION_ID,
	TEST_CUSTOMER_ID,
	TEST_ORDER_ID,
	TEST_EMAIL,
	createTestUser,
	createActiveSubscription,
	buildCheckoutPayload,
	buildSubscriptionEventPayload,
	buildRenewalPayload,
	sendWebhook,
}
```

- [ ] **Step 2: Update billing.test.js**

Replace `src/modules/billing/__tests__/billing.test.js`:

```js
import { describe, it, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import {
	startServer,
	stopServer,
	clearCollections,
	getBaseUrl,
} from './setup.js'
import {
	createTestUser,
	createActiveSubscription,
	buildCheckoutPayload,
	buildSubscriptionEventPayload,
	buildRenewalPayload,
	sendWebhook,
	TEST_PRODUCT_ORG_CREATOR,
	TEST_SUBSCRIPTION_ID,
	TEST_EMAIL,
} from './helpers.js'
import Subscription from '../model/Subscription.js'
import Payment from '../model/Payment.js'

describe('Billing webhooks', () => {
	before(async () => {
		await startServer()
	})

	beforeEach(async () => {
		await clearCollections()
	})

	after(async () => {
		await stopServer()
	})

	// ── Group 1: New Subscription (checkout.completed) ───────────────────────

	describe('checkout.completed', () => {
		it('1.1 creates subscription with active status', async () => {
			await createTestUser(TEST_EMAIL)
			const payload = buildCheckoutPayload()

			const res = await sendWebhook(getBaseUrl(), 'checkout.completed', payload)
			assert.equal(res.statusCode, 200)

			const sub = await Subscription.findOne({
				providerSubscriptionId: TEST_SUBSCRIPTION_ID,
			})
			assert.ok(sub, 'Subscription should exist in DB')
			assert.equal(sub.status, 'active')
			assert.equal(sub.planKey, 'org_creator')
			assert.equal(sub.productId, TEST_PRODUCT_ORG_CREATOR)
		})

		it('1.2 creates payment record', async () => {
			await createTestUser(TEST_EMAIL)
			const payload = buildCheckoutPayload()

			await sendWebhook(getBaseUrl(), 'checkout.completed', payload)

			const payment = await Payment.findOne({ eventType: 'checkout.completed' })
			assert.ok(payment, 'Payment should exist in DB')
			assert.equal(payment.type, 'subscription')
			assert.equal(payment.amount, 200)
			assert.equal(payment.currency, 'USD')
		})

		it('1.3 rejects webhook when user not found', async () => {
			const payload = buildCheckoutPayload({
				customer: { id: 'cus_unknown', email: 'unknown@example.com' },
			})

			const res = await sendWebhook(getBaseUrl(), 'checkout.completed', payload)
			assert.equal(res.statusCode, 200)

			const subCount = await Subscription.countDocuments()
			assert.equal(
				subCount,
				0,
				'No subscription should be created when user not found',
			)
		})

		it('1.4 duplicate checkout does not create duplicates', async () => {
			await createTestUser(TEST_EMAIL)
			const payload = buildCheckoutPayload()

			await sendWebhook(getBaseUrl(), 'checkout.completed', payload)
			await sendWebhook(getBaseUrl(), 'checkout.completed', payload)

			const subCount = await Subscription.countDocuments()
			assert.equal(subCount, 1, 'Should have exactly 1 subscription')

			const paymentCount = await Payment.countDocuments()
			assert.equal(paymentCount, 1, 'Should have exactly 1 payment')
		})
	})

	// ── Group 2: Renewal (subscription.paid) ─────────────────────────────────

	describe('subscription.paid', () => {
		it('2.1 updates existing subscription without duplication', async () => {
			const user = await createTestUser(TEST_EMAIL)
			await createActiveSubscription(user._id)
			const payload = buildRenewalPayload()

			const res = await sendWebhook(getBaseUrl(), 'subscription.paid', payload)
			assert.equal(res.statusCode, 200)

			const subCount = await Subscription.countDocuments()
			assert.equal(subCount, 1, 'Should still have exactly 1 subscription')

			const sub = await Subscription.findOne({
				providerSubscriptionId: TEST_SUBSCRIPTION_ID,
			})
			assert.equal(sub.status, 'active')
		})

		it('2.2 updates billing period dates', async () => {
			const user = await createTestUser(TEST_EMAIL)
			await createActiveSubscription(user._id)

			const newPeriodStart = '2026-04-01T00:00:00Z'
			const newPeriodEnd = '2026-05-01T00:00:00Z'
			const payload = buildRenewalPayload({
				current_period_start_date: newPeriodStart,
				current_period_end_date: newPeriodEnd,
			})

			await sendWebhook(getBaseUrl(), 'subscription.paid', payload)

			const sub = await Subscription.findOne({
				providerSubscriptionId: TEST_SUBSCRIPTION_ID,
			})
			assert.equal(
				sub.currentPeriodStart.toISOString(),
				new Date(newPeriodStart).toISOString(),
			)
			assert.equal(
				sub.currentPeriodEnd.toISOString(),
				new Date(newPeriodEnd).toISOString(),
			)
		})

		it('2.3 creates renewal payment record', async () => {
			const user = await createTestUser(TEST_EMAIL)
			await createActiveSubscription(user._id)
			const payload = buildRenewalPayload()

			await sendWebhook(getBaseUrl(), 'subscription.paid', payload)

			const payment = await Payment.findOne({ eventType: 'subscription.paid' })
			assert.ok(payment, 'Renewal payment should exist in DB')
			assert.equal(payment.amount, 200)
			assert.equal(payment.currency, 'USD')
		})
	})

	// ── Group 3: Cancellation (subscription.canceled) ────────────────────────

	describe('subscription.canceled', () => {
		it('3.1 sets status to canceled', async () => {
			const user = await createTestUser(TEST_EMAIL)
			await createActiveSubscription(user._id)

			const payload = buildSubscriptionEventPayload({
				canceled_at: '2026-04-01T00:00:00Z',
				status: 'canceled',
			})

			const res = await sendWebhook(
				getBaseUrl(),
				'subscription.canceled',
				payload,
			)
			assert.equal(res.statusCode, 200)

			const sub = await Subscription.findOne({
				providerSubscriptionId: TEST_SUBSCRIPTION_ID,
			})
			assert.equal(sub.status, 'canceled')
		})

		it('3.2 scheduled_cancel then canceled flow', async () => {
			const user = await createTestUser(TEST_EMAIL)
			await createActiveSubscription(user._id)

			const scheduledPayload = buildSubscriptionEventPayload({
				canceled_at: '2026-04-01T00:00:00Z',
				status: 'scheduled_cancel',
			})
			await sendWebhook(
				getBaseUrl(),
				'subscription.scheduled_cancel',
				scheduledPayload,
			)

			const subAfterScheduled = await Subscription.findOne({
				providerSubscriptionId: TEST_SUBSCRIPTION_ID,
			})
			assert.equal(subAfterScheduled.status, 'scheduled_cancel')

			const canceledPayload = buildSubscriptionEventPayload({
				canceled_at: '2026-04-01T00:00:00Z',
				status: 'canceled',
			})
			await sendWebhook(getBaseUrl(), 'subscription.canceled', canceledPayload)

			const subAfterCanceled = await Subscription.findOne({
				providerSubscriptionId: TEST_SUBSCRIPTION_ID,
			})
			assert.equal(subAfterCanceled.status, 'canceled')
		})

		it('3.3 canceled subscription not returned as active', async () => {
			const user = await createTestUser(TEST_EMAIL)
			await createActiveSubscription(user._id)

			const payload = buildSubscriptionEventPayload({
				canceled_at: '2026-04-01T00:00:00Z',
				status: 'canceled',
			})
			await sendWebhook(getBaseUrl(), 'subscription.canceled', payload)

			const { getActiveSubscriptionByUserId } =
				await import('../repository/subscriptionRepository.js')
			const activeSub = await getActiveSubscriptionByUserId(user._id)
			assert.equal(
				activeSub,
				null,
				'Canceled subscription should not be returned as active',
			)
		})
	})
})
```

- [ ] **Step 3: Run tests to verify**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
npm test
```

Expected: All tests pass with updated plan names and amounts.

- [ ] **Step 4: Commit**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
git add src/modules/billing/__tests__/helpers.js src/modules/billing/__tests__/billing.test.js
git commit -m "test: обновить тесты биллинга для org_creator плана"
```

---

### Task 7: Frontend — Update i18n messages

**Files:**

- Modify: `/Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted/i18n/messages/en.json`
- Modify: `/Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted/i18n/messages/uk.json`

- [ ] **Step 1: Update en.json billing section**

Replace the `billing` section (lines 111-144) in `i18n/messages/en.json`:

```json
"billing": {
    "plans": {
        "free": {
            "name": "Free",
            "description": "Basic access",
            "features": [
                "Dashboard access",
                "Community support"
            ]
        },
        "org_creator": {
            "name": "Org Creator",
            "description": "Create and manage organizations",
            "features": [
                "Create up to 3 organizations",
                "Full organization management",
                "Public booking pages",
                "Staff management"
            ]
        }
    },
    "products": {},
    "period": {
        "month": "/month",
        "year": "/year"
    },
    "orgCreator": {
        "paywallTitle": "Subscription Required",
        "paywallDescription": "Subscribe to the Org Creator plan to create and manage organizations.",
        "paywallPrice": "$2/month",
        "limitReached": "Organization limit reached ({count}/{max})",
        "subscribe": "Subscribe — $2/mo"
    },
    "orgDeactivated": {
        "public": "This organization is temporarily unavailable",
        "owner": "Your subscription has expired. The organization is deactivated.",
        "member": "This organization is currently inactive.",
        "renewLink": "Renew subscription"
    }
},
```

- [ ] **Step 2: Update uk.json billing section**

Replace the `billing` section (lines 111-144) in `i18n/messages/uk.json`:

```json
"billing": {
    "plans": {
        "free": {
            "name": "Безкоштовно",
            "description": "Базовий доступ",
            "features": [
                "Доступ до дашборду",
                "Підтримка спільноти"
            ]
        },
        "org_creator": {
            "name": "Org Creator",
            "description": "Створення та управління організаціями",
            "features": [
                "Створення до 3 організацій",
                "Повне управління організаціями",
                "Публічні сторінки бронювання",
                "Управління персоналом"
            ]
        }
    },
    "products": {},
    "period": {
        "month": "/місяць",
        "year": "/рік"
    },
    "orgCreator": {
        "paywallTitle": "Потрібна підписка",
        "paywallDescription": "Підпишіться на план Org Creator, щоб створювати та керувати організаціями.",
        "paywallPrice": "$2/місяць",
        "limitReached": "Досягнуто ліміт організацій ({count}/{max})",
        "subscribe": "Підписатися — $2/міс"
    },
    "orgDeactivated": {
        "public": "Ця організація тимчасово недоступна",
        "owner": "Ваша підписка закінчилась. Організацію деактивовано.",
        "member": "Ця організація наразі неактивна.",
        "renewLink": "Поновити підписку"
    }
},
```

- [ ] **Step 3: Commit**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
git add i18n/messages/en.json i18n/messages/uk.json
git commit -m "feat: обновить i18n ключи для org_creator плана"
```

---

### Task 8: Frontend — Update billing types

**Files:**

- Modify: `/Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted/services/configs/billing.config.ts`

- [ ] **Step 1: Update Plan interface**

In `services/configs/billing.config.ts`, update the `Plan` interface to use the new feature/limit names:

```ts
interface Plan {
	key: string
	features: Record<string, boolean>
	limits: Record<string, number>
	products: string[]
}
```

This makes the type generic enough to work with any plan config (free, org_creator, or future plans).

- [ ] **Step 2: Commit**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
git add services/configs/billing.config.ts
git commit -m "feat: обобщить тип Plan для поддержки разных планов"
```

---

### Task 9: Frontend — Update billing plan tab

**Files:**

- Modify: `/Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted/components/billing-plan-tab.tsx`

- [ ] **Step 1: Replace billing-plan-tab.tsx**

Remove products section, update current plan display for organizations instead of projects/storage:

```tsx
'use client'

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { BillingCatalog, BillingSubscription, Plan } from '@/services'
import { billingApi } from '@/services'
import { formatPrice } from '@/lib/billing'
import { CreemCheckout } from '@creem_io/nextjs'
import { Check } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { toast } from 'sonner'

// ── Helpers ─────────────────────────────────────────────────────────────────

const hasI18nKeys = (
	t: ReturnType<typeof useTranslations>,
	prefix: string,
	key: string,
) => t.has(`${prefix}.${key}.name`)

// ── Component ───────────────────────────────────────────────────────────────

interface BillingPlanTabProps {
	plan: Plan
	subscription: BillingSubscription | null
	catalog: BillingCatalog
	onPlanChanged: () => void
}

export function BillingPlanTab({
	plan,
	subscription,
	catalog,
	onPlanChanged,
}: BillingPlanTabProps) {
	const [cancelling, setCancelling] = useState(false)
	const t = useTranslations('billing')

	const currentIndex = catalog.hierarchy.indexOf(plan.key)

	const handleCancel = async () => {
		setCancelling(true)
		try {
			await billingApi.cancel()
			toast.success('Subscription cancelled')
			onPlanChanged()
		} catch {
			// errors handled by toast interceptor
		} finally {
			setCancelling(false)
		}
	}

	return (
		<div className="space-y-6 pt-6">
			{/* ── Current Plan ────────────────────────────────────────── */}
			<Card>
				<CardHeader>
					<div className="flex items-center gap-3">
						<CardTitle>Current Plan</CardTitle>
						<Badge variant="outline" className="capitalize">
							{plan.key}
						</Badge>
						{subscription && (
							<Badge
								variant={
									subscription.status === 'active' ? 'default' : 'secondary'
								}
								className="capitalize"
							>
								{subscription.status.replaceAll('_', ' ')}
							</Badge>
						)}
					</div>
				</CardHeader>
				<CardContent>
					{plan.limits.organizations !== undefined && (
						<div className="text-muted-foreground text-sm">
							<span>
								Organizations:{' '}
								{plan.limits.organizations === Infinity
									? '∞'
									: plan.limits.organizations}
							</span>
						</div>
					)}
					{subscription &&
						subscription.status !== 'canceled' &&
						subscription.status !== 'expired' && (
							<div className="mt-4">
								<AlertDialog>
									<AlertDialogTrigger
										render={
											<Button
												variant="outline"
												size="sm"
												disabled={cancelling}
											/>
										}
									>
										{cancelling ? 'Cancelling...' : 'Cancel subscription'}
									</AlertDialogTrigger>
									<AlertDialogContent>
										<AlertDialogHeader>
											<AlertDialogTitle>Cancel subscription?</AlertDialogTitle>
											<AlertDialogDescription>
												Your subscription will remain active until the end of
												the current billing period. After that, you will be
												downgraded to the Free plan.
											</AlertDialogDescription>
										</AlertDialogHeader>
										<AlertDialogFooter>
											<AlertDialogCancel>Keep subscription</AlertDialogCancel>
											<AlertDialogAction onClick={handleCancel}>
												Yes, cancel
											</AlertDialogAction>
										</AlertDialogFooter>
									</AlertDialogContent>
								</AlertDialog>
							</div>
						)}
				</CardContent>
			</Card>

			{/* ── Subscription Plans ──────────────────────────────────── */}
			<div>
				<h3 className="mb-4 text-lg font-semibold">Subscription Plans</h3>
				<div className="grid gap-6 lg:grid-cols-2">
					{catalog.hierarchy.map((key, index) => {
						if (!hasI18nKeys(t, 'plans', key)) {
							if (process.env.NODE_ENV === 'development') {
								console.warn(`Missing i18n keys for billing plan: ${key}`)
							}
							return null
						}

						const catalogPlan = catalog.plans.find((p) => p.key === key)
						if (!catalogPlan) return null

						const isCurrent = key === plan.key
						const isHigher = index > currentIndex
						const features: string[] = t.raw(`plans.${key}.features`)

						return (
							<Card
								key={key}
								className={isCurrent ? 'border-primary border-2' : ''}
							>
								<CardHeader>
									<div className="flex items-center justify-between">
										<CardTitle>{t(`plans.${key}.name`)}</CardTitle>
										{isCurrent && <Badge>Current</Badge>}
									</div>
									<div className="flex items-baseline gap-1">
										<span className="text-3xl font-semibold">
											{formatPrice(catalogPlan.price, catalogPlan.currency)}
										</span>
										<span className="text-muted-foreground text-sm">
											{t(`period.${catalogPlan.period}`)}
										</span>
									</div>
								</CardHeader>
								<CardContent>
									<ul className="mb-6 space-y-2">
										{features.map((feature) => (
											<li
												key={feature}
												className="flex items-center gap-2 text-sm"
											>
												<Check className="text-primary h-4 w-4 shrink-0" />
												{feature}
											</li>
										))}
									</ul>
									{isHigher && catalogPlan.productId && (
										<CreemCheckout
											productId={catalogPlan.productId}
											checkoutPath="/api/checkout"
										>
											<Button className="w-full">
												Upgrade to {t(`plans.${key}.name`)}
											</Button>
										</CreemCheckout>
									)}
								</CardContent>
							</Card>
						)
					})}
				</div>
			</div>
		</div>
	)
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
git add components/billing-plan-tab.tsx
git commit -m "feat: обновить billing plan tab для org_creator плана"
```

---

### Task 10: Frontend — Paywall component

**Files:**

- Create: `/Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted/components/organizations/OrgPaywall.tsx`

- [ ] **Step 1: Create OrgPaywall component**

```tsx
'use client'

import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import type { BillingCatalog } from '@/services'
import { CreemCheckout } from '@creem_io/nextjs'
import { Lock } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface OrgPaywallProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	catalog: BillingCatalog | null
}

function OrgPaywall({ open, onOpenChange, catalog }: OrgPaywallProps) {
	const t = useTranslations('billing.orgCreator')

	const orgCreatorPlan = catalog
		? catalog.plans.find((p) => p.key === 'org_creator')
		: null

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Lock className="size-5" />
						{t('paywallTitle')}
					</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					<p className="text-muted-foreground text-sm">
						{t('paywallDescription')}
					</p>
					<p className="text-lg font-semibold">{t('paywallPrice')}</p>
					{orgCreatorPlan && orgCreatorPlan.productId && (
						<CreemCheckout
							productId={orgCreatorPlan.productId}
							checkoutPath="/api/checkout"
						>
							<Button className="w-full">{t('subscribe')}</Button>
						</CreemCheckout>
					)}
				</div>
			</DialogContent>
		</Dialog>
	)
}

export { OrgPaywall }
```

- [ ] **Step 2: Commit**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
git add components/organizations/OrgPaywall.tsx
git commit -m "feat: добавить компонент OrgPaywall"
```

---

### Task 11: Frontend — Update CreateOrgDialog with paywall logic

**Files:**

- Modify: `/Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted/components/organizations/CreateOrgDialog.tsx`
- Modify: `/Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted/app/[locale]/(personal)/organizations/page.tsx`

- [ ] **Step 1: Update CreateOrgDialog to accept plan and catalog props**

Replace `components/organizations/CreateOrgDialog.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { orgApi, setServerErrors } from '@/services'
import type { Plan, BillingCatalog } from '@/services'
import { OrgPaywall } from '@/components/organizations/OrgPaywall'

// Предустановленные цвета бренда
const PRESET_COLORS = [
	'#1a1a2e',
	'#16213e',
	'#0f3460',
	'#533483',
	'#e94560',
	'#ff6b6b',
	'#feca57',
	'#48dbfb',
	'#0abde3',
	'#10ac84',
	'#01a3a4',
	'#2d3436',
]

const createOrgSchema = z.object({
	name: z
		.string()
		.min(1, 'Name is required')
		.min(2, 'Name must be at least 2 characters'),
	currency: z.enum(['UAH', 'USD']),
	brandColor: z.string().optional(),
	logoUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
	defaultTimezone: z.string().optional(),
	defaultCountry: z.string().optional(),
})

type CreateOrgFormData = z.infer<typeof createOrgSchema>

interface CreateOrgDialogProps {
	onCreated: () => void
	plan: Plan | null
	catalog: BillingCatalog | null
	orgCount: number
}

function CreateOrgDialog({
	onCreated,
	plan,
	catalog,
	orgCount,
}: CreateOrgDialogProps) {
	const t = useTranslations('organizations')
	const tb = useTranslations('billing')
	const [open, setOpen] = useState(false)
	const [paywallOpen, setPaywallOpen] = useState(false)

	const {
		register,
		handleSubmit,
		control,
		formState: { errors, isSubmitting },
		reset,
		setError,
		setValue,
	} = useForm<CreateOrgFormData>({
		resolver: zodResolver(createOrgSchema),
		defaultValues: {
			currency: 'UAH',
			defaultTimezone: 'Europe/Kyiv',
			defaultCountry: 'UA',
		},
	})

	const canCreateOrg = plan && plan.features.createOrg
	const orgLimit = plan ? plan.limits.organizations || 0 : 0
	const limitReached = canCreateOrg && orgCount >= orgLimit

	const handleCreateClick = () => {
		if (!canCreateOrg) {
			setPaywallOpen(true)
			return
		}
		setOpen(true)
	}

	const onSubmit = async (data: CreateOrgFormData) => {
		try {
			const body = {
				name: data.name,
				currency: data.currency,
				brandColor: data.brandColor || undefined,
				logoUrl: data.logoUrl || undefined,
				defaultTimezone: data.defaultTimezone || undefined,
				defaultCountry: data.defaultCountry || undefined,
			}
			await orgApi.create({ body })
			toast.success(t('created'))
			reset()
			setOpen(false)
			onCreated()
		} catch (err) {
			if (!setServerErrors(err, setError)) {
				// Не validation ошибка — toast уже показан интерцептором
			}
		}
	}

	const selectPresetColor = (color: string) => () => {
		setValue('brandColor', color)
	}

	const renderColorOption = (color: string) => (
		<button
			key={color}
			type="button"
			className="size-6 rounded-full border-2 border-transparent hover:border-gray-400"
			style={{ backgroundColor: color }}
			onClick={selectPresetColor(color)}
		/>
	)

	return (
		<>
			<Button onClick={handleCreateClick} disabled={!!limitReached}>
				<Plus className="mr-2 size-4" />
				{limitReached
					? tb('orgCreator.limitReached', {
							count: String(orgCount),
							max: String(orgLimit),
						})
					: t('create')}
			</Button>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t('create')}</DialogTitle>
					</DialogHeader>
					<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
						<Field data-invalid={!!errors.name || undefined}>
							<FieldLabel htmlFor="name">{t('form.name')}</FieldLabel>
							<Input
								id="name"
								placeholder={t('form.namePlaceholder')}
								{...register('name')}
							/>
							<FieldError errors={[errors.name]} />
						</Field>

						<Field data-invalid={!!errors.currency || undefined}>
							<FieldLabel>{t('form.currency')}</FieldLabel>
							<Controller
								control={control}
								name="currency"
								render={({ field }) => (
									<Select value={field.value} onValueChange={field.onChange}>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="UAH">UAH (&#8372;)</SelectItem>
											<SelectItem value="USD">USD ($)</SelectItem>
										</SelectContent>
									</Select>
								)}
							/>
							<FieldError errors={[errors.currency]} />
						</Field>

						<Field data-invalid={!!errors.brandColor || undefined}>
							<FieldLabel htmlFor="brandColor">
								{t('form.brandColor')}
							</FieldLabel>
							<div className="mb-2 flex flex-wrap gap-2">
								{PRESET_COLORS.map(renderColorOption)}
							</div>
							<Input
								id="brandColor"
								placeholder="#1a1a2e"
								{...register('brandColor')}
							/>
							<FieldError errors={[errors.brandColor]} />
						</Field>

						<Field data-invalid={!!errors.logoUrl || undefined}>
							<FieldLabel htmlFor="logoUrl">{t('form.logo')}</FieldLabel>
							<Input
								id="logoUrl"
								placeholder={t('form.logoPlaceholder')}
								{...register('logoUrl')}
							/>
							<FieldError errors={[errors.logoUrl]} />
						</Field>

						<div className="flex justify-end gap-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => setOpen(false)}
							>
								{t('form.cancel')}
							</Button>
							<Button type="submit" disabled={isSubmitting}>
								{t('form.submit')}
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>

			<OrgPaywall
				open={paywallOpen}
				onOpenChange={setPaywallOpen}
				catalog={catalog}
			/>
		</>
	)
}

export { CreateOrgDialog }
```

- [ ] **Step 2: Update organizations page to fetch and pass plan/catalog**

Replace `app/[locale]/(personal)/organizations/page.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useUserOrgs } from '@/lib/hooks/useUserOrgs'
import { OrgCard } from '@/components/organizations/OrgCard'
import { CreateOrgDialog } from '@/components/organizations/CreateOrgDialog'
import { Spinner } from '@/components/ui/spinner'
import type { OrgListItem, Plan, BillingCatalog } from '@/services'
import { billingApi } from '@/services'

function OrganizationsPage() {
	const t = useTranslations('organizations')
	const { orgs, isLoading, refetch } = useUserOrgs()
	const [plan, setPlan] = useState<Plan | null>(null)
	const [catalog, setCatalog] = useState<BillingCatalog | null>(null)

	useEffect(() => {
		const fetchBilling = async () => {
			try {
				const [planRes, catalogRes] = await Promise.all([
					billingApi.plan(),
					billingApi.catalog(),
				])
				setPlan(planRes.data)
				setCatalog(catalogRes.data)
			} catch {
				// toast interceptor handles errors
			}
		}
		fetchBilling()
	}, [])

	const ownerOrgCount = orgs.filter((org) => org.role === 'owner').length

	const renderOrgCard = (org: OrgListItem) => (
		<OrgCard key={org.id} org={org} onInvitationHandled={refetch} />
	)

	return (
		<div className="container mx-auto p-6">
			<div className="mb-6 flex items-center justify-between">
				<h1 className="text-2xl font-bold">{t('title')}</h1>
				<CreateOrgDialog
					onCreated={refetch}
					plan={plan}
					catalog={catalog}
					orgCount={ownerOrgCount}
				/>
			</div>

			{isLoading ? (
				<div className="flex min-h-[200px] items-center justify-center">
					<Spinner />
				</div>
			) : orgs.length === 0 ? (
				<div className="text-muted-foreground flex min-h-[200px] items-center justify-center">
					<p>{t('empty')}</p>
				</div>
			) : (
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
					{orgs.map(renderOrgCard)}
				</div>
			)}
		</div>
	)
}

export default OrganizationsPage
```

- [ ] **Step 3: Commit**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
git add components/organizations/CreateOrgDialog.tsx app/\[locale\]/\(personal\)/organizations/page.tsx
git commit -m "feat: добавить paywall логику при создании организации"
```

---

### Task 12: Frontend — Deactivated organization banner

**Files:**

- Create: `/Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted/components/organizations/OrgDeactivatedBanner.tsx`

- [ ] **Step 1: Create OrgDeactivatedBanner component**

```tsx
'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'

interface OrgDeactivatedBannerProps {
	variant: 'owner' | 'member' | 'public'
}

function OrgDeactivatedBanner({ variant }: OrgDeactivatedBannerProps) {
	const t = useTranslations('billing.orgDeactivated')
	const router = useRouter()

	const handleRenew = () => {
		router.push('/billing')
	}

	return (
		<div className="flex min-h-[60vh] items-center justify-center p-6">
			<Card className="max-w-md">
				<CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
					<AlertTriangle className="text-destructive size-12" />
					<p className="text-lg font-medium">{t(variant)}</p>
					{variant === 'owner' && (
						<Button onClick={handleRenew}>{t('renewLink')}</Button>
					)}
				</CardContent>
			</Card>
		</div>
	)
}

export { OrgDeactivatedBanner }
```

- [ ] **Step 2: Commit**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
git add components/organizations/OrgDeactivatedBanner.tsx
git commit -m "feat: добавить компонент баннера деактивированной организации"
```

---

### Task 13: Frontend — Handle deactivated org on public page

**Files:**

- Modify: `/Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted/app/[locale]/(public)/org/[orgId]/page.tsx`

- [ ] **Step 1: Add active check to public org page**

Replace `app/[locale]/(public)/org/[orgId]/page.tsx`:

```tsx
import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { CalendarViewConfigProvider } from '@/lib/calendar/CalendarViewConfigContext'
import { ORG_PUBLIC_CONFIG } from '@/lib/calendar/view-config'
import { OrgCalendarPage } from '@/components/booking/OrgCalendarPage'
import { orgApi } from '@/services'
import { OrgDeactivatedBanner } from '@/components/organizations/OrgDeactivatedBanner'

export default async function OrgPublicPage({
	params,
}: {
	params: Promise<{ orgId: string }>
}) {
	const { orgId } = await params
	const t = await getTranslations('booking')

	const orgResponse = await orgApi.getById({ pathParams: { id: orgId } })
	const org = orgResponse.data

	if (!org || org.active === false) {
		return <OrgDeactivatedBanner variant="public" />
	}

	return (
		<Suspense
			fallback={
				<div className="flex min-h-screen items-center justify-center">
					<p className="text-muted-foreground">{t('loading')}</p>
				</div>
			}
		>
			<CalendarViewConfigProvider config={ORG_PUBLIC_CONFIG}>
				<OrgCalendarPage orgSlug={orgId} />
			</CalendarViewConfigProvider>
		</Suspense>
	)
}
```

Note: The `OrgDeactivatedBanner` is a client component imported into a server component. This works because Next.js App Router supports importing client components into server components. The `orgApi.getById` call uses server-side fetch — ensure it uses the absolute URL variant for server components. If the existing `orgApi` doesn't work server-side, use `getData` directly with the full URL.

- [ ] **Step 2: Commit**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
git add app/\[locale\]/\(public\)/org/\[orgId\]/page.tsx
git commit -m "feat: показывать баннер деактивации на публичной странице организации"
```

---

### Task 14: Frontend — Handle deactivated org in management layout

**Files:**

- Modify: `/Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted/app/[locale]/(org)/manage/[orgId]/layout.tsx`

- [ ] **Step 1: Add org active check to management layout**

Replace `app/[locale]/(org)/manage/[orgId]/layout.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { checkOrgAccess } from '@/lib/auth/check-org-access'
import { orgApi } from '@/services'
import { OrgDeactivatedBanner } from '@/components/organizations/OrgDeactivatedBanner'

const ADMIN_ROLES = ['owner', 'admin']

export default async function ManageOrgLayout({
	children,
	params,
}: Readonly<{
	children: React.ReactNode
	params: Promise<{ orgId: string; locale: string }>
}>) {
	const { orgId, locale } = await params
	const membership = await checkOrgAccess(orgId)

	if (
		!membership ||
		membership.status !== 'active' ||
		!ADMIN_ROLES.includes(membership.role)
	) {
		redirect(`/${locale}/forbidden`)
	}

	const orgResponse = await orgApi.getById({ pathParams: { id: orgId } })
	const org = orgResponse.data

	if (!org || org.active === false) {
		const variant = membership.role === 'owner' ? 'owner' : 'member'
		return <OrgDeactivatedBanner variant={variant} />
	}

	return <>{children}</>
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
git add app/\[locale\]/\(org\)/manage/\[orgId\]/layout.tsx
git commit -m "feat: показывать баннер деактивации в layout управления организацией"
```

---

### Task 15: Frontend — Add OrgListItem active field type

**Files:**

- Modify: `/Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted/services/configs/org.types.ts`

- [ ] **Step 1: Add `active` to org types**

Add the `active` field to `OrgListItem` and the org response type in `services/configs/org.types.ts`. Find the `OrgListItem` interface and add:

```ts
active: boolean
```

Also add `active: boolean` to whatever type is used for `getById` response (the full org DTO).

- [ ] **Step 2: Commit**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
git add services/configs/org.types.ts
git commit -m "feat: добавить поле active в типы организации"
```

---

### Task 16: Verify everything works

- [ ] **Step 1: Run frontend lint**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
npm run lint
```

Expected: No errors.

- [ ] **Step 2: Run frontend build**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Run backend tests**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
npm test
```

Expected: All tests pass.

- [ ] **Step 4: Manual verification checklist**

- [ ] Set `CREEM_PRODUCT_ORG_CREATOR` in backend `.env`
- [ ] Start backend and frontend
- [ ] Visit `/billing` — should show `free` and `org_creator` plans, no `pro` or products
- [ ] Visit `/organizations` — click "Create" without subscription → paywall dialog
- [ ] Subscribe to `org_creator` plan via Creem checkout
- [ ] After subscription — create up to 3 organizations
- [ ] Try creating 4th org — should see limit reached message
- [ ] Cancel subscription → organizations should deactivate
- [ ] Visit public org page — should show deactivation banner
- [ ] Visit management page — should show deactivation banner with renew link
- [ ] Re-subscribe — organizations should reactivate
