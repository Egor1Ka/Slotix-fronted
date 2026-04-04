# Позиції та Послуги — CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Додати CRUD управління позиціями та послугами для організацій — бекенд API + фронтенд сторінки + сайдбар навігація.

**Architecture:** Бекенд (BackendTemplate): нові роути/контролери/сервіси/репозиторії для Position CRUD та розширення EventType CRUD. Фронтенд (Slotix): нові API конфіги, типи, дві сторінки з формами (Dialog), нові пункти в OrgSidebar. Org-admin middleware для перевірки ролі owner/admin.

**Tech Stack:** Express.js + Mongoose (бекенд), Next.js 16 + React 19 + shadcn/ui + react-hook-form + zod + next-intl (фронтенд)

---

## File Structure

### BackendTemplate (бекенд)

| Action | File                                      | Responsibility                               |
| ------ | ----------------------------------------- | -------------------------------------------- |
| Create | `src/routes/subroutes/positionRoutes.js`  | Position CRUD роути                          |
| Create | `src/controllers/positionController.js`   | Position хендлери + валідація                |
| Create | `src/services/positionService.js`         | Position бізнес-логіка                       |
| Modify | `src/repository/positionRepository.js`    | Додати getByOrgId, create, update, delete    |
| Create | `src/dto/positionDto.js`                  | Position DTO трансформер                     |
| Create | `src/middleware/orgMiddleware.js`         | requireOrgAdmin — перевірка owner/admin ролі |
| Modify | `src/routes/routes.js`                    | Підключити positionRoutes                    |
| Modify | `src/routes/subroutes/eventTypeRoutes.js` | Додати POST/PATCH/DELETE роути               |
| Modify | `src/controllers/eventTypeController.js`  | Додати create/update/delete хендлери         |
| Create | `src/services/eventTypeService.js`        | EventType create/update/delete бізнес-логіка |
| Modify | `src/repository/eventTypeRepository.js`   | Додати create, update, delete                |
| Modify | `src/repository/membershipRepository.js`  | Додати countByPositionId                     |

### Slotix-fronted (фронтенд)

| Action | File                                                   | Responsibility                       |
| ------ | ------------------------------------------------------ | ------------------------------------ |
| Create | `services/configs/position.types.ts`                   | Position типи                        |
| Create | `services/configs/position.config.ts`                  | Position API ендпоінти               |
| Create | `services/configs/event-type.types.ts`                 | EventType CRUD типи                  |
| Create | `services/configs/event-type.config.ts`                | EventType API ендпоінти              |
| Modify | `services/index.ts`                                    | Експорт positionApi, eventTypeApi    |
| Modify | `services/configs/booking.types.ts`                    | Розширити EventType інтерфейс        |
| Create | `components/positions/PositionList.tsx`                | Список позицій                       |
| Create | `components/positions/PositionDialog.tsx`              | Форма створення/редагування позиції  |
| Create | `components/services/ServicesList.tsx`                 | Список послуг                        |
| Create | `components/services/ServiceDialog.tsx`                | Форма створення/редагування послуги  |
| Create | `app/[locale]/(org)/manage/[orgId]/positions/page.tsx` | Сторінка позицій                     |
| Create | `app/[locale]/(org)/manage/[orgId]/services/page.tsx`  | Сторінка послуг                      |
| Modify | `components/sidebar/OrgSidebar.tsx`                    | Додати пункти "Позиції" та "Послуги" |
| Modify | `i18n/messages/uk.json`                                | Українські переклади                 |
| Modify | `i18n/messages/en.json`                                | Англійські переклади                 |

---

## Task 1: Org Admin Middleware (бекенд)

**Files:**

- Create: `src/middleware/orgMiddleware.js`

- [ ] **Step 1: Створити orgMiddleware.js**

```javascript
import Membership from '../models/Membership.js'
import { httpResponse } from '../shared/utils/http/httpResponse.js'
import { generalStatus } from '../shared/utils/http/httpStatus.js'

const ADMIN_ROLES = ['owner', 'admin']

const requireOrgAdmin = (getOrgId) => async (req, res, next) => {
	try {
		const orgId = getOrgId(req)

		if (!orgId) {
			httpResponse(res, generalStatus.BAD_REQUEST)
			return
		}

		const membership = await Membership.findOne({
			userId: req.user.id,
			orgId,
			status: 'active',
		})

		if (!membership || !ADMIN_ROLES.includes(membership.role)) {
			httpResponse(res, generalStatus.UNAUTHORIZED)
			return
		}

		req.membership = membership
		next()
	} catch (error) {
		console.error('requireOrgAdmin error:', error)
		httpResponse(res, generalStatus.ERROR)
	}
}

export { requireOrgAdmin }
```

- [ ] **Step 2: Коміт**

```bash
git add src/middleware/orgMiddleware.js
git commit -m "feat(middleware): requireOrgAdmin — перевірка ролі owner/admin"
```

---

## Task 2: Position Repository (бекенд)

**Files:**

- Modify: `src/repository/positionRepository.js`
- Create: `src/dto/positionDto.js`

- [ ] **Step 1: Створити positionDto.js**

```javascript
const toPositionDto = (doc) => ({
	id: doc._id.toString(),
	name: doc.name,
	level: doc.level,
	color: doc.color || null,
	active: doc.active,
	createdAt: doc.createdAt,
	updatedAt: doc.updatedAt,
})

export { toPositionDto }
```

- [ ] **Step 2: Розширити positionRepository.js**

Існуючий файл має лише `getPositionById`. Додати:

```javascript
import Position from '../models/Position.js'
import { toPositionDto } from '../dto/positionDto.js'

const getPositionById = async (id) => {
	const doc = await Position.findById(id)
	if (!doc) return null
	return toPositionDto(doc)
}

const getPositionsByOrgId = async (orgId) => {
	const docs = await Position.find({ orgId }).sort({ level: -1, name: 1 })
	return docs.map(toPositionDto)
}

const createPosition = async (data) => {
	const doc = await Position.create(data)
	return toPositionDto(doc)
}

const updatePosition = async (id, update) => {
	const doc = await Position.findByIdAndUpdate(id, update, { new: true })
	if (!doc) return null
	return toPositionDto(doc)
}

const deletePosition = async (id) => {
	const doc = await Position.findByIdAndDelete(id)
	if (!doc) return null
	return toPositionDto(doc)
}

export {
	getPositionById,
	getPositionsByOrgId,
	createPosition,
	updatePosition,
	deletePosition,
}
```

- [ ] **Step 3: Коміт**

```bash
git add src/dto/positionDto.js src/repository/positionRepository.js
git commit -m "feat(position): DTO + розширений репозиторій (CRUD)"
```

---

## Task 3: Membership — countByPositionId (бекенд)

**Files:**

- Modify: `src/repository/membershipRepository.js`

- [ ] **Step 1: Додати countByPositionId**

Додати в кінець файлу перед `export`:

```javascript
const countByPositionId = async (positionId) => {
	return Membership.countDocuments({
		positionId,
		status: MEMBERSHIP_STATUS.ACTIVE,
	})
}
```

