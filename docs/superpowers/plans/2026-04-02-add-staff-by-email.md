# Добавление сотрудника в организацию по email — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить кнопку "+" рядом с Select выбора сотрудника на странице Staff Schedule, которая открывает Popover с Combobox для поиска пользователей по email и добавления их в организацию.

**Architecture:** Бэкенд — 2 новых эндпоинта: поиск пользователей по email (GET) и добавление сотрудника в организацию (POST). Фронтенд — новый компонент `AddStaffPopover` с Popover + Combobox, подключённый к странице Staff Schedule. API слой — расширение `org.config.ts` и нового `user.config.ts`.

**Tech Stack:** Express.js (backend), Next.js + React 19 (frontend), @base-ui/react Combobox, Popover, shadcn/ui, TypeScript, Mongoose

---

### Task 1: Бэкенд — repository для поиска пользователей по email

**Files:**

- Modify: `/Users/egorzozula/Desktop/BackendTemplate/src/modules/user/repository/userRepository.js`
- Modify: `/Users/egorzozula/Desktop/BackendTemplate/src/modules/user/services/userServices.js`
- Modify: `/Users/egorzozula/Desktop/BackendTemplate/src/modules/user/index.js`

- [ ] **Step 1: Добавить функцию searchUsersByEmail в userRepository.js**

В конец файла перед `export` добавить:

```javascript
const searchUsersByEmail = async (
	emailQuery,
	excludeUserIds = [],
	limit = 10,
) => {
	const regex = new RegExp(emailQuery, 'i')
	const docs = await User.find({
		email: regex,
		_id: { $nin: excludeUserIds },
	}).limit(limit)
	const toDto = (doc) => toUserDto(doc)
	return docs.map(toDto)
}
```

Обновить экспорт:

```javascript
export {
	createUser,
	getUserById,
	getUser,
	updateUser,
	deleteUser,
	searchUsersByEmail,
}
```

- [ ] **Step 2: Добавить searchUsersByEmail в userServices.js**

```javascript
import {
	createUser as repoCreateUser,
	getUserById as repoGetUserById,
	getUser as repoGetUser,
	updateUser as repoUpdateUser,
	deleteUser as repoDeleteUser,
	searchUsersByEmail as repoSearchUsersByEmail,
} from '../repository/userRepository.js'

const searchUsersByEmail = async (emailQuery, excludeUserIds, limit) => {
	return await repoSearchUsersByEmail(emailQuery, excludeUserIds, limit)
}
```

Обновить экспорт:

```javascript
export {
	createUser,
	getUserById,
	getUser,
	updateUser,
	deleteUser,
	searchUsersByEmail,
}
```

- [ ] **Step 3: Экспортировать searchUsersByEmail из user/index.js**

```javascript
export {
	getUserById,
	getUser,
	createUser,
	updateUser,
	searchUsersByEmail,
} from './services/userServices.js'
export { toUserDto } from './dto/userDto.js'
export { default as userRouter } from './routes/userRoutes.js'
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/user/
git commit -m "feat: добавить searchUsersByEmail в user module"
```

---

### Task 2: Бэкенд — repository для проверки существующих членств

**Files:**

- Modify: `/Users/egorzozula/Desktop/BackendTemplate/src/repository/membershipRepository.js`

- [ ] **Step 1: Добавить getMemberUserIdsByOrg для получения userId всех членов организации**

```javascript
const getMemberUserIdsByOrg = async (orgId) => {
	const docs = await Membership.find({
		orgId,
		status: {
			$in: [
				MEMBERSHIP_STATUS.ACTIVE,
				MEMBERSHIP_STATUS.INVITED,
				MEMBERSHIP_STATUS.SUSPENDED,
			],
		},
	}).select('userId')
	const toUserId = (doc) => doc.userId
	return docs.map(toUserId)
}
```

Обновить экспорт — добавить `getMemberUserIdsByOrg`.

- [ ] **Step 2: Добавить getMembershipByUserAndOrg для проверки дубликатов при добавлении**

```javascript
const getMembershipByUserAndOrg = async (userId, orgId) => {
	return Membership.findOne({ userId, orgId })
}
```

