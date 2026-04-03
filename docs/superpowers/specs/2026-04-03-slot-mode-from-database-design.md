# Slot Mode — из базы данных, а не мок

**Дата:** 2026-04-03
**Статус:** Approved

## Проблема

`SlotModeSelector` сейчас отображается в сайдбаре календаря и работает через URL параметр `?mode=fixed`. Значение не сохраняется в базу — при перезагрузке страницы всегда возвращается `'fixed'`. Бэкенд уже поддерживает `slotMode` в `ScheduleTemplate` и `scheduleApi.updateTemplate()` принимает `slotMode`, но фронтенд это игнорирует.

## Решение

### Подход A — SlotModeSelector в Sheet "Налаштування розкладу"

Переместить `SlotModeSelector` из сайдбара календаря в `ScheduleSheetButton` (Sheet). При выборе — сразу сохранять в базу через API. Все стратегии читают `slotMode` из `schedule.slotMode`.

## Источник данных

**Было:** `slotMode` из URL `?mode=fixed`, фоллбек `'fixed'`
**Стало:** `slotMode` из `schedule.slotMode` (загружается через `useStaffSchedule` / `useOrgSchedules`)

- **Личный кабинет:** `useStaffSchedule` уже возвращает `schedule.slotMode` — использовать напрямую
- **Организация:** `useOrgSchedules` → `getStaffSchedule(staffId).slotMode`
- **Клиент (public booking):** бэкенд сам берёт `slotMode` из расписания при расчёте `/api/slots` — клиент не передаёт и не видит селектор

## UI — SlotModeSelector в ScheduleSheetButton

- Добавить `SlotModeSelector` в `ScheduleSheetButton` между `ScheduleEditor` и `ScheduleOverrideForm`
- При выборе — **сразу** вызывать `scheduleApi.updateTemplate(staffId, orgId, weeklyHours, newSlotMode)` и `reloadSchedule()`
- Показывать disabled/спиннер пока идёт сохранение
- Пропс: `onSaveSlotMode: (mode: SlotMode) => Promise<void>`

## Удаление из сайдбаров

- Убрать `SlotModeSelector` из `createStaffStrategy.tsx`, `createOrgStrategy.tsx`, `createClientStrategy.tsx`
- Убрать `slotMode` из URL search params в `BookingPage.tsx` и `OrgCalendarPage.tsx`
- Убрать `onModeChange` из props всех стратегий
- Стратегии получают `slotMode` из `schedule.slotMode`

## Клиентский вид

- Убрать `SlotModeSelector` из клиентской стратегии полностью
- Убрать передачу `slotMode` в `slotsApi.getAvailable()` — бэкенд сам знает режим из расписания
- Убрать `slotMode` prop из `BookingPanel` / `BookingPanelParts` / `StaffBookingPanel`

## Затрагиваемые файлы

| Файл | Действие |
|------|----------|
| `components/booking/ScheduleSheetButton.tsx` | Добавить `SlotModeSelector` + instant-save в API |
| `lib/calendar/strategies/createStaffStrategy.tsx` | Убрать `SlotModeSelector`, читать `slotMode` из schedule |
| `lib/calendar/strategies/createOrgStrategy.tsx` | Убрать `SlotModeSelector`, читать `slotMode` из schedule |
| `lib/calendar/strategies/createClientStrategy.tsx` | Убрать `SlotModeSelector`, не передавать `slotMode` в API |
| `app/[locale]/book/[staffSlug]/BookingPage.tsx` | Убрать `slotMode` из URL params |
| `components/booking/OrgCalendarPage.tsx` | Убрать `slotMode` из URL params, `onModeChange` |
| `components/booking/BookingPanel.tsx` | Убрать `slotMode` prop |
| `components/booking/BookingPanelParts.tsx` | Убрать `slotMode` из `ServiceInfo` |
| `components/booking/StaffBookingPanel.tsx` | Убрать `slotMode` prop |

## Вне скоупа

- Изменение слот-движка (`lib/slot-engine.ts`) — работает корректно
- Изменение бэкенда — уже поддерживает `slotMode`
- Изменение `SlotModeSelector` компонента — UI остаётся тем же
