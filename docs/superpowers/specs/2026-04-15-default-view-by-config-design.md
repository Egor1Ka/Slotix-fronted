# Default calendar view by config preset

## Problem

Календарь по умолчанию открывается в режиме `'day'` на всех страницах, где он используется. Для публичных booking-ссылок (клиент без логина) это неудобно: клиенту нужен список доступных слотов, а не сетка дня. Внутри аккаунта (staff/org dashboard) дневной календарь остаётся желаемым поведением.

## Goal

Публичные страницы открываются в режиме `'list'` по умолчанию. Внутренние (staff self, org admin) — в `'day'` (без изменений). Параметр `?view=...` в URL продолжает перекрывать дефолт, чтобы shareable links и back/forward не ломались.

## Design

Различие между публичным и внутренним контекстом уже закодировано в четырёх пресетах `CalendarViewConfig` (`lib/calendar/view-config.ts`), которые выбираются на уровне Next.js-страницы через `CalendarViewConfigProvider`. Это единственное место, где известно «кто смотрит на календарь», — туда и помещаем дефолтный вью.

### Изменение в `CalendarViewConfig`

Добавить обязательное поле:

```ts
interface CalendarViewConfig {
	// ... существующие поля
	defaultView: ViewMode // 'day' | 'week' | 'month' | 'list'
}
```

### Значения по пресетам

| Preset                | `defaultView` | Контекст                     |
| --------------------- | ------------- | ---------------------------- |
| `STAFF_PUBLIC_CONFIG` | `'list'`      | Публичная ссылка сотрудника  |
| `ORG_PUBLIC_CONFIG`   | `'list'`      | Публичная ссылка организации |
| `STAFF_SELF_CONFIG`   | `'day'`       | Личная страница сотрудника   |
| `ORG_ADMIN_CONFIG`    | `'day'`       | Админка организации          |

Во всех пресетах уже стоит `allowListView: true`, так что `'list'` валиден везде.

### Использование

`app/[locale]/book/[staffSlug]/BookingPage.tsx` (строка 98):

```ts
// было
const view = (searchParams.get('view') as ViewMode) ?? 'day'

// стало
const view = (searchParams.get('view') as ViewMode) ?? viewConfig.defaultView
```

`components/booking/OrgCalendarPage.tsx` — аналогичная замена в месте, где читается `view` из `searchParams`.

### Fallback в `CalendarCore`

В `CalendarCore.tsx` есть `DEFAULT_VIEW_CONFIG` — fallback для случая, когда `useViewConfig()` вызывается вне провайдера. Добавить в него `defaultView: 'day'`, чтобы не падал тип.

## Files

- `lib/calendar/view-config.ts` — добавить поле в интерфейс и во все 4 пресета.
- `app/[locale]/book/[staffSlug]/BookingPage.tsx` — использовать `viewConfig.defaultView` вместо литерала `'day'`.
- `components/booking/OrgCalendarPage.tsx` — то же самое.
- `lib/calendar/CalendarCore.tsx` — добавить `defaultView: 'day'` в `DEFAULT_VIEW_CONFIG`.

## Non-goals

- Не меняем UI тумблера List/Calendar.
- Не меняем логику навигации (prev/next, switch to day on click).
- Не трогаем `SlotListView` — UI списка уже готов и работает.
- Не вводим user preference «запомнить выбор» — scope ограничен дефолтом по контексту.

## Backwards compatibility

- Shareable links с `?view=day` / `?view=week` / `?view=month` продолжают работать.
- Back/forward в браузере не ломается — URL-источник истины не меняется.
- Пользователь всегда может переключиться вручную тумблером.