Обновить экспорт — добавить `getMembershipByUserAndOrg`.

- [ ] **Step 3: Commit**

```bash
git add src/repository/membershipRepository.js
git commit -m "feat: добавить getMemberUserIdsByOrg и getMembershipByUserAndOrg"
```

---

### Task 3: Бэкенд — сервис и контроллер для поиска пользователей

**Files:**

- Create: `/Users/egorzozula/Desktop/BackendTemplate/src/services/userSearchServices.js`
- Create: `/Users/egorzozula/Desktop/BackendTemplate/src/controllers/userSearchController.js`

- [ ] **Step 1: Создать userSearchServices.js**

```javascript
import { searchUsersByEmail } from '../modules/user/index.js'
import { getMemberUserIdsByOrg } from '../repository/membershipRepository.js'

const searchUsersExcludingOrgMembers = async (emailQuery, orgId) => {
	const existingMemberIds = await getMemberUserIdsByOrg(orgId)
	const users = await searchUsersByEmail(emailQuery, existingMemberIds, 10)
	const toEmailResult = (user) => ({ id: user.id, email: user.email })
	return users.map(toEmailResult)
}

export { searchUsersExcludingOrgMembers }
```

- [ ] **Step 2: Создать userSearchController.js**

```javascript
import { searchUsersExcludingOrgMembers } from '../services/userSearchServices.js'
import {
	httpResponse,
	httpResponseError,
} from '../shared/utils/http/httpResponse.js'
import { generalStatus, userStatus } from '../shared/utils/http/httpStatus.js'

const handleSearchUsers = async (req, res) => {
	try {
		const { email, orgId } = req.query

		if (!email || email.length < 3) {
			return httpResponseError(res, {
				...userStatus.VALIDATION_ERROR,
				data: { email: { error: 'email — минимум 3 символа' } },
			})
		}

		if (!orgId) {
			return httpResponseError(res, {
				...userStatus.VALIDATION_ERROR,
				data: { orgId: { error: 'orgId обязателен' } },
			})
		}

		const users = await searchUsersExcludingOrgMembers(email, orgId)
		return httpResponse(res, generalStatus.SUCCESS, users)
	} catch (error) {
		return httpResponseError(res, error)
	}
}

export { handleSearchUsers }
```

- [ ] **Step 3: Commit**

```bash
git add src/services/userSearchServices.js src/controllers/userSearchController.js
git commit -m "feat: сервис и контроллер поиска пользователей по email"
```

---

### Task 4: Бэкенд — сервис и контроллер для добавления сотрудника

**Files:**

- Modify: `/Users/egorzozula/Desktop/BackendTemplate/src/services/orgServices.js`
- Modify: `/Users/egorzozula/Desktop/BackendTemplate/src/controllers/orgController.js`

- [ ] **Step 1: Добавить addStaffToOrg в orgServices.js**

Добавить импорт:

```javascript
import { getMembershipByUserAndOrg } from '../repository/membershipRepository.js'
import { getUserById } from '../modules/user/index.js'
```

Примечание: `getUserById` уже импортирован. Добавить только `getMembershipByUserAndOrg`.

Добавить функцию:

```javascript
const addStaffToOrg = async (orgId, userId, invitedByUserId) => {
	const org = await getOrgById(orgId)
	if (!org) return { error: 'org_not_found' }

	const user = await getUserById(userId)
	if (!user) return { error: 'user_not_found' }

	const existing = await getMembershipByUserAndOrg(userId, orgId)
	if (existing) return { error: 'already_member' }

	const membership = await createMembership({
		userId,
		orgId,
		role: 'member',
		status: MEMBERSHIP_STATUS.INVITED,
		invitedBy: invitedByUserId,
	})

	return {
		staff: {
			id: user.id,
			name: user.name,
			avatar: user.avatar,
			position: null,
			bookingCount: 0,
		},
	}
}
```

Обновить экспорт — добавить `addStaffToOrg`.

- [ ] **Step 2: Добавить handleAddStaff в orgController.js**

Добавить импорт `addStaffToOrg` из `orgServices.js`.

```javascript
import {
	getOrganizationById,
	getOrgStaff,
	createOrganization,
	getUserOrganizations,
	addStaffToOrg,
} from '../services/orgServices.js'
```

