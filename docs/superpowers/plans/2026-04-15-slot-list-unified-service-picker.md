# Unified Service Picker — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the duplicate inline service picker in `SlotListView`. Keep single source of services (top `ServiceList`) with `allowedIds` filtering and `pendingSlot` state that preserves user intent when a slot is clicked without a selected service.

**Architecture:** Replace local `servicePicker` state + inline picker block with `pendingSlot` state. When user clicks a slot without a service: save `{staffId, time}`, scroll to top `ServiceList`, filter it via new `allowedIds` prop. When user picks a service that fits the staff member — auto-open the confirm sheet.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind, next-intl, shadcn/ui (sonner for toast).

---

## File Structure

- `components/booking/ServiceList.tsx` — add optional `allowedIds?: Set<string>` prop; render disabled state for services outside the set.
- `components/booking/SlotListView.tsx` — replace `servicePicker` flow with `pendingSlot` + scroll/highlight + auto-open sheet.
- `i18n/messages/uk.json`, `i18n/messages/en.json` — add `booking.noServicesForStaff` key.

All changes land in a single commit so `git revert <sha>` restores the old behavior.

---

## Task 1: i18n key for "no services for this staff"

**Files:**
- Modify: `i18n/messages/uk.json`
- Modify: `i18n/messages/en.json`

- [ ] **Step 1: Add Ukrainian key**

In `i18n/messages/uk.json`, find the `booking` block near the existing `noServicesForSlot` line and add below it:

```json
"noServicesForSlot": "Немає доступних послуг на цей час",
"noServicesForStaff": "Немає доступних послуг для цього спеціаліста",
```

(Keep `noServicesForSlot` untouched — left in place for easy rollback.)

- [ ] **Step 2: Add English key**

In `i18n/messages/en.json`, mirror the change:

```json
"noServicesForSlot": "No services fit this slot",
"noServicesForStaff": "No services available for this staff member",
```

- [ ] **Step 3: Verify JSON validity**

Run: `node -e "JSON.parse(require('fs').readFileSync('i18n/messages/uk.json','utf8')); JSON.parse(require('fs').readFileSync('i18n/messages/en.json','utf8')); console.log('ok')"`
Expected: `ok`

---

## Task 2: Add `allowedIds` prop to `ServiceList`

**Files:**
- Modify: `components/booking/ServiceList.tsx`

- [ ] **Step 1: Extend props interface**

Replace the `ServiceListProps` interface (currently lines 8-14) with:

```tsx
interface ServiceListProps {
	eventTypes: EventType[]
	selectedId: string | null
	onSelect: (eventTypeId: string) => void
	loading?: boolean
	variant?: 'vertical' | 'horizontal'
	allowedIds?: Set<string>
}
```

- [ ] **Step 2: Destructure `allowedIds` in component**

Update the `ServiceList` signature (currently lines 32-38):

```tsx
function ServiceList({
	eventTypes,
	selectedId,
	onSelect,
	loading = false,
	variant = 'vertical',
	allowedIds,
}: ServiceListProps) {
```

- [ ] **Step 3: Compute disabled state per item**

Inside `renderEventType` (first line after `const isActive = ...`), add:

```tsx
const isDisabled = allowedIds ? !allowedIds.has(eventType.id) : false
```

- [ ] **Step 4: Apply disabled to horizontal button**

Replace the horizontal `<button>` block (currently lines 48-69) with:

```tsx
return (
	<button
		key={eventType.id}
		type="button"
		onClick={handleClick}
		disabled={isDisabled}
		className={cn(
			'flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-all',
			isActive
				? 'border-primary bg-primary/10 ring-primary/30 shadow-sm ring-1'
				: 'border-border hover:bg-muted',
			isDisabled && 'cursor-not-allowed opacity-40 hover:bg-transparent',
		)}
	>
		<div
			className="size-2 shrink-0 rounded-full"
			style={{ backgroundColor: eventType.color }}
		/>
		<span className="font-medium">{eventType.name}</span>
		<span className="text-muted-foreground">
			{eventType.price} {eventType.currency}
		</span>
	</button>
)
```

- [ ] **Step 5: Apply disabled to vertical button**

Replace the vertical `<button>` block (currently lines 72-96) with:

