# Dynamic Booking Statuses — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded booking statuses with a dynamic, user-configurable system stored in a `BookingStatus` MongoDB collection, seeded on user/org creation, with an extensible action system (first action: `hideFromSchedule`).

**Architecture:** New `BookingStatus` model + CRUD API + seed logic on registration/org-creation. `Booking.status` string field replaced with `Booking.statusId` ObjectId ref. Slot generation and conflict detection switch from `ACTIVE_BOOKING_STATUSES` array to querying statuses with `hideFromSchedule` action. Frontend removes all hardcoded status constants and renders dynamically from the populated status object.

**Tech Stack:** MongoDB/Mongoose (backend), Express routes (backend), Next.js + React + TypeScript + Tailwind + shadcn/ui (frontend)

---

## Scope Check

This spec covers two subsystems that are tightly coupled:

1. **Backend** — model, seed, CRUD API, booking modifications
2. **Frontend** — types, API client, component refactors, settings UI

They share the same data contract and must be deployed together, so a single plan is appropriate.

---

## File Structure

### Backend (BackendTemplate)

| Action | File                                          | Responsibility                                                         |
| ------ | --------------------------------------------- | ---------------------------------------------------------------------- |
| Create | `src/constants/bookingStatus.js`              | Action registry, color palette, default status seeds                   |
| Create | `src/models/BookingStatus.js`                 | Mongoose schema + indexes                                              |
| Create | `src/repository/bookingStatusRepository.js`   | DB queries for BookingStatus CRUD                                      |
| Create | `src/services/bookingStatusServices.js`       | Business logic: create, update, archive, restore, seed                 |
| Create | `src/controllers/bookingStatusController.js`  | HTTP handlers for BookingStatus CRUD                                   |
| Create | `src/dto/bookingStatusDto.js`                 | DTO transformer                                                        |
| Create | `src/routes/subroutes/bookingStatusRoutes.js` | Express router                                                         |
| Create | `src/scripts/migrateBookingStatuses.js`       | One-time migration script                                              |
| Modify | `src/models/Booking.js`                       | Replace `status` string with `statusId` ObjectId ref                   |
| Modify | `src/models/Organization.js`                  | Add `defaultBookingStatusId` field                                     |
| Modify | `src/modules/user/model/User.js`              | Add `defaultBookingStatusId` field                                     |
| Modify | `src/constants/booking.js`                    | Remove `BOOKING_STATUS`, `BOOKING_STATUSES`, `ACTIVE_BOOKING_STATUSES` |
| Modify | `src/repository/bookingRepository.js`         | Replace status string queries with statusId + hidden action queries    |
| Modify | `src/services/bookingServices.js`             | Use `defaultBookingStatusId` for new bookings, remove status enum      |
| Modify | `src/controllers/bookingController.js`        | Remove `ALLOWED_STATUS_TRANSITIONS`, use statusId                      |
| Modify | `src/dto/bookingDto.js`                       | Populate statusId into full status object                              |
| Modify | `src/services/slotServices.js`                | Use hidden status IDs instead of `ACTIVE_BOOKING_STATUSES`             |
| Modify | `src/routes/routes.js`                        | Mount bookingStatus routes                                             |
| Modify | `src/modules/auth/services/authServices.js`   | Seed default statuses on user registration                             |
| Modify | `src/services/orgServices.js`                 | Seed default statuses on org creation                                  |

### Frontend (Slotix-fronted)

| Action | File                                            | Responsibility                                                              |
| ------ | ----------------------------------------------- | --------------------------------------------------------------------------- |
| Create | `services/configs/bookingStatus.types.ts`       | `BookingStatusObject` interface, body types                                 |
| Create | `services/configs/bookingStatus.config.ts`      | API endpoint config                                                         |
| Create | `components/booking/BookingStatusBadge.tsx`     | Dynamic status badge component                                              |
| Modify | `services/configs/booking.types.ts`             | Replace `BookingStatus` union with `BookingStatusObject`, update interfaces |
| Modify | `lib/booking-api-client.ts`                     | Update DTOs, `updateBookingStatus` to use statusId                          |
| Modify | `lib/calendar/types.ts`                         | Update `ConfirmedBooking.status` type                                       |
| Modify | `lib/calendar/hooks/useBookingActions.ts`       | Update `handleBookingStatusChange` signature                                |
| Modify | `components/staff-schedule/BookingListItem.tsx` | Use `BookingStatusBadge`, remove `STATUS_VARIANT`                           |
| Modify | `components/booking/BookingDetailPanel.tsx`     | Remove hardcoded constants, use dynamic statuses                            |
| Modify | `components/booking/BookingDetailsPanel.tsx`    | Remove hardcoded constants, use dynamic statuses                            |
| Modify | `i18n/messages/en.json`                         | Add new default status keys                                                 |
| Modify | `i18n/messages/uk.json`                         | Add new default status keys                                                 |

---

## Task 1: Backend — Constants & Action Registry

**Files:**

- Create: `src/constants/bookingStatus.js`
- Modify: `src/constants/booking.js:1-32,72-85`

- [ ] **Step 1: Create bookingStatus constants file**

```js
// src/constants/bookingStatus.js

const BOOKING_STATUS_ACTIONS = {
	HIDE_FROM_SCHEDULE: 'hideFromSchedule',
}

const VALID_ACTIONS = Object.values(BOOKING_STATUS_ACTIONS)

const STATUS_COLORS = [
	'blue',
	'green',
	'red',
	'yellow',
	'purple',
	'orange',
	'gray',
	'teal',
]

const DEFAULT_STATUSES = [
	{
		label: 'status_unconfirmed',
		color: 'yellow',
		actions: [],
		isDefault: true,
		order: 0,
	},
	{
		label: 'status_confirmed',
		color: 'blue',
		actions: [],
		isDefault: true,
		order: 1,
	},
	{
		label: 'status_paid',
		color: 'green',
		actions: [],
		isDefault: true,
		order: 2,
	},
	{
		label: 'status_cancelled',
		color: 'red',
		actions: [BOOKING_STATUS_ACTIONS.HIDE_FROM_SCHEDULE],
		isDefault: true,
		order: 3,
	},
]

export {
	BOOKING_STATUS_ACTIONS,
	VALID_ACTIONS,
	STATUS_COLORS,
	DEFAULT_STATUSES,
}
```

- [ ] **Step 2: Remove old status constants from booking.js**

In `src/constants/booking.js`, remove:

- `BOOKING_STATUS` object (lines 1-7)
- `BOOKING_STATUSES` (line 9)
- `ACTIVE_BOOKING_STATUSES` (lines 29-32)

Remove them from exports (lines 72-85). Keep `PAYMENT_STATUS`, `PAYMENT_STATUSES`, `SLOT_MODE`, `SLOT_MODES`, `NOTIFICATION_TYPE`, `NOTIFICATION_STATUS`, `NOTIFICATION_CHANNEL`, `MEMBERSHIP_STATUS`, `HOST_ROLE`.

Updated `src/constants/booking.js`:

```js
const PAYMENT_STATUS = {
	NONE: 'none',
	PENDING: 'pending',
	PAID: 'paid',
	REFUNDED: 'refunded',
	FAILED: 'failed',
}

const PAYMENT_STATUSES = Object.values(PAYMENT_STATUS)

const SLOT_MODE = {
	FIXED: 'fixed',
	OPTIMAL: 'optimal',
	DYNAMIC: 'dynamic',
}

const SLOT_MODES = Object.values(SLOT_MODE)

const NOTIFICATION_TYPE = {
	BOOKING_CONFIRMED: 'booking_confirmed',
	BOOKING_CANCELLED: 'booking_cancelled',
	BOOKING_RESCHEDULED: 'booking_rescheduled',
	BOOKING_COMPLETED: 'booking_completed',
	BOOKING_NO_SHOW: 'booking_no_show',
	BOOKING_STATUS_CHANGED: 'booking_status_changed',
	REMINDER_24H: 'reminder_24h',
	REMINDER_1H: 'reminder_1h',
	FOLLOW_UP: 'follow_up',
}

const NOTIFICATION_STATUS = {
	SCHEDULED: 'scheduled',
	SENT: 'sent',
	FAILED: 'failed',
	SKIPPED: 'skipped',
}

const NOTIFICATION_CHANNEL = {
	EMAIL: 'email',
	SMS: 'sms',
	TELEGRAM: 'telegram',
}

const MEMBERSHIP_STATUS = {
	ACTIVE: 'active',
	INVITED: 'invited',
	SUSPENDED: 'suspended',
	LEFT: 'left',
}

const HOST_ROLE = {
	LEAD: 'lead',
	ASSISTANT: 'assistant',
	OBSERVER: 'observer',
}

export {
	PAYMENT_STATUS,
	PAYMENT_STATUSES,
	SLOT_MODE,
	SLOT_MODES,
	NOTIFICATION_TYPE,
	NOTIFICATION_STATUS,
	NOTIFICATION_CHANNEL,
	MEMBERSHIP_STATUS,
	HOST_ROLE,
}
```

- [ ] **Step 3: Verify no import errors**

Run: `grep -rn "BOOKING_STATUS\|ACTIVE_BOOKING_STATUSES" src/ --include="*.js" | grep -v "bookingStatus"`

This will show all files still importing the removed constants — they will be fixed in subsequent tasks. Note them down.

- [ ] **Step 4: Commit**

```bash
git add src/constants/bookingStatus.js src/constants/booking.js
git commit -m "feat(booking-status): добавить action registry и дефолтные статусы, удалить захардкоженные константы"
```

---

## Task 2: Backend — BookingStatus Model

**Files:**

- Create: `src/models/BookingStatus.js`

- [ ] **Step 1: Create BookingStatus Mongoose model**

