# Dynamic Sidebar & Organizations — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded booking sidebar with context-aware dynamic sidebars (dashboard/personal/org/public) and add organization management (list + create).

**Architecture:** 4 Next.js route groups with separate layouts. Backend gets 2 new endpoints (`GET /api/user/organizations`, `POST /api/org`). Frontend gets 3 new sidebar components replacing `BookingSidebar`. Public booking pages have no sidebar.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui sidebar primitives, Express.js (backend), Mongoose, zod + react-hook-form (frontend forms).

---

## File Structure

### Backend (BackendTemplate)

| File                                       | Action | Responsibility                                   |
| ------------------------------------------ | ------ | ------------------------------------------------ |
| `src/models/Organization.js`               | Modify | Add `currency` field                             |
| `src/dto/orgDto.js`                        | Modify | Add `toOrgListItemDto`                           |
| `src/repository/organizationRepository.js` | Modify | Add `createOrg`                                  |
| `src/repository/membershipRepository.js`   | Modify | Add `createMembership`, `getMembershipsByUser`   |
| `src/services/orgServices.js`              | Modify | Add `createOrganization`, `getUserOrganizations` |
| `src/controllers/orgController.js`         | Modify | Add `handleCreateOrg`, `handleGetUserOrgs`       |
| `src/routes/subroutes/orgRoutes.js`        | Modify | Add `POST /`, `GET /user-orgs`                   |

### Frontend (Slotix-fronted)

| File                                                | Action | Responsibility               |
| --------------------------------------------------- | ------ | ---------------------------- |
| `services/configs/org.types.ts`                     | Create | Org API types                |
| `services/configs/org.config.ts`                    | Create | Org API endpoint config      |
| `services/index.ts`                                 | Modify | Export orgApi                |
| `lib/hooks/useUserOrgs.ts`                          | Create | Hook to fetch user's orgs    |
| `components/sidebar/DashboardSidebar.tsx`           | Create | Sidebar for /organizations   |
| `components/sidebar/PersonalSidebar.tsx`            | Create | Sidebar for /schedule        |
| `components/sidebar/OrgSidebar.tsx`                 | Create | Sidebar for /org/[orgId]     |
| `components/sidebar/LogoutButton.tsx`               | Create | Shared logout button         |
| `components/organizations/OrgCard.tsx`              | Create | Org list card component      |
| `components/organizations/CreateOrgDialog.tsx`      | Create | Create org modal form        |
| `app/[locale]/(public)/layout.tsx`                  | Create | Public layout (no sidebar)   |
| `app/[locale]/(public)/org/[orgId]/page.tsx`        | Create | Public org booking           |
| `app/[locale]/(public)/book/[staffSlug]/page.tsx`   | Create | Public staff booking         |
| `app/[locale]/(dashboard)/layout.tsx`               | Create | Dashboard layout + sidebar   |
| `app/[locale]/(dashboard)/organizations/page.tsx`   | Create | Org list page                |
| `app/[locale]/(personal)/layout.tsx`                | Create | Personal layout + sidebar    |
| `app/[locale]/(personal)/schedule/page.tsx`         | Create | Personal schedule page       |
| `app/[locale]/(org)/layout.tsx`                     | Create | Org layout + sidebar         |
| `app/[locale]/(org)/org/[orgId]/page.tsx`           | Create | Org admin schedule           |
| `app/[locale]/(org)/org/[orgId]/[staffId]/page.tsx` | Create | Staff admin schedule         |
| `lib/auth-middleware.ts`                            | Modify | Update protected paths       |
| `i18n/messages/en.json`                             | Modify | Add sidebar/org translations |
| `i18n/messages/uk.json`                             | Modify | Add sidebar/org translations |

### Files to delete after migration

| File                                                  | Reason                                                        |
| ----------------------------------------------------- | ------------------------------------------------------------- |
| `components/booking/BookingSidebar.tsx`               | Replaced by 3 new sidebars                                    |
| `components/booking/BookingLayout.tsx`                | Replaced by route group layouts                               |
| `app/[locale]/org/[orgSlug]/page.tsx`                 | Moved to `(public)/org/[orgId]/`                              |
| `app/[locale]/org/[orgSlug]/[staffId]/page.tsx`       | Moved to `(public)/org/[orgId]/` (handled by staff selection) |
| `app/[locale]/book/[staffSlug]/page.tsx`              | Moved to `(public)/book/[staffSlug]/`                         |
| `app/[locale]/staff/schedule/page.tsx`                | Moved to `(personal)/schedule/`                               |
| `app/[locale]/staff/org/[orgSlug]/page.tsx`           | Moved to `(org)/org/[orgId]/`                                 |
| `app/[locale]/staff/org/[orgSlug]/[staffId]/page.tsx` | Moved to `(org)/org/[orgId]/[staffId]/`                       |

---

## Task 1: Backend — Organization model + repository + DTO

**Files:**

- Modify: `BackendTemplate/src/models/Organization.js`
- Modify: `BackendTemplate/src/dto/orgDto.js`
- Modify: `BackendTemplate/src/repository/organizationRepository.js`
- Modify: `BackendTemplate/src/repository/membershipRepository.js`

- [ ] **Step 1: Add `currency` field to Organization model**

In `src/models/Organization.js`, add after the `name` field:

```js
    /**
     * Валюта организации.
     */
    currency: { type: String, enum: ["UAH", "USD"], default: "UAH" },
```

- [ ] **Step 2: Add `toOrgListItemDto` to orgDto.js**

In `src/dto/orgDto.js`, add the new DTO function:

```js
const toOrgListItemDto = (org, membership) => ({
	id: org._id.toString(),
	name: org.name,
	logo: org.settings ? org.settings.logoUrl || null : null,
	role: membership.role,
	status: membership.status,
})

export { toOrgDto, toOrgListItemDto }
```

