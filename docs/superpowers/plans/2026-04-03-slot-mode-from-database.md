# Slot Mode — из базы данных Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Переместить SlotModeSelector из сайдбара календаря в Sheet "Налаштування розкладу", сохранять slotMode в базу через API, читать из schedule вместо URL.

**Architecture:** Убираем slotMode из URL search params и props стратегий. Стратегии читают slotMode из schedule.slotMode. ScheduleSheetButton получает SlotModeSelector с instant-save. Клиентский вид не показывает и не передаёт slotMode.

**Tech Stack:** React, Next.js App Router, TypeScript, next-intl

---

### Task 1: Добавить SlotModeSelector в ScheduleSheetButton

**Files:**

- Modify: `components/booking/ScheduleSheetButton.tsx`

- [ ] **Step 1: Добавить props для slotMode save**

В `ScheduleSheetButtonProps` добавить:

```tsx
interface ScheduleSheetButtonProps {
	schedule: ScheduleTemplate
	onSaveSchedule: (weeklyHours: WeeklyHours[]) => Promise<void>
	onSaveOverride: (body: CreateScheduleOverrideBody) => Promise<void>
	onSaveSlotMode: (mode: SlotMode) => Promise<void>
}
```

- [ ] **Step 2: Добавить saving state и handler**

Внутри `ScheduleSheetButton` добавить:

```tsx
const [savingMode, setSavingMode] = useState(false)

const handleSlotModeChange = async (mode: SlotMode) => {
	setSavingMode(true)
	try {
		await onSaveSlotMode(mode)
	} finally {
		setSavingMode(false)
	}
}
```

- [ ] **Step 3: Добавить SlotModeSelector в Sheet между ScheduleEditor и ScheduleOverrideForm**

Импортировать SlotModeSelector и добавить в JSX:

```tsx
import { SlotModeSelector } from './SlotModeSelector'
import type { SlotMode } from '@/lib/slot-engine'
```

Между `<ScheduleEditor>` и `<Separator />` перед `<ScheduleOverrideForm>`:

```tsx
<ScheduleEditor schedule={schedule} onSave={handleSaveSchedule} />
<Separator />
<div className={savingMode ? 'pointer-events-none opacity-50' : ''}>
	<SlotModeSelector
		value={schedule.slotMode}
		onChange={handleSlotModeChange}
	/>
</div>
<Separator />
<ScheduleOverrideForm
	staffId={schedule.staffId}
	orgId={schedule.orgId ?? undefined}
	onSave={handleSaveOverride}
/>
```

- [ ] **Step 4: Проверить что компонент компилируется**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 5: Commit**

```bash
git add components/booking/ScheduleSheetButton.tsx
git commit -m "feat: добавить SlotModeSelector в ScheduleSheetButton с instant-save"
```

---

### Task 2: Прокинуть onSaveSlotMode в BookingPage (личный кабинет)

**Files:**

- Modify: `app/[locale]/book/[staffSlug]/BookingPage.tsx`

- [ ] **Step 1: Добавить handler для сохранения slotMode**

Рядом с `handleSaveSchedule` добавить:

```tsx
const handleSaveSlotMode = async (mode: SlotMode) => {
	if (!staff) return
	const scheduleSource = staffScheduleData.schedule ?? DEFAULT_SCHEDULE
	await scheduleApi.updateTemplate(
		staff.id,
		null,
		scheduleSource.weeklyHours,
		mode,
	)
	staffScheduleData.reloadSchedule()
}
```

- [ ] **Step 2: Передать onSaveSlotMode в createStaffStrategy**

В вызове `createStaffStrategy({...})` добавить:

```tsx
onSaveSlotMode: handleSaveSlotMode,
```

- [ ] **Step 3: Commit**

```bash
git add app/[locale]/book/[staffSlug]/BookingPage.tsx
git commit -m "feat: прокинуть onSaveSlotMode в BookingPage"
```

---

### Task 3: Прокинуть onSaveSlotMode в OrgCalendarPage

**Files:**

- Modify: `components/booking/OrgCalendarPage.tsx`

- [ ] **Step 1: Добавить handler для сохранения slotMode**

Рядом с существующими handlers добавить:

```tsx
const handleSaveSlotMode = async (mode: SlotMode) => {
	if (!activeStaffId) return
	const staffSchedule = orgSchedules.getStaffSchedule(activeStaffId)
	if (!staffSchedule) return
	await scheduleApi.updateTemplate(
		activeStaffId,
		orgSlug,
		staffSchedule.weeklyHours,
		mode,
	)
	orgSchedules.reloadSchedules()
}
```