Добавить контроллер:

```javascript
const addStaffSchema = {
	userId: { type: 'string', required: true },
}

const handleAddStaff = async (req, res) => {
	try {
		const validated = validateSchema(addStaffSchema, req.body)
		if (validated.errors) {
			return httpResponseError(res, {
				...userStatus.VALIDATION_ERROR,
				data: validated.errors,
			})
		}

		const result = await addStaffToOrg(
			req.params.id,
			validated.userId,
			req.user.id,
		)

		if (result.error === 'org_not_found') {
			return httpResponse(res, generalStatus.NOT_FOUND)
		}
		if (result.error === 'user_not_found') {
			return httpResponse(res, generalStatus.NOT_FOUND)
		}
		if (result.error === 'already_member') {
			return httpResponseError(res, {
				statusCode: 409,
				status: 'conflict',
				data: null,
			})
		}

		return httpResponse(res, generalStatus.CREATED, result.staff)
	} catch (error) {
		return httpResponseError(res, error)
	}
}
```

Обновить экспорт — добавить `handleAddStaff`.

- [ ] **Step 3: Commit**

```bash
git add src/services/orgServices.js src/controllers/orgController.js
git commit -m "feat: добавить addStaffToOrg сервис и контроллер"
```

---

### Task 5: Бэкенд — маршруты

**Files:**

- Modify: `/Users/egorzozula/Desktop/BackendTemplate/src/routes/subroutes/orgRoutes.js`
- Create: `/Users/egorzozula/Desktop/BackendTemplate/src/routes/subroutes/userSearchRoutes.js`
- Modify: `/Users/egorzozula/Desktop/BackendTemplate/src/routes/routes.js`

- [ ] **Step 1: Добавить POST /:id/staff в orgRoutes.js**

```javascript
import express from 'express'
import {
	handleGetOrg,
	handleGetOrgStaff,
	handleCreateOrg,
	handleGetUserOrgs,
	handleAddStaff,
} from '../../controllers/orgController.js'
import { authMiddleware } from '../../modules/auth/index.js'

const router = express.Router()

router.get('/user-orgs', authMiddleware, handleGetUserOrgs)
router.post('/', authMiddleware, handleCreateOrg)
router.get('/:id', handleGetOrg)
router.get('/:id/staff', handleGetOrgStaff)
router.post('/:id/staff', authMiddleware, handleAddStaff)

export default router
```

- [ ] **Step 2: Создать userSearchRoutes.js**

```javascript
import express from 'express'
import { handleSearchUsers } from '../../controllers/userSearchController.js'
import { authMiddleware } from '../../modules/auth/index.js'

const router = express.Router()

router.get('/search', authMiddleware, handleSearchUsers)

export default router
```

- [ ] **Step 3: Подключить userSearchRoutes в routes.js**

Добавить импорт:

```javascript
import userSearchRoutes from './subroutes/userSearchRoutes.js'
```

Добавить маршрут (после `router.use("/positions", positionRoutes);`):

```javascript
router.use('/users', userSearchRoutes)
```

- [ ] **Step 4: Commit**

```bash
git add src/routes/
git commit -m "feat: маршруты для поиска пользователей и добавления сотрудника"
```

---

### Task 6: Фронтенд — типы и API конфиг для поиска пользователей

**Files:**

- Create: `/Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted/services/configs/user-search.types.ts`
- Create: `/Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted/services/configs/user-search.config.ts`

- [ ] **Step 1: Создать user-search.types.ts**

```typescript
interface UserSearchResult {
	id: string
	email: string
}

export type { UserSearchResult }
```

- [ ] **Step 2: Создать user-search.config.ts**

```typescript
import { getData } from '@/services/api/methods'
import { endpoint } from '@/services/api/types'
import type { UserSearchResult } from './user-search.types'
import type { ApiResponse } from './user.config'

const userSearchApiConfig = {
	searchByEmail: endpoint<void, ApiResponse<UserSearchResult[]>>({
		url: () => `/api/users/search`,
		method: getData,
		defaultErrorMessage: 'Failed to search users',
	}),
}

export default userSearchApiConfig
```

