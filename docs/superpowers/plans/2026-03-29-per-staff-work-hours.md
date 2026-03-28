# Per-Staff Work Hours Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Каждый сотрудник организации имеет собственное расписание; календарь показывает объединённые часы в общем виде и индивидуальные при выборе сотрудника.

**Architecture:** Новый batch-endpoint на бэкенде возвращает все расписания организации одним запросом. Фронтенд-хук `useOrgSchedules` вычисляет объединённые/индивидуальные рабочие часы и фильтрует сотрудников по рабочему дню. OrgCalendarPage использует этот хук вместо `useStaffSchedule` для определения workStart/workEnd.

**Tech Stack:** Express.js + Mongoose (бэкенд), React hooks + Next.js (фронтенд)

---

## File Structure

### New files:
- `BackendTemplate/src/controllers/scheduleController.js` — добавить `handleGetTemplatesByOrg`
- `Slotix-fronted/lib/calendar/hooks/useOrgSchedules.ts` — хук batch-загрузки расписаний

### Modified files:
- `BackendTemplate/src/repository/scheduleTemplateRepository.js` — добавить `findActiveTemplatesByOrg`
- `BackendTemplate/src/services/scheduleServices.js` — добавить `getActiveTemplatesByOrg`
- `BackendTemplate/src/routes/subroutes/scheduleRoutes.js` — добавить route
- `Slotix-fronted/lib/booking-api-client.ts` — добавить `scheduleApi.getByOrg`
- `Slotix-fronted/lib/calendar/hooks/index.ts` — экспорт `useOrgSchedules`
- `Slotix-fronted/components/booking/OrgCalendarPage.tsx` — интеграция `useOrgSchedules`

---

### Task 1: Backend — Repository метод для batch-загрузки расписаний

**Files:**
- Modify: `BackendTemplate/src/repository/scheduleTemplateRepository.js`
- Modify: `BackendTemplate/src/repository/membershipRepository.js`

- [ ] **Step 1: Добавить `findActiveTemplatesByOrg` в scheduleTemplateRepository**

```javascript
// В конец файла, перед module.exports

const findActiveTemplatesByOrg = async (orgId, date) => {
	const memberships = await getActiveMembersByOrg(orgId)
	const userIds = memberships.map((m) => m.userId)

	const templates = await ScheduleTemplate.find({
		staffId: { $in: userIds },
		orgId: orgId,
		validFrom: { $lte: date },
		$or: [{ validTo: null }, { validTo: { $gte: date } }],
	}).lean()

	return templates.map(toScheduleTemplateDto)
}
```

Импорт вверху файла:
```javascript
const { getActiveMembersByOrg } = require('./membershipRepository')
```

Добавить в `module.exports`:
```javascript
module.exports = {
	// ... existing exports
	findActiveTemplatesByOrg,
}
```

- [ ] **Step 2: Проверить что бэкенд стартует без ошибок**

Run: `cd /Users/egorzozula/Desktop/BackendTemplate && node -e "require('./src/repository/scheduleTemplateRepository')"`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
git add src/repository/scheduleTemplateRepository.js
git commit -m "feat(schedule): добавить batch-загрузку расписаний по orgId"
```

---

### Task 2: Backend — Service + Controller + Route

**Files:**
- Modify: `BackendTemplate/src/services/scheduleServices.js`
- Modify: `BackendTemplate/src/controllers/scheduleController.js`
- Modify: `BackendTemplate/src/routes/subroutes/scheduleRoutes.js`

- [ ] **Step 1: Добавить сервис `getActiveTemplatesByOrg`**

В `scheduleServices.js`:
```javascript
const { findActiveTemplatesByOrg } = require('../repository/scheduleTemplateRepository')

const getActiveTemplatesByOrg = async (orgId) => {
	const today = new Date()
	today.setHours(0, 0, 0, 0)
	return findActiveTemplatesByOrg(orgId, today)
}

