# Фильтрация услуг и сотрудников — План реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Двусторонняя фильтрация услуг и сотрудников на публичной странице организации — выбрал услугу → фильтруются сотрудники, выбрал сотрудника → фильтруются услуги.

**Architecture:** Новый бэкенд-эндпоинт `GET /event-types/:id/staff` возвращает сотрудников для услуги по staffPolicy. Фронтенд-хук `useOrgFiltering` координирует двустороннюю фильтрацию между services и staff tabs. OrgCalendarPage передаёт отфильтрованные данные в стратегию и StaffTabs.

**Tech Stack:** Express.js + Mongoose (backend), React hooks + next-intl (frontend), existing booking-api-client

---

## Структура файлов

### Бэкенд (BackendTemplate)

| Действие | Файл | Ответственность |
|----------|------|-----------------|
| Modify | `src/repository/eventTypeRepository.js` | Новый query `getEventTypeById` |
| Modify | `src/repository/membershipRepository.js` | Новые queries: `getActiveMembersByPositions`, `getActiveMembersByUserIds` |
| Create | `src/services/eventTypeStaffServices.js` | Логика разрешения staffPolicy → список сотрудников |
| Modify | `src/controllers/eventTypeController.js` | Новый хендлер `handleGetStaffForEventType` |
| Modify | `src/routes/subroutes/eventTypeRoutes.js` | Новый роут `GET /:id/staff` |

### Фронтенд (Slotix-fronted)

| Действие | Файл | Ответственность |
|----------|------|-----------------|
| Modify | `lib/booking-api-client.ts` | Новый метод `eventTypeApi.getStaffForEventType()` |
| Create | `lib/calendar/hooks/useOrgFiltering.ts` | Хук двусторонней фильтрации |
| Modify | `components/booking/OrgCalendarPage.tsx` | Интеграция фильтрации |

---

### Task 1: Бэкенд — Repository queries для поиска сотрудников по позициям и userId

**Files:**
- Modify: `/Users/egorzozula/Desktop/BackendTemplate/src/repository/membershipRepository.js`

- [ ] **Step 1: Добавить `getActiveMembersByPositions` и `getActiveMembersByUserIds`**

В файле `src/repository/membershipRepository.js` добавить две новые функции перед блоком `export`:

```javascript
const getActiveMembersByPositions = async (orgId, positionIds) => {
  const docs = await Membership.find({
    orgId,
    positionId: { $in: positionIds },
    status: MEMBERSHIP_STATUS.ACTIVE,
  });
  return docs;
};

const getActiveMembersByUserIds = async (orgId, userIds) => {
  const docs = await Membership.find({
    orgId,
    userId: { $in: userIds },
    status: MEMBERSHIP_STATUS.ACTIVE,
  });
  return docs;
};
```

Обновить экспорт:

```javascript
export {
  getActiveMembership,
  getActiveMembersByOrg,
  getMembershipsByUser,
  createMembership,
  getActiveMembersByPositions,
  getActiveMembersByUserIds,
};
```

- [ ] **Step 2: Проверить что сервер стартует без ошибок**

Run: `cd /Users/egorzozula/Desktop/BackendTemplate && npm start`
Expected: Сервер запускается без ошибок

- [ ] **Step 3: Коммит**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
git add src/repository/membershipRepository.js
git commit -m "feat(repo): добавить queries для поиска сотрудников по позициям и userId"
```

---

### Task 2: Бэкенд — Сервис resolving staffPolicy → список сотрудников

**Files:**
- Create: `/Users/egorzozula/Desktop/BackendTemplate/src/services/eventTypeStaffServices.js`

- [ ] **Step 1: Создать сервис `getStaffForEventType`**

Создать файл `src/services/eventTypeStaffServices.js`:

```javascript
import { getEventTypeById } from "../repository/eventTypeRepository.js";
import {
  getActiveMembersByOrg,
  getActiveMembersByPositions,
  getActiveMembersByUserIds,
} from "../repository/membershipRepository.js";
import { getUserById } from "../modules/user/index.js";
import { getPositionById } from "../repository/positionRepository.js";
import { toOrgStaffDto } from "../dto/staffDto.js";