- [ ] **Step 3: Commit**

```bash
git add services/configs/user-search.types.ts services/configs/user-search.config.ts
git commit -m "feat: API конфиг для поиска пользователей по email"
```

---

### Task 7: Фронтенд — API конфиг для добавления сотрудника + экспорт

**Files:**

- Modify: `/Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted/services/configs/org.types.ts`
- Modify: `/Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted/services/configs/org.config.ts`
- Modify: `/Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted/services/index.ts`

- [ ] **Step 1: Добавить AddStaffBody в org.types.ts**

```typescript
// ── Org ──

interface OrgListItem {
	id: string
	name: string
	logo: string | null
	role: 'owner' | 'admin' | 'member'
	status: 'active' | 'invited' | 'suspended' | 'left'
}

interface CreateOrgBody {
	name: string
	currency: 'UAH' | 'USD'
	logoUrl?: string
	brandColor?: string
	defaultTimezone?: string
	defaultCountry?: string
}

interface AddStaffBody {
	userId: string
}

export type { OrgListItem, CreateOrgBody, AddStaffBody }
```

- [ ] **Step 2: Добавить addStaff эндпоинт в org.config.ts**

```typescript
import { getData, postData } from '@/services/api/methods'
import { endpoint } from '@/services/api/types'
import type { OrgListItem, CreateOrgBody, AddStaffBody } from './org.types'
import type { OrgByIdResponse, OrgStaffMember } from './booking.types'
import type { ApiResponse } from './user.config'

const orgApiConfig = {
	getUserOrgs: endpoint<void, ApiResponse<OrgListItem[]>>({
		url: () => `/api/org/user-orgs`,
		method: getData,
		defaultErrorMessage: 'Failed to fetch organizations',
	}),

	getById: endpoint<void, ApiResponse<OrgByIdResponse>>({
		url: ({ id }) => `/api/org/${id}`,
		method: getData,
		defaultErrorMessage: 'Failed to fetch organization',
	}),

	getStaff: endpoint<void, ApiResponse<OrgStaffMember[]>>({
		url: ({ id }) => `/api/org/${id}/staff`,
		method: getData,
		defaultErrorMessage: 'Failed to fetch staff',
	}),

	create: endpoint<CreateOrgBody, ApiResponse<OrgByIdResponse>>({
		url: () => `/api/org`,
		method: postData,
		defaultErrorMessage: 'Failed to create organization',
	}),

	addStaff: endpoint<AddStaffBody, ApiResponse<OrgStaffMember>>({
		url: ({ id }) => `/api/org/${id}/staff`,
		method: postData,
		defaultErrorMessage: 'Failed to add staff member',
	}),
}

export default orgApiConfig
```

- [ ] **Step 3: Добавить userSearchApi в services/index.ts**

Добавить импорт после `import bookingFieldApiConfig from './configs/booking-field.config'`:

```typescript
import userSearchApiConfig from './configs/user-search.config'
```

Добавить экспорт после `export const bookingFieldApi = ...`:

```typescript
export const userSearchApi = createApiMethods(
	userSearchApiConfig,
	defaultInterceptors,
)
```

Добавить экспорт типа в конце файла:

```typescript
export type { UserSearchResult } from './configs/user-search.types'
export type { AddStaffBody } from './configs/org.types'
```

- [ ] **Step 4: Commit**

```bash
git add services/configs/org.types.ts services/configs/org.config.ts services/configs/user-search.types.ts services/configs/user-search.config.ts services/index.ts
git commit -m "feat: API слой для поиска пользователей и добавления сотрудника"
```

---

### Task 8: Фронтенд — i18n ключи

**Files:**

- Modify: `/Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted/i18n/messages/en.json`
- Modify: `/Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted/i18n/messages/uk.json`

- [ ] **Step 1: Добавить ключи в en.json в секцию staffSchedule**

Добавить после `"overrideDeleteError": "Failed to delete day off"`:

```json
"addStaff": "Add staff member",
"searchByEmail": "Enter staff email",
"userNotFound": "No users found",
"staffInvited": "Staff member invited",
"minCharsHint": "Enter at least 3 characters",
"alreadyInOrg": "Already in organization"
```