```js
// src/models/BookingStatus.js
import mongoose from 'mongoose'
import { VALID_ACTIONS, STATUS_COLORS } from '../constants/bookingStatus.js'

const { Schema, model } = mongoose

const BookingStatusSchema = new Schema(
	{
		/**
		 * Название статуса.
		 * Для дефолтных: i18n ключ ("status_confirmed").
		 * Для кастомных: произвольная строка.
		 */
		label: { type: String, required: true },

		/**
		 * Цвет из предустановленной палитры.
		 */
		color: {
			type: String,
			enum: STATUS_COLORS,
			required: true,
		},

		/**
		 * Действия из реестра: ["hideFromSchedule"].
		 */
		actions: {
			type: [String],
			validate: {
				validator: (arr) => arr.every((a) => VALID_ACTIONS.includes(a)),
				message: 'Invalid action in actions array',
			},
			default: [],
		},

		/**
		 * true = системный статус, создан при сиде.
		 * Нельзя удалить навсегда (только архивировать).
		 */
		isDefault: { type: Boolean, default: false },

		/**
		 * true = архивирован, не доступен для выбора.
		 */
		isArchived: { type: Boolean, default: false },

		/**
		 * ObjectId = статус организации, null = персональный.
		 */
		orgId: {
			type: Schema.Types.ObjectId,
			ref: 'Organization',
			default: null,
		},

		/**
		 * Персональный: ID владельца, орг: null.
		 */
		userId: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			default: null,
		},

		/**
		 * Порядок отображения (0, 1, 2, 3...).
		 */
		order: { type: Number, default: 0 },
	},
	{ timestamps: true },
)

/** Уникальность label в рамках scope */
BookingStatusSchema.index({ label: 1, orgId: 1, userId: 1 }, { unique: true })

/** Быстрый список по org */
BookingStatusSchema.index({ orgId: 1, isArchived: 1 })

/** Поиск по action */
BookingStatusSchema.index({ actions: 1, orgId: 1 })

export default model('BookingStatus', BookingStatusSchema)
```

- [ ] **Step 2: Commit**

```bash
git add src/models/BookingStatus.js
git commit -m "feat(booking-status): модель BookingStatus с индексами"
```

---

## Task 3: Backend — DTO & Repository

**Files:**

- Create: `src/dto/bookingStatusDto.js`
- Create: `src/repository/bookingStatusRepository.js`

- [ ] **Step 1: Create BookingStatus DTO**

```js
// src/dto/bookingStatusDto.js

const toBookingStatusDto = (doc) => ({
	id: doc._id.toString(),
	label: doc.label,
	color: doc.color,
	actions: doc.actions,
	isDefault: doc.isDefault,
	isArchived: doc.isArchived,
	orgId: doc.orgId ? doc.orgId.toString() : null,
	userId: doc.userId ? doc.userId.toString() : null,
	order: doc.order,
})

export { toBookingStatusDto }
```

- [ ] **Step 2: Create BookingStatus repository**

```js
// src/repository/bookingStatusRepository.js
import BookingStatus from '../models/BookingStatus.js'
import { toBookingStatusDto } from '../dto/bookingStatusDto.js'
import { BOOKING_STATUS_ACTIONS } from '../constants/bookingStatus.js'

const createStatus = async (data) => {
	const doc = await BookingStatus.create(data)
	return toBookingStatusDto(doc)
}

const createManyStatuses = async (dataArray) => {
	const docs = await BookingStatus.insertMany(dataArray)
	return docs.map(toBookingStatusDto)
}

const findByScope = async (orgId, userId = null) => {
	const query = orgId
		? { orgId, isArchived: false }
		: { userId, orgId: null, isArchived: false }
	const docs = await BookingStatus.find(query).sort({ order: 1 })
	return docs.map(toBookingStatusDto)
}

const findById = async (id) => {
	const doc = await BookingStatus.findById(id)
	return doc ? toBookingStatusDto(doc) : null
}

const findRawById = async (id) => {
	return BookingStatus.findById(id)
}

const updateStatus = async (id, updates) => {
	const doc = await BookingStatus.findByIdAndUpdate(id, updates, { new: true })
	return doc ? toBookingStatusDto(doc) : null
}

const findByLabel = async (label, orgId, userId = null) => {
	const query = orgId ? { label, orgId } : { label, userId, orgId: null }
	const doc = await BookingStatus.findOne(query)
	return doc ? toBookingStatusDto(doc) : null
}

const getHiddenStatusIds = async (orgId, userId = null) => {
	const query = orgId
		? { orgId, actions: BOOKING_STATUS_ACTIONS.HIDE_FROM_SCHEDULE }
		: {
				userId,
				orgId: null,
				actions: BOOKING_STATUS_ACTIONS.HIDE_FROM_SCHEDULE,
			}
	return BookingStatus.find(query).distinct('_id')
}

const countByScope = async (orgId, userId = null) => {
	const query = orgId
		? { orgId, isArchived: false }
		: { userId, orgId: null, isArchived: false }
	return BookingStatus.countDocuments(query)
}

export {
	createStatus,
	createManyStatuses,
	findByScope,
	findById,
	findRawById,
	updateStatus,
	findByLabel,
	getHiddenStatusIds,
	countByScope,
}
```

- [ ] **Step 3: Commit**

```bash
git add src/dto/bookingStatusDto.js src/repository/bookingStatusRepository.js
git commit -m "feat(booking-status): DTO и repository для BookingStatus"
```

---

## Task 4: Backend — Service Layer (CRUD + Seed)

**Files:**

- Create: `src/services/bookingStatusServices.js`

- [ ] **Step 1: Create BookingStatus service**

```js
// src/services/bookingStatusServices.js
import {
	createStatus,
	createManyStatuses,
	findByScope,
	findById,
	updateStatus,
	findByLabel,
	countByScope,
} from '../repository/bookingStatusRepository.js'
import {
	VALID_ACTIONS,
	STATUS_COLORS,
	DEFAULT_STATUSES,
} from '../constants/bookingStatus.js'
import { HttpError } from '../shared/utils/http/httpError.js'
import { generalStatus } from '../shared/utils/http/httpStatus.js'
import Organization from '../models/Organization.js'
import User from '../modules/user/model/User.js'

/**
 * Создать 4 дефолтных статуса для scope (org или personal).
 * Возвращает массив созданных статусов.
 * Устанавливает defaultBookingStatusId на status_unconfirmed.
 */
const seedDefaultStatuses = async (orgId, userId = null) => {
	const existing = await countByScope(orgId, userId)
	if (existing > 0) return []

	const toStatusData = (template) => ({
		...template,
		orgId: orgId || null,
		userId: orgId ? null : userId,
	})
	const statusDataArray = DEFAULT_STATUSES.map(toStatusData)
	const created = await createManyStatuses(statusDataArray)

	// Установить defaultBookingStatusId = status_unconfirmed
	const unconfirmed = created.find((s) => s.label === 'status_unconfirmed')
	if (unconfirmed) {
		if (orgId) {
			await Organization.findByIdAndUpdate(orgId, {
				defaultBookingStatusId: unconfirmed.id,
			})
		} else if (userId) {
			await User.findByIdAndUpdate(userId, {
				defaultBookingStatusId: unconfirmed.id,
			})
		}
	}

	return created
}

const getStatusesByScope = async (orgId, userId) => {
	return findByScope(orgId, userId)
}

const createCustomStatus = async ({ label, color, actions, orgId, userId }) => {
	if (!label || !label.trim()) {
		throw new HttpError(generalStatus.BAD_REQUEST)
	}
	if (!STATUS_COLORS.includes(color)) {
		throw new HttpError(generalStatus.BAD_REQUEST)
	}
	const invalidAction = (actions || []).find((a) => !VALID_ACTIONS.includes(a))
	if (invalidAction) {
		throw new HttpError(generalStatus.BAD_REQUEST)
	}

	// Проверить уникальность label в scope
	const duplicate = await findByLabel(label, orgId, userId)
	if (duplicate) {
		throw new HttpError(generalStatus.BAD_REQUEST)
	}

	const nextOrder = await countByScope(orgId, userId)

	return createStatus({
		label,
		color,
		actions: actions || [],
		isDefault: false,
		isArchived: false,
		orgId: orgId || null,
		userId: orgId ? null : userId,
		order: nextOrder,
	})
}

const updateStatusById = async (id, updates) => {
	const existing = await findById(id)
	if (!existing) throw new HttpError(generalStatus.NOT_FOUND)

	const allowed = {}
	if (updates.label !== undefined) allowed.label = updates.label
	if (updates.color !== undefined) {
		if (!STATUS_COLORS.includes(updates.color)) {
			throw new HttpError(generalStatus.BAD_REQUEST)
		}
		allowed.color = updates.color
	}
	if (updates.actions !== undefined) {
		const invalidAction = updates.actions.find(
			(a) => !VALID_ACTIONS.includes(a),
		)
		if (invalidAction) {
			throw new HttpError(generalStatus.BAD_REQUEST)
		}
		allowed.actions = updates.actions
	}
	if (updates.order !== undefined) allowed.order = updates.order

	return updateStatus(id, allowed)
}

const archiveStatus = async (id) => {
	const existing = await findById(id)
	if (!existing) throw new HttpError(generalStatus.NOT_FOUND)

	// Нельзя архивировать дефолтный статус для новых бронирований
	const isOrgDefault = existing.orgId
		? await Organization.findOne({
				_id: existing.orgId,
				defaultBookingStatusId: id,
			})
		: null
	const isUserDefault = existing.userId
		? await User.findOne({ _id: existing.userId, defaultBookingStatusId: id })
		: null

	if (isOrgDefault || isUserDefault) {
		throw new HttpError(generalStatus.BAD_REQUEST)
	}

	return updateStatus(id, { isArchived: true })
}

const restoreStatus = async (id) => {
	const existing = await findById(id)
	if (!existing) throw new HttpError(generalStatus.NOT_FOUND)

	return updateStatus(id, { isArchived: false })
}

export {
	seedDefaultStatuses,
	getStatusesByScope,
	createCustomStatus,
	updateStatusById,
	archiveStatus,
	restoreStatus,
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/bookingStatusServices.js
git commit -m "feat(booking-status): сервисный слой — CRUD + seed дефолтных статусов"
```

---

## Task 5: Backend — Controller & Routes

**Files:**