const isNotNull = (item) => item !== null;

const buildStaffProfile = async (member) => {
  const user = await getUserById(member.userId.toString());
  if (!user) return null;

  const position = member.positionId
    ? await getPositionById(member.positionId)
    : null;

  return toOrgStaffDto(user, position, 0);
};

const POLICY_HANDLERS = {
  any: (eventType) => getActiveMembersByOrg(eventType.orgId),
  by_position: (eventType) =>
    getActiveMembersByPositions(eventType.orgId, eventType.assignedPositions),
  specific: (eventType) =>
    getActiveMembersByUserIds(eventType.orgId, eventType.assignedStaff),
};

const getStaffForEventType = async (eventTypeId) => {
  const eventType = await getEventTypeById(eventTypeId);
  if (!eventType) return { error: "event_type_not_found" };
  if (!eventType.orgId) return { error: "not_org_event_type" };

  const getMembers = POLICY_HANDLERS[eventType.staffPolicy] ?? POLICY_HANDLERS.any;
  const members = await getMembers(eventType);

  const profiles = await Promise.all(members.map(buildStaffProfile));
  return { staff: profiles.filter(isNotNull) };
};

export { getStaffForEventType };
```

- [ ] **Step 2: Проверить что сервер стартует**

Run: `cd /Users/egorzozula/Desktop/BackendTemplate && npm start`
Expected: Сервер запускается без ошибок

- [ ] **Step 3: Коммит**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
git add src/services/eventTypeStaffServices.js
git commit -m "feat(service): добавить getStaffForEventType — resolve staffPolicy в список сотрудников"
```

---

### Task 3: Бэкенд — Controller + Route для GET /event-types/:id/staff

**Files:**
- Modify: `/Users/egorzozula/Desktop/BackendTemplate/src/controllers/eventTypeController.js`
- Modify: `/Users/egorzozula/Desktop/BackendTemplate/src/routes/subroutes/eventTypeRoutes.js`

- [ ] **Step 1: Добавить хендлер `handleGetStaffForEventType`**

В файле `src/controllers/eventTypeController.js` добавить импорт и хендлер:

```javascript
import { getEventTypesForStaff } from "../services/eventTypeServices.js";
import { getStaffForEventType } from "../services/eventTypeStaffServices.js";
import { httpResponse, httpResponseError } from "../shared/utils/http/httpResponse.js";
import { generalStatus } from "../shared/utils/http/httpStatus.js";
import { isValidObjectId } from "../shared/utils/validation/validators.js";

const handleGetEventTypes = async (req, res) => {
  try {
    const { staffId } = req.query;
    if (!staffId || !isValidObjectId(staffId)) {
      return httpResponse(res, generalStatus.BAD_REQUEST);
    }

    const eventTypes = await getEventTypesForStaff(staffId);
    return httpResponse(res, generalStatus.SUCCESS, eventTypes);
  } catch (error) {
    return httpResponseError(res, error);
  }
};

const handleGetStaffForEventType = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !isValidObjectId(id)) {
      return httpResponse(res, generalStatus.BAD_REQUEST);
    }

    const result = await getStaffForEventType(id);
    if (result.error) {
      return httpResponse(res, generalStatus.NOT_FOUND);
    }

    return httpResponse(res, generalStatus.SUCCESS, result.staff);
  } catch (error) {
    return httpResponseError(res, error);
  }
};

export { handleGetEventTypes, handleGetStaffForEventType };
```

- [ ] **Step 2: Добавить роут**

В файле `src/routes/subroutes/eventTypeRoutes.js`:

```javascript
import express from "express";
import { handleGetEventTypes, handleGetStaffForEventType } from "../../controllers/eventTypeController.js";

const router = express.Router();

router.get("/", handleGetEventTypes);
router.get("/:id/staff", handleGetStaffForEventType);

export default router;
```

- [ ] **Step 3: Протестировать эндпоинт вручную**

Run: `curl http://localhost:9000/api/event-types/<eventTypeId>/staff | jq`

Заменить `<eventTypeId>` на реальный ID из базы. Ожидаем массив `OrgStaffMember[]`.