- [ ] **Step 3: Add `createOrg` to organizationRepository.js**

```js
import Organization from '../models/Organization.js'
import { toOrgDto, toOrgListItemDto } from '../dto/orgDto.js'

const createOrg = async (data) => {
	const doc = await Organization.create(data)
	return toOrgDto(doc)
}

export { getOrgById, createOrg }
```

- [ ] **Step 4: Add `createMembership` and `getMembershipsByUser` to membershipRepository.js**

```js
import Membership from '../models/Membership.js'
import { MEMBERSHIP_STATUS } from '../constants/booking.js'

const getActiveMembership = async (userId) => {
	const doc = await Membership.findOne({
		userId,
		status: MEMBERSHIP_STATUS.ACTIVE,
	})
	return doc
}

const getActiveMembersByOrg = async (orgId) => {
	const docs = await Membership.find({
		orgId,
		status: MEMBERSHIP_STATUS.ACTIVE,
	})
	return docs
}

const getMembershipsByUser = async (userId) => {
	const docs = await Membership.find({ userId })
	return docs
}

const createMembership = async (data) => {
	const doc = await Membership.create(data)
	return doc
}

export {
	getActiveMembership,
	getActiveMembersByOrg,
	getMembershipsByUser,
	createMembership,
}
```

- [ ] **Step 5: Commit**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
git add src/models/Organization.js src/dto/orgDto.js src/repository/organizationRepository.js src/repository/membershipRepository.js
git commit -m "feat(org): add currency field, org list DTO, create org/membership repos"
```

---

## Task 2: Backend — Services + Controller + Routes

**Files:**

- Modify: `BackendTemplate/src/services/orgServices.js`
- Modify: `BackendTemplate/src/controllers/orgController.js`
- Modify: `BackendTemplate/src/routes/subroutes/orgRoutes.js`

- [ ] **Step 1: Add `createOrganization` and `getUserOrganizations` to orgServices.js**

Add imports and new functions:

```js
import { getOrgById, createOrg } from '../repository/organizationRepository.js'
import {
	getActiveMembersByOrg,
	getMembershipsByUser,
	createMembership,
} from '../repository/membershipRepository.js'
import { getUserById } from '../modules/user/index.js'
import { getPositionById } from '../repository/positionRepository.js'
import { countConfirmedBookings } from '../repository/bookingRepository.js'
import { toOrgStaffDto } from '../dto/staffDto.js'
import { toOrgListItemDto } from '../dto/orgDto.js'
import Organization from '../models/Organization.js'
import { MEMBERSHIP_STATUS } from '../constants/booking.js'

// ... existing functions stay as-is ...

const createOrganization = async (data, userId) => {
	const orgData = {
		slug: `org-${Date.now()}`,
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

	return org
}

const getUserOrganizations = async (userId) => {
	const memberships = await getMembershipsByUser(userId)
	const toOrgWithRole = async (membership) => {
		const org = await Organization.findById(membership.orgId)
		if (!org) return null
		return toOrgListItemDto(org, membership)
	}
	const orgs = await Promise.all(memberships.map(toOrgWithRole))
	return orgs.filter(isNotNull)
}

export {
	getOrganizationById,
	getOrgStaff,
	createOrganization,
	getUserOrganizations,
}
```

- [ ] **Step 2: Add controller handlers to orgController.js**

```js
import {
	getOrganizationById,
	getOrgStaff,
	createOrganization,
	getUserOrganizations,
} from '../services/orgServices.js'
import {
	httpResponse,
	httpResponseError,
} from '../shared/utils/http/httpResponse.js'
import { generalStatus, userStatus } from '../shared/utils/http/httpStatus.js'
import { validateSchema } from '../shared/utils/validation/requestValidation.js'

const createOrgSchema = {
	name: { type: 'string', required: true },
	currency: { type: 'string', required: false },
	logoUrl: { type: 'string', required: false },
	brandColor: { type: 'string', required: false },
	defaultTimezone: { type: 'string', required: false },
	defaultCountry: { type: 'string', required: false },
}

// ... existing handlers stay as-is ...

const handleCreateOrg = async (req, res) => {
	try {
		const validated = validateSchema(createOrgSchema, req.body)
		if (validated.errors) {
			return httpResponseError(res, {
				...userStatus.VALIDATION_ERROR,
				data: validated.errors,
			})
		}
		const org = await createOrganization(validated, req.user.id)
		return httpResponse(res, generalStatus.CREATED, org)
	} catch (error) {
		return httpResponseError(res, error)
	}
}

const handleGetUserOrgs = async (req, res) => {
	try {
		const orgs = await getUserOrganizations(req.user.id)
		return httpResponse(res, generalStatus.SUCCESS, orgs)
	} catch (error) {
		return httpResponseError(res, error)
	}
}

export { handleGetOrg, handleGetOrgStaff, handleCreateOrg, handleGetUserOrgs }
```

- [ ] **Step 3: Add routes to orgRoutes.js**

```js
import express from 'express'
import {
	handleGetOrg,
	handleGetOrgStaff,
	handleCreateOrg,
	handleGetUserOrgs,
} from '../../controllers/orgController.js'
import { authMiddleware } from '../../modules/auth/index.js'

const router = express.Router()

router.get('/user-orgs', authMiddleware, handleGetUserOrgs)
router.post('/', authMiddleware, handleCreateOrg)
router.get('/:id', handleGetOrg)
router.get('/:id/staff', handleGetOrgStaff)

export default router
```

Note: `GET /user-orgs` must be defined BEFORE `GET /:id` to avoid `:id` matching "user-orgs".

- [ ] **Step 4: Test endpoints manually**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
npm run dev
```

Test with curl or Postman:

- `GET /api/org/user-orgs` with auth header → should return `[]` (empty array)
- `POST /api/org` with `{ "name": "Test Org" }` and auth header → should return created org
- `GET /api/org/user-orgs` again → should return `[{ id, name, logo, role: "owner", status: "active" }]`

- [ ] **Step 5: Commit**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
git add src/services/orgServices.js src/controllers/orgController.js src/routes/subroutes/orgRoutes.js
git commit -m "feat(org): add create org and get user organizations endpoints"
```

---

## Task 3: Frontend — Org API types + config + hook

**Files:**

- Create: `Slotix-fronted/services/configs/org.types.ts`
- Create: `Slotix-fronted/services/configs/org.config.ts`
- Modify: `Slotix-fronted/services/index.ts`
- Create: `Slotix-fronted/lib/hooks/useUserOrgs.ts`

- [ ] **Step 1: Create org.types.ts**

```ts
// services/configs/org.types.ts

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

export type { OrgListItem, CreateOrgBody }
```

- [ ] **Step 2: Create org.config.ts**

```ts
// services/configs/org.config.ts

import { getData, postData } from '@/services/api/methods'
import { endpoint } from '@/services/api/types'
import type { OrgListItem, CreateOrgBody } from './org.types'
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
}

