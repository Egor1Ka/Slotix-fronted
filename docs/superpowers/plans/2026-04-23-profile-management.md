# Profile Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to see their avatar + email in the personal profile, and set a per-organization display name, see their role, and see their position in the org profile.

**Architecture:** Extend the backend `Membership` model with a nullable `displayName`. Centralise the effective-name substitution (`displayName ?? user.name`) in the staff DTOs so every consumer sees a single flat `name` field. Extend `GET /api/org/:id/my-membership` to be the canonical source for the org profile page (role + displayName + bio + positionId + position name). Frontend adds a shared `ProfileHeader` used in both the personal and the org profile.

**Tech Stack:** Backend — Express + Mongoose. Frontend — Next.js 16 App Router, react-hook-form + zod, shadcn/ui, `next-intl`.

**Note on tests:** Neither repo has a unit-test harness yet. Each task ends with a manual verification step run against the dev server; the final task walks through end-to-end browser verification.

**Repos:**

- Backend: `/Users/egorzozula/Desktop/BackendTemplate`
- Frontend: `/Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted`

---

## Task 1: Add `displayName` to Membership model

**Files:**

- Modify: `/Users/egorzozula/Desktop/BackendTemplate/src/models/Membership.js`

- [ ] **Step 1: Add field to schema**

Open `src/models/Membership.js`. After the existing `bio` field definition (around line 81), add a new field block:

```js
    /**
     * Имя сотрудника внутри этой организации.
     * Если null — используется User.name (глобальное имя).
     * Max 100 символов.
     */
    displayName: {
      type: String,
      default: null,
      maxlength: 100,
    },
```

- [ ] **Step 2: Smoke check**

Run the backend dev server:

```bash
cd /Users/egorzozula/Desktop/BackendTemplate && npm run dev
```

Expected: server starts without schema errors. Stop after a few seconds.

- [ ] **Step 3: Commit**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
git add src/models/Membership.js
git commit -m "feat(membership): добавить поле displayName"
```

---

## Task 2: Extend staff DTOs with effective name + raw displayName

**Files:**

- Modify: `/Users/egorzozula/Desktop/BackendTemplate/src/dto/staffDto.js`

- [ ] **Step 1: Update `toStaffDto`**

Replace the body of `toStaffDto` so `name` is the effective name and `displayName` is the raw override:

```js
const toStaffDto = (user, position, membership) => ({
	id: user.id,
	name: (membership && membership.displayName) || user.name,
	displayName: membership ? membership.displayName || null : null,
	avatar: user.avatar,
	position: position ? position.name : null,
	bio: membership ? membership.bio || null : null,
	orgId: membership ? membership.orgId.toString() : null,
	locationIds: membership ? membership.locationIds.map(toString) : [],
})
```

- [ ] **Step 2: Update `toOrgStaffDto`**

Replace its body:

```js
const toOrgStaffDto = (user, position, bookingCount, status, membership) => ({
	id: user.id,
	name: (membership && membership.displayName) || user.name,
	displayName: membership ? membership.displayName || null : null,
	avatar: user.avatar,
	position: position ? position.name : null,
	positionId:
		membership && membership.positionId
			? membership.positionId.toString()
			: null,
	bio: membership ? membership.bio || null : null,
	bookingCount,
	status: status || 'active',
})
```

- [ ] **Step 3: Smoke check**

Restart dev server:

```bash
cd /Users/egorzozula/Desktop/BackendTemplate && npm run dev
```

Hit `GET http://localhost:<port>/api/org/<anyOrgId>/staff` and confirm the response shape still returns an array of staff with the new `displayName: null` field. Stop the server.

- [ ] **Step 4: Commit**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
git add src/dto/staffDto.js
git commit -m "feat(staff-dto): подставлять displayName как effective name"
```

---

## Task 3: Extend `getMyMembership` response

**Files:**

- Modify: `/Users/egorzozula/Desktop/BackendTemplate/src/services/orgServices.js`

- [ ] **Step 1: Replace `getMyMembership`**

Find the function (currently at line 222) and replace it with:

```js
const getMyMembership = async (orgId, userId) => {
	const membership = await getMembershipByUserAndOrg(userId, orgId)
	if (!membership) return null

	const position = membership.positionId
		? await getPositionById(membership.positionId)
		: null

	return {
		role: membership.role,
		status: membership.status,
		displayName: membership.displayName || null,
		bio: membership.bio || null,
		positionId: membership.positionId ? membership.positionId.toString() : null,
		position: position ? position.name : null,
	}
}
```

- [ ] **Step 2: Smoke check**

Restart dev server. Call `GET /api/org/<orgId>/my-membership` with a valid access token. Confirm the JSON response now contains `displayName`, `bio`, `positionId`, `position`.

- [ ] **Step 3: Commit**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
git add src/services/orgServices.js
git commit -m "feat(membership): вернуть displayName, bio, positionId, position в my-membership"
```