Додати `countByPositionId` в export.

- [ ] **Step 2: Коміт**

```bash
git add src/repository/membershipRepository.js
git commit -m "feat(membership): countByPositionId для перевірки прив'язаних співробітників"
```

---

## Task 4: Position Service (бекенд)

**Files:**

- Create: `src/services/positionService.js`

- [ ] **Step 1: Створити positionService.js**

```javascript
import {
	getPositionsByOrgId as repoGetByOrg,
	createPosition as repoCreate,
	updatePosition as repoUpdate,
	deletePosition as repoDelete,
	getPositionById as repoGetById,
} from '../repository/positionRepository.js'
import { countByPositionId } from '../repository/membershipRepository.js'
import EventType from '../models/EventType.js'
import { HttpError } from '../shared/utils/http/httpError.js'
import { generalStatus } from '../shared/utils/http/httpStatus.js'

const getPositionsByOrg = async (orgId) => {
	const positions = await repoGetByOrg(orgId)

	const withStaffCount = await Promise.all(
		positions.map(async (position) => {
			const staffCount = await countByPositionId(position.id)
			return { ...position, staffCount }
		}),
	)

	return withStaffCount
}

const createPosition = async (orgId, data) => {
	return repoCreate({ ...data, orgId })
}

const updatePosition = async (id, data) => {
	const position = await repoUpdate(id, data)
	if (!position) {
		throw new HttpError(generalStatus.NOT_FOUND)
	}
	return position
}

const deletePosition = async (id) => {
	const staffCount = await countByPositionId(id)
	if (staffCount > 0) {
		throw new HttpError(
			{ status: 400, message: 'badRequest', appStatusCode: 400 },
			{ reason: 'Position has assigned staff members. Unassign them first.' },
		)
	}

	const eventTypeCount = await EventType.countDocuments({
		assignedPositions: id,
	})
	if (eventTypeCount > 0) {
		throw new HttpError(
			{ status: 400, message: 'badRequest', appStatusCode: 400 },
			{
				reason: 'Position is used in services. Remove it from services first.',
			},
		)
	}

	const deleted = await repoDelete(id)
	if (!deleted) {
		throw new HttpError(generalStatus.NOT_FOUND)
	}
	return deleted
}

export { getPositionsByOrg, createPosition, updatePosition, deletePosition }
```

- [ ] **Step 2: Коміт**

```bash
git add src/services/positionService.js
git commit -m "feat(position): сервіс з бізнес-логікою (CRUD + валідація видалення)"
```

---

## Task 5: Position Controller + Routes (бекенд)

**Files:**

- Create: `src/controllers/positionController.js`
- Create: `src/routes/subroutes/positionRoutes.js`
- Modify: `src/routes/routes.js`

- [ ] **Step 1: Створити positionController.js**

```javascript
import {
	getPositionsByOrg,
	createPosition,
	updatePosition,
	deletePosition,
} from '../services/positionService.js'
import {
	httpResponse,
	httpResponseError,
} from '../shared/utils/http/httpResponse.js'
import { generalStatus } from '../shared/utils/http/httpStatus.js'
import { validateSchema } from '../shared/utils/validation/requestValidation.js'
import { isValidObjectId } from '../shared/utils/validation/validators.js'

const createPositionSchema = {
	name: { type: 'string', required: true },
	level: { type: 'number', required: false, defaultValue: 0 },
	color: { type: 'string', required: false },
}

const updatePositionSchema = {
	name: { type: 'string', required: false },
	level: { type: 'number', required: false },
	color: { type: 'string', required: false },
}

const handleGetPositions = async (req, res) => {
	try {
		const { orgId } = req.query

		if (!orgId || !isValidObjectId(orgId)) {
			return httpResponse(res, generalStatus.BAD_REQUEST)
		}

		const positions = await getPositionsByOrg(orgId)
		return httpResponse(res, generalStatus.SUCCESS, positions)
	} catch (error) {
		return httpResponseError(res, error)
	}
}

const handleCreatePosition = async (req, res) => {
	try {
		const validated = validateSchema(createPositionSchema, req.body)
		if (validated.errors) {
			return httpResponse(res, generalStatus.BAD_REQUEST, {
				errors: validated.errors,
			})
		}

		const orgId = req.body.orgId
		if (!orgId || !isValidObjectId(orgId)) {
			return httpResponse(res, generalStatus.BAD_REQUEST)
		}

		const position = await createPosition(orgId, validated)
		return httpResponse(res, generalStatus.CREATED, position)
	} catch (error) {
		return httpResponseError(res, error)
	}
}

const handleUpdatePosition = async (req, res) => {
	try {
		if (!isValidObjectId(req.params.id)) {
			return httpResponse(res, generalStatus.BAD_REQUEST)
		}

		const validated = validateSchema(updatePositionSchema, req.body)
		if (validated.errors) {
			return httpResponse(res, generalStatus.BAD_REQUEST, {
				errors: validated.errors,
			})
		}

		const position = await updatePosition(req.params.id, validated)
		return httpResponse(res, generalStatus.SUCCESS, position)
	} catch (error) {
		return httpResponseError(res, error)
	}
}

const handleDeletePosition = async (req, res) => {
	try {
		if (!isValidObjectId(req.params.id)) {
			return httpResponse(res, generalStatus.BAD_REQUEST)
		}

		await deletePosition(req.params.id)
		return httpResponse(res, generalStatus.SUCCESS)
	} catch (error) {
		return httpResponseError(res, error)
	}
}

export {
	handleGetPositions,
	handleCreatePosition,
	handleUpdatePosition,
	handleDeletePosition,
}
```

- [ ] **Step 2: Створити positionRoutes.js**

```javascript
import express from 'express'
import { authMiddleware } from '../../modules/auth/index.js'
import { requireOrgAdmin } from '../../middleware/orgMiddleware.js'
import {
	handleGetPositions,
	handleCreatePosition,
	handleUpdatePosition,
	handleDeletePosition,
} from '../../controllers/positionController.js'

const router = express.Router()

const getOrgIdFromQuery = (req) => req.query.orgId
const getOrgIdFromBody = (req) => req.body.orgId

router.get('/', authMiddleware, handleGetPositions)
router.post(
	'/',
	authMiddleware,
	requireOrgAdmin(getOrgIdFromBody),
	handleCreatePosition,
)
router.patch('/:id', authMiddleware, handleUpdatePosition)
router.delete('/:id', authMiddleware, handleDeletePosition)

export default router
```

- [ ] **Step 3: Підключити в routes.js**

Додати в `src/routes/routes.js`:

```javascript
import positionRoutes from './subroutes/positionRoutes.js'
```

та

```javascript
router.use('/positions', positionRoutes)
```

- [ ] **Step 4: Коміт**

```bash
git add src/controllers/positionController.js src/routes/subroutes/positionRoutes.js src/routes/routes.js
git commit -m "feat(position): контролер + роути (GET/POST/PATCH/DELETE)"
```

---

## Task 6: EventType Repository — create/update/delete (бекенд)

