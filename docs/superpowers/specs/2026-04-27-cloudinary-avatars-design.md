# Загрузка аватарок через Cloudinary — Шаг 1

**Дата:** 2026-04-27
**Скоуп:** Личные и per-org аватарки юзеров (без логотипов организаций и фото услуг — это следующие шаги).
**Репо:**

- Frontend: `Slotix-fronted` (Next.js 16)
- Backend: `BackendTemplate` (Express 5 + Mongoose)

---

## 1. Цель

Дать юзерам возможность загружать, менять и удалять:

1. **Личную аватарку** на странице `/profile` — глобальная, единая для всего приложения
2. **Per-org аватарку** на странице `/org/{orgId}/my-profile` — отдельная для каждой организации (например, у барбершопа сотрудник может иметь профессиональное фото в форме конкретного бренда)

Подключить Cloudinary как медиа-провайдера. Архитектура должна позволять заменить Cloudinary на S3 / R2 / Backblaze без переделки кода выше уровня провайдера.

---

## 2. Зафиксированные решения

| Решение              | Выбор                                                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Модель данных        | Per-org override: `User.avatar` (глобал) + `Membership.avatar` (per-org)                                                                               |
| Display fallback     | `entity.avatar ?? <буква имени>` — без каскада с org → global                                                                                          |
| Архитектура аплоада  | Бэкенд берёт всё на себя: фронт шлёт `multipart/form-data`, бэк аплоадит в Cloudinary, возвращает готовый URL                                          |
| Crop                 | Без UI-кропа на клиенте — Cloudinary автокроп через `c_fill,g_face` в URL-трансформациях                                                               |
| UI триггер           | Отдельная кнопка "Сменить фото" под `ProfileHeader` → открывает `Dialog`                                                                               |
| Валидация на фронте  | jpeg / png / webp / gif, ≤2 MB, мин. 200×200, конфигурируется по типу ассета                                                                           |
| Удаление             | Кнопка "Удалить" в том же диалоге — чистит поле, фолбэк на букву                                                                                       |
| Provider abstraction | Фронт не знает про Cloudinary, импортирует только `mediaApi`. Cloudinary SDK живёт исключительно в `backend/src/modules/media/providers/cloudinary.js` |

---

## 3. Backend — Express + Mongoose

### 3.1. Изменения схемы

**`src/models/Membership.js`** — добавить поле:

```js
avatar: { type: String, default: '' }
```

**`src/modules/user/model/User.js`** — без изменений (поле `avatar: { type: String, default: '' }` уже существует).

### 3.2. Новый модуль `src/modules/media/`

Структура (по правилам Module Isolation):

```
src/modules/media/
├── index.js                       # public API
├── providers/
│   ├── cloudinary.js              # реализация контракта { upload, delete }
│   └── index.js                   # реестр { cloudinary }
├── services/
│   └── mediaServices.js           # uploadAvatar / deleteAvatar — провайдер-агностик
├── controller/
│   └── mediaController.js         # HTTP-хендлеры
├── routes/
│   └── mediaRoutes.js             # роут-определения
├── middleware/
│   └── upload.js                  # multer (memoryStorage, limits, fileFilter по assetType)
├── constants/
│   └── media.js                   # ASSET_LIMITS, ASSET_TYPES, белые списки MIME
└── dto/
    └── mediaDto.js                # нормализация ответа
```

**Public API** (`src/modules/media/index.js`):

```js
export { mediaRouter, uploadAvatar, deleteAvatar }
```

`uploadAvatar` / `deleteAvatar` экспортируются как сервисные функции — чтобы при удалении юзера или орг можно было чистить ассеты из других модулей.

### 3.3. Контракт провайдера

```js
// src/modules/media/providers/cloudinary.js
export default {
  upload(file, { assetType, ownerId }) → Promise<{ url: string, providerId: string }>
  delete(providerId) → Promise<void>
}
```

- `file` — `{ buffer, mimetype, originalname, size }` (то что multer кладёт в `req.file`)
- `assetType` — `'user-avatar'` или `'staff-avatar'` (определяет папку и трансформации)
- `ownerId` — детерминистичный идентификатор владельца (`userId` для личной, `${orgId}/${staffId}` для per-org)
- `providerId` — `public_id` Cloudinary, для будущих провайдеров — ключ объекта