Чтобы найти ID:
```bash
mongosh --quiet --eval 'db.eventtypes.findOne({orgId: ObjectId("69c5364f7a84add67bb68cfa")}, {_id:1, name:1, staffPolicy:1})' myDatabase
```

- [ ] **Step 4: Коммит**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
git add src/controllers/eventTypeController.js src/routes/subroutes/eventTypeRoutes.js
git commit -m "feat(api): добавить GET /event-types/:id/staff — сотрудники для услуги"
```

---

### Task 4: Фронтенд — API метод для получения сотрудников по услуге

**Files:**
- Modify: `/Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted/lib/booking-api-client.ts`

- [ ] **Step 1: Добавить функцию `getStaffForEventType`**

В файле `lib/booking-api-client.ts`, после функции `getEventTypesByStaff` (строка ~232), добавить:

```typescript
const getStaffForEventType = async (eventTypeId: string): Promise<OrgStaffMember[]> =>
	get<OrgStaffMember[]>(`/event-types/${eventTypeId}/staff`)
```

- [ ] **Step 2: Добавить метод в экспорт `eventTypeApi`**

Обновить объект `eventTypeApi` (строка ~369):

```typescript
export const eventTypeApi = {
	getByStaff: getEventTypesByStaff,
	getStaffForEventType,
}
```

- [ ] **Step 3: Проверить билд**

Run: `cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted && npm run build`
Expected: Билд проходит без ошибок

- [ ] **Step 4: Коммит**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
git add lib/booking-api-client.ts
git commit -m "feat(api): добавить eventTypeApi.getStaffForEventType()"
```

---

### Task 5: Фронтенд — Хук двусторонней фильтрации useOrgFiltering

**Files:**
- Create: `/Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted/lib/calendar/hooks/useOrgFiltering.ts`

- [ ] **Step 1: Создать хук `useOrgFiltering`**

Создать файл `lib/calendar/hooks/useOrgFiltering.ts`:

```typescript
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { eventTypeApi } from '@/lib/booking-api-client'
import type { EventType, OrgStaffMember } from '@/services/configs/booking.types'

interface UseOrgFilteringProps {
	allStaff: OrgStaffMember[]
	selectedStaffId: string | null
	selectedEventTypeId: string | null
	onStaffAutoSelect: (staffId: string) => void
}

interface UseOrgFilteringResult {
	filteredStaff: OrgStaffMember[]
	filteredEventTypes: EventType[]
	staffEventTypes: EventType[]
	loading: boolean
}

const useOrgFiltering = ({
	allStaff,
	selectedStaffId,
	selectedEventTypeId,
	onStaffAutoSelect,
}: UseOrgFilteringProps): UseOrgFilteringResult => {
	// Услуги текущего выбранного сотрудника
	const [staffEventTypes, setStaffEventTypes] = useState<EventType[]>([])
	// Сотрудники для текущей выбранной услуги
	const [eventTypeStaff, setEventTypeStaff] = useState<OrgStaffMember[] | null>(null)
	const [loading, setLoading] = useState(false)
	const lastStaffIdRef = useRef<string | null>(null)
	const lastEventTypeIdRef = useRef<string | null>(null)

	// Загружаем услуги при смене сотрудника
	useEffect(() => {
		if (!selectedStaffId) {
			setStaffEventTypes([])
			return
		}

		if (lastStaffIdRef.current === selectedStaffId) return
		lastStaffIdRef.current = selectedStaffId

		const loadEventTypes = async () => {
			try {
				const types = await eventTypeApi.getByStaff(selectedStaffId)
				setStaffEventTypes(types)
			} catch {
				setStaffEventTypes([])
			}
		}

		loadEventTypes()
	}, [selectedStaffId])

	// Загружаем сотрудников при смене услуги
	useEffect(() => {
		if (!selectedEventTypeId) {
			setEventTypeStaff(null)
			lastEventTypeIdRef.current = null
			return
		}

		if (lastEventTypeIdRef.current === selectedEventTypeId) return
		lastEventTypeIdRef.current = selectedEventTypeId

		const loadStaff = async () => {
			setLoading(true)
			try {
				const staff = await eventTypeApi.getStaffForEventType(selectedEventTypeId)
				setEventTypeStaff(staff)

				// Если текущий сотрудник не может выполнять эту услугу — автовыбор первого
				const isStaffInList = (s: OrgStaffMember): boolean => s.id === selectedStaffId
				const currentStaffCanPerform = staff.some(isStaffInList)

				if (!currentStaffCanPerform && staff.length > 0) {
					onStaffAutoSelect(staff[0].id)
				}
			} catch {
				setEventTypeStaff(null)
			} finally {
				setLoading(false)
			}
		}

		loadStaff()
	}, [selectedEventTypeId, selectedStaffId, onStaffAutoSelect])

	// Фильтрация сотрудников: если выбрана услуга — только подходящие
	const filteredStaff = eventTypeStaff
		? allStaff.filter((s) => {
				const isInEventTypeStaff = (es: OrgStaffMember): boolean => es.id === s.id
				return eventTypeStaff.some(isInEventTypeStaff)
			})
		: allStaff

	// Фильтрация услуг: показываем услуги текущего сотрудника
	const filteredEventTypes = staffEventTypes

	return {
		filteredStaff,
		filteredEventTypes,
		staffEventTypes,
		loading,
	}
}

export type { UseOrgFilteringResult }
export { useOrgFiltering }
```