- [ ] **Step 2: Передать onSaveSlotMode в createOrgStrategy**

В вызове `createOrgStrategy({...})` добавить:

```tsx
onSaveSlotMode: handleSaveSlotMode,
```

- [ ] **Step 3: Commit**

```bash
git add components/booking/OrgCalendarPage.tsx
git commit -m "feat: прокинуть onSaveSlotMode в OrgCalendarPage"
```

---

### Task 4: Принять onSaveSlotMode в createStaffStrategy и передать в ScheduleSheetButton

**Files:**

- Modify: `lib/calendar/strategies/createStaffStrategy.tsx`

- [ ] **Step 1: Добавить onSaveSlotMode в StaffStrategyParams**

```tsx
interface StaffStrategyParams {
	// ... existing props ...
	onSaveSlotMode: (mode: SlotMode) => Promise<void>
}
```

- [ ] **Step 2: Деструктурировать в createStaffStrategy**

В деструктуризации `params` добавить:

```tsx
onSaveSlotMode,
```

- [ ] **Step 3: Передать в ScheduleSheetButton**

В `renderSidebar()` изменить `<ScheduleSheetButton>`:

```tsx
<ScheduleSheetButton
	schedule={schedule}
	onSaveSchedule={onSaveSchedule}
	onSaveOverride={onSaveOverride}
	onSaveSlotMode={onSaveSlotMode}
/>
```

- [ ] **Step 4: Commit**

```bash
git add lib/calendar/strategies/createStaffStrategy.tsx
git commit -m "feat: прокинуть onSaveSlotMode через createStaffStrategy"
```

---

### Task 5: Принять onSaveSlotMode в createOrgStrategy и добавить ScheduleSheetButton

**Files:**

- Modify: `lib/calendar/strategies/createOrgStrategy.tsx`

- [ ] **Step 1: Добавить в OrgStrategyParams**

```tsx
interface OrgStrategyParams {
	// ... existing ...
	onSaveSlotMode?: (mode: SlotMode) => Promise<void>
	onSaveSchedule?: (weeklyHours: WeeklyHours[]) => Promise<void>
	onSaveOverride?: (body: CreateScheduleOverrideBody) => Promise<void>
}
```

Если `onSaveSchedule` и `onSaveOverride` уже есть — пропустить, добавить только `onSaveSlotMode`.

- [ ] **Step 2: Деструктурировать и добавить ScheduleSheetButton в renderSidebar**

В `renderSidebar()`, после `<ServiceList>`, если `onSaveSlotMode` передан:

```tsx
{
	onSaveSchedule && onSaveOverride && onSaveSlotMode && schedule && (
		<>
			<Separator className="my-4" />
			<ScheduleSheetButton
				schedule={schedule}
				onSaveSchedule={onSaveSchedule}
				onSaveOverride={onSaveOverride}
				onSaveSlotMode={onSaveSlotMode}
			/>
		</>
	)
}
```

- [ ] **Step 3: Импортировать ScheduleSheetButton**

```tsx
import { ScheduleSheetButton } from '@/components/booking/ScheduleSheetButton'
```

- [ ] **Step 4: Commit**

```bash
git add lib/calendar/strategies/createOrgStrategy.tsx
git commit -m "feat: прокинуть onSaveSlotMode через createOrgStrategy"
```

---

### Task 6: Убрать SlotModeSelector из сайдбаров всех стратегий

**Files:**

- Modify: `lib/calendar/strategies/createStaffStrategy.tsx`
- Modify: `lib/calendar/strategies/createOrgStrategy.tsx`
- Modify: `lib/calendar/strategies/createClientStrategy.tsx`

- [ ] **Step 1: createStaffStrategy — убрать из renderSidebar**

В `renderSidebar()` удалить:

```tsx
<Separator className="my-4" />
<SlotModeSelector value={slotMode} onChange={onModeChange} />
```

Убрать импорт `SlotModeSelector`.

- [ ] **Step 2: createOrgStrategy — убрать из renderSidebar**

В `renderSidebar()` удалить:

```tsx
<Separator className="my-4" />
<SlotModeSelector
	value={slotMode}
	onChange={onModeChange ?? (() => {})}
/>
```

Убрать импорт `SlotModeSelector`.

- [ ] **Step 3: createClientStrategy — убрать из renderSidebar**

В `renderSidebar()` удалить:

