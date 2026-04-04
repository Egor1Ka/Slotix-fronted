# Calendar UX Improvements Design

**Date:** 2026-03-30
**Status:** Approved

## Problem

1. На блоках календаря показывается имя клиента, а не исполнителя — админу важнее видеть кто делает услугу
2. В боковой панели деталей нет информации об исполнителе
3. Короткие события (30 мин) — sublabel не виден, т.к. высота блока слишком мала

## Changes

### 1. Staff имя + аватарка на блоках календаря

**Data flow:**

`useStaffBookings` загружает букинги per-staff (`OrgStaffMember[]`), но при маппинге через `toCalendarDisplayBooking` staff info теряется. Нужно:

1. Расширить `CalendarDisplayBooking` — добавить `staffName: string`, `staffAvatar: string`
2. Изменить `toCalendarDisplayBooking` — принимает доп. аргумент `staff: { name: string; avatar: string }`, формирует label как `"Услуга — StaffName"`, сохраняет `staffName`/`staffAvatar`
3. В `useStaffBookings` — при маппинге каждого staff-а прокидывать его `name`/`avatar` в `toCalendarDisplayBooking`
4. Расширить `CalendarBlock` — добавить `avatarUrl?: string`
5. В `createOrgStrategy` → `buildBookingBlocks` — прокидывать `booking.staffAvatar` в `avatarUrl`
6. В `CalendarCore` → `renderBookingBlock` — рендерить маленький аватар (16px, rounded-full) слева от текста. Если нет avatarUrl — не показывать.

**Label format:**

- До: `"Фарбування — Egor Zozulia"` (услуга — клиент)
- После: `"Фарбування — Egor Zozulia"` (услуга — исполнитель)

**Аватарка на блоке:**

- Day view: 16px круглая аватарка слева от label
- Week view: не показываем (слишком мало места)

### 2. Секция исполнителя в BookingDetailsPanel

**Подход:** Добавить новые пропсы `staffName`, `staffAvatar`, `staffPosition` в `BookingDetailsPanel`. Создать компонент `StaffSection` (по аналогии с `ClientSection`), разместить между `PanelHeader` и `TimeGrid`.

**Откуда брать данные:** В `createOrgStrategy` → `renderPanel()` при рендере `BookingDetailsPanel` — `selectedBooking.hosts[0].userId` содержит staff ID. Найти staff по ID в `staffList` (уже доступен в замыкании стратегии), взять `name`, `avatar`, `position`.

**StaffSection рендерит:**

- Аватарка (32px, rounded-full) + имя + должность (position)

### 3. Inline layout для коротких событий

**Порог:** `duration <= 30` мин (при PX_PER_HOUR = 48 это 24px высоты — помещается только одна строка текста).

**Day view (`renderBookingBlock`):**

- Если `duration <= 30`: рендерим label и sublabel в одну строку через `flex-row` + разделитель `·`
- Формат: `"Услуга — Staff · 10:00–10:30"` — одна строка, truncate
- Аватарка всё равно показывается слева (shrink-0)

**Week view (`renderWeekBlock`):**

- Sublabel и так не рендерится, только label с truncate — изменений не нужно

## Files Affected

| File                                            | Change                                                         |
| ----------------------------------------------- | -------------------------------------------------------------- |
| `services/configs/booking.types.ts`             | Добавить `staffName`, `staffAvatar` в `CalendarDisplayBooking` |
| `lib/booking-utils.ts`                          | `toCalendarDisplayBooking` принимает staff info, меняет label  |
| `lib/calendar/hooks/useStaffBookings.ts`        | Прокидывать staff name/avatar при маппинге                     |
| `lib/calendar/types.ts`                         | Добавить `avatarUrl?: string` в `CalendarBlock`                |
| `lib/calendar/strategies/createOrgStrategy.tsx` | Прокидывать avatarUrl в блоки, прокидывать staff info в panel  |
| `lib/calendar/CalendarCore.tsx`                 | Аватарка на блоке + inline layout для коротких событий         |
| `components/booking/BookingDetailsPanel.tsx`    | Новая секция StaffSection                                      |

## Not In Scope

- Аватарка в week view блоках (слишком мало места)
- Изменение month view
- Клиентский (public) календарь — только org/admin