export default orgApiConfig
```

- [ ] **Step 3: Add orgApi to services/index.ts**

Add import and export after the existing billingApi:

```ts
import orgApiConfig from './configs/org.config'

export const orgApi = createApiMethods(orgApiConfig, defaultInterceptors)

export type { OrgListItem, CreateOrgBody } from './configs/org.types'
```

- [ ] **Step 4: Create useUserOrgs hook**

```ts
// lib/hooks/useUserOrgs.ts

'use client'

import { useState, useEffect, useCallback } from 'react'
import type { OrgListItem } from '@/services'
import { orgApi } from '@/services'

interface UseUserOrgsResult {
	orgs: OrgListItem[]
	isLoading: boolean
	error: string | null
	refetch: () => void
}

function useUserOrgs(): UseUserOrgsResult {
	const [orgs, setOrgs] = useState<OrgListItem[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	const fetchOrgs = useCallback(async () => {
		setIsLoading(true)
		setError(null)
		try {
			const response = await orgApi.getUserOrgs()
			setOrgs(response.data)
		} catch (err) {
			const message =
				err instanceof Error ? err.message : 'Failed to fetch organizations'
			setError(message)
		} finally {
			setIsLoading(false)
		}
	}, [])

	useEffect(() => {
		fetchOrgs()
	}, [fetchOrgs])

	return { orgs, isLoading, error, refetch: fetchOrgs }
}

export { useUserOrgs }
```

- [ ] **Step 5: Commit**

```bash
git add services/configs/org.types.ts services/configs/org.config.ts services/index.ts lib/hooks/useUserOrgs.ts
git commit -m "feat(org): add org API config, types, and useUserOrgs hook"
```

---

## Task 4: Frontend — i18n translations

**Files:**

- Modify: `Slotix-fronted/i18n/messages/en.json`
- Modify: `Slotix-fronted/i18n/messages/uk.json`

- [ ] **Step 1: Add English translations**

Add a new top-level `"sidebar"` and `"organizations"` key to `en.json`:

```json
"sidebar": {
  "myOrganizations": "My organizations",
  "mySchedule": "My schedule",
  "generalSchedule": "General schedule",
  "backToOrgs": "Back to organizations",
  "logout": "Log out",
  "staff": "Staff"
},
"organizations": {
  "title": "My organizations",
  "create": "Create organization",
  "empty": "You don't have any organizations yet",
  "role": {
    "owner": "Owner",
    "admin": "Admin",
    "member": "Member"
  },
  "status": {
    "active": "Active",
    "invited": "Invited",
    "suspended": "Suspended"
  },
  "form": {
    "name": "Name",
    "namePlaceholder": "Organization name",
    "currency": "Currency",
    "brandColor": "Brand color",
    "logo": "Logo URL",
    "logoPlaceholder": "https://example.com/logo.png",
    "timezone": "Timezone",
    "country": "Country",
    "submit": "Create",
    "cancel": "Cancel"
  },
  "created": "Organization created"
}
```

- [ ] **Step 2: Add Ukrainian translations**

Add corresponding `"sidebar"` and `"organizations"` key to `uk.json`:

```json
"sidebar": {
  "myOrganizations": "Мої організації",
  "mySchedule": "Мій розклад",
  "generalSchedule": "Загальний розклад",
  "backToOrgs": "Назад до організацій",
  "logout": "Вийти",
  "staff": "Персонал"
},
"organizations": {
  "title": "Мої організації",
  "create": "Створити організацію",
  "empty": "У вас ще немає організацій",
  "role": {
    "owner": "Власник",
    "admin": "Адмін",
    "member": "Учасник"
  },
  "status": {
    "active": "Активний",
    "invited": "Запрошений",
    "suspended": "Призупинений"
  },
  "form": {
    "name": "Назва",
    "namePlaceholder": "Назва організації",
    "currency": "Валюта",
    "brandColor": "Колір бренду",
    "logo": "URL логотипу",
    "logoPlaceholder": "https://example.com/logo.png",
    "timezone": "Часовий пояс",
    "country": "Країна",
    "submit": "Створити",
    "cancel": "Скасувати"
  },
  "created": "Організацію створено"
}
```

- [ ] **Step 3: Commit**

```bash
git add i18n/messages/en.json i18n/messages/uk.json
git commit -m "feat(i18n): add sidebar and organizations translations"
```

---

## Task 5: Frontend — LogoutButton shared component

**Files:**

- Create: `Slotix-fronted/components/sidebar/LogoutButton.tsx`

- [ ] **Step 1: Create LogoutButton component**

```tsx
// components/sidebar/LogoutButton.tsx

'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { LogOut } from 'lucide-react'
import { SidebarMenuButton } from '@/components/ui/sidebar'
import { authApi } from '@/services'

function LogoutButton() {
	const router = useRouter()
	const t = useTranslations('sidebar')

	const handleLogout = async () => {
		try {
			await authApi.logout()
		} catch {
			// proceed with redirect even if API call fails
		}
		router.push('/login')
	}

	return (
		<SidebarMenuButton onClick={handleLogout}>
			<LogOut className="size-4" />
			<span>{t('logout')}</span>
		</SidebarMenuButton>
	)
}

export { LogoutButton }
```

- [ ] **Step 2: Commit**

```bash
git add components/sidebar/LogoutButton.tsx
git commit -m "feat(sidebar): add shared LogoutButton component"
```

---

## Task 6: Frontend — DashboardSidebar

**Files:**

- Create: `Slotix-fronted/components/sidebar/DashboardSidebar.tsx`

- [ ] **Step 1: Create DashboardSidebar**

```tsx
// components/sidebar/DashboardSidebar.tsx

'use client'

import { usePathname } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { Building2, Calendar } from 'lucide-react'
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from '@/components/ui/sidebar'
import { LogoutButton } from './LogoutButton'
import { useUser } from '@/lib/auth/user-provider'

function DashboardSidebar() {
	const pathname = usePathname()
	const locale = useLocale()
	const t = useTranslations('sidebar')
	const user = useUser()

	const isActive = (href: string): boolean => pathname === href

	const buildHref = (path: string): string => `/${locale}${path}`

	const orgsHref = buildHref('/organizations')
	const scheduleHref = buildHref('/schedule')

	return (
		<Sidebar>
			<SidebarHeader className="border-b p-4">
				<div className="flex items-center gap-2">
					<span className="text-lg font-semibold">Slotix</span>
				</div>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu>
							<SidebarMenuItem>
								<SidebarMenuButton
									render={<Link href={orgsHref} />}
									isActive={isActive(orgsHref)}
								>
									<Building2 className="size-4" />
									<span>{t('myOrganizations')}</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton
									render={<Link href={scheduleHref} />}
									isActive={isActive(scheduleHref)}
								>
									<Calendar className="size-4" />
									<span>{t('mySchedule')}</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter className="border-t p-2">
				<SidebarMenu>
					<SidebarMenuItem>
						<div className="text-muted-foreground px-2 py-1 text-sm">
							{user.name}
						</div>
					</SidebarMenuItem>
					<SidebarMenuItem>
						<LogoutButton />
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	)
}

export { DashboardSidebar }
```

- [ ] **Step 2: Commit**

```bash
git add components/sidebar/DashboardSidebar.tsx
git commit -m "feat(sidebar): add DashboardSidebar component"
```

---

## Task 7: Frontend — PersonalSidebar

**Files:**

- Create: `Slotix-fronted/components/sidebar/PersonalSidebar.tsx`

- [ ] **Step 1: Create PersonalSidebar**

```tsx
// components/sidebar/PersonalSidebar.tsx

'use client'

import { usePathname } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { Building2, Calendar } from 'lucide-react'
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from '@/components/ui/sidebar'
import { LogoutButton } from './LogoutButton'
import { useUser } from '@/lib/auth/user-provider'

function PersonalSidebar() {
	const pathname = usePathname()
	const locale = useLocale()
	const t = useTranslations('sidebar')
	const user = useUser()

	const isActive = (href: string): boolean => pathname === href

	const buildHref = (path: string): string => `/${locale}${path}`

	const scheduleHref = buildHref('/schedule')
	const orgsHref = buildHref('/organizations')

	return (
		<Sidebar>
			<SidebarHeader className="border-b p-4">
				<div className="flex items-center gap-2">
					<span className="text-lg font-semibold">{user.name}</span>
				</div>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu>
							<SidebarMenuItem>
								<SidebarMenuButton
									render={<Link href={scheduleHref} />}
									isActive={isActive(scheduleHref)}
								>
									<Calendar className="size-4" />
									<span>{t('mySchedule')}</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton
									render={<Link href={orgsHref} />}
									isActive={isActive(orgsHref)}
								>
									<Building2 className="size-4" />
									<span>{t('myOrganizations')}</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter className="border-t p-2">
				<SidebarMenu>
					<SidebarMenuItem>
						<LogoutButton />
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	)
}

export { PersonalSidebar }
```

- [ ] **Step 2: Commit**

```bash
git add components/sidebar/PersonalSidebar.tsx
git commit -m "feat(sidebar): add PersonalSidebar component"
```

---

## Task 8: Frontend — OrgSidebar

**Files:**

- Create: `Slotix-fronted/components/sidebar/OrgSidebar.tsx`

- [ ] **Step 1: Create OrgSidebar**

```tsx
// components/sidebar/OrgSidebar.tsx

'use client'

import { usePathname, useParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Calendar, ArrowLeft, Users } from 'lucide-react'
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LogoutButton } from './LogoutButton'
import { orgApi } from '@/services'
import type { OrgByIdResponse, OrgStaffMember } from '@/services'