---

## Task 4: Rename `updateStaffBio` → `updateStaffMember` and accept `displayName`

**Files:**

- Modify: `/Users/egorzozula/Desktop/BackendTemplate/src/services/orgServices.js`

- [ ] **Step 1: Replace the service function**

Locate the current `updateStaffBio` (line 145). Replace it with:

```js
const updateStaffMember = async (orgId, staffId, updates) => {
	const changes = {}
	if (updates.bio !== undefined) {
		changes.bio = updates.bio && updates.bio.trim() ? updates.bio.trim() : null
	}
	if (updates.displayName !== undefined) {
		const dn = updates.displayName && updates.displayName.trim()
		changes.displayName = dn ? dn : null
	}

	if (Object.keys(changes).length === 0) {
		throw new HttpError(generalStatus.BAD_REQUEST)
	}

	const membership = await Membership.findOneAndUpdate(
		{ userId: staffId, orgId, status: 'active' },
		changes,
		{ new: true },
	)

	if (!membership) {
		throw new HttpError(generalStatus.NOT_FOUND)
	}

	return {
		bio: membership.bio || null,
		displayName: membership.displayName || null,
	}
}
```

- [ ] **Step 2: Update the module export**

At the bottom of `src/services/orgServices.js`, replace `updateStaffBio` with `updateStaffMember` in the export list:

```js
export {
	getOrganizationById,
	getOrgStaff,
	createOrganization,
	updateOrganization,
	updateStaffMember,
	updateStaffPosition,
	getUserOrganizations,
	addStaffToOrg,
	acceptInvitation,
	declineInvitation,
	getMyMembership,
	getDayRange,
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
git add src/services/orgServices.js
git commit -m "refactor(org): переименовать updateStaffBio в updateStaffMember, принимать displayName"
```

---

## Task 5: Update controller to accept `displayName`

**Files:**

- Modify: `/Users/egorzozula/Desktop/BackendTemplate/src/controllers/orgController.js`

- [ ] **Step 1: Swap the import**

Line 1 — change `updateStaffBio` to `updateStaffMember`:

```js
import {
	getOrganizationById,
	getOrgStaff,
	createOrganization,
	updateOrganization,
	updateStaffMember,
	updateStaffPosition,
	getUserOrganizations,
	addStaffToOrg,
	acceptInvitation,
	declineInvitation,
	getMyMembership,
} from '../services/orgServices.js'
```

- [ ] **Step 2: Replace the validation schema**

Replace `updateStaffBioSchema` (line 27) with:

```js
const updateStaffMemberSchema = {
	bio: { type: 'string', required: false },
	displayName: { type: 'string', required: false },
}
```

- [ ] **Step 3: Replace the handler**

Replace `handleUpdateStaffBio` with:

```js
const handleUpdateStaffMember = async (req, res) => {
	try {
		if (
			!isValidObjectId(req.params.id) ||
			!isValidObjectId(req.params.staffId)
		) {
			return httpResponse(res, generalStatus.BAD_REQUEST)
		}

		if (req.user.id !== req.params.staffId) {
			return httpResponse(res, generalStatus.UNAUTHORIZED)
		}

		const validated = validateSchema(updateStaffMemberSchema, req.body)
		if (validated.errors) {
			return httpResponse(res, generalStatus.BAD_REQUEST, {
				errors: validated.errors,
			})
		}

		const displayName = validated.displayName
		if (
			displayName !== undefined &&
			displayName !== null &&
			displayName !== '' &&
			displayName.trim().length < 2
		) {
			return httpResponse(res, generalStatus.BAD_REQUEST, {
				errors: {
					displayName: 'displayName - must be at least 2 characters or empty',
				},
			})
		}
		if (
			displayName !== undefined &&
			displayName !== null &&
			displayName.length > 100
		) {
			return httpResponse(res, generalStatus.BAD_REQUEST, {
				errors: { displayName: 'displayName - must be at most 100 characters' },
			})
		}

		const updates = {}
		if (validated.bio !== undefined) updates.bio = validated.bio
		if (validated.displayName !== undefined)
			updates.displayName = validated.displayName

		const result = await updateStaffMember(
			req.params.id,
			req.params.staffId,
			updates,
		)
		return httpResponse(res, generalStatus.SUCCESS, result)
	} catch (error) {
		return httpResponseError(res, error)
	}
}
```

