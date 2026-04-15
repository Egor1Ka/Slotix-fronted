# Default Calendar View By Config Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Публичные booking-ссылки открывать в режиме `'list'`, внутренние staff/org страницы — в `'day'`. Дефолт берётся из пресета `CalendarViewConfig`, URL `?view=` продолжает перекрывать.

**Architecture:** Добавляем обязательное поле `defaultView: ViewMode` в `CalendarViewConfig`. Public-пресеты получают `'list'`, internal — `'day'`. Страницы, читающие `view` из URL, используют `viewConfig.defaultView` как fallback вместо литерала `'day'`.

**Tech Stack:** Next.js 15 (App Router, client components), TypeScript, React Context (`CalendarViewConfigProvider`).

---

## File Structure

- `lib/calendar/view-config.ts` — интерфейс + 4 пресета (`ORG_PUBLIC_CONFIG`, `ORG_ADMIN_CONFIG`, `STAFF_PUBLIC_CONFIG`, `STAFF_SELF_CONFIG`).
- `lib/calendar/CalendarCore.tsx` — `DEFAULT_VIEW_CONFIG` fallback для случая без провайдера.
- `app/[locale]/book/[staffSlug]/BookingPage.tsx` — клиентский компонент booking-страницы, читает `view` из URL (строка 98).
- `components/booking/OrgCalendarPage.tsx` — клиентский компонент org-страницы, читает `view` из URL (строка 84).

Все изменения делаются в одном коммите на задачу, чтобы репозиторий компилировался на каждом шаге.

---

### Task 1: Расширить `CalendarViewConfig` полем `defaultView`

**Files:**
- Modify: `lib/calendar/view-config.ts`
- Modify: `lib/calendar/CalendarCore.tsx:47-58`

Цель — добавить поле в интерфейс и заполнить его во всех пресетах и в fallback-конфиге одновременно, чтобы TypeScript оставался зелёным.

- [ ] **Step 1: Добавить поле в интерфейс и пресеты**

В `lib/calendar/view-config.ts` заменить интерфейс и все 4 пресета на:

```ts
import type { ViewMode } from './types'

interface CalendarViewConfig {
  blockedTimeVisibility: 'hidden' | 'grey' | 'full'
  columnHeader: 'date' | 'staff'
  showStaffTabs: boolean
  staffTabBehavior: 'select-one' | 'show-all'
  onEmptyCellClick: 'open-booking-flow' | 'none'
  onBlockClick: 'open-booking-details' | 'none'
  canBookForClient: boolean
  filterByStaffCapability: boolean
  showScheduleEditor: boolean
  allowListView: boolean
  defaultView: ViewMode
}

const ORG_PUBLIC_CONFIG: CalendarViewConfig = {
  blockedTimeVisibility: 'grey',
  columnHeader: 'staff',
  showStaffTabs: true,
  staffTabBehavior: 'select-one',
  onEmptyCellClick: 'open-booking-flow',
  onBlockClick: 'none',
  canBookForClient: true,
  filterByStaffCapability: true,
  showScheduleEditor: false,
  allowListView: true,
  defaultView: 'list',
}

const ORG_ADMIN_CONFIG: CalendarViewConfig = {
  blockedTimeVisibility: 'full',
  columnHeader: 'staff',
  showStaffTabs: true,
  staffTabBehavior: 'select-one',
  onEmptyCellClick: 'open-booking-flow',
  onBlockClick: 'open-booking-details',
  canBookForClient: true,
  filterByStaffCapability: true,
  showScheduleEditor: true,
  allowListView: true,
  defaultView: 'day',
}

const STAFF_PUBLIC_CONFIG: CalendarViewConfig = {
  blockedTimeVisibility: 'grey',
  columnHeader: 'date',
  showStaffTabs: false,
  staffTabBehavior: 'select-one',
  onEmptyCellClick: 'open-booking-flow',
  onBlockClick: 'none',
  canBookForClient: true,
  filterByStaffCapability: false,
  showScheduleEditor: false,
  allowListView: true,
  defaultView: 'list',
}

const STAFF_SELF_CONFIG: CalendarViewConfig = {
  blockedTimeVisibility: 'full',
  columnHeader: 'date',
  showStaffTabs: false,
  staffTabBehavior: 'select-one',
  onEmptyCellClick: 'open-booking-flow',
  onBlockClick: 'open-booking-details',
  canBookForClient: true,
  filterByStaffCapability: false,
  showScheduleEditor: false,
  allowListView: true,
  defaultView: 'day',
}

export {
  ORG_PUBLIC_CONFIG,
  ORG_ADMIN_CONFIG,
  STAFF_PUBLIC_CONFIG,
  STAFF_SELF_CONFIG,
}
export type { CalendarViewConfig }
```

- [ ] **Step 2: Обновить `DEFAULT_VIEW_CONFIG` в `CalendarCore.tsx`**

В `lib/calendar/CalendarCore.tsx` в объекте `DEFAULT_VIEW_CONFIG` (строки 47-58) добавить последним полем:

```ts
const DEFAULT_VIEW_CONFIG: CalendarViewConfig = {
  blockedTimeVisibility: 'full',
  columnHeader: 'date',
  showStaffTabs: false,
  staffTabBehavior: 'select-one',
  onEmptyCellClick: 'open-booking-flow',
  onBlockClick: 'none',
  canBookForClient: false,
  filterByStaffCapability: false,
  showScheduleEditor: false,
  allowListView: false,
  defaultView: 'day',
}
```