**Files:**

- Modify: `src/repository/eventTypeRepository.js`

- [ ] **Step 1: Додати CRUD методи**

Додати в існуючий файл:

```javascript
const createEventType = async (data) => {
	const doc = await EventType.create(data)
	return toEventTypeDto(doc)
}

const updateEventType = async (id, update) => {
	const doc = await EventType.findByIdAndUpdate(id, update, { new: true })
	if (!doc) return null
	return toEventTypeDto(doc)
}

const deleteEventType = async (id) => {
	const doc = await EventType.findByIdAndDelete(id)
	if (!doc) return null
	return toEventTypeDto(doc)
}
```

Додати ці функції в export.

**Примітка:** Якщо `toEventTypeDto` ще не існує, створити його аналогічно до існуючого маппінгу в `booking-api-client.ts`:

```javascript
const toEventTypeDto = (doc) => ({
	id: doc._id.toString(),
	name: doc.name,
	slug: doc.slug,
	durationMin: doc.durationMin,
	price: doc.price ? doc.price.amount : 0,
	currency: doc.price ? doc.price.currency : 'UAH',
	color: doc.color,
	description: doc.description || null,
	type: doc.type,
	staffPolicy: doc.staffPolicy,
	assignedPositions: doc.assignedPositions.map((id) => id.toString()),
	assignedStaff: doc.assignedStaff.map((id) => id.toString()),
})
```

- [ ] **Step 2: Коміт**

```bash
git add src/repository/eventTypeRepository.js
git commit -m "feat(event-type): розширений репозиторій (create/update/delete)"
```

---

## Task 7: EventType Service (бекенд)

**Files:**

- Create: `src/services/eventTypeService.js`

- [ ] **Step 1: Створити eventTypeService.js**

```javascript
import {
	createEventType as repoCreate,
	updateEventType as repoUpdate,
	deleteEventType as repoDelete,
} from '../repository/eventTypeRepository.js'
import Booking from '../models/Booking.js'
import { HttpError } from '../shared/utils/http/httpError.js'
import { generalStatus } from '../shared/utils/http/httpStatus.js'

const generateSlug = (name) =>
	name
		.toLowerCase()
		.replace(/[^a-zA-Zа-яА-ЯіІїЇєЄґҐ0-9\s-]/g, '')
		.replace(/\s+/g, '-')
		.slice(0, 50)

const createEventType = async (orgId, data) => {
	const slug = generateSlug(data.name)

	const eventTypeData = {
		...data,
		orgId,
		slug,
		type: 'org',
		price: { amount: data.price, currency: data.currency },
		assignedPositions:
			data.staffPolicy === 'by_position' ? data.assignedPositions : [],
		assignedStaff: data.staffPolicy === 'specific' ? data.assignedStaff : [],
	}

	return repoCreate(eventTypeData)
}

const updateEventType = async (id, data) => {
	const updateData = { ...data }

	if (data.price !== undefined || data.currency !== undefined) {
		updateData.price = { amount: data.price, currency: data.currency }
		delete updateData.currency
	}

	if (data.staffPolicy) {
		updateData.assignedPositions =
			data.staffPolicy === 'by_position' ? data.assignedPositions : []
		updateData.assignedStaff =
			data.staffPolicy === 'specific' ? data.assignedStaff : []
	}

	const result = await repoUpdate(id, updateData)
	if (!result) {
		throw new HttpError(generalStatus.NOT_FOUND)
	}
	return result
}

const deleteEventType = async (id) => {
	const activeBookings = await Booking.countDocuments({
		eventTypeId: id,
		status: { $in: ['pending_payment', 'confirmed'] },
	})

	if (activeBookings > 0) {
		throw new HttpError(
			{ status: 400, message: 'badRequest', appStatusCode: 400 },
			{ reason: 'Service has active bookings. Cancel or complete them first.' },
		)
	}

	const deleted = await repoDelete(id)
	if (!deleted) {
		throw new HttpError(generalStatus.NOT_FOUND)
	}
	return deleted
}

export { createEventType, updateEventType, deleteEventType }
```

- [ ] **Step 2: Коміт**

```bash
git add src/services/eventTypeService.js
git commit -m "feat(event-type): сервіс з бізнес-логікою (create/update/delete)"
```

---

## Task 8: EventType Controller + Routes — додати POST/PATCH/DELETE (бекенд)

**Files:**

- Modify: `src/controllers/eventTypeController.js`
- Modify: `src/routes/subroutes/eventTypeRoutes.js`

- [ ] **Step 1: Додати хендлери в eventTypeController.js**

Додати в існуючий файл:

```javascript
import {
	createEventType,
	updateEventType,
	deleteEventType,
} from '../services/eventTypeService.js'

const createEventTypeSchema = {
	name: { type: 'string', required: true },
	durationMin: { type: 'number', required: true },
	price: { type: 'number', required: true },
	currency: { type: 'string', required: false, defaultValue: 'UAH' },
	color: { type: 'string', required: false },
	description: { type: 'string', required: false },
	staffPolicy: { type: 'string', required: false, defaultValue: 'any' },
	assignedPositions: {
		type: 'array',
		required: false,
		items: { type: 'string' },
	},
	assignedStaff: { type: 'array', required: false, items: { type: 'string' } },
}

const updateEventTypeSchema = {
	name: { type: 'string', required: false },
	durationMin: { type: 'number', required: false },
	price: { type: 'number', required: false },
	currency: { type: 'string', required: false },
	color: { type: 'string', required: false },
	description: { type: 'string', required: false },
	staffPolicy: { type: 'string', required: false },
	assignedPositions: {
		type: 'array',
		required: false,
		items: { type: 'string' },
	},
	assignedStaff: { type: 'array', required: false, items: { type: 'string' } },
}

const handleCreateEventType = async (req, res) => {
	try {
		const validated = validateSchema(createEventTypeSchema, req.body)
		if (validated.errors) {
			return httpResponse(res, generalStatus.BAD_REQUEST, {
				errors: validated.errors,
			})
		}

		const orgId = req.body.orgId
		if (!orgId || !isValidObjectId(orgId)) {
			return httpResponse(res, generalStatus.BAD_REQUEST)
		}

		const eventType = await createEventType(orgId, validated)
		return httpResponse(res, generalStatus.CREATED, eventType)
	} catch (error) {
		return httpResponseError(res, error)
	}
}

const handleUpdateEventType = async (req, res) => {
	try {
		if (!isValidObjectId(req.params.id)) {
			return httpResponse(res, generalStatus.BAD_REQUEST)
		}

		const validated = validateSchema(updateEventTypeSchema, req.body)
		if (validated.errors) {
			return httpResponse(res, generalStatus.BAD_REQUEST, {
				errors: validated.errors,
			})
		}

		const eventType = await updateEventType(req.params.id, validated)
		return httpResponse(res, generalStatus.SUCCESS, eventType)
	} catch (error) {
		return httpResponseError(res, error)
	}
}

const handleDeleteEventType = async (req, res) => {
	try {
		if (!isValidObjectId(req.params.id)) {
			return httpResponse(res, generalStatus.BAD_REQUEST)
		}

		await deleteEventType(req.params.id)
		return httpResponse(res, generalStatus.SUCCESS)
	} catch (error) {
		return httpResponseError(res, error)
	}
}
```