function OrgSidebar() {
	const pathname = usePathname()
	const locale = useLocale()
	const params = useParams<{ orgId: string }>()
	const t = useTranslations('sidebar')
	const [org, setOrg] = useState<OrgByIdResponse | null>(null)
	const [staffList, setStaffList] = useState<OrgStaffMember[]>([])

	const orgId = params.orgId

	useEffect(() => {
		if (!orgId) return

		const fetchOrgData = async () => {
			try {
				const orgResponse = await orgApi.getById({ pathParams: { id: orgId } })
				setOrg(orgResponse.data)
			} catch {
				// handled by toast interceptor
			}
		}

		const fetchStaffData = async () => {
			try {
				const staffResponse = await orgApi.getStaff({
					pathParams: { id: orgId },
				})
				setStaffList(staffResponse.data)
			} catch {
				// handled by toast interceptor
			}
		}

		fetchOrgData()
		fetchStaffData()
	}, [orgId])

	const isActive = (href: string): boolean => pathname === href

	const buildHref = (path: string): string => `/${locale}${path}`

	const orgScheduleHref = buildHref(`/org/${orgId}`)
	const orgsHref = buildHref('/organizations')

	const getInitial = (name: string): string => name.charAt(0).toUpperCase()

	const renderStaffItem = (staff: OrgStaffMember) => {
		const href = buildHref(`/org/${orgId}/${staff.id}`)
		return (
			<SidebarMenuItem key={staff.id}>
				<SidebarMenuButton
					render={<Link href={href} />}
					isActive={isActive(href)}
				>
					<Avatar className="size-5">
						<AvatarImage src={staff.avatar} />
						<AvatarFallback className="text-xs">
							{getInitial(staff.name)}
						</AvatarFallback>
					</Avatar>
					<span>{staff.name}</span>
				</SidebarMenuButton>
			</SidebarMenuItem>
		)
	}

	return (
		<Sidebar>
			<SidebarHeader className="border-b p-4">
				<div className="flex items-center gap-2">
					{org ? (
						<>
							{org.logo ? (
								<img src={org.logo} alt={org.name} className="size-6 rounded" />
							) : (
								<div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded text-xs font-bold">
									{getInitial(org.name)}
								</div>
							)}
							<span className="font-semibold">{org.name}</span>
						</>
					) : (
						<span className="text-muted-foreground text-sm">Loading...</span>
					)}
				</div>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu>
							<SidebarMenuItem>
								<SidebarMenuButton
									render={<Link href={orgScheduleHref} />}
									isActive={isActive(orgScheduleHref)}
								>
									<Calendar className="size-4" />
									<span>{t('generalSchedule')}</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>

				{staffList.length > 0 && (
					<SidebarGroup>
						<SidebarGroupLabel>
							<Users className="mr-1 inline size-3" />
							{t('staff')}
						</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>{staffList.map(renderStaffItem)}</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				)}
			</SidebarContent>
			<SidebarFooter className="border-t p-2">
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton render={<Link href={orgsHref} />}>
							<ArrowLeft className="size-4" />
							<span>{t('backToOrgs')}</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
					<SidebarMenuItem>
						<LogoutButton />
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	)
}