```tsx
<Separator className="my-4" />
<SlotModeSelector value={slotMode} onChange={onModeChange} />
```

Убрать импорт `SlotModeSelector`.

- [ ] **Step 4: Commit**

```bash
git add lib/calendar/strategies/createStaffStrategy.tsx lib/calendar/strategies/createOrgStrategy.tsx lib/calendar/strategies/createClientStrategy.tsx
git commit -m "refactor: убрать SlotModeSelector из сайдбаров стратегий"
```

---

### Task 7: Убрать slotMode и onModeChange из props стратегий

**Files:**

- Modify: `lib/calendar/strategies/createStaffStrategy.tsx`
- Modify: `lib/calendar/strategies/createOrgStrategy.tsx`
- Modify: `lib/calendar/strategies/createClientStrategy.tsx`

- [ ] **Step 1: createStaffStrategy — убрать из interface и деструктуризации**

В `StaffStrategyParams` удалить:

```tsx
slotMode: SlotMode
onModeChange: (mode: SlotMode) => void
```

В деструктуризации удалить `slotMode` и `onModeChange`.

Заменить все оставшиеся использования `slotMode` на `schedule.slotMode`.

В `getBlocks()` найти где `slotMode` используется и заменить на `schedule.slotMode`.

В `renderPanel()` — `slotMode={slotMode}` заменить на `slotMode={schedule.slotMode}` (временно, будет удалено в Task 8).

- [ ] **Step 2: createOrgStrategy — убрать из interface и деструктуризации**

В `OrgStrategyParams` удалить:

```tsx
slotMode?: SlotMode
onModeChange?: (mode: SlotMode) => void
```

В деструктуризации удалить `slotMode = 'fixed'` и `onModeChange`.

Заменить `slotMode` → `schedule?.slotMode ?? 'fixed'` где используется.

- [ ] **Step 3: createClientStrategy — убрать из interface и деструктуризации**

В `ClientStrategyParams` удалить:

```tsx
slotMode: SlotMode
onModeChange: (mode: SlotMode) => void
```

В деструктуризации удалить `slotMode` и `onModeChange`.

Заменить `slotMode` → `schedule.slotMode` где используется.

- [ ] **Step 4: Commit**

```bash
git add lib/calendar/strategies/createStaffStrategy.tsx lib/calendar/strategies/createOrgStrategy.tsx lib/calendar/strategies/createClientStrategy.tsx
git commit -m "refactor: убрать slotMode/onModeChange из props стратегий, читать из schedule"
```

---

### Task 8: Убрать slotMode prop из BookingPanel, StaffBookingPanel, BookingPanelParts

**Files:**

- Modify: `components/booking/BookingPanelParts.tsx`
- Modify: `components/booking/BookingPanel.tsx`
- Modify: `components/booking/StaffBookingPanel.tsx`

- [ ] **Step 1: BookingPanelParts — убрать slotMode из ServiceInfo**

В `ServiceInfo` убрать prop `slotMode`:

```tsx
function ServiceInfo({ eventType }: { eventType: EventType }) {
	const t = useTranslations('booking')
	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center gap-2">
				<div
					className="size-3 rounded-full"
					style={{ backgroundColor: eventType.color }}
				/>
				<span className="text-sm font-semibold">{eventType.name}</span>
			</div>
			<div className="text-muted-foreground text-xs">
				{eventType.durationMin} {t('min')} · {eventType.price}{' '}
				{eventType.currency}
			</div>
			<Separator />
			<p className="text-muted-foreground text-xs">{t('clickDashedZone')}</p>
		</div>
	)
}
```

Убрать импорт `SlotMode` из файла.

- [ ] **Step 2: BookingPanel — убрать slotMode prop**

В `BookingPanelProps` удалить `slotMode: SlotMode`.

В деструктуризации убрать `slotMode`.

В `<ServiceInfo>` убрать `slotMode={slotMode}`:

```tsx
return <ServiceInfo eventType={selectedEventType} />
```

Убрать импорт `SlotMode`.

- [ ] **Step 3: StaffBookingPanel — убрать slotMode prop**

В `StaffBookingPanelProps` удалить `slotMode: SlotMode`.

В деструктуризации убрать `slotMode`.

В `<ServiceInfo>` убрать `slotMode={slotMode}`:

```tsx
return <ServiceInfo eventType={selectedEventType} />
```

Убрать неиспользуемый импорт `SlotMode`.

- [ ] **Step 4: Обновить вызовы в стратегиях**

В `createStaffStrategy.tsx` → `renderPanel()` убрать `slotMode={...}` из `<StaffBookingPanel>`.

