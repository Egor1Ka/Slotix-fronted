# Slot List View — второй вид отображения для бронирования

## Проблема

Сейчас бронирование доступно только через календарный вид (day/week/month). Клиенты хотят более простой способ выбрать время — увидеть список сотрудников с доступными слотами в виде сетки кнопок, без необходимости разбираться в календарной сетке.

## Решение

Добавить режим "Список" как переключатель вида на существующей странице бронирования. Работает и на публичных ссылках, и в админке.

## Два flow в режиме "Список"

### Flow 1: Личная страница (один сотрудник)

```
ServiceList (выбор услуги)
    ↓
TimeSlotGrid (сетка слотов, 3 колонки)
    ↓
BookingConfirmSheet (подтверждение записи)
```

На личной странице сотрудника нет выбора сотрудника — сразу показываем услуги и слоты.

### Flow 2: Org-страница (несколько сотрудников)

```
ServiceList (выбор услуги)
    ↓
Список StaffSlotCard (сотрудники, отфильтрованные по услуге)
  ├── Аватар + имя + должность + кнопка "i"
  ├── "Ближайший час: 14 апреля, вторник"
  └── TimeSlotGrid (полная сетка слотов сотрудника)
    ↓
BookingConfirmSheet (подтверждение записи)
```

## Новые компоненты

### `TimeSlotGrid`

Сетка кнопок-пилюль в 3 колонки. Reusable — используется и в org-виде (под каждым сотрудником), и в личном виде.

**Props:**
- `slots: Slot[]` — массив доступных слотов из slot engine
- `selectedSlot: string | null` — выбранный слот (формат "HH:MM")
- `onSelect: (time: string, date: string) => void` — callback при клике
- `date: string` — дата для отображения ("Завтра" / "14 апреля, вторник")
- `loading: boolean` — состояние загрузки

**Отображение:**
- Кнопки-пилюли с закруглёнными краями (rounded-full)
- 3 колонки, responsive: 2 на мобильных
- Выбранный слот — primary цвет
- Пустое состояние: "Нет свободного времени"

### `StaffSlotCard`

Карточка сотрудника для org-режима списка.

**Содержит:**
- Аватар + имя + должность (слева)
- Кнопка "i" (справа) — открывает Sheet с bio/контактами через `StaffInfoCard`
- Подпись с датой: "Ближайший час для записи: **14 апреля, вторник**"
- `TimeSlotGrid` с полной сеткой слотов

**Props:**
- `staff: OrgStaffMember` — данные сотрудника
- `slots: Slot[]` — доступные слоты
- `date: string` — дата слотов
- `selectedSlot: { staffId: string; time: string } | null`
- `onSlotSelect: (staffId: string, time: string, date: string) => void`
- `loading: boolean`

### `SlotListView`

Контейнер режима "Список". Два подрежима:

- **Org**: `ServiceList` сверху → список `StaffSlotCard` (фильтрованных через `useOrgFiltering`)
- **Personal**: `ServiceList` сверху → `TimeSlotGrid` (без карточек сотрудников)

**Props:**
- `variant: 'org' | 'personal'`
- `eventTypes: EventType[]`
- `staff?: OrgStaffMember[]` (только для org)
- `selectedEventTypeId: string | null`
- `onEventTypeSelect: (id: string) => void`
- `onSlotSelect: (staffId: string, time: string, date: string) => void`
- `selectedDate: string | null` (null = ближайший доступный)

### `BookingConfirmSheet`

Sheet для подтверждения записи. Открывается по клику на слот.

**Содержит:**
- Информация о выбранной услуге (название, длительность, цена)
- Сотрудник (аватар + имя) — в org режиме
- Выбранное время и дата
- `ClientInfoForm` (имя, email, телефон)
- Кнопка подтверждения

**В админке:** форма клиента обязательна (как в `StaffBookingPanel`).
**На публичной ссылке:** форма клиента упрощена.

Использует существующий `useBookingActions` для создания записи.

## Переключатель вида

### Расширение ViewMode

Добавляем `'list'` к существующему типу `ViewMode = 'day' | 'week' | 'month'`:

```typescript
type ViewMode = 'day' | 'week' | 'month' | 'list'
```

### UI переключателя

Toggle "Календарь | Список" рендерится рядом с кнопками day/week/month. При выборе "Список" кнопки day/week/month скрываются — они не имеют смысла в этом режиме. При переключении обратно на "Календарь" — восстанавливается последний выбранный режим (day/week/month).

### ViewConfig

Добавляем в `CalendarViewConfig` новое поле:

```typescript
allowListView: boolean
```