- Create: `src/controllers/bookingStatusController.js`
- Create: `src/routes/subroutes/bookingStatusRoutes.js`
- Modify: `src/routes/routes.js:12,36`

- [ ] **Step 1: Create BookingStatus controller**

```js
// src/controllers/bookingStatusController.js
import {
	getStatusesByScope,
	createCustomStatus,
	updateStatusById,
	archiveStatus,
	restoreStatus,
} from '../services/bookingStatusServices.js'
import {
	httpResponse,
	httpResponseError,
} from '../shared/utils/http/httpResponse.js'
import { generalStatus } from '../shared/utils/http/httpStatus.js'
import { isValidObjectId } from '../shared/utils/validation/validators.js'

const handleGetStatuses = async (req, res) => {
	try {
		const { orgId } = req.query
		const userId = req.user._id

		const statuses = orgId
			? await getStatusesByScope(orgId, null)
			: await getStatusesByScope(null, userId)

		return httpResponse(res, generalStatus.SUCCESS, statuses)
	} catch (error) {
		return httpResponseError(res, error)
	}
}

const handleCreateStatus = async (req, res) => {
	try {
		const { label, color, actions, orgId } = req.body
		const userId = req.user._id

		const status = await createCustomStatus({
			label,
			color,
			actions,
			orgId: orgId || null,
			userId: orgId ? null : userId,
		})

		return httpResponse(res, generalStatus.CREATED, status)
	} catch (error) {
		return httpResponseError(res, error)
	}
}

const handleUpdateStatus = async (req, res) => {
	try {
		if (!isValidObjectId(req.params.id)) {
			return httpResponse(res, generalStatus.BAD_REQUEST)
		}

		const updated = await updateStatusById(req.params.id, req.body)
		return httpResponse(res, generalStatus.SUCCESS, updated)
	} catch (error) {
		return httpResponseError(res, error)
	}
}

const handleArchiveStatus = async (req, res) => {
	try {
		if (!isValidObjectId(req.params.id)) {
			return httpResponse(res, generalStatus.BAD_REQUEST)
		}

		const archived = await archiveStatus(req.params.id)
		return httpResponse(res, generalStatus.SUCCESS, archived)
	} catch (error) {
		return httpResponseError(res, error)
	}
}

const handleRestoreStatus = async (req, res) => {
	try {
		if (!isValidObjectId(req.params.id)) {
			return httpResponse(res, generalStatus.BAD_REQUEST)
		}

		const restored = await restoreStatus(req.params.id)
		return httpResponse(res, generalStatus.SUCCESS, restored)
	} catch (error) {
		return httpResponseError(res, error)
	}
}

export {
	handleGetStatuses,
	handleCreateStatus,
	handleUpdateStatus,
	handleArchiveStatus,
	handleRestoreStatus,
}
```

- [ ] **Step 2: Create BookingStatus routes**

```js
// src/routes/subroutes/bookingStatusRoutes.js
import express from 'express'
import { authMiddleware } from '../../modules/auth/index.js'
import {
	handleGetStatuses,
	handleCreateStatus,
	handleUpdateStatus,
	handleArchiveStatus,
	handleRestoreStatus,
} from '../../controllers/bookingStatusController.js'

const router = express.Router()

router.get('/', authMiddleware, handleGetStatuses)
router.post('/', authMiddleware, handleCreateStatus)
router.patch('/:id', authMiddleware, handleUpdateStatus)
router.patch('/:id/archive', authMiddleware, handleArchiveStatus)
router.patch('/:id/restore', authMiddleware, handleRestoreStatus)

export default router
```

- [ ] **Step 3: Mount routes in routes.js**

Add import at line 12 area:

```js
import bookingStatusRoutes from './subroutes/bookingStatusRoutes.js'
```

Add route at line 36 area (after `bookingRoutes`):

```js
router.use('/booking-statuses', bookingStatusRoutes)
```

- [ ] **Step 4: Commit**

```bash
git add src/controllers/bookingStatusController.js src/routes/subroutes/bookingStatusRoutes.js src/routes/routes.js
git commit -m "feat(booking-status): контроллер, роуты, маунт в routes.js"
```

---

## Task 6: Backend — Modify Organization & User Models

**Files:**

- Modify: `src/models/Organization.js:87`
- Modify: `src/modules/user/model/User.js:14`

- [ ] **Step 1: Add defaultBookingStatusId to Organization**

In `src/models/Organization.js`, add before the closing of the schema (before `{ timestamps: true }`):

```js
    /**
     * Дефолтный статус для новых бронирований в организации.
     */
    defaultBookingStatusId: {
      type: Schema.Types.ObjectId,
      ref: "BookingStatus",
      default: null,
    },
```

Add it after the `settings` block (after line 87).

- [ ] **Step 2: Add defaultBookingStatusId to User**

In `src/modules/user/model/User.js`, add before `{ timestamps: true }`:

```js
    /**
     * Дефолтный статус для новых бронирований в персональном расписании.
     */
    defaultBookingStatusId: {
      type: Schema.Types.ObjectId,
      ref: "BookingStatus",
      default: null,
    },
```

Add it after `telegramChatId` (after line 14).

- [ ] **Step 3: Commit**

```bash
git add src/models/Organization.js src/modules/user/model/User.js
git commit -m "feat(booking-status): добавить defaultBookingStatusId в Organization и User"
```

---

## Task 7: Backend — Modify Booking Model

**Files:**

- Modify: `src/models/Booking.js:9-15,126-130,197-218`

- [ ] **Step 1: Replace status field with statusId**

In `src/models/Booking.js`:

1. Remove `BOOKING_STATUSES` array (lines 9-15).

2. Replace the `status` field (lines 126-130):

Before:

```js
    status: {
      type: String,
      enum: BOOKING_STATUSES,
      default: "confirmed",
    },
```

After:

```js
    /**
     * Динамический статус бронирования.
     * Ссылка на BookingStatus collection.
     */
    statusId: {
      type: Schema.Types.ObjectId,
      ref: "BookingStatus",
      required: true,
    },
```

3. Update indexes that reference `status` — replace `status` with `statusId`:

Line 201: `{ "hosts.userId": 1, status: 1, startAt: 1 }` → `{ "hosts.userId": 1, statusId: 1, startAt: 1 }`

Line 207: `{ orgId: 1, status: 1, startAt: 1 }` → `{ orgId: 1, statusId: 1, startAt: 1 }`

Line 210: `{ locationId: 1, status: 1, startAt: 1 }` → `{ locationId: 1, statusId: 1, startAt: 1 }`

4. Remove the partial index (lines 215-218) — it was filtering by `status: "confirmed"` which no longer makes sense with dynamic statuses.

- [ ] **Step 2: Commit**

```bash
git add src/models/Booking.js
git commit -m "feat(booking-status): Booking.status → Booking.statusId (ObjectId ref)"
```

---

## Task 8: Backend — Modify Booking DTO (Populate Status)

**Files:**

- Modify: `src/dto/bookingDto.js:27-46,48-62`

- [ ] **Step 1: Update toBookingDto to include populated status**

Replace `src/dto/bookingDto.js`:

```js
const toHostDto = (host) => ({
	userId: host.userId.toString(),
	role: host.role,
})

const toInviteeSnapshotDto = (snapshot) => ({
	name: snapshot.name,
	email: snapshot.email,
	phone: snapshot.phone,
})

const toPaymentDto = (payment) => ({
	status: payment.status,
	amount: payment.amount,
	currency: payment.currency,
})

const toCustomFieldValueDto = (entry) => ({
	fieldId: entry.fieldId,
	label: entry.label,
	value: entry.value,
})

const extractId = (field) =>
	field && field._id ? field._id.toString() : field.toString()

const toStatusDto = (statusId) => {
	// statusId может быть populated объектом или plain ObjectId
	if (statusId && statusId._id) {
		return {
			id: statusId._id.toString(),
			label: statusId.label,
			color: statusId.color,
			actions: statusId.actions,
			isDefault: statusId.isDefault,
		}
	}
	// Fallback: ещё не populated
	return { id: statusId ? statusId.toString() : null }
}

const toBookingDto = (doc) => ({
	id: doc._id.toString(),
	eventTypeId: extractId(doc.eventTypeId),
	hosts: doc.hosts.map(toHostDto),
	inviteeId: doc.inviteeId.toString(),
	orgId: doc.orgId ? doc.orgId.toString() : null,
	locationId: doc.locationId ? doc.locationId.toString() : null,
	startAt: doc.startAt,
	endAt: doc.endAt,
	timezone: doc.timezone,
	statusId: doc.statusId ? doc.statusId.toString() : null,
	status: toStatusDto(doc.statusId),
	inviteeSnapshot: toInviteeSnapshotDto(doc.inviteeSnapshot),
	clientNotes: doc.clientNotes,
	customFieldValues: Array.isArray(doc.customFieldValues)
		? doc.customFieldValues.map(toCustomFieldValueDto)
		: [],
	payment: toPaymentDto(doc.payment),
	createdAt: doc.createdAt,
	updatedAt: doc.updatedAt,
})

const toBookingCreatedDto = (doc, eventType) => ({
	id: doc._id.toString(),
	eventTypeId: extractId(doc.eventTypeId),
	eventTypeName: eventType.name,
	staffId: doc.hosts[0].userId.toString(),
	startAt: doc.startAt,
	endAt: doc.endAt,
	timezone: doc.timezone,
	locationId: doc.locationId ? doc.locationId.toString() : null,
	statusId: doc.statusId ? doc.statusId.toString() : null,
	status: toStatusDto(doc.statusId),
	cancelToken: doc.cancelToken,
	invitee: toInviteeSnapshotDto(doc.inviteeSnapshot),
	payment: toPaymentDto(doc.payment),
	createdAt: doc.createdAt,
})

export { toBookingDto, toBookingCreatedDto }
```

- [ ] **Step 2: Commit**

```bash
git add src/dto/bookingDto.js
git commit -m "feat(booking-status): DTO — statusId + populated status object"
```

---

## Task 9: Backend — Modify Booking Repository

**Files:**

- Modify: `src/repository/bookingRepository.js`

- [ ] **Step 1: Rewrite bookingRepository to use statusId and hidden actions**

