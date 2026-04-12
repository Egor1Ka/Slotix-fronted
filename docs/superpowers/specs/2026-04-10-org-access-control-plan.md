# План реализации: Система контроля доступа к организациям

## Шаг 1: Бэкенд — `requireOrgMember` middleware + `getMyMembership` эндпоинт

### 1.1 Добавить `requireOrgMember` в `src/middleware/orgMiddleware.js`

Аналог `requireOrgAdmin`, но без проверки роли — только active membership.

### 1.2 Добавить `getMyMembership` сервис в `src/services/orgServices.js`

Функция: `getMyMembership(orgId, userId)` — вызывает `getMembershipByUserAndOrg`, возвращает `{ role, status }` или `null`.

### 1.3 Добавить `handleGetMyMembership` контроллер в `src/controllers/orgController.js`

Вызывает `getMyMembership`, возвращает 200 с данными или 404.

### 1.4 Добавить маршрут и защитить `addStaff`

В `src/routes/subroutes/orgRoutes.js`:

- Добавить `GET /:id/my-membership` с `authMiddleware`
- Добавить `requireOrgAdmin` на `POST /:id/staff`

---

## Шаг 2: Фронтенд — API конфиг + серверная утилита проверки доступа

### 2.1 Добавить `getMyMembership` эндпоинт в `services/configs/org.config.ts`

### 2.2 Добавить тип `OrgMembership` в `services/configs/org.types.ts`

```ts
interface OrgMembership {
	role: 'owner' | 'admin' | 'member'
	status: 'active' | 'invited' | 'suspended' | 'left'
}
```

### 2.3 Экспортировать тип из `services/index.ts`

### 2.4 Создать серверную утилиту `lib/auth/check-org-access.ts`

Функция `checkOrgAccess(orgId)` — серверная (с `'server-only'`), использует cookies для запроса `GET /api/org/:id/my-membership`. Возвращает `OrgMembership | null`.

---

## Шаг 3: Фронтенд — i18n ключи для forbidden

### 3.1 Добавить ключи в `i18n/messages/en.json` и `uk.json`

Под `errors`:

```json
"orgForbiddenTitle": "Access denied",
"orgForbiddenDescription": "You don't have access to this organization.",
"orgForbiddenBack": "Go to my organizations"
```

---

## Шаг 4: Фронтенд — страница 403

### 4.1 Создать `app/[locale]/(org)/forbidden/page.tsx`

Серверный компонент с i18n. Заголовок, описание, кнопка "До моїх організацій" → `/organizations`.

---

## Шаг 5: Фронтенд — layout с проверкой доступа для `/manage/[orgId]`

### 5.1 Создать `app/[locale]/(org)/manage/[orgId]/layout.tsx`

- Вызвать `checkOrgAccess(orgId)`
- Проверить `role` in `['owner', 'admin']` и `status === 'active'`
- Если нет → `redirect` на `/{locale}/(org)/forbidden`
- Если да → render `children`

---

## Шаг 6: Фронтенд — layout с проверкой доступа для `/org/[orgId]`

### 6.1 Создать `app/[locale]/(org)/org/[orgId]/layout.tsx`

- Вызвать `checkOrgAccess(orgId)`
- Проверить `status === 'active'` (любая роль)
- Если нет → `redirect` на `/{locale}/(org)/forbidden`
- Если да → render `children`

---

## Порядок выполнения

Шаги 1 → 2 → 3,4 (параллельно) → 5,6 (параллельно)

Шаг 1 выполняется первым, т.к. фронтенд зависит от нового API эндпоинта.