- [ ] **Step 2: Добавить ключи в uk.json в секцию staffSchedule**

Добавить после аналогичной позиции:

```json
"addStaff": "Додати співробітника",
"searchByEmail": "Введіть email співробітника",
"userNotFound": "Користувачів не знайдено",
"staffInvited": "Співробітника запрошено",
"minCharsHint": "Введіть мінімум 3 символи",
"alreadyInOrg": "Вже в організації"
```

- [ ] **Step 3: Commit**

```bash
git add i18n/messages/en.json i18n/messages/uk.json
git commit -m "feat: i18n ключи для добавления сотрудника по email"
```

---

### Task 9: Фронтенд — компонент AddStaffPopover

**Files:**

- Create: `/Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted/components/staff-schedule/AddStaffPopover.tsx`

- [ ] **Step 1: Создать компонент AddStaffPopover**

```typescript
'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover'
import {
	Combobox,
	ComboboxInput,
	ComboboxContent,
	ComboboxList,
	ComboboxItem,
	ComboboxEmpty,
} from '@/components/ui/combobox'
import { Spinner } from '@/components/ui/spinner'
import { userSearchApi, orgApi } from '@/services'
import type { UserSearchResult } from '@/services'

interface AddStaffPopoverProps {
	orgId: string
	onStaffAdded: () => void
}

const MIN_QUERY_LENGTH = 3
const DEBOUNCE_MS = 300

function AddStaffPopover({ orgId, onStaffAdded }: AddStaffPopoverProps) {
	const t = useTranslations('staffSchedule')

	const [open, setOpen] = useState(false)
	const [query, setQuery] = useState('')
	const [results, setResults] = useState<UserSearchResult[]>([])
	const [loading, setLoading] = useState(false)
	const [adding, setAdding] = useState(false)
	const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

	const searchUsers = useCallback(
		async (searchQuery: string) => {
			if (searchQuery.length < MIN_QUERY_LENGTH) {
				setResults([])
				return
			}

			setLoading(true)
			try {
				const data = await userSearchApi.searchByEmail({
					query: { email: searchQuery, orgId },
				})
				setResults(data)
			} catch {
				// обрабатывается интерцептором toast
			} finally {
				setLoading(false)
			}
		},
		[orgId],
	)

	const handleInputChange = (value: string) => {
		setQuery(value)

		if (debounceTimer) clearTimeout(debounceTimer)

		if (value.length < MIN_QUERY_LENGTH) {
			setResults([])
			return
		}

		const timer = setTimeout(() => {
			searchUsers(value)
		}, DEBOUNCE_MS)
		setDebounceTimer(timer)
	}

	const handleSelectUser = async (userId: string) => {
		setAdding(true)
		try {
			await orgApi.addStaff({
				pathParams: { id: orgId },
				body: { userId },
			})
			toast.success(t('staffInvited'))
			setOpen(false)
			setQuery('')
			setResults([])
			onStaffAdded()
		} catch {
			// обрабатывается интерцептором toast
		} finally {
			setAdding(false)
		}
	}

	const handleOpenChange = (nextOpen: boolean) => {
		setOpen(nextOpen)
		if (!nextOpen) {
			setQuery('')
			setResults([])
		}
	}

	const renderUserOption = (user: UserSearchResult) => (
		<ComboboxItem
			key={user.id}
			value={user.email}
			onClick={() => handleSelectUser(user.id)}
			className="cursor-pointer"
		>
			{user.email}
		</ComboboxItem>
	)

	const showHint = query.length > 0 && query.length < MIN_QUERY_LENGTH
	const showEmpty = !loading && query.length >= MIN_QUERY_LENGTH && results.length === 0

	return (
		<Popover open={open} onOpenChange={handleOpenChange}>
			<PopoverTrigger
				render={
					<Button
						variant="outline"
						size="icon"
						aria-label={t('addStaff')}
					/>
				}
			>
				<Plus className="size-4" />
			</PopoverTrigger>

			<PopoverContent align="end" className="w-80 p-3">
				<Combobox open>
					<ComboboxInput
						placeholder={t('searchByEmail')}
						value={query}
						onChange={(event) => handleInputChange(event.target.value)}
						autoFocus
						showTrigger={false}
						disabled={adding}
					/>
					<ComboboxContent>
						<ComboboxList>
							{loading && (
								<div className="flex justify-center py-3">
									<Spinner className="size-4" />
								</div>
							)}

							{showHint && (
								<div className="text-muted-foreground py-2 text-center text-sm">
									{t('minCharsHint')}
								</div>
							)}

							{showEmpty && (
								<ComboboxEmpty>{t('userNotFound')}</ComboboxEmpty>
							)}

							{!loading && results.map(renderUserOption)}
						</ComboboxList>
					</ComboboxContent>
				</Combobox>
			</PopoverContent>
		</Popover>
	)
}

export { AddStaffPopover }
```