Replace `src/repository/bookingRepository.js`:

```js
import Booking from '../models/Booking.js'
import { toBookingDto } from '../dto/bookingDto.js'
import { getHiddenStatusIds } from './bookingStatusRepository.js'

const createBooking = async (data) => {
	const doc = await Booking.create(data)
	const populated = await doc.populate('statusId')
	return toBookingDto(populated)
}

const findConflict = async (staffId, startAt, endAt, orgId = null) => {
	const userId = staffId
	const hiddenIds = await getHiddenStatusIds(orgId, orgId ? null : userId)

	const doc = await Booking.findOne({
		'hosts.userId': staffId,
		orgId: orgId || null,
		statusId: { $nin: hiddenIds },
		startAt: { $lt: endAt },
		endAt: { $gt: startAt },
	})
	return doc
}

const findByStaffAndDate = async (
	staffId,
	dateStart,
	dateEnd,
	orgId = null,
) => {
	const hiddenIds = await getHiddenStatusIds(orgId, orgId ? null : staffId)

	const docs = await Booking.find({
		'hosts.userId': staffId,
		statusId: { $nin: hiddenIds },
		startAt: { $lt: dateEnd },
		endAt: { $gt: dateStart },
	})
	return docs
}

const findByStaffFiltered = async ({
	staffId,
	dateFrom,
	dateTo,
	locationId,
	orgId,
	statuses,
}) => {
	const query = {
		'hosts.userId': staffId,
		startAt: { $gte: dateFrom, $lte: dateTo },
	}
	if (locationId) query.locationId = locationId
	if (orgId !== undefined) query.orgId = orgId

	// statuses теперь массив statusId строк (если передан с фронта)
	if (statuses) {
		query.statusId = { $in: statuses }
	}
	// Без фильтра — показываем все (включая скрытые), фильтрация на уровне UI

	const docs = await Booking.find(query)
		.populate('statusId')
		.sort({ startAt: 1 })
	return docs.map(toBookingDto)
}

const findBookingById = async (id) => {
	const doc = await Booking.findById(id)
		.populate('eventTypeId', 'name durationMin')
		.populate('statusId')
	return doc
}

const findBookingByToken = async (cancelToken) => {
	const doc = await Booking.findOne({ cancelToken }).populate('statusId')
	return doc
}

const cancelBooking = async (id, reason, cancelStatusId) => {
	const doc = await Booking.findByIdAndUpdate(
		id,
		{
			statusId: cancelStatusId,
			cancelReason: reason || null,
			cancelToken: null,
			rescheduleToken: null,
		},
		{ new: true },
	).populate('statusId')
	if (!doc) return null
	return toBookingDto(doc)
}

const countConfirmedBookings = async (
	staffId,
	dateStart,
	dateEnd,
	orgId = null,
) => {
	// Считаем все бронирования кроме скрытых (hideFromSchedule)
	const hiddenIds = await getHiddenStatusIds(orgId, orgId ? null : staffId)
	const count = await Booking.countDocuments({
		'hosts.userId': staffId,
		statusId: { $nin: hiddenIds },
		startAt: { $gte: dateStart, $lt: dateEnd },
	})
	return count
}

const updateBookingStatus = async (id, statusId) => {
	const doc = await Booking.findByIdAndUpdate(
		id,
		{ statusId },
		{ new: true },
	).populate('statusId')
	if (!doc) return null
	return toBookingDto(doc)
}

const rescheduleBooking = async (id, startAt, endAt) => {
	const doc = await Booking.findByIdAndUpdate(
		id,
		{ startAt, endAt },
		{ new: true },
	).populate('statusId')
	if (!doc) return null
	return toBookingDto(doc)
}

export {
	createBooking,
	findConflict,
	findByStaffAndDate,
	findByStaffFiltered,
	findBookingById,
	findBookingByToken,
	cancelBooking,
	countConfirmedBookings,
	updateBookingStatus,
	rescheduleBooking,
}
```

**Ключевые изменения:**

- `findConflict` и `findByStaffAndDate` используют `getHiddenStatusIds` вместо `ACTIVE_BOOKING_STATUSES`
- `findByStaffAndDate` теперь принимает `orgId` для определения scope статусов
- `cancelBooking` принимает `cancelStatusId` вместо хардкода
- Все запросы с `populate("statusId")` для DTO
- `findByStaffFiltered` — `statuses` теперь массив ObjectId

- [ ] **Step 2: Commit**

```bash
git add src/repository/bookingRepository.js
git commit -m "feat(booking-status): repository — statusId + getHiddenStatusIds вместо ACTIVE_BOOKING_STATUSES"
```

---

## Task 10: Backend — Modify Booking Services

**Files:**

- Modify: `src/services/bookingServices.js`

- [ ] **Step 1: Rewrite bookingServices to use dynamic statuses**

Key changes:

1. Remove imports of `BOOKING_STATUS` from `constants/booking.js`
2. Import `findByLabel` from `bookingStatusRepository`
3. `createBooking`: resolve `defaultBookingStatusId` from Organization or User instead of hardcoding status
4. `cancelBookingById` / `cancelBookingByToken`: find the cancel status (with `hideFromSchedule` action) dynamically
5. `updateBookingStatus`: accept `statusId` instead of status string
6. Remove `STATUS_NOTIFICATION_MAP` (notifications will use generic `BOOKING_STATUS_CHANGED`)

Replace `src/services/bookingServices.js`:

```js
import crypto from 'crypto'
import { getEventTypeById } from '../repository/eventTypeRepository.js'
import { getMembershipByUserAndOrg } from '../repository/membershipRepository.js'
import { findActiveTemplate } from '../repository/scheduleTemplateRepository.js'
import { resolvePriceForStaff } from './positionPricingServices.js'
import {
	createBooking as repoCreate,
	findConflict,
	findByStaffFiltered,
	findBookingById,
	findBookingByToken,
	cancelBooking as repoCancel,
	updateBookingStatus as repoUpdateStatus,
	rescheduleBooking as repoReschedule,
} from '../repository/bookingRepository.js'
import { toBookingDto } from '../dto/bookingDto.js'
import { findOrCreateInvitee } from '../repository/inviteeRepository.js'
import {
	createBookingNotifications,
	skipNotifications,
	sendBookingTelegramNotifications,
} from './notificationServices.js'
import {
	PAYMENT_STATUS,
	HOST_ROLE,
	NOTIFICATION_TYPE,
} from '../constants/booking.js'
import { BOOKING_STATUS_ACTIONS } from '../constants/bookingStatus.js'
import {
	findByLabel,
	getHiddenStatusIds,
} from '../repository/bookingStatusRepository.js'
import { HttpError } from '../shared/utils/http/httpError.js'
import { bookingStatus } from '../shared/utils/http/httpStatus.js'
import {
	parseWallClockToUtc,
	isValidTimezone,
	resolveScheduleTimezone,
	getOrgTimezone,
} from '../shared/utils/timezone.js'
import Organization from '../models/Organization.js'
import User from '../modules/user/model/User.js'

const generateToken = () => crypto.randomBytes(32).toString('hex')

const computePaymentStatus = (amount) =>
	amount > 0 ? PAYMENT_STATUS.PENDING : PAYMENT_STATUS.NONE

/**
 * Получить defaultBookingStatusId для scope.
 */
const resolveDefaultStatusId = async (orgId, userId) => {
	if (orgId) {
		const org = await Organization.findById(orgId).select(
			'defaultBookingStatusId',
		)
		return org ? org.defaultBookingStatusId : null
	}
	const user = await User.findById(userId).select('defaultBookingStatusId')
	return user ? user.defaultBookingStatusId : null
}

/**
 * Найти статус с действием hideFromSchedule (для отмены).
 */
const resolveCancelStatusId = async (orgId, userId) => {
	const hiddenIds = await getHiddenStatusIds(orgId, orgId ? null : userId)
	return hiddenIds.length > 0 ? hiddenIds[0] : null
}

const createBooking = async ({
	eventTypeId,
	staffId,
	startAt,
	timezone,
	invitee,
	customFieldValues,
}) => {
	const eventType = await getEventTypeById(eventTypeId)
	if (!eventType) return { error: 'eventType_not_found' }

	const clientTimezone = isValidTimezone(timezone) ? timezone : null

	const template = await findActiveTemplate(
		staffId,
		eventType.orgId || null,
		null,
		new Date(startAt),
	)
	if (!template) return { error: 'template_not_found' }
	const gridTimezone = await resolveScheduleTimezone(template, getOrgTimezone)

	const durationMs = eventType.durationMin * 60 * 1000
	const startDate = parseWallClockToUtc(startAt, gridTimezone)
	const endDate = new Date(startDate.getTime() + durationMs)

	const conflict = await findConflict(
		staffId,
		startDate,
		endDate,
		eventType.orgId || null,
	)
	if (conflict) throw new HttpError(bookingStatus.SLOT_TAKEN)

	const inviteeDoc = await findOrCreateInvitee(invitee)

	const staffMembership = eventType.orgId
		? await getMembershipByUserAndOrg(staffId, eventType.orgId)
		: null
	const staffPositionId = staffMembership ? staffMembership.positionId : null
	const resolvedPrice = await resolvePriceForStaff(eventType, staffPositionId)

	const amount = resolvedPrice ? resolvedPrice.amount : 0
	const currency = resolvedPrice ? resolvedPrice.currency : 'usd'

	// Динамический дефолтный статус вместо хардкода
	const defaultStatusId = await resolveDefaultStatusId(eventType.orgId, staffId)
	if (!defaultStatusId) {
		throw new HttpError(bookingStatus.SLOT_TAKEN) // fallback: нет дефолтного статуса
	}

	const bookingData = {
		eventTypeId,
		hosts: [{ userId: staffId, role: HOST_ROLE.LEAD }],
		inviteeId: inviteeDoc.id,
		orgId: eventType.orgId || null,
		locationId: null,
		startAt: startDate,
		endAt: endDate,
		timezone: clientTimezone,
		statusId: defaultStatusId,
		inviteeSnapshot: {
			name: invitee.name,
			email: invitee.email || null,
			phone: invitee.phone || null,
		},
		clientNotes: invitee.notes || null,
		customFieldValues: Array.isArray(customFieldValues)
			? customFieldValues
			: [],
		payment: {
			status: computePaymentStatus(amount),
			amount,
			currency,
		},
		cancelToken: generateToken(),
		rescheduleToken: generateToken(),
	}

	const booking = await repoCreate(bookingData)

	const rawBooking = await findBookingById(booking.id)
	await createBookingNotifications(rawBooking)
	sendBookingTelegramNotifications(
		rawBooking,
		NOTIFICATION_TYPE.BOOKING_CONFIRMED,
	).catch((error) =>
		console.error('Telegram notification error:', error.message),
	)

	return { raw: rawBooking, eventType }
}

const getBookingsByStaff = async (params) => {
	return findByStaffFiltered(params)
}

const cancelBookingById = async (id, reason) => {
	const booking = await findBookingById(id)
	if (!booking) return null

	const orgId = booking.orgId
	const userId = booking.hosts[0].userId.toString()
	const cancelStatusId = await resolveCancelStatusId(
		orgId,
		orgId ? null : userId,
	)

	if (!cancelStatusId) return null

	const cancelled = await repoCancel(id, reason, cancelStatusId)
	await skipNotifications(id)
	sendBookingTelegramNotifications(
		booking,
		NOTIFICATION_TYPE.BOOKING_CANCELLED,
	).catch((error) =>
		console.error('Telegram notification error:', error.message),
	)
	return cancelled
}

const cancelBookingByToken = async (cancelToken, reason) => {
	const booking = await findBookingByToken(cancelToken)
	if (!booking) return null

	const orgId = booking.orgId
	const userId = booking.hosts[0].userId.toString()
	const cancelStatusId = await resolveCancelStatusId(
		orgId,
		orgId ? null : userId,
	)

	if (!cancelStatusId) return null

	const cancelled = await repoCancel(booking._id, reason, cancelStatusId)
	await skipNotifications(booking._id)
	sendBookingTelegramNotifications(
		booking,
		NOTIFICATION_TYPE.BOOKING_CANCELLED,
	).catch((error) =>
		console.error('Telegram notification error:', error.message),
	)
	return cancelled
}

const getBookingById = async (id) => {
	const booking = await findBookingById(id)
	if (!booking) return null
	return toBookingDto(booking)
}

const updateBookingStatus = async (id, statusId) => {
	const booking = await findBookingById(id)
	if (!booking) return null

	const result = await repoUpdateStatus(id, statusId)

	// Универсальное уведомление о смене статуса
	sendBookingTelegramNotifications(
		booking,
		NOTIFICATION_TYPE.BOOKING_STATUS_CHANGED,
	).catch((error) =>
		console.error('Telegram notification error:', error.message),
	)

	return result
}

const rescheduleBookingById = async (id, newStartAt) => {
	const booking = await findBookingById(id)
	if (!booking) return { error: 'booking_not_found' }

	const eventTypeId = booking.eventTypeId?._id || booking.eventTypeId
	const eventType = await getEventTypeById(eventTypeId.toString())
	if (!eventType) return { error: 'eventType_not_found' }

	const staffId = booking.hosts[0].userId.toString()

	const template = await findActiveTemplate(
		staffId,
		eventType.orgId || null,
		null,
		new Date(newStartAt),
	)
	if (!template) return { error: 'template_not_found' }
	const gridTimezone = await resolveScheduleTimezone(template, getOrgTimezone)

	const durationMs = eventType.durationMin * 60 * 1000
	const startDate = parseWallClockToUtc(newStartAt, gridTimezone)
	const endDate = new Date(startDate.getTime() + durationMs)

	const conflict = await findConflict(
		staffId,
		startDate,
		endDate,
		eventType.orgId || null,
	)
	if (conflict && conflict._id.toString() !== id) {
		throw new HttpError(bookingStatus.SLOT_TAKEN)
	}

	const rescheduled = await repoReschedule(id, startDate, endDate)
	const updatedBooking = await findBookingById(id)
	sendBookingTelegramNotifications(
		updatedBooking,
		NOTIFICATION_TYPE.BOOKING_RESCHEDULED,
	).catch((error) =>
		console.error('Telegram notification error:', error.message),
	)
	return rescheduled
}

export {
	createBooking,
	getBookingsByStaff,
	cancelBookingById,
	cancelBookingByToken,
	getBookingById,
	updateBookingStatus,
	rescheduleBookingById,
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/bookingServices.js
git commit -m "feat(booking-status): bookingServices — динамический statusId, resolveDefaultStatusId"
```