Додати нові хендлери в export.

- [ ] **Step 2: Додати роути в eventTypeRoutes.js**

```javascript
import { authMiddleware } from '../../modules/auth/index.js'
import { requireOrgAdmin } from '../../middleware/orgMiddleware.js'
import {
	handleCreateEventType,
	handleUpdateEventType,
	handleDeleteEventType,
} from '../../controllers/eventTypeController.js'

const getOrgIdFromBody = (req) => req.body.orgId

router.post(
	'/',
	authMiddleware,
	requireOrgAdmin(getOrgIdFromBody),
	handleCreateEventType,
)
router.patch('/:id', authMiddleware, handleUpdateEventType)
router.delete('/:id', authMiddleware, handleDeleteEventType)
```

- [ ] **Step 3: Коміт**

```bash
git add src/controllers/eventTypeController.js src/routes/subroutes/eventTypeRoutes.js
git commit -m "feat(event-type): контролер + роути для POST/PATCH/DELETE"
```

---

## Task 9: Frontend — Position Types + API Config

**Files:**

- Create: `services/configs/position.types.ts`
- Create: `services/configs/position.config.ts`
- Modify: `services/index.ts`

- [ ] **Step 1: Створити position.types.ts**

```typescript
interface Position {
	id: string
	name: string
	level: number
	color: string | null
	active: boolean
	staffCount: number
	createdAt: string
	updatedAt: string
}

interface CreatePositionBody {
	orgId: string
	name: string
	level?: number
	color?: string
}

interface UpdatePositionBody {
	name?: string
	level?: number
	color?: string
}

export type { Position, CreatePositionBody, UpdatePositionBody }
```

- [ ] **Step 2: Створити position.config.ts**

```typescript
import {
	getData,
	postData,
	patchData,
	deleteData,
} from '@/services/api/methods'
import { endpoint } from '@/services/api/types'
import type { ApiResponse } from '@/services/api/types'
import type {
	Position,
	CreatePositionBody,
	UpdatePositionBody,
} from './position.types'

const positionApiConfig = {
	getByOrg: endpoint<void, ApiResponse<Position[]>>({
		url: ({ orgId }) => `/api/positions?orgId=${orgId}`,
		method: getData,
		defaultErrorMessage: 'Failed to load positions',
	}),

	create: endpoint<CreatePositionBody, ApiResponse<Position>>({
		url: () => `/api/positions`,
		method: postData,
		defaultErrorMessage: 'Failed to create position',
	}),

	update: endpoint<UpdatePositionBody, ApiResponse<Position>>({
		url: ({ id }) => `/api/positions/${id}`,
		method: patchData,
		defaultErrorMessage: 'Failed to update position',
	}),

	remove: endpoint<void, ApiResponse<null>>({
		url: ({ id }) => `/api/positions/${id}`,
		method: deleteData,
		defaultErrorMessage: 'Failed to delete position',
	}),
}

export default positionApiConfig
```

- [ ] **Step 3: Додати positionApi в services/index.ts**

Додати імпорт та експорт:

```typescript
import positionApiConfig from './configs/position.config'

export const positionApi = createApiMethods(
	positionApiConfig,
	defaultInterceptors,
)
```

Та ре-експорт типів:

```typescript
export type {
	Position,
	CreatePositionBody,
	UpdatePositionBody,
} from './configs/position.types'
```

- [ ] **Step 4: Коміт**

```bash
git add services/configs/position.types.ts services/configs/position.config.ts services/index.ts
git commit -m "feat(position): API конфіг + типи для Position CRUD"
```

---

## Task 10: Frontend — EventType Types + API Config

**Files:**

- Create: `services/configs/event-type.types.ts`
- Create: `services/configs/event-type.config.ts`
- Modify: `services/configs/booking.types.ts`
- Modify: `services/index.ts`

- [ ] **Step 1: Створити event-type.types.ts**

```typescript
type StaffPolicy = 'any' | 'by_position' | 'specific'

interface CreateEventTypeBody {
	orgId: string
	name: string
	durationMin: number
	price: number
	currency: string
	color?: string
	description?: string
	staffPolicy: StaffPolicy
	assignedPositions?: string[]
	assignedStaff?: string[]
}

interface UpdateEventTypeBody {
	name?: string
	durationMin?: number
	price?: number
	currency?: string
	color?: string
	description?: string
	staffPolicy?: StaffPolicy
	assignedPositions?: string[]
	assignedStaff?: string[]
}

export type { StaffPolicy, CreateEventTypeBody, UpdateEventTypeBody }
```

- [ ] **Step 2: Розширити EventType в booking.types.ts**

Додати нові поля в існуючий інтерфейс `EventType`:

```typescript
interface EventType {
	id: string
	name: string
	slug: string
	durationMin: number
	price: number
	currency: string
	color: string
	description: string | null
	staffPolicy: 'any' | 'by_position' | 'specific'
	assignedPositions: string[]
	assignedStaff: string[]
}
```

- [ ] **Step 3: Створити event-type.config.ts**

```typescript
import { postData, patchData, deleteData } from '@/services/api/methods'
import { endpoint } from '@/services/api/types'
import type { ApiResponse } from '@/services/api/types'
import type { EventType } from './booking.types'
import type {
	CreateEventTypeBody,
	UpdateEventTypeBody,
} from './event-type.types'

const eventTypeApiConfig = {
	create: endpoint<CreateEventTypeBody, ApiResponse<EventType>>({
		url: () => `/api/event-types`,
		method: postData,
		defaultErrorMessage: 'Failed to create service',
	}),

	update: endpoint<UpdateEventTypeBody, ApiResponse<EventType>>({
		url: ({ id }) => `/api/event-types/${id}`,
		method: patchData,
		defaultErrorMessage: 'Failed to update service',
	}),

	remove: endpoint<void, ApiResponse<null>>({
		url: ({ id }) => `/api/event-types/${id}`,
		method: deleteData,
		defaultErrorMessage: 'Failed to delete service',
	}),
}

export default eventTypeApiConfig
```

- [ ] **Step 4: Додати eventTypeApi в services/index.ts**

```typescript
import eventTypeApiConfig from './configs/event-type.config'

export const eventTypeApi = createApiMethods(
	eventTypeApiConfig,
	defaultInterceptors,
)

export type {
	StaffPolicy,
	CreateEventTypeBody,
	UpdateEventTypeBody,
} from './configs/event-type.types'
```

- [ ] **Step 5: Коміт**

```bash
git add services/configs/event-type.types.ts services/configs/event-type.config.ts services/configs/booking.types.ts services/index.ts
git commit -m "feat(event-type): API конфіг + типи для EventType CRUD"
```

---

## Task 11: Frontend — i18n

**Files:**

- Modify: `i18n/messages/uk.json`
- Modify: `i18n/messages/en.json`

