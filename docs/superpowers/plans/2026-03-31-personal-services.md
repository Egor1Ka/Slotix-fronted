# Personal Services Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to manage personal services (event types) without an organization, reusing the existing org-level services UI.

**Architecture:** Refactor `ServicesList` and `ServiceDialog` to accept `ownerId` + `ownerType` instead of `orgId`. Add `getByUser` endpoint to booking-api-client. Create new personal page at `/(personal)/my-services`. Add sidebar link.

**Tech Stack:** Next.js App Router, React, TypeScript, react-hook-form, Zod, next-intl

---

## File Structure

| File                                                  | Action | Responsibility                                                               |
| ----------------------------------------------------- | ------ | ---------------------------------------------------------------------------- |
| `services/configs/event-type.types.ts`                | Modify | Make `orgId` optional, add `userId`, make `staffPolicy` optional             |
| `lib/booking-api-client.ts`                           | Modify | Add `getEventTypesByUser` method                                             |
| `components/services/ServicesList.tsx`                | Modify | Replace `orgId` with `ownerId` + `ownerType`, conditional fetch              |
| `components/services/ServiceDialog.tsx`               | Modify | Replace `orgId` with `ownerId` + `ownerType`, hide staff policy for personal |
| `app/[locale]/(personal)/my-services/page.tsx`        | Create | Personal services page                                                       |
| `app/[locale]/(org)/manage/[orgId]/services/page.tsx` | Modify | Pass `ownerType="org"` to ServicesList                                       |
| `components/sidebar/PersonalSidebar.tsx`              | Modify | Add "My Services" link                                                       |

---

### Task 1: Update API types

**Files:**

- Modify: `services/configs/event-type.types.ts`

- [ ] **Step 1: Update CreateEventTypeBody**

Replace the full content of `services/configs/event-type.types.ts`:

```ts
type StaffPolicy = 'any' | 'by_position' | 'specific'

interface CreateEventTypeBody {
	orgId?: string
	userId?: string
	name: string
	durationMin: number
	price: number
	currency: string
	color?: string
	description?: string
	staffPolicy?: StaffPolicy
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

Changes: `orgId` → optional, added `userId`, `staffPolicy` → optional in Create.

- [ ] **Step 2: Verify no type errors**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors (existing ones may remain).

- [ ] **Step 3: Commit**

```bash
git add services/configs/event-type.types.ts
git commit -m "refactor: сделать orgId и staffPolicy опциональными, добавить userId в CreateEventTypeBody"
```

---

### Task 2: Add getEventTypesByUser to booking-api-client

**Files:**

- Modify: `lib/booking-api-client.ts`

- [ ] **Step 1: Add getEventTypesByUser function**

After the existing `getEventTypesByOrg` function (around line 252), add:

```ts
const getEventTypesByUser = async (userId: string): Promise<EventType[]> => {
	const raw = await get<BackendEventType[]>(`/event-types?userId=${userId}`)
	return raw.map(toFrontendEventType)
}
```

- [ ] **Step 2: Add to eventTypeApi export**

Update the `eventTypeApi` export object (line ~427) to include the new method:

```ts
export const eventTypeApi = {
	getByStaff: getEventTypesByStaff,
	getByOrg: getEventTypesByOrg,
	getByUser: getEventTypesByUser,
	getStaffForEventType,
}
```

- [ ] **Step 3: Verify no type errors**

Run: `npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 4: Commit**

```bash
git add lib/booking-api-client.ts
git commit -m "feat: добавить getEventTypesByUser в booking-api-client"
```

---

### Task 3: Refactor ServicesList

**Files:**

- Modify: `components/services/ServicesList.tsx`

- [ ] **Step 1: Update interface and fetch logic**

Replace the `ServicesListProps` interface and update the component signature and fetch:

Old (lines 46-49):

```ts
interface ServicesListProps {
	orgId: string
	currency: string
}
```

New:

```ts
interface ServicesListProps {
	ownerId: string
	ownerType: 'org' | 'user'
	currency: string
}
```

Old function signature (line 51):

```ts
function ServicesList({ orgId, currency }: ServicesListProps) {
```

New:

```ts
function ServicesList({ ownerId, ownerType, currency }: ServicesListProps) {
```

- [ ] **Step 2: Update fetchServices**

Old (lines 63-72):

```ts
const fetchServices = useCallback(async () => {
	try {
		const data = await bookingEventTypeApi.getByOrg(orgId)
		setServices(data)
	} catch {
		// Toast вже показано інтерцептором
	} finally {
		setLoading(false)
	}
}, [orgId])
```

New:

```ts
const fetchByOwnerType =
	ownerType === 'org'
		? bookingEventTypeApi.getByOrg
		: bookingEventTypeApi.getByUser

const fetchServices = useCallback(async () => {
	try {
		const data = await fetchByOwnerType(ownerId)
		setServices(data)
	} catch {
		// Toast вже показано інтерцептором
	} finally {
		setLoading(false)
	}
}, [ownerId, fetchByOwnerType])
```

