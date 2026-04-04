# Personal Schedule Page — Design Spec

## Overview

Создать страницу управления личным расписанием сотрудника (`/my-schedule`) без привязки к организации. Убрать кнопку `ScheduleSheetButton` со страницы `/schedule` (BookingPage), так как управление расписанием переносится на отдельную страницу.

## Что меняется

### 1. Удаление ScheduleSheetButton с BookingPage

**Файл:** `lib/calendar/view-config.ts`

Добавить поле `showScheduleEditor: boolean` в `CalendarViewConfig`. Установить `true` для `ORG_ADMIN_CONFIG`, `false` для `STAFF_SELF_CONFIG` и остальных.

**Файл:** `lib/calendar/strategies/createStaffStrategy.tsx`

В `renderSidebar()` рендерить `ScheduleSheetButton` только если `viewConfig.showScheduleEditor === true`. Сейчас кнопка показывается всегда — после изменения она будет скрыта на personal `/schedule` странице.

### 2. Новая страница `/my-schedule`

**Файл:** `app/[locale]/(personal)/my-schedule/page.tsx`

Клиентский компонент:

- `staffId` из `useUser().id`
- Заголовок "Моє розкладі" из `t('staffSchedule.mySchedule')`
- `StaffScheduleTabs` с `orgId={undefined}` и `readOnly={false}`
- Лоадер пока staffId не готов (не нужен — `useUser()` синхронный из контекста)

Структура аналогична `app/[locale]/(org)/org/[orgId]/my-schedule/page.tsx`, но без загрузки org/staff данных.

### 3. Сделать orgId optional в компонентах

**Файлы:**

- `components/staff-schedule/StaffScheduleTabs.tsx` — `orgId?: string`
- `components/staff-schedule/ScheduleViewTab.tsx` — `orgId?: string`
- `components/staff-schedule/OverridesTab.tsx` — `orgId?: string`
- `components/staff-schedule/BookingsTab.tsx` — `orgId?: string`

API методы уже принимают optional orgId:

- `scheduleApi.getTemplate(staffId, orgId?)` — работает
- `scheduleApi.getOverrides(staffId, orgId?)` — работает
- `scheduleApi.updateTemplate(staffId, orgId, weeklyHours)` — `orgId` принимает `string | null`, передаём `orgId ?? null`
- `scheduleApi.createOverride(body)` — `orgId` уже optional в `ScheduleOverrideForm`

### 4. BookingsTab — получение eventTypes без orgId

**Проблема:** `BookingsTab` вызывает `eventTypeApi.getByOrg(orgId)` для получения типов событий. Без `orgId` это не работает.

**Решение:** Если `orgId` не задан, использовать `eventTypeApi.getByStaff(staffId)` вместо `eventTypeApi.getByOrg(orgId)`.

```ts
// Было:
const types =
	eventTypes.length > 0 ? eventTypes : await eventTypeApi.getByOrg(orgId)

// Стало:
const fetchEventTypes = orgId
	? () => eventTypeApi.getByOrg(orgId)
	: () => eventTypeApi.getByStaff(staffId)

const types = eventTypes.length > 0 ? eventTypes : await fetchEventTypes()
```

### 5. Ссылка в PersonalSidebar

**Файл:** `components/sidebar/PersonalSidebar.tsx`

Добавить пункт меню "Моє розкладі" (`t('sidebar.myScheduleSettings')` или аналог) со ссылкой на `/my-schedule`. Иконка: `CalendarCog` или `Settings` из lucide-react.

Порядок: Мій розклад (календарь) → Моє розкладі (настройки) → Мої організації.

### 6. Переводы

**Файлы:** `i18n/messages/en.json`, `i18n/messages/uk.json`

Добавить ключ в `sidebar`:

- `myScheduleSettings` — "Schedule Settings" / "Налаштування розкладу"

Все остальные переводы уже существуют под ключом `staffSchedule`.

## Что НЕ меняется

- BookingPage и её функциональность (кроме удаления кнопки расписания)
- Компоненты `ScheduleEditor`, `ScheduleOverrideForm` — без изменений
- API layer (`lib/booking-api-client.ts`) — без изменений
- Org-версия страницы расписания — без изменений

## Риски

- **BookingsTab без orgId:** `eventTypeApi.getByStaff(staffId)` должен возвращать event types для личного аккаунта. Если API не поддерживает это — таб букингов будет пустым. Проверить при тестировании.
- **ScheduleOverrideForm:** Уже поддерживает `orgId?: string` — проверено, работает.

## Файлы затронутые изменениями

| Файл                                              | Действие                                 |
| ------------------------------------------------- | ---------------------------------------- |
| `lib/calendar/view-config.ts`                     | Добавить `showScheduleEditor` поле       |
| `lib/calendar/strategies/createStaffStrategy.tsx` | Условный рендер `ScheduleSheetButton`    |
| `app/[locale]/(personal)/my-schedule/page.tsx`    | Новый файл — страница                    |
| `components/staff-schedule/StaffScheduleTabs.tsx` | `orgId` → optional                       |
| `components/staff-schedule/ScheduleViewTab.tsx`   | `orgId` → optional                       |
| `components/staff-schedule/OverridesTab.tsx`      | `orgId` → optional                       |
| `components/staff-schedule/BookingsTab.tsx`       | `orgId` → optional + fallback eventTypes |
| `components/sidebar/PersonalSidebar.tsx`          | Новый пункт меню                         |
| `i18n/messages/en.json`                           | Добавить `sidebar.myScheduleSettings`    |
| `i18n/messages/uk.json`                           | Добавить `sidebar.myScheduleSettings`    |