- [ ] **Step 3: Проверить, что TypeScript и линт зелёные**

Run: `npx tsc --noEmit`
Expected: без ошибок.

Run: `npx eslint lib/calendar/view-config.ts lib/calendar/CalendarCore.tsx`
Expected: без ошибок.

- [ ] **Step 4: Commit**

```bash
git add lib/calendar/view-config.ts lib/calendar/CalendarCore.tsx
git commit -m "feat(calendar): добавить defaultView в CalendarViewConfig

Public-пресеты — 'list', internal — 'day'. Пока не используется; подключим на следующих шагах."
```

---

### Task 2: `BookingPage` использует `viewConfig.defaultView`

**Files:**
- Modify: `app/[locale]/book/[staffSlug]/BookingPage.tsx:98`

- [ ] **Step 1: Заменить литерал `'day'` на `viewConfig.defaultView`**

В `app/[locale]/book/[staffSlug]/BookingPage.tsx` строка 98:

```ts
// было
const view = (searchParams.get('view') as ViewMode) ?? 'day'

// стало
const view = (searchParams.get('view') as ViewMode) ?? viewConfig.defaultView
```

`viewConfig` уже читается выше в компоненте (строка 89: `const viewConfig = useViewConfig()`), добавлять импорт не нужно.

- [ ] **Step 2: Проверить TypeScript**

Run: `npx tsc --noEmit`
Expected: без ошибок.

- [ ] **Step 3: Ручная проверка в браузере**

Run (если dev-сервер не запущен): `npm run dev`

Открыть публичную ссылку сотрудника: `http://localhost:3000/en/book/<staffSlug>` (без `?view=...`).
Expected: страница открывается в режиме **List** (тумблер в правом верхнем углу в состоянии «List»).

Открыть ту же страницу с `?view=day`:
Expected: страница открывается в режиме **Day** (URL перекрывает дефолт).

Открыть личную страницу сотрудника: `http://localhost:3000/en/schedule` (требует логина).
Expected: открывается в режиме **Day** (без изменений).

- [ ] **Step 4: Commit**

```bash
git add app/[locale]/book/[staffSlug]/BookingPage.tsx
git commit -m "feat(booking): дефолтный вью из пресета для публичной ссылки сотрудника

STAFF_PUBLIC_CONFIG → 'list', STAFF_SELF_CONFIG → 'day'. ?view= в URL перекрывает."
```

---

### Task 3: `OrgCalendarPage` использует `viewConfig.defaultView`

**Files:**
- Modify: `components/booking/OrgCalendarPage.tsx:84`

- [ ] **Step 1: Проверить, что `viewConfig` уже доступен в компоненте**

Run: `grep -n "useViewConfig\|viewConfig" components/booking/OrgCalendarPage.tsx`
Expected: хотя бы одна строка с `useViewConfig()` или `viewConfig.` — компонент уже читает пресет (см. строку 276: `canBookForClient: viewConfig.canBookForClient`). Если `viewConfig` не объявлен рядом со строкой 84, добавить выше (после существующих хуков): `const viewConfig = useViewConfig()` и импорт `useViewConfig` из `@/lib/calendar/CalendarViewConfigContext`.

- [ ] **Step 2: Заменить литерал `'day'` на `viewConfig.defaultView`**

В `components/booking/OrgCalendarPage.tsx` строка 84:

```ts
// было
const view = (searchParams.get('view') as ViewMode) ?? 'day'

// стало
const view = (searchParams.get('view') as ViewMode) ?? viewConfig.defaultView
```

- [ ] **Step 3: Проверить TypeScript**

Run: `npx tsc --noEmit`
Expected: без ошибок.

- [ ] **Step 4: Ручная проверка в браузере**

Открыть публичную ссылку организации: `http://localhost:3000/en/org/<orgId>` (без `?view=...`).
Expected: страница открывается в режиме **List**.

Открыть ту же страницу с `?view=week`:
Expected: страница открывается в режиме **Week**.

Открыть админку организации: `http://localhost:3000/en/manage/<orgId>` (требует прав).
Expected: открывается в режиме **Day** (без изменений).

- [ ] **Step 5: Commit**

```bash
git add components/booking/OrgCalendarPage.tsx
git commit -m "feat(booking): дефолтный вью из пресета для публичной org-ссылки

ORG_PUBLIC_CONFIG → 'list', ORG_ADMIN_CONFIG → 'day'. ?view= в URL перекрывает."
```

---

## Self-Review

**Spec coverage:** Все 4 файла из спека покрыты задачами. Значения `defaultView` по пресетам совпадают с таблицей в спеке. Поведение URL override явно проверяется в ручной проверке Task 2 и Task 3.

**Placeholder scan:** Нет TBD/TODO/«handle edge cases» — каждый шаг содержит конечный код или команду.

**Type consistency:** `defaultView: ViewMode` используется в интерфейсе, во всех пресетах, в `DEFAULT_VIEW_CONFIG` и в двух call-site. Тип `ViewMode` уже импортируется из `./types` в `view-config.ts` и в обоих компонентах.

**Manual-only validation:** Юнит-тест «дефолтное значение в пресете» был бы тавтологичным (`expect(STAFF_PUBLIC_CONFIG.defaultView).toBe('list')`), а поведение URL-override уже покрыто браузерной проверкой. Автотесты в плане не предусмотрены осознанно.