export { OrgSidebar }
```

- [ ] **Step 2: Commit**

```bash
git add components/sidebar/OrgSidebar.tsx
git commit -m "feat(sidebar): add OrgSidebar component with dynamic staff list"
```

---

## Task 9: Frontend — Route group layouts

**Files:**

- Create: `Slotix-fronted/app/[locale]/(public)/layout.tsx`
- Create: `Slotix-fronted/app/[locale]/(dashboard)/layout.tsx`
- Create: `Slotix-fronted/app/[locale]/(personal)/layout.tsx`
- Create: `Slotix-fronted/app/[locale]/(org)/layout.tsx`

- [ ] **Step 1: Create (public) layout — no sidebar, no auth**

```tsx
// app/[locale]/(public)/layout.tsx

export default function PublicLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return <main className="min-h-svh">{children}</main>
}
```

- [ ] **Step 2: Create (dashboard) layout — auth + DashboardSidebar**

```tsx
// app/[locale]/(dashboard)/layout.tsx

import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth/get-user'
import { UserProvider } from '@/lib/auth/user-provider'
import {
	SidebarProvider,
	SidebarInset,
	SidebarTrigger,
} from '@/components/ui/sidebar'
import { DashboardSidebar } from '@/components/sidebar/DashboardSidebar'

export default async function DashboardLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	const user = await getUser()
	if (!user) redirect('/login')

	return (
		<UserProvider user={user}>
			<SidebarProvider>
				<DashboardSidebar />
				<SidebarInset>
					<header className="bg-background sticky top-0 z-10 flex h-12 items-center gap-2 border-b px-4">
						<SidebarTrigger className="-ml-1" />
					</header>
					<main className="flex-1">{children}</main>
				</SidebarInset>
			</SidebarProvider>
		</UserProvider>
	)
}
```

- [ ] **Step 3: Create (personal) layout — auth + PersonalSidebar**

```tsx
// app/[locale]/(personal)/layout.tsx

import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth/get-user'
import { UserProvider } from '@/lib/auth/user-provider'
import {
	SidebarProvider,
	SidebarInset,
	SidebarTrigger,
} from '@/components/ui/sidebar'
import { PersonalSidebar } from '@/components/sidebar/PersonalSidebar'

export default async function PersonalLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	const user = await getUser()
	if (!user) redirect('/login')

	return (
		<UserProvider user={user}>
			<SidebarProvider>
				<PersonalSidebar />
				<SidebarInset>
					<header className="bg-background sticky top-0 z-10 flex h-12 items-center gap-2 border-b px-4">
						<SidebarTrigger className="-ml-1" />
					</header>
					<main className="flex-1">{children}</main>
				</SidebarInset>
			</SidebarProvider>
		</UserProvider>
	)
}
```

- [ ] **Step 4: Create (org) layout — auth + OrgSidebar**

```tsx
// app/[locale]/(org)/layout.tsx

import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth/get-user'
import { UserProvider } from '@/lib/auth/user-provider'
import {
	SidebarProvider,
	SidebarInset,
	SidebarTrigger,
} from '@/components/ui/sidebar'
import { OrgSidebar } from '@/components/sidebar/OrgSidebar'