- [ ] **Step 4: Swap the export**

Update the bottom-of-file export list — replace `handleUpdateStaffBio` with `handleUpdateStaffMember`:

```js
export {
	handleGetOrg,
	handleGetOrgStaff,
	handleCreateOrg,
	handleUpdateOrg,
	handleUpdateStaffMember,
	handleUpdateStaffPosition,
	handleGetUserOrgs,
	handleAddStaff,
	handleAcceptInvitation,
	handleDeclineInvitation,
	handleGetMyMembership,
}
```

- [ ] **Step 5: Update the route binding**

Open `/Users/egorzozula/Desktop/BackendTemplate/src/routes/subroutes/orgRoutes.js`. Replace `handleUpdateStaffBio` with `handleUpdateStaffMember` in the import (line 2) and in the route handler (line 16):

```js
router.patch('/:id/staff/:staffId', authMiddleware, handleUpdateStaffMember)
```

- [ ] **Step 6: Smoke check**

Restart dev server. Call `PATCH /api/org/<orgId>/staff/<your-userId>` with body `{ "displayName": "Егор" }` and confirm the response returns `{ displayName: "Егор", bio: null }`. Then call `GET /api/org/<orgId>/my-membership` and confirm `displayName` is now `"Егор"`.

- [ ] **Step 7: Commit**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
git add src/controllers/orgController.js src/routes/subroutes/orgRoutes.js
git commit -m "feat(org-api): принять displayName в PATCH /org/:id/staff/:staffId"
```

---

## Task 6: Frontend types — `OrgMembership` + `OrgStaffMember`

**Files:**

- Modify: `/Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted/services/configs/org.types.ts`
- Modify: `/Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted/services/configs/booking.types.ts`

- [ ] **Step 1: Extend `OrgMembership`**

In `services/configs/org.types.ts`, replace the `OrgMembership` interface with:

```ts
interface OrgMembership {
	role: 'owner' | 'admin' | 'member'
	status: 'active' | 'invited' | 'suspended' | 'left'
	displayName: string | null
	bio: string | null
	positionId: string | null
	position: string | null
}
```

- [ ] **Step 2: Extend `OrgStaffMember`**

In `services/configs/booking.types.ts`, replace the `OrgStaffMember` interface (near the bottom — currently around line 163) with:

```ts
interface OrgStaffMember extends StaffMember {
	bookingCount: number
	status?: 'active' | 'invited' | 'suspended'
	positionId?: string | null
	displayName?: string | null
}
```

- [ ] **Step 3: Typecheck**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
npx tsc --noEmit 2>&1 | grep -v "\.next/"
```

Expected: no errors beyond the two pre-existing `StaffPositionAssignment` / `ScheduleViewTab` errors documented in git history (these are unrelated).

- [ ] **Step 4: Commit**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
git add services/configs/org.types.ts services/configs/booking.types.ts
git commit -m "types(org): добавить displayName, bio, positionId, position в OrgMembership"
```

---

## Task 7: Frontend API — rename endpoint to `updateStaffMember`

**Files:**

- Modify: `/Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted/services/configs/org.config.ts`

- [ ] **Step 1: Rename and widen the body type**

Replace the `updateStaffBio` entry in `orgApiConfig` (currently at lines 71-77) with:

```ts
	updateStaffMember: endpoint<
		{ bio?: string | null; displayName?: string | null },
		ApiResponse<{ bio: string | null; displayName: string | null }>
	>({
		url: ({ orgId, staffId }) => `/api/org/${orgId}/staff/${staffId}`,
		method: patchData,
		defaultErrorMessage: 'Failed to update profile',
	}),
