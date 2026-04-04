# Профили и описания — дизайн-спека

## Цель

Добавить возможность заполнять описания/контактную информацию для трёх уровней:

- **Организация** — описание компании, адрес, телефон, вебсайт
- **Личный пользователь** (работает сам на себя) — описание, адрес, телефон, вебсайт
- **Сотрудник в организации** — bio (короткое описание)

Отображать эту информацию на публичной странице букинга (`/book/...`).

Дополнительно: удалить `slug` из организации.

---

## 1. Изменения типов данных

### Организация

**`OrgByIdResponse`** — убираем `slug`, добавляем новые поля:

```typescript
interface OrgByIdResponse {
	id: string
	name: string
	logo: string | null
	description: string | null
	address: string | null
	phone: string | null
	website: string | null
}
```

**`OrgListItem`** — убираем `slug` (остальное без изменений).

**`CreateOrgBody`** — добавляем опциональные поля:

```typescript
interface CreateOrgBody {
	name: string
	currency: 'UAH' | 'USD'
	logoUrl?: string
	brandColor?: string
	defaultTimezone?: string
	defaultCountry?: string
	description?: string
	address?: string
	phone?: string
	website?: string
}
```

**`UpdateOrgBody`** — новый тип (или расширение существующего):

```typescript
interface UpdateOrgBody {
	name?: string
	description?: string | null
	address?: string | null
	phone?: string | null
	website?: string | null
	logoUrl?: string
	brandColor?: string
}
```

### Пользователь

**`User`** — добавляем поля:

```typescript
interface User {
	id: string
	name: string
	email: string
	avatar: string
	description: string | null
	address: string | null
	phone: string | null
	website: string | null
	createdAt: string
	updatedAt: string
}
```

**`UpdateUserBody`** — расширяем:

```typescript
interface UpdateUserBody {
	name?: string
	description?: string | null
	address?: string | null
	phone?: string | null
	website?: string | null
}
```

### Сотрудник

**`StaffMember`** и **`StaffBySlugResponse`** — добавляем `bio`:

```typescript
interface StaffMember {
	id: string
	name: string
	avatar: string
	position: string | null
	bio: string | null
}

interface StaffBySlugResponse {
	id: string
	name: string
	avatar: string
	position: string | null
	bio: string | null
	orgId: string | null
	locationIds: string[]
	description: string | null
	address: string | null
	phone: string | null
	website: string | null
	orgName: string | null
	orgLogo: string | null
}
```

Поля `description`, `address`, `phone`, `website`, `orgName`, `orgLogo` — бэкенд заполняет из данных организации (если `orgId` есть) или из профиля пользователя (если личный). Это позволяет букинг-странице получить всю нужную информацию одним запросом `GET /api/staff/{slug}` без аутентификации.

**`OrgStaffMember`** — наследует `bio` от `StaffMember`.

---

## 2. Страницы редактирования

### 2.1 Профиль организации

**Путь:** `/manage/[orgId]/profile`

**Расположение:** новый пункт в сайдбаре организации.

**Форма (react-hook-form + zod):**

| Поле          | Тип      | Валидация                      |
| ------------- | -------- | ------------------------------ |
| `name`        | Input    | Обязательно, min 2 символа     |
| `description` | Textarea | Опционально, max 1000 символов |
| `address`     | Input    | Опционально                    |
| `phone`       | Input    | Опционально, формат телефона   |
| `website`     | Input    | Опционально, формат URL        |

**API:** `PUT /api/org/{orgId}` с `UpdateOrgBody`.

### 2.2 Мой профиль (личный)

**Путь:** `/profile` (в personal layout)

**Расположение:** новый пункт в сайдбаре личного кабинета.

**Форма:**

| Поле          | Тип      | Валидация                      |
| ------------- | -------- | ------------------------------ |
| `name`        | Input    | Обязательно, min 2 символа     |
| `description` | Textarea | Опционально, max 1000 символов |
| `address`     | Input    | Опционально                    |
| `phone`       | Input    | Опционально, формат телефона   |
| `website`     | Input    | Опционально, формат URL        |