- [ ] **Step 3: Conditionally render staff policy badge**

In the `renderService` function, wrap the Badge (lines 145-153) with a condition:

Old:

```tsx
<Badge
	variant="outline"
	className={cn(
		'hidden text-xs sm:inline-flex',
		POLICY_BADGE_CLASS[service.staffPolicy],
	)}
>
	{getPolicyLabel(service.staffPolicy)}
</Badge>
```

New:

```tsx
{
	ownerType === 'org' && (
		<Badge
			variant="outline"
			className={cn(
				'hidden text-xs sm:inline-flex',
				POLICY_BADGE_CLASS[service.staffPolicy],
			)}
		>
			{getPolicyLabel(service.staffPolicy)}
		</Badge>
	)
}
```

- [ ] **Step 4: Update ServiceDialog props**

Old (lines 203-209):

```tsx
<ServiceDialog
	open={dialogOpen}
	onOpenChange={setDialogOpen}
	orgId={orgId}
	currency={currency}
	eventType={editingService}
	onSuccess={handleDialogSuccess}
/>
```

New:

```tsx
<ServiceDialog
	open={dialogOpen}
	onOpenChange={setDialogOpen}
	ownerId={ownerId}
	ownerType={ownerType}
	currency={currency}
	eventType={editingService}
	onSuccess={handleDialogSuccess}
/>
```

- [ ] **Step 5: Verify no type errors**

Run: `npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 6: Commit**

```bash
git add components/services/ServicesList.tsx
git commit -m "refactor: ServicesList — заменить orgId на ownerId + ownerType"
```

---

### Task 4: Refactor ServiceDialog

**Files:**

- Modify: `components/services/ServiceDialog.tsx`

- [ ] **Step 1: Split Zod schema**

Replace the existing `serviceSchema` (lines 36-64) with two schemas:

```ts
const baseServiceSchema = z.object({
	name: z.string().min(2),
	durationMin: z.number().min(1),
	price: z.number().min(0),
	color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
	description: z.string().optional(),
})

const orgServiceSchema = baseServiceSchema
	.extend({
		staffPolicy: z.enum(['any', 'by_position', 'specific']),
		assignedPositions: z.array(z.string()),
		assignedStaff: z.array(z.string()),
	})
	.refine(
		(data) => {
			if (data.staffPolicy === 'by_position') {
				return data.assignedPositions.length > 0
			}
			return true
		},
		{ path: ['assignedPositions'], message: 'Select at least one position' },
	)
	.refine(
		(data) => {
			if (data.staffPolicy === 'specific') {
				return data.assignedStaff.length > 0
			}
			return true
		},
		{ path: ['assignedStaff'], message: 'Select at least one staff member' },
	)

const personalServiceSchema = baseServiceSchema

type OrgServiceFormData = z.infer<typeof orgServiceSchema>
type PersonalServiceFormData = z.infer<typeof personalServiceSchema>
type ServiceFormData = OrgServiceFormData | PersonalServiceFormData
```

- [ ] **Step 2: Update interface and component signature**

Old (lines 68-84):

```ts
interface ServiceDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	orgId: string
	currency: string
	eventType?: EventType
	onSuccess: () => void
}

function ServiceDialog({
	open,
	onOpenChange,
	orgId,
	currency,
	eventType,
	onSuccess,
}: ServiceDialogProps) {
```

New:

```ts
interface ServiceDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	ownerId: string
	ownerType: 'org' | 'user'
	currency: string
	eventType?: EventType
	onSuccess: () => void
}