- [ ] **Step 2: Экспортировать из index**

В файле `lib/calendar/hooks/index.ts` добавить экспорт:

```typescript
export { useOrgFiltering } from './useOrgFiltering'
export type { UseOrgFilteringResult } from './useOrgFiltering'
```

- [ ] **Step 3: Проверить билд**

Run: `cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted && npm run build`
Expected: Билд проходит (хук ещё не используется, но компилируется)

- [ ] **Step 4: Коммит**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
git add lib/calendar/hooks/useOrgFiltering.ts lib/calendar/hooks/index.ts
git commit -m "feat(hooks): добавить useOrgFiltering — двусторонняя фильтрация услуг/сотрудников"
```

---

### Task 6: Фронтенд — Интеграция фильтрации в OrgCalendarPage

**Files:**
- Modify: `/Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted/components/booking/OrgCalendarPage.tsx`

- [ ] **Step 1: Добавить импорт `useOrgFiltering`**

В блоке импортов из `@/lib/calendar/hooks` (строка ~23) добавить `useOrgFiltering`:

```typescript
import {
	useOrgInfo,
	useStaffSchedule,
	useStaffBookings,
	useCalendarNavigation,
	useBookingActions,
	useOrgFiltering,
} from '@/lib/calendar/hooks'
```

- [ ] **Step 2: Подключить хук фильтрации**

После блока `// ── Data ──` (после `useStaffSchedule`), добавить вызов `useOrgFiltering`.

Заменить весь блок данных (строки ~73-91) на:

```typescript
	// ── Data ──

	const { org, staffList, loading: orgLoading, error: orgError } = useOrgInfo(orgSlug)

	const activeStaffId = staffIdProp ?? getFirstStaffId(staffList)

	// Двусторонняя фильтрация (только для публичных страниц)
	const isPublic = !viewConfig.canBookForClient && viewConfig.showStaffTabs

	const handleStaffAutoSelect = useCallback((staffId: string) => {
		navigation.handleStaffSelect(staffId)
	}, [navigation])

	const filtering = useOrgFiltering({
		allStaff: staffList,
		selectedStaffId: activeStaffId,
		selectedEventTypeId,
		onStaffAutoSelect: handleStaffAutoSelect,
	})

	// На публичных страницах используем отфильтрованные данные,
	// на админских — оригинальные из useStaffSchedule
	const { eventTypes: scheduleEventTypes, schedule, loading: scheduleLoading, error: scheduleError } =
		useStaffSchedule(activeStaffId)

	const eventTypes = isPublic ? filtering.filteredEventTypes : scheduleEventTypes

	const staffToLoad = useMemo(
		() => getStaffToLoad(staffList, selectedStaffId, viewConfig.staffTabBehavior),
		[staffList, selectedStaffId, viewConfig.staffTabBehavior],
	)

	const { bookings, reloadBookings, loading: bookingsLoading, error: bookingsError } =
		useStaffBookings(staffToLoad, dateStr, view, eventTypes)

	const loading = orgLoading || scheduleLoading || bookingsLoading || filtering.loading
	const error = orgError || scheduleError || bookingsError
```