- [ ] **Step 2: Commit**

```bash
git add components/staff-schedule/AddStaffPopover.tsx
git commit -m "feat: компонент AddStaffPopover с поиском по email"
```

---

### Task 10: Фронтенд — интеграция в страницу Staff Schedule

**Files:**

- Modify: `/Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted/app/[locale]/(org)/manage/[orgId]/staff-schedule/page.tsx`

- [ ] **Step 1: Добавить AddStaffPopover на страницу**

Добавить импорт после существующих:

```typescript
import { AddStaffPopover } from '@/components/staff-schedule/AddStaffPopover'
```

Заменить блок с `StaffFilter` (строки 70-77):

```typescript
<div className="space-y-4">
	<h1 className="text-lg font-semibold">{t('staffSchedule')}</h1>
	<div className="flex items-center gap-2">
		<StaffFilter
			staff={staffList}
			selectedId={staffId}
			onSelect={handleSelectStaff}
		/>
		<AddStaffPopover orgId={orgId} onStaffAdded={refetchStaff} />
	</div>
</div>
```

Добавить функцию `refetchStaff` внутри компонента (после `handleSelectStaff`):

```typescript
const refetchStaff = async () => {
	try {
		const data = await orgApi.getStaff(orgId)
		setStaffList(data)
	} catch {
		// обрабатывается интерцептором toast
	}
}
```

Примечание: `orgApi` уже импортирован из `@/lib/booking-api-client`. Нужно также импортировать `orgApi` из `@/services` для метода `addStaff`, либо добавить `addStaff` в `booking-api-client.ts`. Учитывая что страница уже использует `orgApi` из `booking-api-client`, а новые эндпоинты — из `services`, `AddStaffPopover` импортирует `orgApi` и `userSearchApi` из `@/services` самостоятельно (см. Task 9).

Для `refetchStaff` — использовать тот же `orgApi` из `@/lib/booking-api-client`, что уже используется на странице:

```typescript
const refetchStaff = async () => {
	try {
		const data = await orgApi.getStaff(orgId)
		setStaffList(data)
	} catch {
		// обрабатывается интерцептором toast
	}
}
```

- [ ] **Step 2: Commit**

```bash
git add app/[locale]/(org)/manage/[orgId]/staff-schedule/page.tsx
git commit -m "feat: интеграция AddStaffPopover в страницу Staff Schedule"
```

---

### Task 11: Ручное тестирование и финальный commit

- [ ] **Step 1: Запустить бэкенд и фронтенд**

```bash
# В терминале 1 (BackendTemplate):
npm run dev

# В терминале 2 (Slotix-fronted):
npm run dev
```

- [ ] **Step 2: Проверить сценарии**

1. Открыть `/manage/[orgId]/staff-schedule`
2. Убедиться что кнопка "+" отображается рядом с Select
3. Кликнуть "+", ввести 2 символа — dropdown не показывается
4. Ввести 3+ символов email — показываются результаты
5. Кликнуть на email — toast "Сотрудник приглашён", попover закрывается, список обновляется
6. Попробовать добавить того же — 409 error toast
7. Закрыть попover — поле очищается

- [ ] **Step 3: Запустить lint**

```bash
npm run lint
npm run format:check
```

- [ ] **Step 4: Исправить ошибки линтера, если есть**

- [ ] **Step 5: Финальный commit (если были исправления)**

```bash
git add -A
git commit -m "fix: исправления после тестирования добавления сотрудника"
```