function ServiceDialog({
	open,
	onOpenChange,
	ownerId,
	ownerType,
	currency,
	eventType,
	onSuccess,
}: ServiceDialogProps) {
```

- [ ] **Step 3: Conditional schema in useForm**

Add `isOrg` flag and use conditional schema:

```ts
const isOrg = ownerType === 'org'
```

Update `useForm` (line 101):

Old:

```ts
resolver: zodResolver(serviceSchema),
```

New:

```ts
resolver: zodResolver(isOrg ? orgServiceSchema : personalServiceSchema),
```

- [ ] **Step 4: Conditional reference data loading**

Old `loadReferenceData` (lines 120-134):

```ts
const loadReferenceData = useCallback(async () => {
	setLoadingData(true)
	try {
		const [positionsRes, staffRes] = await Promise.all([
			positionApi.getByOrg({ pathParams: { orgId } }),
			orgApi.getStaff({ pathParams: { id: orgId } }),
		])
		setPositions(positionsRes.data)
		setStaff(staffRes.data)
	} catch {
		// Toast вже показано інтерцептором
	} finally {
		setLoadingData(false)
	}
}, [orgId])
```

New:

```ts
const loadReferenceData = useCallback(async () => {
	if (!isOrg) return
	setLoadingData(true)
	try {
		const [positionsRes, staffRes] = await Promise.all([
			positionApi.getByOrg({ pathParams: { orgId: ownerId } }),
			orgApi.getStaff({ pathParams: { id: ownerId } }),
		])
		setPositions(positionsRes.data)
		setStaff(staffRes.data)
	} catch {
		// Toast вже показано інтерцептором
	} finally {
		setLoadingData(false)
	}
}, [ownerId, isOrg])
```

- [ ] **Step 5: Update onSubmit — conditional body**

Old create call (lines 173-188):

```ts
await eventTypeApi.create({
	body: {
		orgId,
		name: data.name,
		durationMin: data.durationMin,
		price: data.price,
		currency,
		color: data.color,
		description: data.description,
		staffPolicy: data.staffPolicy,
		assignedPositions:
			data.staffPolicy === 'by_position' ? data.assignedPositions : [],
		assignedStaff: data.staffPolicy === 'specific' ? data.assignedStaff : [],
	},
})
```

New:

```ts
const ownerField = isOrg ? { orgId: ownerId } : { userId: ownerId }
const staffFields = isOrg
	? {
			staffPolicy: (data as OrgServiceFormData).staffPolicy,
			assignedPositions:
				(data as OrgServiceFormData).staffPolicy === 'by_position'
					? (data as OrgServiceFormData).assignedPositions
					: [],
			assignedStaff:
				(data as OrgServiceFormData).staffPolicy === 'specific'
					? (data as OrgServiceFormData).assignedStaff
					: [],
		}
	: {}

await eventTypeApi.create({
	body: {
		...ownerField,
		name: data.name,
		durationMin: data.durationMin,
		price: data.price,
		currency,
		color: data.color,
		description: data.description,
		...staffFields,
	},
})
```

Similarly update the `update` call — add `staffFields` spread:

Old update body (lines 155-168):

```ts
body: {
	name: data.name,
	durationMin: data.durationMin,
	price: data.price,
	currency,
	color: data.color,
	description: data.description,
	staffPolicy: data.staffPolicy,
	assignedPositions:
		data.staffPolicy === 'by_position' ? data.assignedPositions : [],
	assignedStaff:
		data.staffPolicy === 'specific' ? data.assignedStaff : [],
},
```

New:

```ts
body: {
	name: data.name,
	durationMin: data.durationMin,
	price: data.price,
	currency,
	color: data.color,
	description: data.description,
	...staffFields,
},
```

- [ ] **Step 6: Update useEffect default values**

Old reset (lines 139-148):

```ts
reset({
	name: eventType?.name ?? '',
	durationMin: eventType?.durationMin ?? 30,
	price: eventType?.price ?? 0,
	color: eventType?.color ?? PALETTE[0],
	description: eventType?.description ?? '',
	staffPolicy: eventType?.staffPolicy ?? 'any',
	assignedPositions: eventType?.assignedPositions ?? [],
	assignedStaff: eventType?.assignedStaff ?? [],
})
```

New:

```ts
const baseDefaults = {
	name: eventType?.name ?? '',
	durationMin: eventType?.durationMin ?? 30,
	price: eventType?.price ?? 0,
	color: eventType?.color ?? PALETTE[0],
	description: eventType?.description ?? '',
}

const orgDefaults = isOrg
	? {
			staffPolicy: eventType?.staffPolicy ?? 'any',
			assignedPositions: eventType?.assignedPositions ?? [],
			assignedStaff: eventType?.assignedStaff ?? [],
		}
	: {}

reset({ ...baseDefaults, ...orgDefaults })
```

- [ ] **Step 7: Conditionally render staff policy section**

Wrap the entire staff policy section (lines 348-407) with `{isOrg && (...)}` — the `<Field>` for staffPolicy radio group, the `by_position` positions section, and the `specific` staff section:

```tsx
{
	isOrg && (
		<>
			<Field data-invalid={!!errors.staffPolicy || undefined}>
				<FieldLabel>{t('staffPolicy')}</FieldLabel>
				<Controller
					control={control}
					name="staffPolicy"
					render={({ field }) => (
						<RadioGroup
							value={field.value}
							onValueChange={field.onChange}
							className="gap-3"
						>
							<label className="flex items-center gap-2 text-sm">
								<RadioGroupItem value="any" />
								{t('staffPolicyAny')}
							</label>
							<label className="flex items-center gap-2 text-sm">
								<RadioGroupItem value="by_position" />
								{t('staffPolicyByPosition')}
							</label>
							<label className="flex items-center gap-2 text-sm">
								<RadioGroupItem value="specific" />
								{t('staffPolicySpecific')}
							</label>
						</RadioGroup>
					)}
				/>
				<FieldError errors={[errors.staffPolicy]} />
			</Field>

			{staffPolicy === 'by_position' && (
				<Field data-invalid={!!errors.assignedPositions || undefined}>
					<FieldLabel>{t('assignedPositions')}</FieldLabel>
					{positions.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							{t('selectPositions')}
						</p>
					) : (
						<div className="flex flex-wrap gap-2">
							{positions.map(renderPositionChip)}
						</div>
					)}
					<FieldError errors={[errors.assignedPositions]} />
				</Field>
			)}

			{staffPolicy === 'specific' && (
				<Field data-invalid={!!errors.assignedStaff || undefined}>
					<FieldLabel>{t('assignedStaff')}</FieldLabel>
					{staff.length === 0 ? (
						<p className="text-muted-foreground text-sm">{t('selectStaff')}</p>
					) : (
						<div className="flex flex-wrap gap-2">
							{staff.map(renderStaffChip)}
						</div>
					)}
					<FieldError errors={[errors.assignedStaff]} />
				</Field>
			)}
		</>
	)
}
```

- [ ] **Step 8: Verify no type errors**

Run: `npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 9: Commit**

