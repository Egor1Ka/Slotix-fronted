# Система контроля доступа к организациям

**Дата:** 2026-04-10
**Статус:** Draft

## Проблема

Любой аутентифицированный пользователь может зайти на страницы управления чужой организацией (`/manage/[orgId]/*`), просто подставив `orgId` в URL. Проверка доступа отсутствует — и на фронтенде, и частично на бэкенде.

## Решения

### Бэкенд

#### 1. Новый эндпоинт `GET /org/:id/my-membership`

Возвращает membership текущего пользователя в организации.

**Маршрут:** `GET /api/org/:id/my-membership`
**Middleware:** `authMiddleware`
**Ответ (200):**

```json
{
	"statusCode": 200,
	"status": "success",
	"data": {
		"role": "owner",
		"status": "active"
	}
}
```

**Ответ (404):** если пользователь не является членом организации.

#### 2. Новый middleware `requireOrgMember`

Аналог `requireOrgAdmin`, но принимает любую активную роль (`owner`, `admin`, `member`).

```js
const requireOrgMember = (getOrgId) => async (req, res, next) => {
	const orgId = getOrgId(req)
	const membership = await Membership.findOne({
		userId: req.user.id,
		orgId,
		status: 'active',
	})
	if (!membership) {
		return httpResponse(res, generalStatus.UNAUTHORIZED)
	}
	req.membership = membership
	next()
}
```

#### 3. Защита эндпоинтов

| Эндпоинт                     | Сейчас            | После                                |
| ---------------------------- | ----------------- | ------------------------------------ |
| `GET /org/:id`               | публичный         | публичный (для бронирования)         |
| `GET /org/:id/staff`         | публичный         | публичный (для бронирования)         |
| `GET /org/:id/my-membership` | —                 | `authMiddleware` (новый)             |
| `PUT /org/:id`               | `requireOrgAdmin` | без изменений                        |
| `POST /org/:id/staff`        | `authMiddleware`  | `authMiddleware` + `requireOrgAdmin` |

### Фронтенд

#### 1. Новый API эндпоинт в конфиге

Добавить `getMyMembership` в `org.config.ts`:

```ts
getMyMembership: endpoint<void, ApiResponse<{ role: string; status: string }>>({
	url: ({ id }) => `/api/org/${id}/my-membership`,
	method: getData,
	defaultErrorMessage: 'Failed to check membership',
})
```

#### 2. Два layout с проверкой доступа

**`app/[locale]/(org)/manage/[orgId]/layout.tsx`** — layout для админских страниц:

- Fetch `GET /org/:id/my-membership`
- Проверить `role` in `['owner', 'admin']` и `status === 'active'`
- Если нет доступа → redirect на страницу 403

**`app/[locale]/(org)/org/[orgId]/layout.tsx`** — layout для страниц сотрудников:

- Fetch `GET /org/:id/my-membership`
- Проверить `status === 'active'` (любая роль)
- Если нет доступа → redirect на страницу 403

Текущий `app/[locale]/(org)/layout.tsx` остаётся как есть — отвечает за аутентификацию и общий UI (sidebar, header).

#### 3. Страница 403 Forbidden

**`app/[locale]/(org)/forbidden/page.tsx`** — серверный компонент:

- Заголовок: "Доступ заборонено"
- Описание: "У вас немає доступу до цієї організації"
- Кнопка: "До моїх організацій" → `/organizations`
- i18n ключи в `errors.forbidden.*`

#### 4. Утилита проверки доступа

Серверная функция `checkOrgAccess(orgId, requiredRoles?)`:

- Используется из layout для fetch membership
- Вызывает `orgApi.getMyMembership` с серверными cookies
- Возвращает membership или `null`
- Layout решает: redirect или render

### Поток данных

```
Пользователь → /manage/[orgId]/profile
  → (org)/layout.tsx: getUser() → auth check ✓
    → manage/[orgId]/layout.tsx: checkOrgAccess(orgId, ['owner', 'admin'])
      → membership найден и роль подходит → render children
      → membership не найден или роль не подходит → redirect /forbidden
        → forbidden/page.tsx: "Доступ заборонено" + кнопка назад

Пользователь → /org/[orgId]/my-schedule
  → (org)/layout.tsx: getUser() → auth check ✓
    → org/[orgId]/layout.tsx: checkOrgAccess(orgId)
      → membership найден и active → render children
      → нет → redirect /forbidden
```

### i18n ключи

```json
{
	"errors": {
		"forbidden": {
			"title": "Доступ заборонено",
			"description": "У вас немає доступу до цієї організації",
			"backToOrgs": "До моїх організацій"
		}
	}
}
```

### Что НЕ меняется

- Публичные страницы бронирования (`/org/[orgId]` в `(public)`) — без авторизации
- `GET /org/:id` и `GET /org/:id/staff` — остаются публичными
- Текущий OrgLayout — остаётся, отвечает за auth + UI
- OrgSidebar — без изменений (данные org публичные)

### Безопасность

- **Фронтенд** — первая линия защиты, предотвращает показ UI
- **Бэкенд** — основная линия защиты, предотвращает мутации данных
- Даже если фронтенд обойти, бэкенд не даст изменить чужие данные