```

- [ ] **Step 2: Update the only call site**

Open `/Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted/app/[locale]/(org)/org/[orgId]/my-profile/page.tsx`. Find the `orgApi.updateStaffBio` call (around line 67). Leave it as-is for now — Task 11 rewrites the whole page. This step is a no-op and exists only so the typecheck in Step 3 below stays meaningful.

Wait — the rename will break the current call site. Temporarily adjust the call to keep TypeScript green until Task 11 replaces the file. Change line 67 from `updateStaffBio` to `updateStaffMember` and the body from `{ bio: ... }` to `{ bio: data.bio || null }` (no `displayName` yet). Keep everything else as-is.

- [ ] **Step 3: Typecheck**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
npx tsc --noEmit 2>&1 | grep -v "\.next/" | grep -v "StaffPositionAssignment\|ScheduleViewTab"
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
git add services/configs/org.config.ts "app/[locale]/(org)/org/[orgId]/my-profile/page.tsx"
git commit -m "refactor(api): переименовать updateStaffBio в updateStaffMember"
```

---

## Task 8: Create `ProfileHeader` component

**Files:**

- Create: `/Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted/components/profile/ProfileHeader.tsx`

- [ ] **Step 1: Write the component**

```tsx
import * as React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface ProfileHeaderProps {
	avatar: string
	name: string
	subtitle?: string
	badges?: React.ReactNode
}

const getInitial = (name: string) => {
	const trimmed = name.trim()
	return trimmed ? trimmed.charAt(0).toUpperCase() : '?'
}

function ProfileHeader({ avatar, name, subtitle, badges }: ProfileHeaderProps) {
	return (
		<div
			data-slot="profile-header"
			className="flex items-center gap-4 rounded-lg border p-4"
		>
			<Avatar className="size-16">
				<AvatarImage src={avatar} alt={name} />
				<AvatarFallback>{getInitial(name)}</AvatarFallback>
			</Avatar>
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<h2 className="truncate text-xl font-semibold">{name}</h2>
				{subtitle ? (
					<p className="text-muted-foreground truncate text-sm">{subtitle}</p>
				) : null}
				{badges ? (
					<div className="mt-1 flex flex-wrap gap-2">{badges}</div>
				) : null}
			</div>
		</div>
	)
}

export { ProfileHeader }
export type { ProfileHeaderProps }
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
npx tsc --noEmit 2>&1 | grep "ProfileHeader"
```

Expected: no output (no errors referencing the new component).

- [ ] **Step 3: Commit**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
git add components/profile/ProfileHeader.tsx
git commit -m "feat(profile): ProfileHeader компонент для шапки с аватаром"
```

---

## Task 9: Add i18n keys

**Files:**

- Modify: `/Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted/i18n/messages/en.json`
- Modify: `/Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted/i18n/messages/uk.json`

- [ ] **Step 1: Inspect current `profile` block**

Open both files. Find the `"profile"` object. Take note of any existing `role` or `email` nested keys to avoid clashes.

- [ ] **Step 2: Add new keys to `en.json`**

Inside the `"profile"` object, add:

```json
"emailLabel": "Email",
"orgDisplayNameLabel": "Your name in this organization",
"orgDisplayNamePlaceholder": "Leave empty to use your global name",
"orgDisplayNameHint": "This name is visible only inside this organization",
"role": {
	"owner": "Owner",
	"admin": "Admin",
	"member": "Member"
}
```

Make sure the JSON remains valid (commas between siblings, no trailing commas).

- [ ] **Step 3: Add new keys to `uk.json`**

Same structure with Ukrainian values:

```json
"emailLabel": "Пошта",
"orgDisplayNameLabel": "Ваше ім'я в цій організації",
"orgDisplayNamePlaceholder": "Залиште пустим, щоб використати глобальне ім'я",
"orgDisplayNameHint": "Це ім'я видно лише в межах цієї організації",
"role": {
	"owner": "Власник",
	"admin": "Адмін",
	"member": "Учасник"
}
```

- [ ] **Step 4: Validate JSON**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
node -e "JSON.parse(require('fs').readFileSync('i18n/messages/en.json','utf8')); JSON.parse(require('fs').readFileSync('i18n/messages/uk.json','utf8')); console.log('ok')"
```