```tsx
return (
	<button
		key={eventType.id}
		type="button"
		onClick={handleClick}
		disabled={isDisabled}
		className={cn(
			'flex items-center gap-3 rounded-lg border p-3 text-left transition-all',
			isActive
				? 'border-primary bg-primary/10 ring-primary/30 shadow-sm ring-2'
				: 'border-border hover:bg-muted',
			isDisabled && 'cursor-not-allowed opacity-40 hover:bg-transparent',
		)}
	>
		<div
			className="size-3 shrink-0 rounded-full"
			style={{ backgroundColor: eventType.color }}
		/>
		<div className="flex-1">
			<div className="text-sm font-medium">{eventType.name}</div>
			<div className="text-muted-foreground text-xs">
				{eventType.durationMin} {t('min')} · {eventType.price}{' '}
				{eventType.currency}
			</div>
		</div>
	</button>
)
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors introduced in `ServiceList.tsx`.

---

## Task 3: Replace `servicePicker` with `pendingSlot` in `SlotListView`

**Files:**
- Modify: `components/booking/SlotListView.tsx`

- [ ] **Step 1: Add imports for sonner toast and useRef**

At the top of `SlotListView.tsx`, update existing React import and add `toast`:

```tsx
import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
```

(Confirm `sonner` is already a dependency by grepping `from 'sonner'` elsewhere in the project. If not, install it via `npm install sonner` and register `<Toaster />` in the root layout — this is already the case in the existing Slotix codebase.)

- [ ] **Step 2: Replace `servicePicker` state and `getStaffMember`/`isServiceForStaff` block**

Find the block around the existing `const [servicePicker, setServicePicker] = useState<...>(null)` line and the `getStaffMember` / `isServiceForStaff` / `servicesForPicker` block. Replace it with:

```tsx
const [pendingSlot, setPendingSlot] = useState<
	{ staffId: string; time: string } | null
>(null)
const serviceListRef = useRef<HTMLDivElement>(null)
const [highlightServices, setHighlightServices] = useState(false)

const getStaffMember = (id: string): OrgStaffMember | null =>
	staff.find((member) => member.id === id) ?? null

const isServiceForStaff =
	(currentStaffId: string) =>
	(et: EventType): boolean => {
		if (et.staffPolicy === 'any') return true
		if (et.staffPolicy === 'specific')
			return et.assignedStaff.includes(currentStaffId)
		if (et.staffPolicy === 'by_position') {
			const member = getStaffMember(currentStaffId)
			if (!member || !member.positionId) return false
			return et.assignedPositions.includes(member.positionId)
		}
		return false
	}

const allowedIdsForPendingSlot: Set<string> | undefined = pendingSlot
	? new Set(
			eventTypes
				.filter(isServiceForStaff(pendingSlot.staffId))
				.map((et) => et.id),
		)
	: undefined
```

- [ ] **Step 3: Replace `handleOrgSlotSelect`**

Find the existing `handleOrgSlotSelect` function and replace it with:

```tsx
const triggerServiceListHighlight = () => {
	setHighlightServices(true)
	setTimeout(() => setHighlightServices(false), 1500)
}

const handleOrgSlotSelect = (staffMemberId: string, time: string) => {
	if (selectedEventTypeId) {
		setSelectedSlot(time)
		setSelectedStaffId(staffMemberId)
		setSheetOpen(true)
		return
	}

	const allowed = eventTypes.filter(isServiceForStaff(staffMemberId))
	if (allowed.length === 0) {
		toast.error(t('noServicesForStaff'))
		return
	}

	setPendingSlot({ staffId: staffMemberId, time })
	serviceListRef.current?.scrollIntoView({
		behavior: 'smooth',
		block: 'start',
	})
	triggerServiceListHighlight()
}
```

- [ ] **Step 4: Replace `handleServicePick` with wrapped `onEventTypeSelect`**

Find and delete the existing `handleServicePick` and `handleServicePickerCancel` functions. Add a wrapper for the service-select callback:

```tsx
const handleEventTypeSelectWrapped = (serviceId: string) => {
	onEventTypeSelect(serviceId)

	if (!pendingSlot) return
	if (allowedIdsForPendingSlot && !allowedIdsForPendingSlot.has(serviceId))
		return

	setSelectedSlot(pendingSlot.time)
	setSelectedStaffId(pendingSlot.staffId)
	setSheetOpen(true)
	setPendingSlot(null)
}
```

- [ ] **Step 5: Delete `renderPickableService` and `servicesForPicker`**

Delete the `renderPickableService` arrow function and anything only it referenced (`servicesForPicker` was removed in Step 2).

- [ ] **Step 6: Wrap `ServiceList` with ref + highlight and pass `allowedIds`**

Find the existing top `<ServiceList ... variant="horizontal" />` usage. Replace it with:

```tsx
<div
	ref={serviceListRef}
	className={cn(
		'rounded-lg transition-all',
		highlightServices && 'ring-primary/40 ring-2 ring-offset-2',
	)}