Включаем во всех конфигах: `ORG_PUBLIC_CONFIG`, `ORG_ADMIN_CONFIG`, `STAFF_PUBLIC_CONFIG`, `STAFF_SELF_CONFIG`.

## URL-состояние

Расширяем `useCalendarNavigation`:

```
?view=list                          — режим списка
?view=list&eventType=xxx            — выбрана услуга
?view=list&eventType=xxx&staff=yyy  — выбран сотрудник (org)
?view=list&eventType=xxx&staff=yyy&slot=HH:MM&date=YYYY-MM-DD — выбран слот
```

При переключении между календарём и списком:
- Сохраняем `eventType` и `staff`
- Сбрасываем `slot`

## Выбор даты в режиме списка

### Поведение по умолчанию

Date picker показывает "сегодня". Каждый сотрудник ищет свой **ближайший доступный день** начиная от текущей даты.

### При выборе конкретной даты

Все сотрудники показывают слоты на эту дату. Если нет слотов — "Нет свободного времени".

### Хук `useFindNearestSlots`

Новый утилитный хук:

**Входные данные:**
- `staffId: string`
- `eventType: EventType`
- `schedule: ScheduleTemplate`
- `overrides: ScheduleOverride[]`
- `bookings: StaffBooking[]`
- `startDate: string` (YYYY-MM-DD)
- `fixedDate: boolean` — если true, ищем только на startDate

**Логика:**
- Перебирает дни от startDate вперёд (максимум 14 дней)
- Для каждого дня: проверяет рабочие часы (`getWorkHoursForDate`) → вызывает `getAvailableSlots()`
- Возвращает первый день с доступными слотами + массив слотов
- Если `fixedDate === true` — возвращает слоты только на startDate

**Возвращает:**
```typescript
{ date: string; slots: Slot[]; loading: boolean }
```

## Интеграция с существующей архитектурой

### Переключение в BookingPage / OrgCalendarPage

```typescript
if (view === 'list') {
  return <SlotListView ... />
} else {
  return <CalendarCore strategy={...} />
}
```

### Переиспользование хуков

`SlotListView` использует те же хуки, что и календарь:
- `useStaffSchedule` — расписание + типы услуг
- `useStaffBookings` — забронированные слоты
- `useOrgFiltering` — фильтрация сотрудник ↔ услуга
- `useOrgSchedules` — расписания всех сотрудников (org)
- `getAvailableSlots()` из slot engine — расчёт свободных слотов
- `useBookingActions` — создание записи

### Кнопка "i" — Staff Info Sheet

Открывает Sheet с данными из `OrgStaffMember`:
- Аватар, имя, должность
- Bio (с expand/collapse)

Контакты (телефон, адрес, вебсайт) доступны только в `StaffBySlugResponse`. Подгружаем по клику на "i" через `staffApi.getById()` — lazy load, чтобы не грузить для всех сотрудников сразу.

Рейтинг и отзывы НЕ добавляем (нет данных в системе).

### Загрузка данных для нескольких сотрудников (org-режим)

В org-режиме `SlotListView` показывает слоты для всех отфильтрованных сотрудников одновременно. Данные загружаются так:

- **Расписания** — уже загружены через `useOrgSchedules` (все сотрудники сразу)
- **Bookings** — `useStaffBookings` вызывается для каждого видимого сотрудника. Хук уже поддерживает множественную загрузку через `staffToLoad` массив в `OrgCalendarPage`
- **Слоты** — рассчитываются на клиенте через `getAvailableSlots()` для каждого сотрудника отдельно (вычисление синхронное, не API-вызов)
- **Ближайший день** — `useFindNearestSlots` вызывается для каждого сотрудника индивидуально, перебор дней происходит локально на основе уже загруженных расписаний и bookings

## Контексты использования

| Контекст | View Config | Поведение |
|----------|-------------|-----------|
| Публичная org-ссылка | `ORG_PUBLIC_CONFIG` | Услуга → сотрудники со слотами → Sheet подтверждения |
| Админка org | `ORG_ADMIN_CONFIG` | То же + форма клиента обязательна |
| Публичная ссылка сотрудника | `STAFF_PUBLIC_CONFIG` | Услуга → сетка слотов → Sheet подтверждения |
| Личная страница сотрудника | `STAFF_SELF_CONFIG` | Услуга → сетка слотов → Sheet подтверждения |

## Что НЕ входит в scope

- Рейтинг / звёзды сотрудников
- Отзывы клиентов
- Портфолио сотрудников
- Toggle включения/выключения сотрудников в списке
- Бэкенд-изменения (вся логика на фронте через существующие API)
