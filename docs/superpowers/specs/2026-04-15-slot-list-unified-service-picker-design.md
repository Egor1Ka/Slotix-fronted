# Unified Service Picker в SlotListView

## Контекст

В `SlotListView` (org variant) при клике на свободный слот у сотрудника без выбранной услуги
появляется inline-блок "Оберіть послугу:" со списком услуг, подходящих этому сотруднику. При этом
услуги уже отрисованы сверху в горизонтальном `ServiceList`. Получается два списка услуг на одном
экране — визуальный дубль и лишний шаг в UI.

## Цель

Убрать дубль. Один источник услуг — верхний `ServiceList`. Клик по слоту без выбранной услуги не
должен терять намерение пользователя: слот запоминается, верхний список фильтруется под выбранного
сотрудника, после выбора услуги откуда угодно — открывается sheet подтверждения.

## Решение

### Поведение

- Клик по слоту у сотрудника без выбранной услуги → сохраняем `{staffId, time}` в `pendingSlot`,
  скроллим к верхнему `ServiceList` и подсвечиваем его.
- Верхний `ServiceList` при активном `pendingSlot` получает `allowedIds` — услуги, подходящие
  сотруднику (через тот же `isServiceForStaff`). Услуги вне набора становятся disabled: полупрозрачные,
  `cursor-not-allowed`, клик игнорируется.
- Пользователь выбирает услугу из верхнего списка → если есть `pendingSlot` и услуга в `allowedIds`,
  проставляем `selectedSlot`, `selectedStaffId`, открываем sheet, чистим `pendingSlot`.
- Клик по слоту с уже выбранной услугой — как сейчас, сразу open sheet.
- Если ни одна услуга не подходит выбранному сотруднику (все услуги других позиций) — `pendingSlot`
  не ставится, показываем toast `noServicesForStaff`.

### Изменения по файлам

**`components/booking/SlotListView.tsx`**

- Удаляем state `servicePicker` и вычисление `servicesForPicker`, рендеринг блока
  "Оберіть послугу:" (~строки 383-407).
- Добавляем state `pendingSlot: { staffId: string; time: string } | null`.
- Добавляем `serviceListRef = useRef<HTMLDivElement>(null)`.
- `handleOrgSlotSelect`: если `selectedEventTypeId` пуст — считаем `allowed = eventTypes.filter(isServiceForStaff(staffMemberId))`.
  Если `allowed.length === 0` → toast и выходим. Иначе → `setPendingSlot`, `scrollIntoView`.
- Обёртка `handleEventTypeSelectWrapped(id)`: вызывает проп `onEventTypeSelect(id)`; если `pendingSlot`
  активен и выбранная услуга подходит сотруднику — `setSelectedSlot(pendingSlot.time)`,
  `setSelectedStaffId(pendingSlot.staffId)`, `setSheetOpen(true)`, `setPendingSlot(null)`.
- Проп `allowedIds` в верхний `<ServiceList>` вычисляется из `pendingSlot` + `isServiceForStaff`.
- Обёртка-див с `ref={serviceListRef}` и условный класс подсветки (`ring-2 ring-primary/40` на 1.5s
  через локальный `highlight` state + `setTimeout`).

**`components/booking/ServiceList.tsx`**

- Новый опциональный проп `allowedIds?: Set<string>`.
- Если `allowedIds` передан и id услуги не в нём → кнопка получает `disabled`, `opacity-40`,
  `cursor-not-allowed`, `onClick` не вызывается.

**`i18n/messages/{uk,en}.json`**

- Добавить ключ `booking.noServicesForStaff`:
  - uk: `"Немає доступних послуг для цього спеціаліста"`
  - en: `"No services available for this staff member"`
- Ключ `noServicesForSlot` оставляем на месте (неиспользуется, но при rollback снова понадобится).

### Откат

Одиночный коммит. Откат через `git revert <sha>` возвращает inline-попап услуг.

## Риски и принятые решения

- **Скролл на мобильных** — `scrollIntoView({ behavior: 'smooth', block: 'start' })` работает
  одинаково на desktop/mobile. Достаточно.
- **Состояние при смене сотрудника** — если у `pendingSlot` один `staffId`, а пользователь потом
  кликнул слот другого сотрудника без услуги → перезаписываем `pendingSlot` новыми значениями.
- **`pendingSlot` + ручной выбор услуги не для этого сотрудника** — sheet не открываем автоматом,
  но и не сбрасываем `pendingSlot`. Пользователь может кликнуть слот заново.
- **Personal variant** — не меняется. Попапа там и не было.

## Критерии приёмки

1. Клик по слоту без услуги: `pendingSlot` установлен, скролл вверх, верхний список подсвечен и
   отфильтрован (disabled для неподходящих услуг). Inline-блок "Оберіть послугу:" не рендерится.
2. Клик по услуге из верхнего списка при активном `pendingSlot`: открывается sheet с корректными
   `selectedSlot` и `selectedStaffId`.
3. Клик по слоту с уже выбранной услугой: sheet открывается сразу (регресс не допускается).
4. Если все услуги организации отфильтрованы для сотрудника (ни одна не подходит) — toast, sheet
   не открывается.
5. Personal variant работает как раньше.