---

## Task 11: Backend — Modify Booking Controller

**Files:**

- Modify: `src/controllers/bookingController.js:157-183`

- [ ] **Step 1: Remove ALLOWED_STATUS_TRANSITIONS, use statusId**

In `src/controllers/bookingController.js`:

1. Remove `ALLOWED_STATUS_TRANSITIONS` (lines 157-160).

2. Replace `handleUpdateStatus` (lines 162-183):

```js
const handleUpdateStatus = async (req, res) => {
	try {
		if (!isValidObjectId(req.params.id)) {
			return httpResponse(res, generalStatus.BAD_REQUEST)
		}
		const { statusId } = req.body
		if (!statusId || !isValidObjectId(statusId)) {
			return httpResponse(res, generalStatus.BAD_REQUEST)
		}

		const existing = await getBookingById(req.params.id)
		if (!existing) return httpResponse(res, generalStatus.NOT_FOUND)

		// Свободные переходы — валидируем только что statusId существует и не архивирован
		const { findById } =
			await import('../repository/bookingStatusRepository.js')
		const targetStatus = await findById(statusId)
		if (!targetStatus || targetStatus.isArchived) {
			return httpResponse(res, generalStatus.BAD_REQUEST)
		}

		const updated = await updateBookingStatusService(req.params.id, statusId)
		return httpResponse(res, generalStatus.SUCCESS, updated)
	} catch (error) {
		return httpResponseError(res, error)
	}
}
```

3. Update import at line 7 — rename is the same (`updateBookingStatus as updateBookingStatusService`), no change needed.

- [ ] **Step 2: Commit**

```bash
git add src/controllers/bookingController.js
git commit -m "feat(booking-status): контроллер — свободные переходы, statusId вместо status string"
```

---

## Task 12: Backend — Modify Slot Services

**Files:**

- Modify: `src/services/slotServices.js:4,106`

- [ ] **Step 1: Update findByStaffAndDate call to pass orgId**

In `src/services/slotServices.js`, `findByStaffAndDate` now requires `orgId` to determine the scope for hidden status lookup.

Line 4 import stays the same.

Line 106 change:

Before:

```js
const bookings = await findByStaffAndDate(staffId, dateStart, dateEnd)
```

After:

```js
const bookings = await findByStaffAndDate(
	staffId,
	dateStart,
	dateEnd,
	eventType.orgId || null,
)
```

- [ ] **Step 2: Commit**

```bash
git add src/services/slotServices.js
git commit -m "feat(booking-status): slotServices — передать orgId в findByStaffAndDate"
```

---

## Task 13: Backend — Seed on Registration & Org Creation

**Files:**

- Modify: `src/modules/auth/services/authServices.js`
- Modify: `src/services/orgServices.js`

- [ ] **Step 1: Seed statuses on user registration**

In `src/modules/auth/services/authServices.js`, after `createDefaultSchedule` call inside `findOrCreateUser` (around line 73), add:

```js
import { seedDefaultStatuses } from '../../../services/bookingStatusServices.js'
```

After `await createDefaultSchedule(...)` add:

```js
await seedDefaultStatuses(null, newUser.id).catch((err) =>
	console.error('[seedDefaultStatuses] registration failed:', err.message),
)
```

- [ ] **Step 2: Seed statuses on org creation**

In `src/services/orgServices.js`, after `createDefaultSchedule` call inside `createOrganization` (around line 107), add:

```js
import { seedDefaultStatuses } from './bookingStatusServices.js'
```

After `await createDefaultSchedule(...)` add:

```js
await seedDefaultStatuses(org.id, null).catch((err) =>
	console.error('[seedDefaultStatuses] org creation failed:', err.message),
)
```

- [ ] **Step 3: Seed statuses when staff accepts invitation**

In `src/services/orgServices.js`, inside `acceptInvitation` (around line 207), no status seeding needed — staff uses org statuses, not personal.

- [ ] **Step 4: Commit**

```bash
git add src/modules/auth/services/authServices.js src/services/orgServices.js
git commit -m "feat(booking-status): сидировать дефолтные статусы при регистрации и создании орги"
```

---

## Task 14: Backend — Migration Script

**Files:**

- Create: `src/scripts/migrateBookingStatuses.js`

- [ ] **Step 1: Create migration script**