module.exports = {
	// ... existing exports
	getActiveTemplatesByOrg,
}
```

- [ ] **Step 2: Добавить handler `handleGetTemplatesByOrg`**

В `scheduleController.js`:
```javascript
const { getActiveTemplatesByOrg } = require('../services/scheduleServices')

const handleGetTemplatesByOrg = async (req, res) => {
	try {
		const { orgId } = req.params
		if (!isValidObjectId(orgId)) {
			return httpResponseError(res, { message: 'Invalid orgId' })
		}
		const templates = await getActiveTemplatesByOrg(orgId)
		return httpResponse(res, generalStatus.SUCCESS, templates)
	} catch (error) {
		return httpResponseError(res, error)
	}
}

module.exports = {
	// ... existing exports
	handleGetTemplatesByOrg,
}
```

- [ ] **Step 3: Добавить route**

В `scheduleRoutes.js`:
```javascript
const { handleGetTemplatesByOrg } = require('../../controllers/scheduleController')

// Добавить перед существующими routes
router.get('/templates/by-org/:orgId', handleGetTemplatesByOrg)
```

- [ ] **Step 4: Проверить endpoint**

Run: `curl http://localhost:4000/schedule/templates/by-org/69c5364f7a84add67bb68cfa`
Expected: JSON массив (может быть пустой `[]` если расписаний ещё нет)

- [ ] **Step 5: Commit**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
git add src/services/scheduleServices.js src/controllers/scheduleController.js src/routes/subroutes/scheduleRoutes.js
git commit -m "feat(schedule): endpoint GET /schedule/templates/by-org/:orgId"
```

---

### Task 3: Тестовые данные — создать расписания в БД

**Files:** Нет (работа с БД)

- [ ] **Step 1: Создать расписания для 4 сотрудников**

```bash
mongosh --quiet --eval '
db = db.getSiblingDB("myDatabase");
const orgId = ObjectId("69c5364f7a84add67bb68cfa");
const today = new Date(); today.setHours(0,0,0,0);

const DAYS = ["sun","mon","tue","wed","thu","fri","sat"];

const makeWeekly = (enabledDays, start, end) =>
  DAYS.map((day, i) => ({
    day,
    enabled: enabledDays.includes(i),
    slots: enabledDays.includes(i) ? [{ start, end }] : []
  }));

const schedules = [
  { staffId: ObjectId("69c5364f7a84add67bb68d0f"), weeklyHours: makeWeekly([1,2,3,4,5], "08:00", "16:00") },
  { staffId: ObjectId("69c5364f7a84add67bb68d10"), weeklyHours: makeWeekly([1,2,3,4,5,6], "10:00", "18:00") },
  { staffId: ObjectId("69c5364f7a84add67bb68d11"), weeklyHours: makeWeekly([2,3,4,5,6], "12:00", "20:00") },
  { staffId: ObjectId("69c5399056d566f4e78ce23d"), weeklyHours: makeWeekly([1,2,3,4,5], "09:00", "17:00") },
];