- [ ] **Step 1: Додати ключі в uk.json**

Додати на верхньому рівні:

```json
"sidebar": {
  ...existing keys...,
  "positions": "Позиції",
  "services": "Послуги"
},
"positions": {
  "title": "Позиції",
  "add": "Додати позицію",
  "edit": "Редагувати позицію",
  "delete": "Видалити позицію",
  "deleteConfirm": "Ви впевнені, що хочете видалити цю позицію?",
  "empty": "Позицій ще немає",
  "emptyDescription": "Створіть першу позицію для організації",
  "name": "Назва",
  "level": "Рівень",
  "color": "Колір",
  "staffCount": "Співробітники",
  "namePlaceholder": "Наприклад: Барбер",
  "created": "Позицію створено",
  "updated": "Позицію оновлено",
  "deleted": "Позицію видалено"
},
"services": {
  "title": "Послуги",
  "add": "Додати послугу",
  "edit": "Редагувати послугу",
  "delete": "Видалити послугу",
  "deleteConfirm": "Ви впевнені, що хочете видалити цю послугу?",
  "empty": "Послуг ще немає",
  "emptyDescription": "Створіть першу послугу для організації",
  "name": "Назва",
  "duration": "Тривалість",
  "durationMin": "хв",
  "price": "Ціна",
  "color": "Колір",
  "description": "Опис",
  "descriptionPlaceholder": "Опис послуги (необов'язково)",
  "namePlaceholder": "Наприклад: Стрижка",
  "staffPolicy": "Хто виконує",
  "staffPolicyAny": "Усі співробітники",
  "staffPolicyByPosition": "За позицією",
  "staffPolicySpecific": "Конкретні співробітники",
  "assignedPositions": "Позиції",
  "assignedStaff": "Співробітники",
  "selectPositions": "Оберіть позиції",
  "selectStaff": "Оберіть співробітників",
  "created": "Послугу створено",
  "updated": "Послугу оновлено",
  "deleted": "Послугу видалено"
}
```

- [ ] **Step 2: Додати ключі в en.json**

```json
"sidebar": {
  ...existing keys...,
  "positions": "Positions",
  "services": "Services"
},
"positions": {
  "title": "Positions",
  "add": "Add position",
  "edit": "Edit position",
  "delete": "Delete position",
  "deleteConfirm": "Are you sure you want to delete this position?",
  "empty": "No positions yet",
  "emptyDescription": "Create the first position for the organization",
  "name": "Name",
  "level": "Level",
  "color": "Color",
  "staffCount": "Staff",
  "namePlaceholder": "e.g. Barber",
  "created": "Position created",
  "updated": "Position updated",
  "deleted": "Position deleted"
},
"services": {
  "title": "Services",
  "add": "Add service",
  "edit": "Edit service",
  "delete": "Delete service",
  "deleteConfirm": "Are you sure you want to delete this service?",
  "empty": "No services yet",
  "emptyDescription": "Create the first service for the organization",
  "name": "Name",
  "duration": "Duration",
  "durationMin": "min",
  "price": "Price",
  "color": "Color",
  "description": "Description",
  "descriptionPlaceholder": "Service description (optional)",
  "namePlaceholder": "e.g. Haircut",
  "staffPolicy": "Who performs",
  "staffPolicyAny": "All staff",
  "staffPolicyByPosition": "By position",
  "staffPolicySpecific": "Specific staff",
  "assignedPositions": "Positions",
  "assignedStaff": "Staff",
  "selectPositions": "Select positions",
  "selectStaff": "Select staff",
  "created": "Service created",
  "updated": "Service updated",
  "deleted": "Service deleted"
}
```

- [ ] **Step 3: Коміт**

```bash
git add i18n/messages/uk.json i18n/messages/en.json
git commit -m "feat(i18n): переклади для позицій та послуг (uk + en)"
```

---

## Task 12: Frontend — Position Dialog Component

**Files:**

- Create: `components/positions/PositionDialog.tsx`

- [ ] **Step 1: Створити PositionDialog.tsx**

```tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { positionApi, setServerErrors } from '@/services'
import type { Position } from '@/services'

const positionSchema = z.object({
	name: z.string().min(2),
	level: z.coerce.number().min(0),
	color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
})

type PositionFormData = z.infer<typeof positionSchema>

interface PositionDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	orgId: string
	position?: Position | null
	onSuccess: () => void
}

const DEFAULT_COLORS = [
	'#8B5CF6',
	'#06B6D4',
	'#F59E0B',
	'#EF4444',
	'#10B981',
	'#3B82F6',
	'#EC4899',
	'#F97316',
]

function PositionDialog({
	open,
	onOpenChange,
	orgId,
	position,
	onSuccess,
}: PositionDialogProps) {
	const t = useTranslations('positions')
	const isEditing = !!position

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
		reset,
		setError,
		setValue,
		watch,
	} = useForm<PositionFormData>({
		resolver: zodResolver(positionSchema),
		defaultValues: {
			name: position?.name ?? '',
			level: position?.level ?? 0,
			color: position?.color ?? DEFAULT_COLORS[0],
		},
	})

	const selectedColor = watch('color')

	const onSubmit = async (data: PositionFormData) => {
		try {
			if (isEditing) {
				await positionApi.update({
					pathParams: { id: position.id },
					body: data,
				})
				toast.success(t('updated'))
			} else {
				await positionApi.create({
					body: { ...data, orgId },
				})
				toast.success(t('created'))
			}
			reset()
			onOpenChange(false)
			onSuccess()
		} catch (err) {
			setServerErrors(err, setError)
		}
	}

	const selectColor = (color: string) => () => {
		setValue('color', color)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{isEditing ? t('edit') : t('add')}</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
					<Field data-invalid={!!errors.name || undefined}>
						<FieldLabel htmlFor="name">{t('name')}</FieldLabel>
						<Input
							id="name"
							placeholder={t('namePlaceholder')}
							{...register('name')}
						/>
						<FieldError errors={[errors.name]} />
					</Field>

					<Field data-invalid={!!errors.level || undefined}>
						<FieldLabel htmlFor="level">{t('level')}</FieldLabel>
						<Input id="level" type="number" min={0} {...register('level')} />
						<FieldError errors={[errors.level]} />
					</Field>

					<Field data-invalid={!!errors.color || undefined}>
						<FieldLabel>{t('color')}</FieldLabel>
						<div className="flex gap-2">
							{DEFAULT_COLORS.map((color) => (
								<button
									key={color}
									type="button"
									onClick={selectColor(color)}
									className="h-8 w-8 rounded-full border-2 transition-transform"
									style={{
										backgroundColor: color,
										borderColor:
											selectedColor === color
												? 'var(--foreground)'
												: 'transparent',
										transform:
											selectedColor === color ? 'scale(1.15)' : 'scale(1)',
									}}
								/>
							))}
						</div>
						<input type="hidden" {...register('color')} />
						<FieldError errors={[errors.color]} />
					</Field>

					<Button type="submit" disabled={isSubmitting} className="w-full">
						{isEditing ? t('edit') : t('add')}
					</Button>
				</form>
			</DialogContent>
		</Dialog>
	)
}

export { PositionDialog }
```