>
	<ServiceList
		eventTypes={eventTypes}
		selectedId={selectedEventTypeId}
		onSelect={handleEventTypeSelectWrapped}
		loading={loading}
		variant="horizontal"
		allowedIds={allowedIdsForPendingSlot}
	/>
</div>
```

If `cn` is not yet imported in this file, add: `import { cn } from '@/lib/utils'` near the other imports.

- [ ] **Step 7: Delete the inline "Оберіть послугу:" picker block**

Locate the `{variant === 'org' && (` section that contains:

```tsx
{servicePicker && (
	<div className="rounded-lg border p-3">
		<div className="text-muted-foreground mb-2 text-xs font-semibold">
			{t('pickServiceTitle')}
		</div>
		...
	</div>
)}
```

Delete the entire `{servicePicker && (...)}` block (including the cancel button inside). Keep the surrounding `variant === 'org' &&` wrapper and the sibling org staff list rendering.

- [ ] **Step 8: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 9: Lint**

Run: `npx eslint components/booking/SlotListView.tsx components/booking/ServiceList.tsx`
Expected: no errors.

---

## Task 4: Manual verification

**Files:** none

- [ ] **Step 1: Start dev server**

Run: `npm run dev`
Expected: server on `localhost:3000`.

- [ ] **Step 2: Open org booking page in list view**

Navigate to an org public booking URL with `?view=list`. Open a date.

- [ ] **Step 3: Scenario A — click slot without service**

- Ensure no service is selected at the top.
- Click any free slot for a staff member.
- Expected: page scrolls to the top `ServiceList`; it briefly shows a blue ring; services not fitting this staff member are dimmed (`opacity-40`, `cursor-not-allowed`); the inline "Оберіть послугу:" block does NOT render.

- [ ] **Step 4: Scenario B — pick a service from top list**

- In the same state as A, click an enabled service chip.
- Expected: confirmation sheet opens with the previously clicked slot and staff member.

- [ ] **Step 5: Scenario C — service already selected, click slot**

- Pick a service first, then click a slot.
- Expected: sheet opens immediately (regression guard).

- [ ] **Step 6: Scenario D — staff with no matching services**

- Temporarily configure an org where a staff member has no services matching their `staffPolicy` resolution.
- Click any slot for that staff member.
- Expected: toast `Немає доступних послуг для цього спеціаліста`; sheet does not open; `pendingSlot` stays `null`.

- [ ] **Step 7: Scenario E — personal variant unchanged**

- Open a personal (solo) booking URL.
- Click a slot after selecting a service.
- Expected: works exactly as before.

---

## Task 5: Commit

**Files:** all changes from Tasks 1-3.

- [ ] **Step 1: Stage everything**

```bash
git add components/booking/ServiceList.tsx \
	components/booking/SlotListView.tsx \
	i18n/messages/uk.json \
	i18n/messages/en.json
```

- [ ] **Step 2: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(booking): unify service picker in SlotListView

Replace the duplicate inline service picker with pendingSlot state that
preserves the user's slot click, then auto-opens the confirm sheet once a
compatible service is chosen from the top ServiceList. Services that do not
match the clicked staff member are dimmed via new allowedIds prop.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3: Verify clean working tree**

Run: `git status`
Expected: `nothing to commit, working tree clean`.

---

## Rollback

Single commit. To revert:

```bash
git revert <sha>
```