Expected: `ok`.

- [ ] **Step 5: Commit**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
git add i18n/messages/en.json i18n/messages/uk.json
git commit -m "i18n(profile): ключи для org displayName и role"
```

---

## Task 10: Personal `/profile` — add `ProfileHeader`

**Files:**

- Modify: `/Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted/app/[locale]/(personal)/profile/page.tsx`

- [ ] **Step 1: Add import**

At the top of the file, alongside the other profile imports, add:

```tsx
import { ProfileHeader } from '@/components/profile/ProfileHeader'
```

- [ ] **Step 2: Render the header**

In the returned JSX replace the current opening block:

```tsx
return (
	<div className="mx-auto max-w-2xl space-y-6 p-6">
		<h1 className="text-2xl font-bold">{t('myTitle')}</h1>
		<ProfileForm defaultValues={defaultValues} onSubmit={handleSubmit} />
```

with:

```tsx
return (
	<div className="mx-auto max-w-2xl space-y-6 p-6">
		<h1 className="text-2xl font-bold">{t('myTitle')}</h1>
		<ProfileHeader
			avatar={user.avatar}
			name={user.name}
			subtitle={user.email}
		/>
		<ProfileForm defaultValues={defaultValues} onSubmit={handleSubmit} />
```

Everything after `<ProfileForm />` stays unchanged.

- [ ] **Step 3: Manual check**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
npm run dev
```

Open `http://localhost:3000/profile` (log in first if needed). Expected: avatar + name + email block appears above the profile form. Stop dev server.

- [ ] **Step 4: Commit**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
git add "app/[locale]/(personal)/profile/page.tsx"
git commit -m "feat(profile): добавить шапку с аватаром и email в личный профиль"
```

---

## Task 11: Rewrite org `/my-profile`

**Files:**

- Modify: `/Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted/app/[locale]/(org)/org/[orgId]/my-profile/page.tsx`

- [ ] **Step 1: Replace the whole file**

Overwrite the file with:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from '@/components/ui/field'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import { useUser } from '@/lib/auth/user-provider'
import { orgApi, setServerErrors } from '@/services'
import type { OrgMembership } from '@/services/configs/org.types'

const profileSchema = z.object({
	displayName: z
		.string()
		.trim()
		.max(100)
		.optional()
		.or(z.literal(''))
		.refine((v) => !v || v.length >= 2, {
			message: 'Minimum 2 characters',
		}),
	bio: z.string().max(500).optional().or(z.literal('')),
})

type ProfileFormData = z.infer<typeof profileSchema>

function StaffMyProfilePage() {
	const params = useParams<{ orgId: string }>()
	const t = useTranslations('profile')
	const user = useUser()
	const [membership, setMembership] = useState<OrgMembership | null>(null)
	const [loading, setLoading] = useState(true)

	const orgId = params.orgId

	useEffect(() => {
		const fetchMembership = async () => {
			try {
				const response = await orgApi.getMyMembership({
					pathParams: { id: orgId },
				})
				setMembership(response.data)
			} catch {
				// toast interceptor handles errors
			} finally {
				setLoading(false)
			}
		}

		fetchMembership()
	}, [orgId])

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
		setError,
	} = useForm<ProfileFormData>({
		resolver: zodResolver(profileSchema),
		values: {
			displayName: membership?.displayName ?? '',
			bio: membership?.bio ?? '',
		},
	})

	const onSubmit = async (data: ProfileFormData) => {
		const displayName = data.displayName?.trim() || null
		const bio = data.bio?.trim() || null
		try {
			const response = await orgApi.updateStaffMember({
				pathParams: { orgId, staffId: user.id },
				body: { displayName, bio },
			})
			setMembership((prev) =>
				prev
					? {
							...prev,
							displayName: response.data.displayName,
							bio: response.data.bio,
						}
					: prev,
			)
			toast.success(t('saved'))
		} catch (err) {
			if (!setServerErrors(err, setError)) {
				// toast already shown by interceptor
			}
		}
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center py-20">
				<Spinner />
			</div>
		)
	}

	if (!membership) return null

	const effectiveName = membership.displayName || user.name
	const roleLabel = t(`role.${membership.role}`)

	const renderBadges = () => {
		const badges = [
			<Badge key="role" variant="secondary">
				{roleLabel}
			</Badge>,
		]
		if (membership.position) {
			badges.push(
				<Badge key="position" variant="outline">
					{membership.position}
				</Badge>,
			)
		}
		return badges
	}

	return (
		<div className="mx-auto max-w-2xl space-y-6 p-6">
			<h1 className="text-2xl font-bold">{t('myTitle')}</h1>

			<ProfileHeader
				avatar={user.avatar}
				name={effectiveName}
				badges={renderBadges()}
			/>

			<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
				<Field data-invalid={!!errors.displayName || undefined}>
					<FieldLabel htmlFor="org-display-name">
						{t('orgDisplayNameLabel')}
					</FieldLabel>
					<Input
						id="org-display-name"
						placeholder={user.name}
						{...register('displayName')}
					/>
					<FieldDescription>{t('orgDisplayNameHint')}</FieldDescription>
					<FieldError errors={[errors.displayName]} />
				</Field>

				<Field data-invalid={!!errors.bio || undefined}>
					<FieldLabel htmlFor="staff-bio">{t('bio')}</FieldLabel>
					<Textarea
						id="staff-bio"
						placeholder={t('bioPlaceholder')}
						rows={4}
						{...register('bio')}
					/>
					<FieldError errors={[errors.bio]} />
				</Field>

				<Button type="submit" disabled={isSubmitting}>
					{t('save')}
				</Button>
			</form>
		</div>
	)
}

export default StaffMyProfilePage
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
npx tsc --noEmit 2>&1 | grep -v "\.next/" | grep -v "StaffPositionAssignment\|ScheduleViewTab"
```

Expected: no new errors.

- [ ] **Step 3: Manual check (UI)**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
npm run dev
```

Open `http://localhost:3000/org/<orgId>/my-profile` while logged in. Expected:

- Header with avatar, effective name, role badge (and position badge if assigned).
- Form with `displayName` (empty if none) and `bio`.
- Save triggers a success toast; header updates without refresh.

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
git add "app/[locale]/(org)/org/[orgId]/my-profile/page.tsx"
git commit -m "feat(profile): шапка, displayName и bio в org-профиле"
```

---

## Task 12: End-to-end verification

**Files:** none (manual).

- [ ] **Step 1: Start backend**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
npm run dev
```

- [ ] **Step 2: Start frontend**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
npm run dev
```

- [ ] **Step 3: Checklist — two orgs, one user**

Log in as a user who is a member of at least two organizations (create a second one if needed).

For org **A**:

- Open `/org/<A>/my-profile`.
- Set `displayName = "Егор"`, `bio = "Test"`. Save.
- Header updates to show "Егор".
- Refresh the page — "Егор" persists.

For org **B** (different org):

- Open `/org/<B>/my-profile`. Header shows the global `User.name` (not "Егор"). `displayName` input is empty.

Personal:

- Open `/profile`. Header shows global `User.name` and `email`. No role/position badges.

Public surfaces:

- Open `/org/<A>/<yourStaffId>` (public org calendar for that staff). Staff label shows "Егор".
- Open `/org/<B>/<yourStaffId>`. Staff label shows global `User.name`.

Fallback:

- In org A, clear the `displayName` field and save. Header reverts to global name. Public pages revert as well.

Role badge:

- Change your role in the DB (or with another account) to each of `owner / admin / member`. Confirm badge text matches the i18n value in both EN and UK.

Position badge:

- Have an admin assign a position to the user in org A. Badge appears. Remove the position. Badge disappears.

- [ ] **Step 4: Stop both dev servers**

---

## Self-Review Notes (for the author, not for execution)

- **Spec coverage**: Backend model (Task 1), DTOs (Task 2), `my-membership` (Task 3), write endpoint (Tasks 4-5), type updates (Task 6), API rename (Task 7), shared header (Task 8), i18n (Task 9), personal profile header (Task 10), org profile rewrite (Task 11), verification (Task 12) — all sections of the design are mapped.
- **No placeholders**: every step has explicit file paths, code blocks and shell commands.
- **Type consistency**: `updateStaffMember` is the same name in backend service, controller, frontend config and page call site. `ProfileHeader` props match between definition and both call sites.
- **Deferred scope** per design: avatar upload, per-org avatar, editable role/position, sidebar changes. Not in this plan.