schedules.forEach(s => {
  db.scheduletemplates.deleteMany({ staffId: s.staffId, orgId });
  db.scheduletemplates.insertOne({
    staffId: s.staffId,
    orgId,
    locationId: null,
    validFrom: today,
    validTo: null,
    timezone: "Europe/Kyiv",
    slotMode: "fixed",
    slotStepMin: 30,
    weeklyHours: s.weeklyHours,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
});

print("Created " + db.scheduletemplates.countDocuments({ orgId }) + " schedules");
'
```

Expected: `Created 4 schedules`

- [ ] **Step 2: Проверить endpoint с данными**

Run: `curl -s http://localhost:4000/schedule/templates/by-org/69c5364f7a84add67bb68cfa | node -e "process.stdin.on('data',d=>{const r=JSON.parse(d);console.log(r.data?.length+' templates')})"`
Expected: `4 templates`

- [ ] **Step 3: Commit** — нет, тестовые данные не коммитятся

---

### Task 4: Frontend — API-клиент для batch-загрузки

**Files:**
- Modify: `Slotix-fronted/lib/booking-api-client.ts`

- [ ] **Step 1: Добавить `getSchedulesByOrg` в booking-api-client**

```typescript
// Рядом с существующим getScheduleTemplate

const getSchedulesByOrg = async (orgId: string): Promise<ScheduleTemplate[]> => {
	const raw = await get<BackendScheduleTemplate[]>(
		`/schedule/templates/by-org/${orgId}`,
	)
	return raw.map(toFrontendSchedule)
}
```

Добавить в `scheduleApi`:
```typescript
export const scheduleApi = {
	getTemplate: getScheduleTemplate,
	getByOrg: getSchedulesByOrg,
	updateTemplate: updateScheduleTemplate,
	createOverride: createScheduleOverride,
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
git add lib/booking-api-client.ts
git commit -m "feat(schedule): API метод scheduleApi.getByOrg для batch-загрузки расписаний"
```

---

### Task 5: Frontend — хук `useOrgSchedules`

**Files:**
- Create: `Slotix-fronted/lib/calendar/hooks/useOrgSchedules.ts`
- Modify: `Slotix-fronted/lib/calendar/hooks/index.ts`

- [ ] **Step 1: Создать useOrgSchedules**

```typescript
'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { scheduleApi } from '@/lib/booking-api-client'
import type { ScheduleTemplate, WeeklyHours } from '@/services/configs/booking.types'
import type { OrgStaffMember } from '@/services/configs/booking.types'

interface UseOrgSchedulesResult {
	getStaffSchedule: (staffId: string) => ScheduleTemplate | null
	getOrgWorkHours: (dateStr: string) => { workStart: string; workEnd: string } | null
	getWorkingStaff: (dateStr: string, allStaff: OrgStaffMember[]) => OrgStaffMember[]
	getDisabledDays: (staffId: string | null) => number[]
	schedules: ScheduleTemplate[]
	loading: boolean
	error: string | null
}

// Получить dayOfWeek (0-6) из строки даты
const getDayOfWeek = (dateStr: string): number => new Date(dateStr).getDay()

// Проверить, работает ли сотрудник в этот день
const isDayEnabled = (weeklyHours: WeeklyHours[], dayOfWeek: number): boolean => {
	const day = weeklyHours.find((d) => d.dayOfWeek === dayOfWeek)
	return Boolean(day && day.enabled && day.slots.length > 0)
}

// Получить рабочие часы за день из расписания
const getDaySlots = (weeklyHours: WeeklyHours[], dayOfWeek: number): { start: string; end: string }[] => {
	const day = weeklyHours.find((d) => d.dayOfWeek === dayOfWeek)
	if (!day || !day.enabled) return []
	return day.slots
}

// Найти самое раннее начало среди всех слотов
const findEarliestStart = (allSlots: { start: string }[]): string =>
	allSlots.reduce((min, slot) => (slot.start < min ? slot.start : min), allSlots[0].start)

// Найти самое позднее окончание среди всех слотов
const findLatestEnd = (allSlots: { end: string }[]): string =>
	allSlots.reduce((max, slot) => (slot.end > max ? slot.end : max), allSlots[0].end)

const useOrgSchedules = (orgId: string): UseOrgSchedulesResult => {
	const [schedules, setSchedules] = useState<ScheduleTemplate[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const loadedOrgIdRef = useRef<string | null>(null)
	const hasLoadedRef = useRef(false)

	useEffect(() => {
		if (!orgId) return
		if (loadedOrgIdRef.current === orgId) return

		const loadSchedules = async () => {
			if (!hasLoadedRef.current) setLoading(true)
			setError(null)

			try {
				const data = await scheduleApi.getByOrg(orgId)
				setSchedules(data)
				loadedOrgIdRef.current = orgId
				hasLoadedRef.current = true
			} catch (err) {
				const message = err instanceof Error ? err.message : 'Failed to load schedules'
				setError(message)
			} finally {
				setLoading(false)
			}
		}

		loadSchedules()
	}, [orgId])

	// Расписание конкретного сотрудника
	const getStaffSchedule = useCallback(
		(staffId: string): ScheduleTemplate | null => {
			const matchesStaff = (s: ScheduleTemplate): boolean => s.staffId === staffId
			return schedules.find(matchesStaff) ?? null
		},
		[schedules],
	)

	// Объединённые рабочие часы на дату (min start, max end)
	const getOrgWorkHours = useCallback(
		(dateStr: string): { workStart: string; workEnd: string } | null => {
			const dayOfWeek = getDayOfWeek(dateStr)

			const collectSlots = (acc: { start: string; end: string }[], schedule: ScheduleTemplate) => {
				const slots = getDaySlots(schedule.weeklyHours, dayOfWeek)
				return [...acc, ...slots]
			}
			const allSlots = schedules.reduce(collectSlots, [])

			if (allSlots.length === 0) return null

			return {
				workStart: findEarliestStart(allSlots),
				workEnd: findLatestEnd(allSlots),
			}
		},
		[schedules],
	)

	// Сотрудники, которые работают в конкретный день
	const getWorkingStaff = useCallback(
		(dateStr: string, allStaff: OrgStaffMember[]): OrgStaffMember[] => {
			const dayOfWeek = getDayOfWeek(dateStr)
			const hasScheduleForDay = (staff: OrgStaffMember): boolean => {
				const schedule = schedules.find((s) => s.staffId === staff.id)
				if (!schedule) return false
				return isDayEnabled(schedule.weeklyHours, dayOfWeek)
			}
			return allStaff.filter(hasScheduleForDay)
		},
		[schedules],
	)

	// Выходные дни (для мини-календаря)
	const getDisabledDays = useCallback(
		(staffId: string | null): number[] => {
			if (staffId) {
				// Выходные конкретного сотрудника
				const schedule = schedules.find((s) => s.staffId === staffId)
				if (!schedule) return []
				const isDisabled = (wh: WeeklyHours): boolean => !wh.enabled
				const toDayOfWeek = (wh: WeeklyHours): number => wh.dayOfWeek
				return schedule.weeklyHours.filter(isDisabled).map(toDayOfWeek)
			}

			// Дни когда НИКТО не работает
			const allDays = [0, 1, 2, 3, 4, 5, 6]
			const noOneWorks = (dayOfWeek: number): boolean =>
				!schedules.some((s) => isDayEnabled(s.weeklyHours, dayOfWeek))
			return allDays.filter(noOneWorks)
		},
		[schedules],
	)

	return {
		getStaffSchedule,
		getOrgWorkHours,
		getWorkingStaff,
		getDisabledDays,
		schedules,
		loading,
		error,
	}
}

export type { UseOrgSchedulesResult }
export { useOrgSchedules }
```

- [ ] **Step 2: Добавить экспорт в index.ts**

В `lib/calendar/hooks/index.ts` добавить:
```typescript
export { useOrgSchedules } from './useOrgSchedules'
export type { UseOrgSchedulesResult } from './useOrgSchedules'
```

- [ ] **Step 3: Commit**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
git add lib/calendar/hooks/useOrgSchedules.ts lib/calendar/hooks/index.ts
git commit -m "feat(schedule): хук useOrgSchedules для batch-загрузки расписаний организации"
```

---

### Task 6: Frontend — Интеграция в OrgCalendarPage

**Files:**
- Modify: `Slotix-fronted/components/booking/OrgCalendarPage.tsx`

- [ ] **Step 1: Добавить import**

```typescript
import {
	useOrgInfo,
	useOrgFiltering,
	useOrgSchedules,
	useStaffSchedule,
	useStaffBookings,
	useCalendarNavigation,
	useBookingActions,
} from '@/lib/calendar/hooks'
```

- [ ] **Step 2: Подключить useOrgSchedules после useOrgInfo**

После строки `const { org, staffList, loading: orgLoading, error: orgError } = useOrgInfo(orgSlug)`:

```typescript
// Расписания всех сотрудников организации
const orgSchedules = useOrgSchedules(orgSlug)
```

- [ ] **Step 3: Заменить логику workHours и disabledDays**

Заменить блок "Derived data" (строки с `scheduleSource`, `workHours`, `workStart`, `workEnd`, `disabledDays`):

```typescript
// ── Derived data ──

// Рабочие часы: если выбран сотрудник — его, иначе объединённые
const staffSchedule = selectedStaffId ? orgSchedules.getStaffSchedule(selectedStaffId) : null
const scheduleSource = staffSchedule ?? schedule ?? DEFAULT_SCHEDULE

const workHoursData = selectedStaffId
	? getWorkHoursForDate(scheduleSource.weeklyHours, dateStr)
	: orgSchedules.getOrgWorkHours(dateStr)

const workStart = workHoursData?.workStart ?? '10:00'
const workEnd = workHoursData?.workEnd ?? '18:00'

// Выходные дни: если выбран сотрудник — его, иначе дни когда никто не работает
const disabledDays = orgSchedules.getDisabledDays(selectedStaffId)
```

- [ ] **Step 4: Фильтровать StaffTabs по рабочему дню**

Заменить строку `const displayStaff = ...`:

```typescript
// Фильтрация: рабочий день + фильтрация по услугам (если включена)
const workingStaff = orgSchedules.getWorkingStaff(dateStr, staffList)
const staffAfterServiceFilter = viewConfig.filterByStaffCapability ? filtering.filteredStaff : workingStaff
const displayStaff = viewConfig.filterByStaffCapability
	? staffAfterServiceFilter.filter((s) => workingStaff.some((ws) => ws.id === s.id))
	: workingStaff
```

- [ ] **Step 5: Обновить loading**

```typescript
const initialLoading = orgLoading || orgSchedules.loading || (scheduleLoading && !schedule)
const contentLoading = scheduleLoading || bookingsLoading || filtering.loading
```

- [ ] **Step 6: Передать staffSchedule в стратегию**

В `createOrgStrategy(...)`, заменить `schedule: schedule ?? undefined`:

```typescript
schedule: staffSchedule ?? schedule ?? undefined,
```

- [ ] **Step 7: Проверить что страница рендерится**

Открыть: `http://localhost:3000/uk/org/69c5364f7a84add67bb68cfa`
Expected: Календарь с объединёнными часами (08:00–20:00 в будний день), сотрудники фильтруются по рабочему дню

- [ ] **Step 8: Commit**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
git add components/booking/OrgCalendarPage.tsx
git commit -m "feat(schedule): интеграция useOrgSchedules в OrgCalendarPage"
```

---

### Task 7: Верификация

- [ ] **Step 1: Проверить общий вид (без выбранного сотрудника)**

Открыть: `http://localhost:3000/uk/org/69c5364f7a84add67bb68cfa?date=2026-03-30` (понедельник)
Expected:
- Все 4 сотрудника в табах (все работают в Пн)
- Сетка: 08:00–20:00 (Іван 08:00 + Дмитро до 20:00)

- [ ] **Step 2: Проверить фильтрацию по дню**

Открыть: `?date=2026-03-28` (суббота)
Expected:
- Только Олексій и Дмитро в табах (остальные не работают в Сб)
- Сетка: 10:00–20:00

- [ ] **Step 3: Проверить воскресенье**

Открыть: `?date=2026-03-29` (воскресенье)
Expected:
- Нет сотрудников в табах
- Серая сетка (никто не работает)

- [ ] **Step 4: Проверить выбор сотрудника**

Кликнуть на Івана в будний день
Expected:
- Сетка сужается до 08:00–16:00
- disabledDays = Сб, Вс

- [ ] **Step 5: Проверить админскую страницу**

Открыть: `http://localhost:3000/uk/manage/69c5364f7a84add67bb68cfa`
Expected: Та же логика что и на публичной