export default async function OrgLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	const user = await getUser()
	if (!user) redirect('/login')

	return (
		<UserProvider user={user}>
			<SidebarProvider>
				<OrgSidebar />
				<SidebarInset>
					<header className="bg-background sticky top-0 z-10 flex h-12 items-center gap-2 border-b px-4">
						<SidebarTrigger className="-ml-1" />
					</header>
					<main className="flex-1">{children}</main>
				</SidebarInset>
			</SidebarProvider>
		</UserProvider>
	)
}
```

- [ ] **Step 5: Commit**

```bash
git add app/[locale]/(public)/layout.tsx app/[locale]/(dashboard)/layout.tsx app/[locale]/(personal)/layout.tsx app/[locale]/(org)/layout.tsx
git commit -m "feat(layout): add 4 route group layouts with context-aware sidebars"
```

---

## Task 10: Frontend — Organizations page (list + create)

**Files:**

- Create: `Slotix-fronted/components/organizations/OrgCard.tsx`
- Create: `Slotix-fronted/components/organizations/CreateOrgDialog.tsx`
- Create: `Slotix-fronted/app/[locale]/(dashboard)/organizations/page.tsx`

- [ ] **Step 1: Create OrgCard component**

```tsx
// components/organizations/OrgCard.tsx

'use client'

import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { OrgListItem } from '@/services'

const ROLE_VARIANT = {
	owner: 'default',
	admin: 'secondary',
	member: 'outline',
} as const

const STATUS_COLOR = {
	active: 'bg-green-500',
	invited: 'bg-yellow-500',
	suspended: 'bg-red-500',
	left: 'bg-gray-400',
} as const

interface OrgCardProps {
	org: OrgListItem
}

function OrgCard({ org }: OrgCardProps) {
	const router = useRouter()
	const locale = useLocale()
	const tRole = useTranslations('organizations.role')
	const tStatus = useTranslations('organizations.status')

	const handleClick = () => {
		router.push(`/${locale}/org/${org.id}`)
	}

	const getInitial = (name: string): string => name.charAt(0).toUpperCase()

	return (
		<Card
			className="cursor-pointer transition-shadow hover:shadow-md"
			onClick={handleClick}
		>
			<CardContent className="flex items-center gap-4 p-4">
				{org.logo ? (
					<img
						src={org.logo}
						alt={org.name}
						className="size-12 rounded-lg object-cover"
					/>
				) : (
					<div className="bg-primary text-primary-foreground flex size-12 items-center justify-center rounded-lg text-lg font-bold">
						{getInitial(org.name)}
					</div>
				)}
				<div className="flex-1">
					<h3 className="font-semibold">{org.name}</h3>
					<div className="mt-1 flex items-center gap-2">
						<Badge variant={ROLE_VARIANT[org.role]}>{tRole(org.role)}</Badge>
						<div className="flex items-center gap-1">
							<div
								className={`size-2 rounded-full ${STATUS_COLOR[org.status]}`}
							/>
							<span className="text-muted-foreground text-xs">
								{tStatus(org.status)}
							</span>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}

export { OrgCard }
```

- [ ] **Step 2: Create CreateOrgDialog component**

```tsx
// components/organizations/CreateOrgDialog.tsx

'use client'

import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
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
import { orgApi } from '@/services'
import { setServerErrors } from '@/services'
import { useState } from 'react'
import { Controller } from 'react-hook-form'

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
}

function CreateOrgDialog({ onCreated }: CreateOrgDialogProps) {
	const t = useTranslations('organizations')
	const [open, setOpen] = useState(false)

	const {
		register,
		handleSubmit,
		control,
		formState: { errors, isSubmitting },
		reset,
		setError,
	} = useForm<CreateOrgFormData>({
		resolver: zodResolver(createOrgSchema),
		defaultValues: {
			currency: 'UAH',
			defaultTimezone: 'Europe/Kyiv',
			defaultCountry: 'UA',
		},
	})

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
				// non-validation error — toast already shown by interceptor
			}
		}
	}

	const renderColorOption = (color: string) => {
		return (
			<button
				key={color}
				type="button"
				className="size-6 rounded-full border-2 border-transparent hover:border-gray-400"
				style={{ backgroundColor: color }}
				onClick={() => {
					const input = document.getElementById(
						'brandColor',
					) as HTMLInputElement
					if (input) {
						input.value = color
						input.dispatchEvent(new Event('input', { bubbles: true }))
					}
				}}
			/>
		)
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger render={<Button />}>
				<Plus className="mr-2 size-4" />
				{t('create')}
			</DialogTrigger>
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
										<SelectItem value="UAH">UAH (₴)</SelectItem>
										<SelectItem value="USD">USD ($)</SelectItem>
									</SelectContent>
								</Select>
							)}
						/>
						<FieldError errors={[errors.currency]} />
					</Field>

					<Field data-invalid={!!errors.brandColor || undefined}>
						<FieldLabel htmlFor="brandColor">{t('form.brandColor')}</FieldLabel>
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
	)
}

export { CreateOrgDialog }
```

- [ ] **Step 3: Create organizations page**

```tsx
// app/[locale]/(dashboard)/organizations/page.tsx

'use client'

import { useTranslations } from 'next-intl'
import { useUserOrgs } from '@/lib/hooks/useUserOrgs'
import { OrgCard } from '@/components/organizations/OrgCard'
import { CreateOrgDialog } from '@/components/organizations/CreateOrgDialog'
import { Spinner } from '@/components/ui/spinner'