### 3.4. Cloudinary-провайдер — детали

**Зависимость:** `npm install cloudinary multer`

**Env:**

```
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

Дополнить `.env.example`.

**Папки в Cloudinary:**

- `slotix/avatars/users/{userId}` — личная
- `slotix/avatars/staff/{orgId}/{staffId}` — per-org

**Параметры аплоада:**

```js
cloudinary.uploader.upload_stream({
	public_id: deterministicPath, // фиксированный, не случайный
	overwrite: true, // повторный аплоад перезаписывает
	resource_type: 'image',
	invalidate: true, // CDN-cache invalidation
})
```

**URL трансформации** для аватарок 400×400 с автокропом по лицу:

```
c_fill,g_face,w_400,h_400,q_auto,f_auto
```

Использовать `cloudinary.url(publicId, { transformation: [...] })` — не строить URL руками.

**Удаление:** `cloudinary.uploader.destroy(publicId, { invalidate: true })`

### 3.5. Эндпоинты

Все требуют `authMiddleware`. Регистрируются в `src/routes/routes.js`.

#### `POST /api/user/avatar`

- **Auth:** authMiddleware
- **Body:** `multipart/form-data`, поле `file`
- **Логика:**
  1. multer middleware валидирует MIME + size (по `ASSET_LIMITS['user-avatar']`)
  2. Проверить наличие `req.file` → 400 если нет
  3. `mediaServices.uploadAvatar({ assetType: 'user-avatar', ownerId: req.user.id, file: req.file })`
  4. `userServices.updateUser(req.user.id, { avatar: result.url })`
  5. Вернуть обновлённого юзера через `toUserDto`
- **Response 200:**
  ```json
  { "data": { "id": "...", "avatar": "https://res.cloudinary.com/...", "name": "...", ... },
    "statusCode": 200, "status": "success" }
  ```
- **Errors:** 400 `validationError` (нет файла / неверный MIME / превышен размер), 401 `unauthorized`, 500 `serverError`

#### `DELETE /api/user/avatar`

- **Auth:** authMiddleware
- **Логика:**
  1. Если `user.avatar` пустой — пропустить вызов провайдера
  2. Иначе `mediaServices.deleteAvatar({ assetType: 'user-avatar', ownerId: req.user.id })`
  3. `userServices.updateUser(req.user.id, { avatar: '' })`
  4. Вернуть обновлённого юзера
- **Response 200:** `{ data: { ...user, avatar: "" }, ... }`

#### `POST /api/org/:orgId/staff/:staffId/avatar`

- **Auth:** authMiddleware
- **Авторизация:** `req.user.id === staffId` ИЛИ `req.user` это owner/admin орг с `orgId`. Иначе 403 `forbidden`.
- **Body:** `multipart/form-data`, поле `file`
- **Логика:**
  1. multer валидирует
  2. Найти `Membership` по `{ userId: staffId, orgId }` → 404 если нет
  3. `mediaServices.uploadAvatar({ assetType: 'staff-avatar', ownerId: \`${orgId}/${staffId}\`, file })`
  4. Сохранить `result.url` в `membership.avatar`
  5. Вернуть обновлённую membership-DTO
- **Response 200:**
  ```json
  {
  	"data": {
  		"avatar": "https://...",
  		"displayName": "...",
  		"bio": "...",
  		"role": "...",
  		"status": "...",
  		"position": "..."
  	},
  	"statusCode": 200,
  	"status": "success"
  }
  ```

#### `DELETE /api/org/:orgId/staff/:staffId/avatar`

- Аналогично — DELETE из Cloudinary + занулить `membership.avatar`

### 3.6. Изменения существующих эндпоинтов

| Endpoint                         | Что изменить                                                                                                                            |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/user/profile`          | Без изменений — `avatar` уже возвращается                                                                                               |
| `GET /api/org/:id/my-membership` | DTO должен включать `membership.avatar` (новое поле)                                                                                    |
| `GET /api/org/:id/staff`         | Каждый элемент должен включать `membership.avatar` (per-org). Если пусто — отдавать пустую строку, **не каскадировать** к `user.avatar` |

### 3.7. Валидация (multer + контроллер)

```js
// constants/media.js
export const ASSET_LIMITS = {
	'user-avatar': {
		maxBytes: 2 * 1024 * 1024,
		mimes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
	},
	'staff-avatar': {
		maxBytes: 2 * 1024 * 1024,
		mimes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
	},
	// org-logo, service-photo — следующие шаги
}
```

- multer `memoryStorage()` — файл не пишется на диск
- `limits: { fileSize }` и `fileFilter` берутся динамически по `assetType` (роут резолвит лимит до multer'а)
- Формат ошибки соответствует контракту `httpResponse.js`:
  ```json
  {
  	"statusCode": 400,
  	"status": "validationError",
  	"data": { "file": { "error": "File size exceeds 2 MB" } }
  }
  ```

### 3.8. Безопасность

- Все эндпоинты за `authMiddleware`
- Org-эндпоинт проверяет `staffId === req.user.id || isOrgAdminOrOwner(req.user.id, orgId)` — функция-проверка живёт в org/membership-сервисе
- multer file-size limit на уровне middleware (не доверять заголовкам клиента)
- Magic-bytes проверка MIME — **не нужна для шага 1** (Cloudinary сам отвергает не-картинки). Можно добавить пакет `file-type` в будущем.
- Cloudinary секреты только в `.env`, не логируются

---

## 4. Frontend — Next.js 16

### 4.1. Новые / изменённые файлы

```
services/
├── configs/
│   ├── media.config.ts                      # mediaApi эндпоинты
│   └── media.types.ts                       # AssetType, UploadConfig
├── api/
│   └── methods.ts                           # ДОПОЛНИТЬ: postFormData (без Content-Type)
└── index.ts                                 # ЭКСПОРТ: mediaApi

components/
└── media/
    ├── AvatarUploader.tsx                   # Кнопка + Dialog + аплоад
    └── AvatarUploader.config.ts             # AVATAR_UPLOAD_CONFIG (лимиты для аватарок)

hooks/
└── use-file-validation.ts                   # validateFile(file, config) → key | null

i18n/messages/en.json                        # ДОПОЛНИТЬ ключи
i18n/messages/uk.json                        # ДОПОЛНИТЬ ключи

services/configs/org.types.ts                # ДОПОЛНИТЬ: OrgMembership.avatar: string
services/configs/booking.types.ts            # ДОПОЛНИТЬ: OrgStaffMember.avatar: string

app/[locale]/(personal)/profile/page.tsx     # ВСТАВИТЬ <AvatarUploader>
app/[locale]/(org)/org/[orgId]/my-profile/page.tsx
                                             # ВСТАВИТЬ <AvatarUploader>, заменить user.avatar → membership.avatar в ProfileHeader
```

### 4.2. `mediaApi` контракт

```ts
// services/configs/media.config.ts
import { postFormData, deleteData } from '@/services/api/methods'
import { endpoint } from '@/services/api/types'
import type { ApiResponse } from './user.config'
import type { User } from './user.config'

interface AvatarResponse {
	avatar: string
}
interface StaffMembershipAvatarResponse {
	avatar: string
	displayName: string | null
	bio: string | null
	role: 'owner' | 'admin' | 'member'
	status: 'active' | 'invited' | 'suspended' | 'left'
	position: string | null
}

const mediaApiConfig = {
	uploadUserAvatar: endpoint<FormData, ApiResponse<User>>({
		url: () => `/api/user/avatar`,
		method: postFormData,
		defaultErrorMessage: 'Failed to upload avatar',
	}),
	deleteUserAvatar: endpoint<void, ApiResponse<User>>({
		url: () => `/api/user/avatar`,
		method: deleteData,
		defaultErrorMessage: 'Failed to delete avatar',
	}),
	uploadStaffAvatar: endpoint<
		FormData,
		ApiResponse<StaffMembershipAvatarResponse>
	>({
		url: ({ orgId, staffId }) => `/api/org/${orgId}/staff/${staffId}/avatar`,
		method: postFormData,
		defaultErrorMessage: 'Failed to upload avatar',
	}),
	deleteStaffAvatar: endpoint<void, ApiResponse<StaffMembershipAvatarResponse>>(
		{
			url: ({ orgId, staffId }) => `/api/org/${orgId}/staff/${staffId}/avatar`,
			method: deleteData,
			defaultErrorMessage: 'Failed to delete avatar',
		},
	),
}
```

Использование на странице:

```ts
const formData = new FormData()
formData.append('file', file)
const response = await mediaApi.uploadUserAvatar({ body: formData })
setUser(response.data)
```

### 4.3. `postFormData` — расширение `services/api/methods.ts`

Текущий `postData` устанавливает `Content-Type: application/json` и сериализует body. Для multipart нужен метод, который:

1. Не выставляет `Content-Type` (браузер сам поставит `multipart/form-data; boundary=...`)
2. Передаёт `FormData` в `fetch()` как есть

**Важно:** проверить `services/api/request.ts` — если он принудительно ставит `Content-Type: application/json`, добавить условие `body instanceof FormData ? skip header : set header`.

### 4.4. `AvatarUploader` компонент

**Props:**

```tsx
interface AvatarUploaderProps {
	currentAvatar: string // текущий URL ('' если нет)
	fallbackText: string // имя, для генерации буквы
	config: UploadConfig // accept, maxSizeBytes, minDimensions
	onUpload: (file: File) => Promise<{ avatar: string }> // вызов mediaApi
	onDelete: () => Promise<{ avatar: string }> // вызов mediaApi
	onSuccess: (avatarUrl: string) => void // обновление родительского state
}
```

**Рендер:**

```tsx
<div className="flex flex-col items-start gap-3">
	<Button variant="outline" size="sm" onClick={openDialog}>
		{t('changePhoto')}
	</Button>
	<Dialog open={open} onOpenChange={setOpen}>
		{/* preview, file picker, validate, save, delete */}
	</Dialog>
</div>
```

Состояния (см. секцию 4 дизайна выше): `idle | selected | validating | invalid | uploading | success | error`.

**Поведение "Удалить":**

- Кнопка видна только если `currentAvatar !== ''`
- Inline-confirm: первый click → кнопка меняет текст на "Подтвердить удаление?", второй click → DELETE
- Не используем вложенный AlertDialog — слишком много модалок

### 4.5. `AVATAR_UPLOAD_CONFIG`

```ts
// components/media/AvatarUploader.config.ts
export const AVATAR_UPLOAD_CONFIG: UploadConfig = {
	accept: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
	maxSizeBytes: 2 * 1024 * 1024,
	minDimensions: { width: 200, height: 200 },
}
```

### 4.6. `use-file-validation` хук

```ts
// hooks/use-file-validation.ts
const validateFile = async (
	file: File,
	config: UploadConfig,
): Promise<string | null> => {
	if (!config.accept.includes(file.type)) return 'errors.upload.invalidFormat'
	if (file.size > config.maxSizeBytes) return 'errors.upload.tooLarge'
	if (config.minDimensions) {
		const dims = await readImageDimensions(file)
		if (
			dims.width < config.minDimensions.width ||
			dims.height < config.minDimensions.height
		)
			return 'errors.upload.tooSmall'
	}
	return null
}

const readImageDimensions = (file: File) =>
	new Promise<{ width: number; height: number }>((resolve, reject) => {
		const img = new Image()
		img.onload = () =>
			resolve({ width: img.naturalWidth, height: img.naturalHeight })
		img.onerror = reject
		img.src = URL.createObjectURL(file)
	})
```

Возвращает i18n-ключ ошибки или `null`. Toast показывает страница / компонент через `t(key, { max: '2 MB' })`.

### 4.7. Изменения существующих файлов

**`services/configs/org.types.ts`:**

```diff
 interface OrgMembership {
+  avatar: string
   role: 'owner' | 'admin' | 'member'
   status: 'active' | 'invited' | 'suspended' | 'left'
   displayName: string | null
   ...
 }
```

**`services/configs/booking.types.ts`** — `OrgStaffMember`: добавить `avatar: string`.

**`services/configs/user.config.ts`** — `UpdateUserBody` НЕ менять (avatar обновляется отдельным эндпоинтом, не через generic update).

**`app/[locale]/(personal)/profile/page.tsx`** — после `<ProfileHeader>` добавить:

```tsx
<AvatarUploader
	currentAvatar={user.avatar}
	fallbackText={user.name}
	config={AVATAR_UPLOAD_CONFIG}
	onUpload={(file) => {
		const fd = new FormData()
		fd.append('file', file)
		return mediaApi
			.uploadUserAvatar({ body: fd })
			.then((r) => ({ avatar: r.data.avatar }))
	}}
	onDelete={() =>
		mediaApi.deleteUserAvatar().then((r) => ({ avatar: r.data.avatar }))
	}
	onSuccess={(avatar) => setUser((prev) => (prev ? { ...prev, avatar } : prev))}
/>
```

**`app/[locale]/(org)/org/[orgId]/my-profile/page.tsx`:**

1. Заменить `<ProfileHeader avatar={user.avatar} ...>` → `<ProfileHeader avatar={membership.avatar} ...>`
2. Добавить `<AvatarUploader>` с `mediaApi.uploadStaffAvatar({ pathParams: { orgId, staffId: user.id }, body: fd })`
3. На успех — `setMembership((prev) => prev ? { ...prev, avatar } : prev)`

### 4.8. i18n ключи

Добавить в `i18n/messages/en.json` и `uk.json`:

```json
{
	"profile": {
		"changePhoto": "Change photo",
		"removePhoto": "Remove photo",
		"confirmRemove": "Confirm remove?",
		"uploadingPhoto": "Uploading...",
		"photoUpdated": "Photo updated"
	},
	"errors": {
		"upload": {
			"invalidFormat": "Invalid file format. Allowed: JPEG, PNG, WebP, GIF",
			"tooLarge": "File too large (max {max})",
			"tooSmall": "Image too small (min {min})"
		}
	}
}
```

---

## 5. Порядок реализации

1. **Backend сначала** — нельзя тестировать фронт без работающих эндпоинтов
2. После того как бэк отвечает на curl-запросы корректно — фронт

Каждая фаза получит свой план в `writing-plans` (потенциально два отдельных плана).

---

## 6. Acceptance Criteria

### Backend

- [ ] `npm install cloudinary multer` — зависимости в `package.json`
- [ ] `Membership.js` имеет поле `avatar`
- [ ] Создан модуль `src/modules/media/` по правилам Module Isolation
- [ ] Cloudinary-вызовы изолированы в `providers/cloudinary.js`, контракт `{ upload, delete }`
- [ ] 4 новых эндпоинта работают и возвращают правильный формат
- [ ] DTO `getMyMembership` и `getStaff` включают `avatar`
- [ ] Загрузка файла >2 MB → `400 validationError`
- [ ] Загрузка не-картинки → `400 validationError`
- [ ] Загрузка без авторизации → `401`
- [ ] Загрузка чужой staff-аватарки не-админом → `403`
- [ ] После DELETE объект в Cloudinary удалён (проверить в дашборде)
- [ ] Повторная загрузка перезаписывает старую (`overwrite: true`)
- [ ] `.env.example` пополнен переменными `CLOUDINARY_*`

### Frontend

- [ ] `mediaApi` экспортируется из `services/index.ts`
- [ ] `postFormData` работает (не выставляет `Content-Type`, передаёт `FormData`)
- [ ] `AvatarUploader` рендерится на `/profile` и `/org/[orgId]/my-profile`
- [ ] Личная страница: загрузка → новая аватарка отображается без рефреша
- [ ] Орг-страница: загрузка per-org → отображается в `ProfileHeader`, **не** ломает глобальную
- [ ] Удаление личной аватарки → fallback-буква показывается
- [ ] Удаление орг-аватарки → fallback-буква (НЕ глобальная) показывается
- [ ] Файл >2 MB → toast с ошибкой, диалог не закрывается
- [ ] Файл не из белого списка форматов → toast с ошибкой
- [ ] Файл <200×200 → toast с ошибкой
- [ ] При успехе диалог автоматически закрывается, тост "Photo updated"
- [ ] Сетевая ошибка от бэка → существующий toast-interceptor показывает сообщение, диалог не закрывается
- [ ] i18n ключи добавлены в `en.json` и `uk.json`
- [ ] `npm run lint` и `npm run build` проходят

---

## 7. Out of scope (следующие шаги)

- Логотипы организаций (`Organization.logo`)
- Фото услуг / event types / cover-фото бронирования
- In-browser cropping (зум, драг, ручная маска)
- Ресайз на клиенте перед отправкой
- Множественная загрузка / галереи
- Direct signed uploads из браузера (миграция с архитектуры A на C)
- Drag & drop по всей странице (только внутри диалога)

Архитектура (`mediaServices` + `providers/cloudinary.js` + `ASSET_LIMITS` + `mediaApi` + `AvatarUploader`) должна позволить добавить новые типы ассетов без переработки.