**API:** `PUT /api/user/profile` с `UpdateUserBody`.

### 2.3 Bio сотрудника

**Контекст:** сотрудник в организации редактирует свой bio.

**Расположение:** отдельная страница `/org/[orgId]/my-profile` в контексте организации. Новый пункт в сайдбаре сотрудника.

**Форма:**

| Поле  | Тип      | Валидация                     |
| ----- | -------- | ----------------------------- |
| `bio` | Textarea | Опционально, max 500 символов |

**API:** `PATCH /api/org/{orgId}/staff/{staffId}` с `{ bio: string | null }`.

---

## 3. Отображение на букинге

### 3.1 Инфо-блок

Показывается над списком услуг / календарём на странице `/book/...`.

**Если букинг через организацию** (staff имеет `orgId`):

- Лого организации + название
- Описание организации (если есть)
- Адрес — текст с иконкой `MapPin`
- Телефон — кликабельная ссылка `tel:` с иконкой `Phone`
- Вебсайт — кликабельная внешняя ссылка с иконкой `Globe`
- При выборе сотрудника — под аватаром/именем/позицией отображается `bio`

**Если букинг личный** (staff без `orgId`):

- Аватар + имя пользователя
- Описание (если есть)
- Адрес, телефон, вебсайт (аналогично орге)

### 3.2 Правила отображения

- Пустые поля (`null`) не рендерятся — нет адреса, нет строки
- Длинное описание обрезается с кнопкой "показати ще" / "show more"
- Контактные данные кликабельны:
  - Телефон → `<a href="tel:...">`
  - Вебсайт → `<a href="..." target="_blank" rel="noopener noreferrer">`
  - Адрес — просто текст
- Блок компактный, не занимает много вертикального пространства

### 3.3 Данные

Все данные для инфо-блока приходят из одного публичного запроса `GET /api/staff/{slug}` (расширенный `StaffBySlugResponse`):

- `description`, `address`, `phone`, `website` — контактные данные (от орги или от юзера)
- `orgName`, `orgLogo` — название и лого организации (если есть)
- `bio` — описание сотрудника

Дополнительных запросов не требуется. Бэкенд сам подставляет контактные данные из орги или профиля пользователя.

---

## 4. Удаление slug из организации

- Убрать `slug` из `OrgByIdResponse`
- Убрать `slug` из `OrgListItem`
- Убрать из `CreateOrgBody` если присутствует
- Вычистить все использования `org.slug` в коде
- Организация идентифицируется только по `id`

---

## 5. Файлы, затронутые изменениями

### Типы и API-конфиги

- `services/configs/org.types.ts` — типы организации
- `services/configs/org.config.ts` — эндпоинты организации (добавить update)
- `services/configs/booking.types.ts` — типы Staff, User
- `services/configs/user.config.ts` — эндпоинты пользователя

### Новые страницы

- `app/[locale]/(org)/manage/[orgId]/profile/page.tsx` — профиль организации
- `app/[locale]/(personal)/profile/page.tsx` — мой профиль

### Компоненты

- Новый компонент формы профиля (переиспользуемый для орги и личного)
- Сайдбар организации — добавить пункт "Профіль"
- Сайдбар личный — добавить пункт "Мій профіль"

### Букинг

- `components/booking/BookingPanel.tsx` или новый компонент — инфо-блок
- `app/[locale]/book/[staffSlug]/BookingPage.tsx` — передача данных

### Очистка slug

- Все файлы, использующие `org.slug`

---

## 6. i18n

Новые ключи перевода в `i18n/messages/{en,uk}.json`:

- `profile.title` — "Профіль" / "Profile"
- `profile.description` — "Опис" / "Description"
- `profile.address` — "Адреса" / "Address"
- `profile.phone` — "Телефон" / "Phone"
- `profile.website` — "Вебсайт" / "Website"
- `profile.bio` — "Про себе" / "About"
- `profile.save` — "Зберегти" / "Save"
- `profile.showMore` — "Показати ще" / "Show more"
- `profile.showLess` — "Сховати" / "Show less"
- Ключи для заголовків сторінок: "Профіль організації", "Мій профіль"