```bash
git add components/services/ServiceDialog.tsx
git commit -m "refactor: ServiceDialog — поддержка personal режима без staff policy"
```

---

### Task 5: Update org services page

**Files:**

- Modify: `app/[locale]/(org)/manage/[orgId]/services/page.tsx`

- [ ] **Step 1: Add ownerType prop**

Replace the full file:

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
			<ServicesList ownerId={orgId} ownerType="org" currency="UAH" />
		</div>
	)
}
```

- [ ] **Step 2: Commit**

```bash
git add app/[locale]/(org)/manage/[orgId]/services/page.tsx
git commit -m "refactor: передать ownerType='org' в ServicesList на странице услуг организации"
```

---

### Task 6: Create personal services page

**Files:**

- Create: `app/[locale]/(personal)/my-services/page.tsx`

- [ ] **Step 1: Create page**

```tsx
'use client'

import { ServicesList } from '@/components/services/ServicesList'
import { useUser } from '@/lib/auth/user-provider'

export default function MyServicesPage() {
	const user = useUser()

	return (
		<div className="container max-w-3xl py-6">
			<ServicesList ownerId={user.id} ownerType="user" currency="UAH" />
		</div>
	)
}
```

- [ ] **Step 2: Verify page renders**

Run: `npm run dev` and navigate to `http://localhost:3000/en/my-services`

- [ ] **Step 3: Commit**

```bash
git add app/[locale]/(personal)/my-services/page.tsx
git commit -m "feat: добавить страницу личных услуг /my-services"
```

---

### Task 7: Add sidebar link

**Files:**

- Modify: `components/sidebar/PersonalSidebar.tsx`

- [ ] **Step 1: Add Settings2 import**

Old import (line 6):

```ts
import { Building2, Calendar, CalendarCog } from 'lucide-react'
```

New:

```ts
import { Building2, Calendar, CalendarCog, Settings2 } from 'lucide-react'
```

- [ ] **Step 2: Add myServicesHref**

After `myScheduleHref` (line 32), add:

```ts
const myServicesHref = buildHref('/my-services')
```

- [ ] **Step 3: Add menu item between "My Schedule Settings" and "My Organizations"**

After the `myScheduleSettings` SidebarMenuItem (line 62), add:

```tsx
<SidebarMenuItem>
	<SidebarMenuButton
		render={<Link href={myServicesHref} />}
		isActive={isActive(myServicesHref)}
	>
		<Settings2 className="size-4" />
		<span>{t('myServices')}</span>
	</SidebarMenuButton>
</SidebarMenuItem>
```

- [ ] **Step 4: Verify sidebar renders**

Run: `npm run dev` and check the personal sidebar shows the "My Services" link.

- [ ] **Step 5: Commit**

```bash
git add components/sidebar/PersonalSidebar.tsx
git commit -m "feat: добавить ссылку 'Мои услуги' в PersonalSidebar"
```

---

### Task 8: Verify everything works end-to-end

- [ ] **Step 1: Run build**

Run: `npm run build`
Expected: Build succeeds without errors.

- [ ] **Step 2: Manual verification checklist**

1. Navigate to `/en/my-services` — page loads with empty state
2. Click "Add" — dialog opens WITHOUT staff policy section
3. Create a service (name, duration, price, color) — saves successfully
4. Service appears in list WITHOUT staff policy badge
5. Edit service — dialog opens with correct data, no staff policy
6. Delete service — confirmation dialog, deletes successfully
7. Navigate to org services page — still works with staff policy section visible
8. Staff policy badge still shows on org services

- [ ] **Step 3: Final commit if any fixes needed**
