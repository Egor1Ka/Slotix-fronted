# Per-Staff Work Hours in Organization Calendar

## Goal

Каждый сотрудник организации имеет собственное расписание (рабочие часы, выходные). Календарь организации должен корректно отображать объединённые рабочие часы всех сотрудников в общем виде и индивидуальное расписание при выборе конкретного сотрудника.

## Требования

### 1. Общий вид (сотрудник не выбран)

- Сетка календаря показывает объединённый диапазон: `min(workStart)` – `max(workEnd)` среди всех сотрудников, работающих в этот день
- Временные слоты, где **все** сотрудники заняты или не работают — отображаются серым блоком (как нерабочее время)
- `disabledDays` (серые дни в мини-календаре) — дни когда **ни один** сотрудник не работает
- Если в конкретный день никто не работает — пустой календарь с серой сеткой, без сотрудников в табах

### 2. Выбран конкретный сотрудник

- Сетка показывает только его рабочие часы (`workStart`/`workEnd` из его расписания)
- `disabledDays` — его личные выходные дни
- Слоты для бронирования генерируются по его расписанию

### 3. StaffTabs — фильтрация по рабочему дню

- Сотрудники, которые **не работают** в текущий день — полностью скрыты из табов
- Одинаковое поведение на публичной и админской странице

### 4. Серые блоки в общем виде

- На каждый интервал (30 мин) проверяется: есть ли хотя бы один свободный сотрудник
- Если нет — серый блок
- Зависит от расписаний (статичные) + бронирований (динамические)
- Вычисляется в стратегии `createOrgStrategy`

## Архитектура

### Бэкенд: новый endpoint

**`GET /schedule/templates/by-org/:orgId`**

Возвращает расписания всех активных сотрудников организации одним запросом.

Логика:
1. Получить все активные memberships для orgId
2. Для каждого userId найти текущий `ScheduleTemplate` (`validFrom <= now`, `validTo` null или > now)
3. Вернуть массив расписаний с `staffId`

Ответ:
```json
[
  {
    "staffId": "...",
    "weeklyHours": [
      { "day": "mon", "enabled": true, "slots": [{ "start": "08:00", "end": "16:00" }] },
      ...
    ],
    "slotStepMin": 30,
    "slotMode": "fixed",
    "timezone": "Europe/Kyiv"
  },
  ...
]
```

Сотрудники без расписания — не включаются в ответ.

### Фронтенд: хук `useOrgSchedules`

```typescript
interface UseOrgSchedulesResult {
  // Расписание конкретного сотрудника
  getStaffSchedule: (staffId: string) => ScheduleTemplate | null

  // Объединённые рабочие часы на дату (min start, max end)
  getOrgWorkHours: (dateStr: string) => { workStart: string; workEnd: string } | null

  // Сотрудники, которые работают в конкретный день
  getWorkingStaff: (dateStr: string) => OrgStaffMember[]

  loading: boolean
  error: string | null
}
```

**`getOrgWorkHours(dateStr)`:**
- Определяет dayOfWeek
- Проходит по всем расписаниям, собирает enabled слоты для этого дня
- Возвращает `{ workStart: min(все start), workEnd: max(все end) }`
- Возвращает `null` если ни у кого нет рабочего дня

**`getWorkingStaff(dateStr)`:**
- Фильтрует staffList: оставляет только тех, у кого этот день enabled
- Используется для фильтрации StaffTabs и для определения серых блоков

**`getStaffSchedule(staffId)`:**
- Возвращает расписание конкретного сотрудника из загруженного кеша

### Фронтенд: API-клиент

Новый метод в `lib/booking-api-client.ts`:
```typescript
scheduleApi.getByOrg(orgId: string): Promise<OrgScheduleEntry[]>
```

### Изменения в OrgCalendarPage

Поток данных:

```
useOrgSchedules(orgSlug, staffList)
  ├── selectedStaffId → getStaffSchedule(staffId) → его workStart/workEnd, disabledDays
  └── no selection   → getOrgWorkHours(dateStr)   → объединённый workStart/workEnd
                      → disabledDays = дни когда НИКТО не работает

getWorkingStaff(dateStr) → фильтрует displayStaff → StaffTabs
```

### Изменения в createOrgStrategy

- Получает расписания всех сотрудников + бронирования
- В общем виде (без выбранного сотрудника): на каждый 30-мин интервал проверяет, есть ли свободный сотрудник
- Если все заняты/не работают — добавляет серый блок типа `'unavailable'`

## Файлы

### Новые:
- **Бэкенд:** handler в `scheduleController` + repository метод + route
- **Фронтенд:** `lib/calendar/hooks/useOrgSchedules.ts`
- **Фронтенд:** метод `scheduleApi.getByOrg` в `lib/booking-api-client.ts`

### Изменяемые:
- `components/booking/OrgCalendarPage.tsx` — подключить `useOrgSchedules`, заменить логику workHours, фильтровать staff
- `lib/calendar/strategies/createOrgStrategy.tsx` — серые блоки для недоступного времени
- `app/[locale]/staff/org/[orgSlug]/page.tsx` — подключить ту же логику для админской страницы

### Не меняется:
- `CalendarCore.tsx` — по-прежнему получает `workStart/workEnd` и `disabledDays`
- `useStaffSchedule` — остаётся для загрузки eventTypes
- Личные страницы сотрудников — не затрагиваются

## Тестовые данные

Создать в БД расписания для 4 сотрудников:
- Іван Петров: 08:00–16:00 (Пн–Пт)
- Олексій Коваленко: 10:00–18:00 (Пн–Сб)
- Дмитро Шевченко: 12:00–20:00 (Вт–Сб)
- Егор Зозуля: 09:00–17:00 (Пн–Пт)

## Одинаковое поведение

Публичная страница (`/org/[orgSlug]`) и админская страница (`/staff/org/[orgSlug]`) используют одну и ту же логику через `useOrgSchedules`. Неработающие сотрудники скрыты на обеих страницах.