```js
// src/scripts/migrateBookingStatuses.js
//
// Одноразовый скрипт миграции:
// 1. Для каждого User — создать дефолтные статусы + defaultBookingStatusId
// 2. Для каждой Organization — создать дефолтные статусы + defaultBookingStatusId
// 3. Все Booking — установить statusId = status_unconfirmed в соответствующем scope
// 4. Удалить поле status из всех Booking
//
// Запуск: node src/scripts/migrateBookingStatuses.js

import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config()

import User from '../modules/user/model/User.js'
import Organization from '../models/Organization.js'
import Booking from '../models/Booking.js'
import BookingStatus from '../models/BookingStatus.js'
import { DEFAULT_STATUSES } from '../constants/bookingStatus.js'

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/slotix'

const run = async () => {
	await mongoose.connect(MONGO_URI)
	console.log('Connected to MongoDB')

	// Step 1: Users
	const users = await User.find({})
	console.log(`Found ${users.length} users`)

	for (const user of users) {
		const existing = await BookingStatus.countDocuments({
			userId: user._id,
			orgId: null,
		})
		if (existing > 0) {
			console.log(`  User ${user._id}: statuses already exist, skip`)
			continue
		}

		const toStatusData = (template) => ({
			...template,
			orgId: null,
			userId: user._id,
		})
		const docs = await BookingStatus.insertMany(
			DEFAULT_STATUSES.map(toStatusData),
		)
		const unconfirmed = docs.find((d) => d.label === 'status_unconfirmed')
		if (unconfirmed) {
			await User.findByIdAndUpdate(user._id, {
				defaultBookingStatusId: unconfirmed._id,
			})
		}
		console.log(`  User ${user._id}: created ${docs.length} statuses`)
	}

	// Step 2: Organizations
	const orgs = await Organization.find({})
	console.log(`Found ${orgs.length} organizations`)

	for (const org of orgs) {
		const existing = await BookingStatus.countDocuments({ orgId: org._id })
		if (existing > 0) {
			console.log(`  Org ${org._id}: statuses already exist, skip`)
			continue
		}

		const toStatusData = (template) => ({
			...template,
			orgId: org._id,
			userId: null,
		})
		const docs = await BookingStatus.insertMany(
			DEFAULT_STATUSES.map(toStatusData),
		)
		const unconfirmed = docs.find((d) => d.label === 'status_unconfirmed')
		if (unconfirmed) {
			await Organization.findByIdAndUpdate(org._id, {
				defaultBookingStatusId: unconfirmed._id,
			})
		}
		console.log(`  Org ${org._id}: created ${docs.length} statuses`)
	}

	// Step 3: Migrate bookings
	const bookings = await Booking.find({}).select('_id orgId hosts status')
	console.log(`Found ${bookings.length} bookings to migrate`)

	let migrated = 0
	for (const booking of bookings) {
		const orgId = booking.orgId
		const userId = orgId ? null : booking.hosts[0]?.userId

		const query = orgId
			? { orgId, label: 'status_unconfirmed' }
			: { userId, orgId: null, label: 'status_unconfirmed' }

		const targetStatus = await BookingStatus.findOne(query)
		if (!targetStatus) {
			console.log(`  Booking ${booking._id}: no unconfirmed status found, skip`)
			continue
		}

		await Booking.updateOne(
			{ _id: booking._id },
			{ $set: { statusId: targetStatus._id }, $unset: { status: '' } },
		)
		migrated++
	}

	console.log(`Migrated ${migrated} bookings`)

	// Step 4: Удалить поле status из оставшихся (если есть)
	const remaining = await Booking.updateMany(
		{ status: { $exists: true } },
		{ $unset: { status: '' } },
	)
	console.log(`Cleaned up ${remaining.modifiedCount} remaining status fields`)

	await mongoose.disconnect()
	console.log('Migration complete')
}

run().catch((err) => {
	console.error('Migration failed:', err)
	process.exit(1)
})
```

- [ ] **Step 2: Commit**

```bash
git add src/scripts/migrateBookingStatuses.js
git commit -m "feat(booking-status): миграционный скрипт — создание статусов + Booking.status → statusId"
```

---

## Task 15: Frontend — Types

**Files:**

- Create: `services/configs/bookingStatus.types.ts`
- Modify: `services/configs/booking.types.ts:5-10,114-127,129-141,170-181,183-202`

- [ ] **Step 1: Create BookingStatus types**

```ts
// services/configs/bookingStatus.types.ts

interface BookingStatusObject {
	id: string
	label: string
	color: string
	actions: string[]
	isDefault: boolean
	isArchived: boolean
	orgId: string | null
	userId: string | null
	order: number
}

interface CreateBookingStatusBody {
	label: string
	color: string
	actions?: string[]
	orgId?: string
}

interface UpdateBookingStatusBody {
	label?: string
	color?: string
	actions?: string[]
	order?: number
}

export type {
	BookingStatusObject,
	CreateBookingStatusBody,
	UpdateBookingStatusBody,
}
```

- [ ] **Step 2: Update booking.types.ts**

In `services/configs/booking.types.ts`:

1. Remove the `BookingStatus` union type (lines 5-10).

2. Add import:

```ts
import type { BookingStatusObject } from './bookingStatus.types'
```

3. Replace `status: BookingStatus` with `statusId: string` and `status: BookingStatusObject` in all interfaces:

**BookingResponse** (line 123):

```ts
statusId: string
status: BookingStatusObject
```

**StaffBooking** (line 137):

```ts
statusId: string
status: BookingStatusObject
```

**CalendarDisplayBooking** (line 177):

```ts
statusId: string
status: BookingStatusObject
```

4. Update exports — remove `BookingStatus`, add re-export of `BookingStatusObject`:

```ts
export type { BookingStatusObject } from './bookingStatus.types'
```

Remove `BookingStatus` from the export list.

- [ ] **Step 3: Commit**

```bash
git add services/configs/bookingStatus.types.ts services/configs/booking.types.ts
git commit -m "feat(booking-status): фронтенд типы — BookingStatusObject, statusId в интерфейсах"
```

---

## Task 16: Frontend — API Client Updates

**Files:**

- Modify: `lib/booking-api-client.ts:133,151,226-246,395-429`

- [ ] **Step 1: Update BackendBookingDto and BackendBookingCreatedDto**

In `lib/booking-api-client.ts`:

1. Add import:

```ts
import type { BookingStatusObject } from '@/services/configs/bookingStatus.types'
```

2. Replace `status: BookingStatus` in `BackendBookingDto` (line 133):

```ts
statusId: string
status: BookingStatusObject
```

3. Replace `status: BookingStatus` in `BackendBookingCreatedDto` (line 151):

```ts
statusId: string
status: BookingStatusObject
```

4. Remove import of `BookingStatus` from `@/services/configs/booking.types` (line 10).

5. Update `toFrontendBookingResponse` (lines 201-221):

```ts
const toFrontendBookingResponse = (
	raw: BackendBookingCreatedDto,
): BookingResponse => ({
	id: raw.id,
	eventTypeId: raw.eventTypeId,
	eventTypeName: raw.eventTypeName,
	staffId: raw.staffId,
	startAt: raw.startAt,
	endAt: raw.endAt,
	timezone: raw.timezone,
	locationId: raw.locationId,
	statusId: raw.statusId,
	status: raw.status,
	cancelToken: raw.cancelToken,
	invitee: {
		name: raw.invitee.name,
		email: raw.invitee.email,
		phone: raw.invitee.phone,
		phoneCountry: null,
	},
	createdAt: raw.createdAt,
})
```

6. Update `toFrontendStaffBooking` (lines 223-246):

```ts
const toFrontendStaffBooking = (
	raw: BackendBookingDto,
	eventTypes: EventType[],
): StaffBooking => {
	const eventType = eventTypes.find((et) => et.id === raw.eventTypeId)
	return {
		id: raw.id,
		eventTypeId: raw.eventTypeId,
		eventTypeName: eventType ? eventType.name : '',
		startAt: raw.startAt,
		endAt: raw.endAt,
		statusId: raw.statusId,
		status: raw.status,
		invitee: {
			name: raw.inviteeSnapshot.name,
			email: raw.inviteeSnapshot.email,
			phone: raw.inviteeSnapshot.phone,
			phoneCountry: null,
		},
		color: eventType ? eventType.color : '#888888',
		locationId: raw.locationId,
		orgId: raw.orgId,
		timezone: raw.timezone,
	}
}
```

7. Update `updateBookingStatus` (lines 425-429):

```ts
const updateBookingStatus = async (
	id: string,
	statusId: string,
): Promise<BackendBookingDto> =>
	patch<BackendBookingDto>(`/bookings/${id}/status`, { statusId })
```

8. Update `getStaffBookings` — remove `status?: BookingStatus[]` param, since filtering now uses statusId array. Update the type:

```ts
  statusIds?: string[],
```

And the usage:

```ts
if (statusIds && statusIds.length > 0) params.set('status', statusIds.join(','))
```

- [ ] **Step 2: Commit**

```bash
git add lib/booking-api-client.ts
git commit -m "feat(booking-status): API client — statusId + BookingStatusObject"
```

---

## Task 17: Frontend — BookingStatusBadge Component

**Files:**

- Create: `components/booking/BookingStatusBadge.tsx`

- [ ] **Step 1: Create BookingStatusBadge**

```tsx
// components/booking/BookingStatusBadge.tsx
'use client'

import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import type { BookingStatusObject } from '@/services/configs/bookingStatus.types'

interface BookingStatusBadgeProps {
	status: BookingStatusObject
	className?: string
}

const COLOR_CLASSES: Record<string, { bg: string; text: string }> = {
	blue: { bg: 'bg-blue-100', text: 'text-blue-800' },
	green: { bg: 'bg-green-100', text: 'text-green-800' },
	red: { bg: 'bg-red-100', text: 'text-red-800' },
	yellow: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
	purple: { bg: 'bg-purple-100', text: 'text-purple-800' },
	orange: { bg: 'bg-orange-100', text: 'text-orange-800' },
	gray: { bg: 'bg-gray-100', text: 'text-gray-800' },
	teal: { bg: 'bg-teal-100', text: 'text-teal-800' },
}

const DEFAULT_COLOR = { bg: 'bg-gray-100', text: 'text-gray-800' }

function BookingStatusBadge({ status, className }: BookingStatusBadgeProps) {
	const t = useTranslations('booking')
	const colorCfg = COLOR_CLASSES[status.color] ?? DEFAULT_COLOR

	// isDefault = системный статус → label = i18n ключ, иначе — строка напрямую
	const label = status.isDefault
		? t(status.label as Parameters<typeof t>[0])
		: status.label

	return (
		<span
			data-slot="booking-status-badge"
			className={cn(
				'rounded-full px-2 py-0.5 text-xs font-medium',
				colorCfg.bg,
				colorCfg.text,
				className,
			)}
		>
			{label}
		</span>
	)
}

export { BookingStatusBadge }
```

- [ ] **Step 2: Commit**

```bash
git add components/booking/BookingStatusBadge.tsx
git commit -m "feat(booking-status): BookingStatusBadge — динамический badge с цветом и i18n"
```

---

## Task 18: Frontend — Update Calendar Types & Hook

**Files:**

- Modify: `lib/calendar/types.ts:2,36`
- Modify: `lib/calendar/hooks/useBookingActions.ts:7,44-47,315-327`