- [ ] **Step 2: Коміт**

```bash
git add components/positions/PositionDialog.tsx
git commit -m "feat(positions): компонент PositionDialog (створення/редагування)"
```

---

## Task 13: Frontend — Position List Component + Page

**Files:**

- Create: `components/positions/PositionList.tsx`
- Create: `app/[locale]/(org)/manage/[orgId]/positions/page.tsx`

- [ ] **Step 1: Створити PositionList.tsx**

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Empty } from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import { positionApi } from '@/services'
import type { Position } from '@/services'
import { PositionDialog } from './PositionDialog'

interface PositionListProps {
	orgId: string
}

function PositionList({ orgId }: PositionListProps) {
	const t = useTranslations('positions')
	const [positions, setPositions] = useState<Position[]>([])
	const [loading, setLoading] = useState(true)
	const [dialogOpen, setDialogOpen] = useState(false)
	const [editingPosition, setEditingPosition] = useState<Position | null>(null)
	const [deletingPosition, setDeletingPosition] = useState<Position | null>(
		null,
	)

	const fetchPositions = useCallback(async () => {
		try {
			setLoading(true)
			const response = await positionApi.getByOrg({ pathParams: { orgId } })
			setPositions(response.data)
		} catch {
			// toast handled by interceptor
		} finally {
			setLoading(false)
		}
	}, [orgId])

	useEffect(() => {
		fetchPositions()
	}, [fetchPositions])

	const handleEdit = (position: Position) => () => {
		setEditingPosition(position)
		setDialogOpen(true)
	}

	const handleAdd = () => {
		setEditingPosition(null)
		setDialogOpen(true)
	}

	const handleDelete = async () => {
		if (!deletingPosition) return
		try {
			await positionApi.remove({ pathParams: { id: deletingPosition.id } })
			toast.success(t('deleted'))
			setDeletingPosition(null)
			fetchPositions()
		} catch {
			// toast handled by interceptor
		}
	}

	const openDeleteDialog = (position: Position) => () => {
		setDeletingPosition(position)
	}

	if (loading) {
		return (
			<div className="flex justify-center py-12">
				<Spinner />
			</div>
		)
	}

	if (positions.length === 0) {
		return (
			<>
				<Empty
					title={t('empty')}
					description={t('emptyDescription')}
					action={<Button onClick={handleAdd}>{t('add')}</Button>}
				/>
				<PositionDialog
					open={dialogOpen}
					onOpenChange={setDialogOpen}
					orgId={orgId}
					position={editingPosition}
					onSuccess={fetchPositions}
				/>
			</>
		)
	}

	const renderPosition = (position: Position) => (
		<div
			key={position.id}
			className="flex items-center justify-between rounded-lg border p-4"
		>
			<div className="flex items-center gap-3">
				<div
					className="h-4 w-4 rounded-full"
					style={{ backgroundColor: position.color || '#94a3b8' }}
				/>
				<div>
					<p className="font-medium">{position.name}</p>
					<p className="text-muted-foreground text-sm">
						{t('level')}: {position.level} · {t('staffCount')}:{' '}
						{position.staffCount}
					</p>
				</div>
			</div>
			<div className="flex gap-1">
				<Button variant="ghost" size="icon" onClick={handleEdit(position)}>
					<Pencil className="h-4 w-4" />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					onClick={openDeleteDialog(position)}
				>
					<Trash2 className="h-4 w-4" />
				</Button>
			</div>
		</div>
	)

	return (
		<>
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold">{t('title')}</h1>
				<Button onClick={handleAdd}>{t('add')}</Button>
			</div>

			<div className="mt-4 space-y-2">{positions.map(renderPosition)}</div>

			<PositionDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				orgId={orgId}
				position={editingPosition}
				onSuccess={fetchPositions}
			/>

			<AlertDialog
				open={!!deletingPosition}
				onOpenChange={(open) => {
					if (!open) setDeletingPosition(null)
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t('delete')}</AlertDialogTitle>
						<AlertDialogDescription>
							{t('deleteConfirm')}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
						<AlertDialogAction onClick={handleDelete}>
							{t('delete')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}

export { PositionList }
```

- [ ] **Step 2: Створити positions/page.tsx**

```tsx
import { PositionList } from '@/components/positions/PositionList'

export default async function PositionsPage({
	params,
}: {
	params: Promise<{ orgId: string }>
}) {
	const { orgId } = await params

	return (
		<div className="container max-w-3xl py-6">
			<PositionList orgId={orgId} />
		</div>
	)
}
```

- [ ] **Step 3: Коміт**

```bash
git add components/positions/PositionList.tsx app/\[locale\]/\(org\)/manage/\[orgId\]/positions/page.tsx
git commit -m "feat(positions): список позицій + сторінка /manage/[orgId]/positions"
```

---

## Task 14: Frontend — Service Dialog Component

**Files:**

- Create: `components/services/ServiceDialog.tsx`

- [ ] **Step 1: Створити ServiceDialog.tsx**

```tsx
'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { eventTypeApi, positionApi, orgApi, setServerErrors } from '@/services'
import type { EventType, Position, OrgStaffMember } from '@/services'

const serviceSchema = z
	.object({
		name: z.string().min(2),
		durationMin: z.coerce.number().positive(),
		price: z.coerce.number().min(0),
		color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
		description: z.string().optional(),
		staffPolicy: z.enum(['any', 'by_position', 'specific']),
		assignedPositions: z.array(z.string()).optional(),
		assignedStaff: z.array(z.string()).optional(),
	})
	.refine(
		(data) => {
			if (data.staffPolicy === 'by_position')
				return data.assignedPositions && data.assignedPositions.length > 0
			if (data.staffPolicy === 'specific')
				return data.assignedStaff && data.assignedStaff.length > 0
			return true
		},
		{ message: 'Select positions or staff according to chosen policy' },
	)

type ServiceFormData = z.infer<typeof serviceSchema>

interface ServiceDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	orgId: string
	currency: string
	eventType?: EventType | null
	onSuccess: () => void
}

const DEFAULT_COLORS = [
	'#8B5CF6',
	'#06B6D4',
	'#F59E0B',
	'#EF4444',
	'#10B981',
	'#3B82F6',
	'#EC4899',
	'#F97316',
]

function ServiceDialog({
	open,
	onOpenChange,
	orgId,
	currency,
	eventType,
	onSuccess,
}: ServiceDialogProps) {
	const t = useTranslations('services')
	const isEditing = !!eventType
	const [positions, setPositions] = useState<Position[]>([])
	const [staffMembers, setStaffMembers] = useState<OrgStaffMember[]>([])

	const {
		register,
		handleSubmit,
		control,
		formState: { errors, isSubmitting },
		reset,
		setError,
		setValue,
		watch,
	} = useForm<ServiceFormData>({
		resolver: zodResolver(serviceSchema),
		defaultValues: {
			name: eventType?.name ?? '',
			durationMin: eventType?.durationMin ?? 60,
			price: eventType?.price ?? 0,
			color: eventType?.color ?? DEFAULT_COLORS[0],
			description: eventType?.description ?? '',
			staffPolicy: eventType?.staffPolicy ?? 'any',
			assignedPositions: eventType?.assignedPositions ?? [],
			assignedStaff: eventType?.assignedStaff ?? [],
		},
	})

	const staffPolicy = watch('staffPolicy')
	const selectedColor = watch('color')

	useEffect(() => {
		if (!open) return

		const loadData = async () => {
			try {
				const [posRes, staffRes] = await Promise.all([
					positionApi.getByOrg({ pathParams: { orgId } }),
					orgApi.getStaff({ pathParams: { id: orgId } }),
				])
				setPositions(posRes.data)
				setStaffMembers(staffRes.data)
			} catch {
				// toast handled by interceptor
			}
		}

		loadData()
	}, [open, orgId])

	const onSubmit = async (data: ServiceFormData) => {
		try {
			if (isEditing) {
				await eventTypeApi.update({
					pathParams: { id: eventType.id },
					body: { ...data, currency },
				})
				toast.success(t('updated'))
			} else {
				await eventTypeApi.create({
					body: { ...data, orgId, currency },
				})
				toast.success(t('created'))
			}
			reset()
			onOpenChange(false)
			onSuccess()
		} catch (err) {
			setServerErrors(err, setError)
		}
	}

	const selectColor = (color: string) => () => {
		setValue('color', color)
	}

	const toggleArrayItem =
		(fieldName: 'assignedPositions' | 'assignedStaff', id: string) => () => {
			const current = watch(fieldName) || []
			const hasItem = current.includes(id)
			const updated = hasItem
				? current.filter((item) => item !== id)
				: [...current, id]
			setValue(fieldName, updated)
		}

	const renderPositionSelector = () => {
		const selected = watch('assignedPositions') || []
		return (
			<Field>
				<FieldLabel>{t('assignedPositions')}</FieldLabel>
				<div className="flex flex-wrap gap-2">
					{positions.map((pos) => {
						const isSelected = selected.includes(pos.id)
						return (
							<button
								key={pos.id}
								type="button"
								onClick={toggleArrayItem('assignedPositions', pos.id)}
								className={`rounded-full border px-3 py-1 text-sm transition-colors ${
									isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
								}`}
							>
								<span
									className="mr-1.5 inline-block h-2 w-2 rounded-full"
									style={{ backgroundColor: pos.color || '#94a3b8' }}
								/>
								{pos.name}
							</button>
						)
					})}
				</div>
			</Field>
		)
	}

	const renderStaffSelector = () => {
		const selected = watch('assignedStaff') || []
		return (
			<Field>
				<FieldLabel>{t('assignedStaff')}</FieldLabel>
				<div className="flex flex-wrap gap-2">
					{staffMembers.map((member) => {
						const isSelected = selected.includes(member.id)
						return (
							<button
								key={member.id}
								type="button"
								onClick={toggleArrayItem('assignedStaff', member.id)}
								className={`rounded-full border px-3 py-1 text-sm transition-colors ${
									isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
								}`}
							>
								{member.name}
							</button>
						)
					})}
				</div>
			</Field>
		)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{isEditing ? t('edit') : t('add')}</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
					<Field data-invalid={!!errors.name || undefined}>
						<FieldLabel htmlFor="name">{t('name')}</FieldLabel>
						<Input
							id="name"
							placeholder={t('namePlaceholder')}
							{...register('name')}
						/>
						<FieldError errors={[errors.name]} />
					</Field>

					<div className="grid grid-cols-2 gap-4">
						<Field data-invalid={!!errors.durationMin || undefined}>
							<FieldLabel htmlFor="durationMin">
								{t('duration')} ({t('durationMin')})
							</FieldLabel>
							<Input
								id="durationMin"
								type="number"
								min={5}
								{...register('durationMin')}
							/>
							<FieldError errors={[errors.durationMin]} />
						</Field>

						<Field data-invalid={!!errors.price || undefined}>
							<FieldLabel htmlFor="price">
								{t('price')} ({currency})
							</FieldLabel>
							<Input id="price" type="number" min={0} {...register('price')} />
							<FieldError errors={[errors.price]} />
						</Field>
					</div>

					<Field data-invalid={!!errors.color || undefined}>
						<FieldLabel>{t('color')}</FieldLabel>
						<div className="flex gap-2">
							{DEFAULT_COLORS.map((color) => (
								<button
									key={color}
									type="button"
									onClick={selectColor(color)}
									className="h-8 w-8 rounded-full border-2 transition-transform"
									style={{
										backgroundColor: color,
										borderColor:
											selectedColor === color
												? 'var(--foreground)'
												: 'transparent',
										transform:
											selectedColor === color ? 'scale(1.15)' : 'scale(1)',
									}}
								/>
							))}
						</div>
						<input type="hidden" {...register('color')} />
					</Field>

					<Field>
						<FieldLabel htmlFor="description">{t('description')}</FieldLabel>
						<Textarea
							id="description"
							placeholder={t('descriptionPlaceholder')}
							{...register('description')}
						/>
					</Field>

					<Field>
						<FieldLabel>{t('staffPolicy')}</FieldLabel>
						<Controller
							control={control}
							name="staffPolicy"
							render={({ field }) => (
								<RadioGroup
									value={field.value}
									onValueChange={field.onChange}
									className="space-y-2"
								>
									<div className="flex items-center gap-2">
										<RadioGroupItem value="any" id="policy-any" />
										<label htmlFor="policy-any">{t('staffPolicyAny')}</label>
									</div>
									<div className="flex items-center gap-2">
										<RadioGroupItem value="by_position" id="policy-position" />
										<label htmlFor="policy-position">
											{t('staffPolicyByPosition')}
										</label>
									</div>
									<div className="flex items-center gap-2">
										<RadioGroupItem value="specific" id="policy-specific" />
										<label htmlFor="policy-specific">
											{t('staffPolicySpecific')}
										</label>
									</div>
								</RadioGroup>
							)}
						/>
					</Field>

					{staffPolicy === 'by_position' && renderPositionSelector()}
					{staffPolicy === 'specific' && renderStaffSelector()}

					<Button type="submit" disabled={isSubmitting} className="w-full">
						{isEditing ? t('edit') : t('add')}
					</Button>
				</form>
			</DialogContent>
		</Dialog>
	)
}

export { ServiceDialog }
```

- [ ] **Step 2: Коміт**

```bash
git add components/services/ServiceDialog.tsx
git commit -m "feat(services): компонент ServiceDialog (створення/редагування з staffPolicy)"
```

---

## Task 15: Frontend — Services List Component + Page

**Files:**

- Create: `components/services/ServicesList.tsx`
- Create: `app/[locale]/(org)/manage/[orgId]/services/page.tsx`

- [ ] **Step 1: Створити ServicesList.tsx**

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Empty } from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import { eventTypeApi } from '@/services'
import { eventTypeApi as bookingEventTypeApi } from '@/lib/booking-api-client'
import type { EventType } from '@/services'
import { ServiceDialog } from './ServiceDialog'

interface ServicesListProps {
	orgId: string
	currency: string
}

const POLICY_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
	any: 'default',
	by_position: 'secondary',
	specific: 'outline',
}

function ServicesList({ orgId, currency }: ServicesListProps) {
	const t = useTranslations('services')
	const [services, setServices] = useState<EventType[]>([])
	const [loading, setLoading] = useState(true)
	const [dialogOpen, setDialogOpen] = useState(false)
	const [editingService, setEditingService] = useState<EventType | null>(null)
	const [deletingService, setDeletingService] = useState<EventType | null>(null)

	const fetchServices = useCallback(async () => {
		try {
			setLoading(true)
			const data = await bookingEventTypeApi.getByOrg(orgId)
			setServices(data)
		} catch {
			// toast handled by interceptor
		} finally {
			setLoading(false)
		}
	}, [orgId])

	useEffect(() => {
		fetchServices()
	}, [fetchServices])

	const handleEdit = (service: EventType) => () => {
		setEditingService(service)
		setDialogOpen(true)
	}

	const handleAdd = () => {
		setEditingService(null)
		setDialogOpen(true)
	}

	const handleDelete = async () => {
		if (!deletingService) return
		try {
			await eventTypeApi.remove({ pathParams: { id: deletingService.id } })
			toast.success(t('deleted'))
			setDeletingService(null)
			fetchServices()
		} catch {
			// toast handled by interceptor
		}
	}

	const openDeleteDialog = (service: EventType) => () => {
		setDeletingService(service)
	}

	const getPolicyLabel = (policy: string) => {
		const labels: Record<string, string> = {
			any: t('staffPolicyAny'),
			by_position: t('staffPolicyByPosition'),
			specific: t('staffPolicySpecific'),
		}
		return labels[policy] || policy
	}

	if (loading) {
		return (
			<div className="flex justify-center py-12">
				<Spinner />
			</div>
		)
	}

	if (services.length === 0) {
		return (
			<>
				<Empty
					title={t('empty')}
					description={t('emptyDescription')}
					action={<Button onClick={handleAdd}>{t('add')}</Button>}
				/>
				<ServiceDialog
					open={dialogOpen}
					onOpenChange={setDialogOpen}
					orgId={orgId}
					currency={currency}
					eventType={editingService}
					onSuccess={fetchServices}
				/>
			</>
		)
	}

	const renderService = (service: EventType) => (
		<div
			key={service.id}
			className="flex items-center justify-between rounded-lg border p-4"
		>
			<div className="flex items-center gap-3">
				<div
					className="h-4 w-4 rounded-full"
					style={{ backgroundColor: service.color }}
				/>
				<div>
					<p className="font-medium">{service.name}</p>
					<p className="text-muted-foreground text-sm">
						{service.durationMin} {t('durationMin')} · {service.price}{' '}
						{service.currency}
					</p>
				</div>
			</div>
			<div className="flex items-center gap-2">
				<Badge variant={POLICY_VARIANT[service.staffPolicy] || 'default'}>
					{getPolicyLabel(service.staffPolicy)}
				</Badge>
				<Button variant="ghost" size="icon" onClick={handleEdit(service)}>
					<Pencil className="h-4 w-4" />
				</Button>
				<Button variant="ghost" size="icon" onClick={openDeleteDialog(service)}>
					<Trash2 className="h-4 w-4" />
				</Button>
			</div>
		</div>
	)

	return (
		<>
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold">{t('title')}</h1>
				<Button onClick={handleAdd}>{t('add')}</Button>
			</div>

			<div className="mt-4 space-y-2">{services.map(renderService)}</div>

			<ServiceDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				orgId={orgId}
				currency={currency}
				eventType={editingService}
				onSuccess={fetchServices}
			/>

			<AlertDialog
				open={!!deletingService}
				onOpenChange={(open) => {
					if (!open) setDeletingService(null)
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t('delete')}</AlertDialogTitle>
						<AlertDialogDescription>
							{t('deleteConfirm')}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
						<AlertDialogAction onClick={handleDelete}>
							{t('delete')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}

export { ServicesList }
```

- [ ] **Step 2: Створити services/page.tsx**

```tsx
import { ServicesList } from '@/components/services/ServicesList'

export default async function ServicesPage({
	params,
}: {
	params: Promise<{ orgId: string }>
}) {
	const { orgId } = await params

	return (
		<div className="container max-w-3xl py-6">
			<ServicesList orgId={orgId} currency="UAH" />
		</div>
	)
}
```

- [ ] **Step 3: Коміт**

```bash
git add components/services/ServicesList.tsx app/\[locale\]/\(org\)/manage/\[orgId\]/services/page.tsx
git commit -m "feat(services): список послуг + сторінка /manage/[orgId]/services"
```

---

## Task 16: Frontend — OrgSidebar — нові пункти

**Files:**

- Modify: `components/sidebar/OrgSidebar.tsx`

- [ ] **Step 1: Додати пункти "Позиції" та "Послуги"**

Імпортувати іконки:

```typescript
import {
	Calendar,
	Users,
	ArrowLeft,
	LogOut,
	Briefcase,
	Settings2,
} from 'lucide-react'
```

Додати нові пункти між "Загальний розклад" та "Персонал" SidebarGroup:

```tsx
<SidebarMenuItem>
  <SidebarMenuButton
    asChild
    isActive={pathname === buildHref(`/manage/${orgId}/positions`)}
  >
    <Link href={buildHref(`/manage/${orgId}/positions`)}>
      <Briefcase className="h-4 w-4" />
      <span>{t('positions')}</span>
    </Link>
  </SidebarMenuButton>
</SidebarMenuItem>

<SidebarMenuItem>
  <SidebarMenuButton
    asChild
    isActive={pathname === buildHref(`/manage/${orgId}/services`)}
  >
    <Link href={buildHref(`/manage/${orgId}/services`)}>
      <Settings2 className="h-4 w-4" />
      <span>{t('services')}</span>
    </Link>
  </SidebarMenuButton>
</SidebarMenuItem>
```

**Захист за роллю:** Показувати ці пункти тільки якщо роль користувача `owner` або `admin`. Для цього потрібно отримати роль з Membership або OrgListItem. Якщо роль вже доступна в компоненті — обгорнути в умову. Якщо ні — додати передачу ролі через props або context.

- [ ] **Step 2: Коміт**

```bash
git add components/sidebar/OrgSidebar.tsx
git commit -m "feat(sidebar): пункти Позиції та Послуги в OrgSidebar"
```

---

## Task 17: Перевірка — білд фронтенду

- [ ] **Step 1: Запустити lint**

```bash
npm run lint
```

Expected: no errors

- [ ] **Step 2: Запустити build**

```bash
npm run build
```

Expected: build succeeds

- [ ] **Step 3: Виправити помилки якщо є, коміт**

```bash
git add -A
git commit -m "fix: виправлення lint/build помилок"
```