Добавить импорт `useCallback` в начало файла (уже есть `useMemo`, добавить `useCallback`):

```typescript
import { useMemo, useCallback } from 'react'
```

- [ ] **Step 3: Передать отфильтрованных сотрудников в StaffTabs**

Заменить блок `staffTabsSlot` (строки ~209-216) на:

```typescript
	const displayStaff = isPublic ? filtering.filteredStaff : staffList

	const staffTabsSlot = viewConfig.showStaffTabs ? (
		<StaffTabs
			staff={displayStaff}
			selectedId={selectedStaffId}
			behavior={viewConfig.staffTabBehavior}
			onSelect={onStaffSelect}
		/>
	) : null
```

- [ ] **Step 4: Убрать общий вид на публичных страницах**

В блоке `onStaffSelect` (строка ~132), добавить автовыбор первого сотрудника если id === null на публичных страницах:

```typescript
	const onStaffSelect = (id: string | null) => {
		// На публичных страницах не разрешаем снимать выбор сотрудника
		if (isPublic && id === null) return
		navigation.handleStaffSelect(id)
		resetBookingState()
	}
```

- [ ] **Step 5: При смене сотрудника сбрасывать кеш фильтрации**

Это уже обрабатывается внутри `useOrgFiltering` через `lastStaffIdRef` — при смене `selectedStaffId` автоматически загружаются новые услуги.

Нужно убедиться что `navigation` доступен до вызова `useOrgFiltering`. Переместить блок навигации выше:

Переместить строку с `useCalendarNavigation` (строка ~95) сразу после `// ── URL state ──` блока:

```typescript
	// ── URL state ──

	const dateStr = searchParams.get('date') ?? todayStr()
	const view = (searchParams.get('view') as ViewMode) ?? 'day'
	const selectedStaffId = staffIdProp ?? null
	const selectedEventTypeId = searchParams.get('eventType') ?? null
	const selectedSlotTime = searchParams.get('slot') ?? null
	const slotMode = (searchParams.get('mode') as SlotMode) ?? 'fixed'

	// ── Navigation ──

	const navigation = useCalendarNavigation({ orgSlug, dateStr, selectedEventTypeId })
```

- [ ] **Step 6: Проверить билд**

Run: `cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted && npm run build`
Expected: Билд проходит без ошибок

- [ ] **Step 7: Проверить в браузере**

1. Открыть `http://localhost:3000/uk/org/69c5364f7a84add67bb68cfa`
2. Убедиться что первый сотрудник выбран по умолчанию
3. Выбрать услугу → табы сотрудников должны отфильтроваться
4. Выбрать другого сотрудника → услуги в сайдбаре должны измениться
5. На `/manage/69c5364f7a84add67bb68cfa` — фильтрация не должна работать (все услуги и все сотрудники)

- [ ] **Step 8: Коммит**

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
git add components/booking/OrgCalendarPage.tsx
git commit -m "feat(org): интегрировать двустороннюю фильтрацию услуг/сотрудников на публичной странице"
```

---

## Self-Review Checklist

### Spec coverage
- [x] Новый бэкенд-эндпоинт `GET /event-types/:id/staff` → Task 1-3
- [x] Двусторонняя фильтрация → Task 5-6
- [x] Общий вид убран на публичных → Task 6 Step 4
- [x] Обязательный выбор исполнителя → Task 6 Step 4
- [x] Админские страницы без изменений → Task 6 Step 2 (`isPublic` guard)
- [x] Фронтенд API метод → Task 4

### Placeholder scan
- Нет TBD/TODO
- Все шаги содержат конкретный код

### Type consistency
- `OrgStaffMember[]` используется одинаково в бэке и фронте
- `EventType[]` — тот же тип что уже в системе
- `getStaffForEventType` — одно имя в сервисе, контроллере и API клиенте