В `createOrgStrategy.tsx` → `renderPanel()` убрать `slotMode={...}` из `<StaffBookingPanel>`.

В `createClientStrategy.tsx` → `renderPanel()` убрать `slotMode={...}` из `<BookingPanel>`.

- [ ] **Step 5: Commit**

```bash
git add components/booking/BookingPanelParts.tsx components/booking/BookingPanel.tsx components/booking/StaffBookingPanel.tsx lib/calendar/strategies/createStaffStrategy.tsx lib/calendar/strategies/createOrgStrategy.tsx lib/calendar/strategies/createClientStrategy.tsx
git commit -m "refactor: убрать slotMode prop из BookingPanel, StaffBookingPanel, ServiceInfo"
```

---

### Task 9: Убрать slotMode из URL search params

**Files:**

- Modify: `app/[locale]/book/[staffSlug]/BookingPage.tsx`
- Modify: `components/booking/OrgCalendarPage.tsx`
- Modify: `lib/calendar/hooks/useCalendarNavigation.ts`

- [ ] **Step 1: BookingPage — убрать slotMode из URL**

Удалить строку:

```tsx
const slotMode = (searchParams.get('mode') as SlotMode) ?? 'fixed'
```

Убрать `slotMode` из вызовов `createStaffStrategy()` и `createClientStrategy()`.

Убрать `onModeChange` из вызовов стратегий.

Удалить функцию `onModeChange`:

```tsx
const onModeChange = (mode: SlotMode) => {
	navigation.handleModeChange(mode)
	resetBookingState()
}
```

Убрать неиспользуемый импорт `SlotMode` если больше не нужен (проверить — может использоваться в `handleSaveSlotMode`).

- [ ] **Step 2: OrgCalendarPage — убрать slotMode из URL**

Удалить строку:

```tsx
const slotMode = (searchParams.get('mode') as SlotMode) ?? 'fixed'
```

Убрать `slotMode` из вызова `createOrgStrategy()`.

Убрать `onModeChange` из вызова `createOrgStrategy()`.

Удалить/упростить функцию `onModeChange`.

- [ ] **Step 3: useCalendarNavigation — убрать handleModeChange**

В `useCalendarNavigation.ts` удалить:

```tsx
const handleModeChange = (mode: SlotMode) => {
	setParams({ mode, slot: null })
}
```

Убрать из return объекта и из `UseCalendarNavigationResult` интерфейса.

Убрать импорт `SlotMode` если не используется больше.

- [ ] **Step 4: Commit**

```bash
git add app/[locale]/book/[staffSlug]/BookingPage.tsx components/booking/OrgCalendarPage.tsx lib/calendar/hooks/useCalendarNavigation.ts
git commit -m "refactor: убрать slotMode из URL search params и navigation"
```

---

### Task 10: Убрать передачу slotMode в slotsApi для клиентского вида

**Files:**

- Modify: `lib/calendar/strategies/createClientStrategy.tsx`

- [ ] **Step 1: Найти вызов slotsApi в клиентской стратегии**

В `onCellClick` или `getBlocks` найти где вызывается `slotsApi.getAvailable()` с `slotMode` параметром и убрать его — бэкенд сам берёт из расписания.

Если `slotMode` передаётся через `getAvailableSlots()` в `BookingPage.tsx` — убрать оттуда тоже.

- [ ] **Step 2: Проверить все вызовы slotsApi**

Run: `grep -rn "slotsApi\|getAvailableSlots" lib/ app/ components/ --include="*.ts" --include="*.tsx" | head -20`

Убрать `slotMode` параметр из всех вызовов `slotsApi.getAvailable()` в клиентском контексте.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: убрать slotMode из slotsApi в клиентском виде"
```

---

### Task 11: Проверить компиляцию и финальная очистка

**Files:**

- Possibly: any files with leftover unused imports

- [ ] **Step 1: Проверить TypeScript компиляцию**

Run: `npx tsc --noEmit --pretty 2>&1 | head -50`

Исправить все ошибки типов.

- [ ] **Step 2: Проверить ESLint**

Run: `npm run lint 2>&1 | head -50`

Исправить все предупреждения об unused imports/variables.

- [ ] **Step 3: Проверить билд**

Run: `npm run build 2>&1 | tail -20`

- [ ] **Step 4: Финальный commit если были исправления**

```bash
git add -A
git commit -m "fix: исправить ошибки типов и unused imports после рефакторинга slotMode"
```