- [ ] **Step 1: Update ConfirmedBooking type**

In `lib/calendar/types.ts`:

1. Update import (line 2):

```ts
import type {
	BookingStatusObject,
	Invitee,
} from '@/services/configs/booking.types'
```

2. Replace `status: BookingStatus` (line 36):

```ts
statusId: string
status: BookingStatusObject
```

- [ ] **Step 2: Update useBookingActions hook**

In `lib/calendar/hooks/useBookingActions.ts`:

1. Remove `import type { BookingStatus }` (line 7). Not needed anymore since we use `string` for statusId.

2. Update `handleBookingStatusChange` type (lines 44-47):

```ts
handleBookingStatusChange: (bookingId: string, statusId: string) =>
	Promise<void>
```

3. Update implementation (lines 315-327):

```ts
const handleBookingStatusChange = async (
	bookingId: string,
	statusId: string,
) => {
	try {
		await bookingApi.updateStatus(bookingId, statusId)
		setSelectedBooking(null)
		reloadBookings()
	} catch (err) {
		const message = err instanceof Error ? err.message : t('bookingFailed')
		setBookingError(message)
	}
}
```

4. Update `setConfirmedBooking` call in `handleConfirmWithClient` — `status` now comes as an object from the API response, no changes needed (it's already spread from `response`).

- [ ] **Step 3: Commit**

```bash
git add lib/calendar/types.ts lib/calendar/hooks/useBookingActions.ts
git commit -m "feat(booking-status): calendar types + hook — statusId string вместо BookingStatus enum"
```

---

## Task 19: Frontend — Update BookingListItem

**Files:**

- Modify: `components/staff-schedule/BookingListItem.tsx`

- [ ] **Step 1: Replace STATUS_VARIANT with BookingStatusBadge**

Replace entire file:

```tsx
'use client'

import { cn } from '@/lib/utils'
import { BookingStatusBadge } from '@/components/booking/BookingStatusBadge'
import type { StaffBooking } from '@/services/configs/booking.types'

interface BookingListItemProps {
	booking: StaffBooking
	timezone: string
	onClick: (booking: StaffBooking) => void
}

const formatTime = (isoString: string, timezone: string): string =>
	new Date(isoString).toLocaleTimeString('uk-UA', {
		timeZone: timezone,
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	})

function BookingListItem({ booking, timezone, onClick }: BookingListItemProps) {
	const handleClick = () => onClick(booking)

	return (
		<button
			type="button"
			data-slot="booking-list-item"
			onClick={handleClick}
			className={cn(
				'group relative flex w-full items-center gap-3 rounded-lg border p-3 text-left',
				'transition-shadow hover:shadow-sm',
			)}
		>
			<div
				className="absolute inset-y-0 left-0 w-1 rounded-l-lg"
				style={{ backgroundColor: booking.color }}
			/>
			<div className="flex min-w-0 flex-1 items-center justify-between gap-2 pl-1">
				<div className="flex min-w-0 flex-col">
					<span className="text-sm font-medium">
						{formatTime(booking.startAt, timezone)} —{' '}
						{formatTime(booking.endAt, timezone)}
					</span>
					<span className="text-muted-foreground truncate text-xs">
						{booking.eventTypeName}
					</span>
				</div>
				<div className="flex shrink-0 items-center gap-2">
					<span className="text-muted-foreground hidden text-xs sm:inline">
						{booking.invitee.name}
					</span>
					<BookingStatusBadge status={booking.status} className="text-[10px]" />
				</div>
			</div>
		</button>
	)
}

export { BookingListItem }
```

- [ ] **Step 2: Commit**

```bash
git add components/staff-schedule/BookingListItem.tsx
git commit -m "feat(booking-status): BookingListItem — динамический BookingStatusBadge"
```

---

## Task 20: Frontend — Update BookingDetailPanel

**Files:**

- Modify: `components/booking/BookingDetailPanel.tsx`

- [ ] **Step 1: Rewrite with dynamic statuses**

The key changes:

- Remove `STATUS_VARIANT`, `ALLOWED_TRANSITIONS`, `ACTION_CONFIG`
- Accept available statuses as prop
- Use `BookingStatusBadge`
- Free transitions to any non-archived status

```tsx
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { bookingApi } from '@/lib/booking-api-client'
import { BookingStatusBadge } from '@/components/booking/BookingStatusBadge'
import { formatLocalTime } from './BookingPanelParts'
import type { BookingStatusObject } from '@/services/configs/bookingStatus.types'

interface BookingDetail {
	id: string
	eventTypeName: string
	color: string
	startAt: string
	endAt: string
	timezone: string
	durationMin: number
	date: string
	statusId: string
	status: BookingStatusObject
	invitee: {
		name: string
		email: string | null
		phone: string | null
	}
	payment: {
		status: string
		amount: number
		currency: string
	}
}

interface BookingDetailPanelProps {
	booking: BookingDetail
	availableStatuses: BookingStatusObject[]
	onClose: () => void
	onStatusChange: (bookingId: string, newStatusId: string) => void
}

function BookingDetailPanel({
	booking,
	availableStatuses,
	onClose,
	onStatusChange,
}: BookingDetailPanelProps) {
	const t = useTranslations('booking')
	const [isUpdating, setIsUpdating] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const isNotCurrentStatus = (s: BookingStatusObject): boolean =>
		s.id !== booking.statusId
	const otherStatuses = availableStatuses.filter(isNotCurrentStatus)

	const handleStatusChange = async (statusId: string) => {
		try {
			setIsUpdating(true)
			setError(null)
			await bookingApi.updateStatus(booking.id, statusId)
			onStatusChange(booking.id, statusId)
		} catch {
			setError(t('statusUpdateFailed'))
		} finally {
			setIsUpdating(false)
		}
	}

	const formatDate = (isoString: string): string => {
		const d = new Date(isoString)
		return d.toLocaleDateString(undefined, {
			weekday: 'short',
			day: 'numeric',
			month: 'short',
			year: 'numeric',
		})
	}

	const renderStatusButton = (targetStatus: BookingStatusObject) => {
		const handleClick = () => handleStatusChange(targetStatus.id)
		const label = targetStatus.isDefault
			? t(targetStatus.label as Parameters<typeof t>[0])
			: targetStatus.label

		return (
			<Button
				key={targetStatus.id}
				variant="outline"
				size="sm"
				className="w-full"
				onClick={handleClick}
				disabled={isUpdating}
			>
				{label}
			</Button>
		)
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center gap-2">
				<div
					className="size-3 shrink-0 rounded-full"
					style={{ backgroundColor: booking.color }}
				/>
				<span className="text-sm font-semibold">{booking.eventTypeName}</span>
			</div>

			<Separator />

			<div className="grid grid-cols-2 gap-y-2 text-xs">
				<span className="text-muted-foreground">{t('startTime')}</span>
				<span className="font-medium">
					{formatLocalTime(booking.startAt, booking.timezone)}
				</span>
				<span className="text-muted-foreground">{t('endTime')}</span>
				<span className="font-medium">
					{formatLocalTime(booking.endAt, booking.timezone)}
				</span>
				<span className="text-muted-foreground">{t('duration')}</span>
				<span className="font-medium">
					{booking.durationMin} {t('min')}
				</span>
				<span className="text-muted-foreground">{t('date')}</span>
				<span className="font-medium">{formatDate(booking.startAt)}</span>
			</div>

			<Separator />

			<div className="grid grid-cols-2 gap-y-2 text-xs">
				<span className="text-muted-foreground">{t('clientName_label')}</span>
				<span className="font-medium">{booking.invitee.name}</span>
				{booking.invitee.email && (
					<>
						<span className="text-muted-foreground">{t('email')}</span>
						<span className="font-medium">{booking.invitee.email}</span>
					</>
				)}
				{booking.invitee.phone && (
					<>
						<span className="text-muted-foreground">{t('phone')}</span>
						<span className="font-medium">{booking.invitee.phone}</span>
					</>
				)}
			</div>

			<Separator />

			<div className="flex items-center gap-2">
				<BookingStatusBadge status={booking.status} />
			</div>

			<div className="grid grid-cols-2 gap-y-2 text-xs">
				<span className="text-muted-foreground">{t('payment')}</span>
				<span className="font-medium">{booking.payment.status}</span>
				<span className="text-muted-foreground">{t('price')}</span>
				<span className="font-medium">
					{booking.payment.amount} {booking.payment.currency}
				</span>
			</div>

			{otherStatuses.length > 0 && (
				<>
					<Separator />
					<div className="flex flex-col gap-2">
						{otherStatuses.map(renderStatusButton)}
					</div>
				</>
			)}

			{error && <p className="text-destructive text-xs">{error}</p>}
		</div>
	)
}

export { BookingDetailPanel }
export type { BookingDetail }
```

- [ ] **Step 2: Commit**

```bash
git add components/booking/BookingDetailPanel.tsx
git commit -m "feat(booking-status): BookingDetailPanel — динамические статусы, свободные переходы"
```

---

## Task 21: Frontend — Update BookingDetailsPanel

**Files:**

- Modify: `components/booking/BookingDetailsPanel.tsx`

- [ ] **Step 1: Rewrite with dynamic statuses**

Key changes:

- Remove `STATUS_CONFIG`, `STATUS_TRANSITIONS`, `ACTION_BUTTON_CLASS`
- Accept `availableStatuses` prop
- Use `BookingStatusBadge`
- Free transitions

Update `BookingDetail` interface:

```ts
interface BookingDetail {
	id: string
	eventTypeId: string
	hosts: { userId: string; role: string }[]
	inviteeId: string
	orgId: string | null
	locationId: string | null
	startAt: string
	endAt: string
	timezone: string
	statusId: string
	status: BookingStatusObject
	inviteeSnapshot: { name: string; email: string | null; phone: string | null }
	clientNotes: string | null
	customFieldValues?: CustomFieldEntry[]
	payment: { status: string; amount: number; currency: string }
	createdAt: string
	updatedAt: string
}
```

Update `BookingDetailsPanelProps`:

```ts
interface BookingDetailsPanelProps {
	booking: BookingDetail
	availableStatuses: BookingStatusObject[]
	eventTypeName: string
	eventTypeColor: string
	staffName?: string
	staffAvatar?: string
	staffPosition?: string
	onChangeStatus: (bookingId: string, statusId: string) => Promise<void>
	onReschedule: (bookingId: string, newStartAt: string) => Promise<void>
	onClose: () => void
}
```

Replace `StatusAndPayment`:

```tsx
function StatusAndPayment({
	booking,
	t,
}: {
	booking: BookingDetail
	t: ReturnType<typeof useTranslations<'booking'>>
}) {
	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center gap-2">
				<BookingStatusBadge status={booking.status} />
			</div>
			<div className="grid grid-cols-2 gap-y-1 text-xs">
				<span className="text-muted-foreground">{t('paymentStatus')}</span>
				<span className="font-medium">{booking.payment.status}</span>
				<span className="text-muted-foreground">{t('price')}</span>
				<span className="font-medium">
					{booking.payment.amount} {booking.payment.currency}
				</span>
			</div>
		</div>
	)
}
```

Replace `ActionButtons`:

```tsx
function ActionButtons({
	booking,
	availableStatuses,
	onChangeStatus,
	t,
}: {
	booking: BookingDetail
	availableStatuses: BookingStatusObject[]
	onChangeStatus: (bookingId: string, statusId: string) => Promise<void>
	t: ReturnType<typeof useTranslations<'booking'>>
}) {
	const [pendingStatusId, setPendingStatusId] = useState<string | null>(null)
	const isNotCurrentStatus = (s: BookingStatusObject): boolean =>
		s.id !== booking.statusId
	const transitions = availableStatuses.filter(isNotCurrentStatus)

	if (transitions.length === 0) return null

	const handleClick = async (targetStatus: BookingStatusObject) => {
		setPendingStatusId(targetStatus.id)
		await onChangeStatus(booking.id, targetStatus.id)
		setPendingStatusId(null)
	}

	const renderButton = (targetStatus: BookingStatusObject) => {
		const isLoading = pendingStatusId === targetStatus.id
		const label = targetStatus.isDefault
			? t(targetStatus.label as Parameters<typeof t>[0])
			: targetStatus.label

		return (
			<button
				key={targetStatus.id}
				type="button"
				disabled={pendingStatusId !== null}
				onClick={() => handleClick(targetStatus)}
				className="bg-muted text-muted-foreground hover:bg-muted/80 rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
			>
				{isLoading ? t('saving') : label}
			</button>
		)
	}

	return (
		<div className="flex flex-wrap gap-2">{transitions.map(renderButton)}</div>
	)
}
```

Add import:

```ts
import { BookingStatusBadge } from '@/components/booking/BookingStatusBadge'
import type { BookingStatusObject } from '@/services/configs/bookingStatus.types'
```

Pass `availableStatuses` to `ActionButtons` in the main render:

```tsx
<ActionButtons
	booking={booking}
	availableStatuses={availableStatuses}
	onChangeStatus={onChangeStatus}
	t={t}
/>
```

- [ ] **Step 2: Commit**

```bash
git add components/booking/BookingDetailsPanel.tsx
git commit -m "feat(booking-status): BookingDetailsPanel — динамические статусы"
```

---

## Task 22: Frontend — Update i18n Messages

**Files:**

- Modify: `i18n/messages/en.json`
- Modify: `i18n/messages/uk.json`

- [ ] **Step 1: Add new default status i18n keys**

In `i18n/messages/en.json`, under `"booking"` section, add:

```json
"status_unconfirmed": "Unconfirmed",
"status_confirmed": "Confirmed",
"status_paid": "Paid",
"status_cancelled": "Cancelled"
```

Keep existing keys (`confirmed`, `pending_payment`, `completed`, `no_show`, `cancelled`) for backward compatibility during migration — they can be cleaned up later.

- [ ] **Step 2: Add Ukrainian translations**

In `i18n/messages/uk.json`, under `"booking"` section, add:

```json
"status_unconfirmed": "Не підтверджено",
"status_confirmed": "Підтверджено",
"status_paid": "Оплачено",
"status_cancelled": "Скасовано"
```

- [ ] **Step 3: Commit**

```bash
git add i18n/messages/en.json i18n/messages/uk.json
git commit -m "feat(booking-status): i18n ключи для дефолтных динамических статусов"
```

---

## Task 23: Frontend — Update Calendar Strategies

**Files:**

- Modify: `lib/calendar/strategies/createOrgStrategy.tsx:41,63-65,125,362`
- Modify: `lib/calendar/strategies/createStaffStrategy.tsx:38,83-85,113,251-261`

- [ ] **Step 1: Update createOrgStrategy**

1. Replace `BookingStatus` import with `BookingStatusObject`:

```ts
import type { BookingStatusObject } from '@/services/configs/bookingStatus.types'
```

2. Update `onBookingStatusChange` callback signature:

```ts
onBookingStatusChange?: (
  bookingId: string,
  statusId: string,
) => Promise<void>
```

3. Add `availableStatuses: BookingStatusObject[]` to the strategy params. Pass it to `BookingDetailsPanel`:

```tsx
<BookingDetailsPanel
  ...
  availableStatuses={availableStatuses}
  onChangeStatus={onBookingStatusChange ?? (async () => {})}
  ...
/>
```

- [ ] **Step 2: Update createStaffStrategy**

Same pattern as createOrgStrategy:

1. Replace `BookingStatus` import with `BookingStatusObject`
2. Update callback signature to `statusId: string`
3. Add `availableStatuses` prop, pass to `BookingDetailsPanel`

- [ ] **Step 3: Commit**

```bash
git add lib/calendar/strategies/createOrgStrategy.tsx lib/calendar/strategies/createStaffStrategy.tsx
git commit -m "feat(booking-status): calendar strategies — динамические статусы + availableStatuses prop"
```

---

## Task 24: Frontend — Load Available Statuses

**Files:**

- This depends on where the calendar pages fetch data. The `availableStatuses` need to be loaded alongside bookings.

- [ ] **Step 1: Add bookingStatus API client**

Create the API call in `lib/booking-api-client.ts`:

```ts
// Add to lib/booking-api-client.ts

import type { BookingStatusObject } from '@/services/configs/bookingStatus.types'

const getBookingStatuses = async (
	orgId?: string,
): Promise<BookingStatusObject[]> => {
	const params = orgId ? `?orgId=${orgId}` : ''
	return get<BookingStatusObject[]>(`/booking-statuses${params}`)
}

// Add to exports:
export const bookingStatusApi = {
	getAll: getBookingStatuses,
}
```

- [ ] **Step 2: Load statuses in the calendar hooks/pages**

The exact integration point depends on the page components that use `useBookingActions`. Add a `useEffect` to load `availableStatuses` when `orgId` changes, and pass them down through the strategy.

This will vary per page — the pattern is:

```ts
const [availableStatuses, setAvailableStatuses] = useState<
	BookingStatusObject[]
>([])

useEffect(() => {
	const loadStatuses = async () => {
		const statuses = await bookingStatusApi.getAll(orgId)
		setAvailableStatuses(statuses)
	}
	loadStatuses()
}, [orgId])
```

- [ ] **Step 3: Commit**

```bash
git add lib/booking-api-client.ts
git commit -m "feat(booking-status): bookingStatusApi + загрузка статусов в календаре"
```

---

## Task 25: Integration Testing & Verification

- [ ] **Step 1: Backend — Start server, verify no import errors**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate && npm run dev
```

Check console for import/startup errors.

- [ ] **Step 2: Backend — Test seed on registration**

Create a new user via the auth flow. Verify:

- 4 BookingStatus records created (check MongoDB)
- `User.defaultBookingStatusId` set to `status_unconfirmed` id

- [ ] **Step 3: Backend — Test seed on org creation**

Create a new organization. Verify:

- 4 BookingStatus records created with `orgId`
- `Organization.defaultBookingStatusId` set

- [ ] **Step 4: Backend — Test CRUD endpoints**

```bash
# GET statuses
curl -H "Authorization: Bearer <token>" http://localhost:9000/api/booking-statuses

# POST create custom status
curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer <token>" \
  -d '{"label":"VIP","color":"purple","actions":[]}' \
  http://localhost:9000/api/booking-statuses

# PATCH update
curl -X PATCH -H "Content-Type: application/json" -H "Authorization: Bearer <token>" \
  -d '{"color":"teal"}' \
  http://localhost:9000/api/booking-statuses/<id>

# PATCH archive
curl -X PATCH -H "Authorization: Bearer <token>" \
  http://localhost:9000/api/booking-statuses/<id>/archive
```

- [ ] **Step 5: Backend — Test booking creation with dynamic status**

Create a booking. Verify `statusId` is set (not `status` string).

- [ ] **Step 6: Backend — Test booking status update**

```bash
curl -X PATCH -H "Content-Type: application/json" -H "Authorization: Bearer <token>" \
  -d '{"statusId":"<statusId>"}' \
  http://localhost:9000/api/bookings/<id>/status
```

- [ ] **Step 7: Frontend — Start dev server, verify compilation**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted && npm run dev
```

- [ ] **Step 8: Frontend — Test booking list renders with dynamic badges**

Open staff schedule in browser. Verify bookings show dynamic color badges.

- [ ] **Step 9: Frontend — Test status change flow**

Click a booking, verify status transition buttons appear, click one, verify it updates.

- [ ] **Step 10: Run migration on existing data (if applicable)**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate && node src/scripts/migrateBookingStatuses.js
```

- [ ] **Step 11: Commit verification results**

```bash
git commit --allow-empty -m "test(booking-status): ручная верификация — бэкенд и фронтенд работают"
```

---

## Deploy Order

1. Deploy `BookingStatus` model + seed logic + CRUD endpoints (Tasks 1-6, 13)
2. Run migration script (Task 14)
3. Deploy modified backend (Tasks 7-12) — works with `statusId`
4. Deploy modified frontend (Tasks 15-24)