export default function OrganizationsPage() {
	const t = useTranslations('organizations')
	const { orgs, isLoading, refetch } = useUserOrgs()

	const renderOrgCard = (org: (typeof orgs)[number]) => (
		<OrgCard key={org.id} org={org} />
	)

	return (
		<div className="container mx-auto p-6">
			<div className="mb-6 flex items-center justify-between">
				<h1 className="text-2xl font-bold">{t('title')}</h1>
				<CreateOrgDialog onCreated={refetch} />
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
```

- [ ] **Step 4: Commit**

```bash
git add components/organizations/OrgCard.tsx components/organizations/CreateOrgDialog.tsx app/[locale]/(dashboard)/organizations/page.tsx
git commit -m "feat(organizations): add org list page with create dialog"
```

---

## Task 11: Frontend — Move pages to new route groups

**Files:**

- Create: `Slotix-fronted/app/[locale]/(public)/org/[orgId]/page.tsx`
- Create: `Slotix-fronted/app/[locale]/(public)/book/[staffSlug]/page.tsx`
- Create: `Slotix-fronted/app/[locale]/(personal)/schedule/page.tsx`
- Create: `Slotix-fronted/app/[locale]/(org)/org/[orgId]/page.tsx`
- Create: `Slotix-fronted/app/[locale]/(org)/org/[orgId]/[staffId]/page.tsx`

Note: `BookingPage.tsx` stays in its current location as a shared component. Pages import it from there.

- [ ] **Step 1: Create public org page — no sidebar, no auth, uses orgId (not orgSlug)**

```tsx
// app/[locale]/(public)/org/[orgId]/page.tsx

import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { CalendarViewConfigProvider } from '@/lib/calendar/CalendarViewConfigContext'
import { ORG_PUBLIC_CONFIG } from '@/lib/calendar/view-config'
import { OrgCalendarPage } from '@/components/booking/OrgCalendarPage'

export default async function OrgPublicPage({
	params,
}: {
	params: Promise<{ orgId: string }>
}) {
	const { orgId } = await params
	const t = await getTranslations('booking')

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

- [ ] **Step 2: Create public staff booking page — no sidebar, no auth**

```tsx
// app/[locale]/(public)/book/[staffSlug]/page.tsx

import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { CalendarViewConfigProvider } from '@/lib/calendar/CalendarViewConfigContext'
import { STAFF_PUBLIC_CONFIG } from '@/lib/calendar/view-config'
import { BookingPage } from '@/app/[locale]/book/[staffSlug]/BookingPage'

export default async function StaffPublicPage({
	params,
}: {
	params: Promise<{ staffSlug: string }>
}) {
	const { staffSlug } = await params
	const t = await getTranslations('booking')

	return (
		<Suspense
			fallback={
				<div className="flex min-h-screen items-center justify-center">
					<p className="text-muted-foreground">{t('loading')}</p>
				</div>
			}
		>
			<CalendarViewConfigProvider config={STAFF_PUBLIC_CONFIG}>
				<BookingPage staffSlug={staffSlug} />
			</CalendarViewConfigProvider>
		</Suspense>
	)
}
```

- [ ] **Step 3: Create personal schedule page — auth handled by layout**

```tsx
// app/[locale]/(personal)/schedule/page.tsx

'use client'

import { Suspense } from 'react'
import { useTranslations } from 'next-intl'
import { CalendarViewConfigProvider } from '@/lib/calendar/CalendarViewConfigContext'
import { STAFF_SELF_CONFIG } from '@/lib/calendar/view-config'
import { BookingPage } from '@/app/[locale]/book/[staffSlug]/BookingPage'
import { useUser } from '@/lib/auth/user-provider'

export default function PersonalSchedulePage() {
	const user = useUser()
	const t = useTranslations('booking')

	return (
		<Suspense
			fallback={
				<div className="flex min-h-screen items-center justify-center">
					<p className="text-muted-foreground">{t('loading')}</p>
				</div>
			}
		>
			<CalendarViewConfigProvider config={STAFF_SELF_CONFIG}>
				<BookingPage staffSlug={user.id} />
			</CalendarViewConfigProvider>
		</Suspense>
	)
}
```

- [ ] **Step 4: Create org admin schedule page**

```tsx
// app/[locale]/(org)/org/[orgId]/page.tsx

import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { CalendarViewConfigProvider } from '@/lib/calendar/CalendarViewConfigContext'
import { ORG_ADMIN_CONFIG } from '@/lib/calendar/view-config'
import { OrgCalendarPage } from '@/components/booking/OrgCalendarPage'

export default async function OrgAdminPage({
	params,
}: {
	params: Promise<{ orgId: string }>
}) {
	const { orgId } = await params
	const t = await getTranslations('booking')

	return (
		<Suspense
			fallback={
				<div className="flex min-h-screen items-center justify-center">
					<p className="text-muted-foreground">{t('loading')}</p>
				</div>
			}
		>
			<CalendarViewConfigProvider config={ORG_ADMIN_CONFIG}>
				<OrgCalendarPage orgSlug={orgId} />
			</CalendarViewConfigProvider>
		</Suspense>
	)
}
```

- [ ] **Step 5: Create org admin staff page**

```tsx
// app/[locale]/(org)/org/[orgId]/[staffId]/page.tsx

import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { CalendarViewConfigProvider } from '@/lib/calendar/CalendarViewConfigContext'
import { ORG_ADMIN_CONFIG } from '@/lib/calendar/view-config'
import { OrgCalendarPage } from '@/components/booking/OrgCalendarPage'

export default async function OrgStaffAdminPage({
	params,
}: {
	params: Promise<{ orgId: string; staffId: string }>
}) {
	const { orgId, staffId } = await params
	const t = await getTranslations('booking')

	return (
		<Suspense
			fallback={
				<div className="flex min-h-screen items-center justify-center">
					<p className="text-muted-foreground">{t('loading')}</p>
				</div>
			}
		>
			<CalendarViewConfigProvider config={ORG_ADMIN_CONFIG}>
				<OrgCalendarPage orgSlug={orgId} staffId={staffId} />
			</CalendarViewConfigProvider>
		</Suspense>
	)
}
```

- [ ] **Step 6: Commit**

```bash
git add "app/[locale]/(public)/org/[orgId]/page.tsx" "app/[locale]/(public)/book/[staffSlug]/page.tsx" "app/[locale]/(personal)/schedule/page.tsx" "app/[locale]/(org)/org/[orgId]/page.tsx" "app/[locale]/(org)/org/[orgId]/[staffId]/page.tsx"
git commit -m "feat(routes): add pages to new route groups"
```

---

## Task 12: Frontend — Update auth middleware + cleanup

**Files:**

- Modify: `Slotix-fronted/lib/auth-middleware.ts`

- [ ] **Step 1: Update protected paths in auth-middleware.ts**

Change the `protectedPaths` array to include the new authenticated routes:

```ts
const protectedPaths = [
	'/dashboard',
	'/billing',
	'/shadcndemo',
	'/organizations',
	'/schedule',
	'/org',
]
```

Note: `/org` here covers `(org)/org/[orgId]` routes. The `(public)/org/[orgId]` routes won't conflict because they use a different route group — but we need to be careful. Since the public org pages are under `(public)` route group and don't have `/org` as a direct path segment at the locale level (they render as `/{locale}/org/...`), and the middleware runs on the pathname, we need to ensure public org pages remain accessible.

Actually, both `(public)/org/[orgId]` and `(org)/org/[orgId]` would resolve to the same URL pattern `/{locale}/org/{id}`. This is a conflict — Next.js route groups with the same path can't coexist.

**Resolution:** Keep the org admin pages at a different path. Use `(org)/manage/[orgId]/` instead:

Update the route structure: admin org pages go under `/manage/[orgId]` and public org pages stay at `/org/[orgId]`.

Update `protectedPaths`:

```ts
const protectedPaths = [
	'/dashboard',
	'/billing',
	'/shadcndemo',
	'/organizations',
	'/schedule',
	'/manage',
]
```

- [ ] **Step 2: Update OrgSidebar links to use `/manage/` prefix**

In `components/sidebar/OrgSidebar.tsx`, update:

```ts
const orgScheduleHref = buildHref(`/manage/${orgId}`)
```

And staff links:

```ts
const href = buildHref(`/manage/${orgId}/${staff.id}`)
```

And in `OrgCard.tsx`, update navigation:

```ts
router.push(`/${locale}/manage/${org.id}`)
```

- [ ] **Step 3: Rename (org) route group paths**

Rename the directories:

- `app/[locale]/(org)/org/[orgId]/` → `app/[locale]/(org)/manage/[orgId]/`

Update the page files accordingly (the content stays the same, just the folder name changes from `org` to `manage`).

- [ ] **Step 4: Commit**

```bash
git add lib/auth-middleware.ts components/sidebar/OrgSidebar.tsx components/organizations/OrgCard.tsx "app/[locale]/(org)/"
git commit -m "fix(routes): resolve public/admin org route conflict with /manage prefix"
```

---

## Task 13: Frontend — Delete old files

**Files to delete:**

- `app/[locale]/org/[orgSlug]/page.tsx`
- `app/[locale]/org/[orgSlug]/[staffId]/page.tsx`
- `app/[locale]/book/[staffSlug]/page.tsx` (keep `BookingPage.tsx` in same dir)
- `app/[locale]/staff/schedule/page.tsx`
- `app/[locale]/staff/org/[orgSlug]/page.tsx`
- `app/[locale]/staff/org/[orgSlug]/[staffId]/page.tsx`
- `components/booking/BookingSidebar.tsx`
- `components/booking/BookingLayout.tsx`

- [ ] **Step 1: Delete old page files**

```bash
rm app/[locale]/org/[orgSlug]/page.tsx
rm app/[locale]/org/[orgSlug]/[staffId]/page.tsx
rm app/[locale]/book/[staffSlug]/page.tsx
rm app/[locale]/staff/schedule/page.tsx
rm app/[locale]/staff/org/[orgSlug]/page.tsx
rm app/[locale]/staff/org/[orgSlug]/[staffId]/page.tsx
```

- [ ] **Step 2: Delete old sidebar and layout**

```bash
rm components/booking/BookingSidebar.tsx
rm components/booking/BookingLayout.tsx
```

- [ ] **Step 3: Remove empty directories**

```bash
rmdir app/[locale]/org/[orgSlug] 2>/dev/null || true
rmdir app/[locale]/org 2>/dev/null || true
rmdir app/[locale]/staff/org/[orgSlug] 2>/dev/null || true
rmdir app/[locale]/staff/org 2>/dev/null || true
rmdir app/[locale]/staff 2>/dev/null || true
```

- [ ] **Step 4: Verify no broken imports**

```bash
npm run build
```

Fix any import errors that surface. The main ones to watch:

- Any file importing `BookingLayout` → should no longer exist (layouts handle this)
- Any file importing `BookingSidebar` → should no longer exist

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: remove old booking sidebar, layout, and page files"
```

---

## Task 14: Verification — build and smoke test

- [ ] **Step 1: Run frontend build**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 2: Run linter**

```bash
npm run lint
```

Expected: No lint errors.

- [ ] **Step 3: Run format check**

```bash
npm run format:check
```

If formatting issues: run `npm run format` and commit.

- [ ] **Step 4: Start dev server and verify routes**

```bash
npm run dev
```

Manual checks:

- `http://localhost:3000/en/organizations` → should show org list page with DashboardSidebar (requires login)
- `http://localhost:3000/en/schedule` → should show personal calendar with PersonalSidebar (requires login)
- `http://localhost:3000/en/manage/{orgId}` → should show org schedule with OrgSidebar (requires login)
- `http://localhost:3000/en/org/{orgId}` → should show public booking (no sidebar, no login required)
- `http://localhost:3000/en/book/{staffSlug}` → should show public booking (no sidebar)

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address build/lint issues from route migration"
```
