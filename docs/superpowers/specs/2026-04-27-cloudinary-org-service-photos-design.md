# Загрузка фото организации и услуг через Cloudinary

**Дата:** 2026-04-27
**Скоуп:** Расширение медиа-модуля шага 1 — лого организации + фото услуг (`EventType`).
**Репо:**

- Frontend: `Slotix-fronted` (Next.js 16)
- Backend: `BackendTemplate` (Express 5 + Mongoose)

**Зависит от:** [`2026-04-27-cloudinary-avatars-design.md`](./2026-04-27-cloudinary-avatars-design.md) (Шаг 1 — юзер-аватарки). Архитектурно использует тот же `media`-модуль, провайдер, реестр `ASSET_TYPES` и `<AvatarUploader>`.

---

## 1. Цель

Позволить:

1. **Лого организации** — `owner`/`admin` орг загружают/меняют/удаляют лого через тот же flow, что аватарки. Заменяет ручное заполнение `Organization.settings.logoUrl` через PATCH.
2. **Фото услуги** — для каждой услуги (`EventType`) — `org` или `solo` — можно загрузить квадратную картинку, которая отображается при выборе услуги в публичном флоу и в админке.

Архитектурно — никаких новых паттернов: расширяем существующий `ASSET_TYPES` реестр и переиспользуем `<AvatarUploader>` через опциональный `labels`-prop.

**Не входит в этот спек:** SEO / Open Graph для публичных страниц. Это план #2 того же спека (после).

---

## 2. Зафиксированные решения

| Решение                                   | Выбор                                                                                   |
| ----------------------------------------- | --------------------------------------------------------------------------------------- |
| Где хранить лого                          | Существующее `Organization.settings.logoUrl` — заменяем механизм заполнения, поле то же |
| Где хранить фото услуги                   | Новое поле `EventType.image: String, default: ''`                                       |
| Solo-услуги (`type='solo'`, `userId` set) | Поддерживают загрузку фото                                                              |
| Формат                                    | Одно квадратное изображение 400×400, автокроп `g_auto` (не `g_face`)                    |
| Авторизация лого                          | `owner` / `admin` орг                                                                   |
| Авторизация фото услуги (org)             | `owner` / `admin` той же орг                                                            |
| Авторизация фото услуги (solo)            | `eventType.userId === req.user.id`                                                      |
| Валидация                                 | jpeg/png/webp/gif, ≤2 MB, мин. 200×200 — те же лимиты, что у аватарок                   |
| UI лого                                   | Секция «Логотип» на `manage/[orgId]/profile/page.tsx`                                   |
| UI фото услуги                            | Блок «Фото» в диалоге редактирования услуги на `manage/[orgId]/services/page.tsx`       |
| Создание услуги                           | На этапе создания фото скрыто. После сохранения — открыть редактирование и загрузить    |
| Отображение фото услуги при выборе        | Миниатюра в карточках выбора услуги (fallback-буква)                                    |
| `UpdateOrgBody.logoUrl`                   | Удаляется из принимаемого body — теперь поле read-only через update                     |

---

## 3. Backend — Express + Mongoose

### 3.1. Изменения схемы

**`src/models/EventType.js`** — добавить:

```js
image: { type: String, default: '' }
```

**`src/models/Organization.js`** — без изменений. Используем существующее `settings.logoUrl`.

### 3.2. Расширение реестра ассетов

**`src/modules/media/constants/media.js`:**

```js
export const ASSET_TYPES = Object.freeze({
	USER_AVATAR: 'user-avatar',
	STAFF_AVATAR: 'staff-avatar',
	ORG_LOGO: 'org-logo', // новый
	SERVICE_PHOTO: 'service-photo', // новый
})

const COMMON_IMAGE_LIMITS = {
	maxBytes: 2 * 1024 * 1024,
	mimes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
}

export const ASSET_LIMITS = Object.freeze({
	[ASSET_TYPES.USER_AVATAR]: COMMON_IMAGE_LIMITS,
	[ASSET_TYPES.STAFF_AVATAR]: COMMON_IMAGE_LIMITS,
	[ASSET_TYPES.ORG_LOGO]: COMMON_IMAGE_LIMITS,
	[ASSET_TYPES.SERVICE_PHOTO]: COMMON_IMAGE_LIMITS,
})
```

### 3.3. Cloudinary провайдер

**`src/modules/media/providers/cloudinary.js`** — расширить `buildPublicId`:

```js
const buildPublicId = (assetType, ownerId) => {
	if (assetType === ASSET_TYPES.USER_AVATAR)
		return `slotix/avatars/users/${ownerId}`
	if (assetType === ASSET_TYPES.STAFF_AVATAR)
		return `slotix/avatars/staff/${ownerId}`
	if (assetType === ASSET_TYPES.ORG_LOGO) return `slotix/orgs/${ownerId}/logo`
	if (assetType === ASSET_TYPES.SERVICE_PHOTO)
		return `slotix/services/${ownerId}`
	throw new Error(`Unknown assetType for publicId: ${assetType}`)
}
```

`ownerId` для `org-logo` = `orgId`. Для `service-photo` = `eventTypeId`.

**Трансформации.** Сейчас `AVATAR_TRANSFORMATION` хардкод. Заменяем на таблицу:

```js
const TRANSFORMATIONS = Object.freeze({
	[ASSET_TYPES.USER_AVATAR]: [
		{ width: 400, height: 400, crop: 'fill', gravity: 'face' },
		{ quality: 'auto', fetch_format: 'auto' },
	],
	[ASSET_TYPES.STAFF_AVATAR]: [
		{ width: 400, height: 400, crop: 'fill', gravity: 'face' },
		{ quality: 'auto', fetch_format: 'auto' },
	],
	[ASSET_TYPES.ORG_LOGO]: [
		{ width: 400, height: 400, crop: 'fill', gravity: 'auto' },
		{ quality: 'auto', fetch_format: 'auto' },
	],
	[ASSET_TYPES.SERVICE_PHOTO]: [
		{ width: 400, height: 400, crop: 'fill', gravity: 'auto' },
		{ quality: 'auto', fetch_format: 'auto' },
	],
})

const upload = async (file, { assetType, ownerId }) => {
	const publicId = buildPublicId(assetType, ownerId)
	const result = await uploadStream(file.buffer, {
		public_id: publicId,
		overwrite: true,
		resource_type: 'image',
		invalidate: true,
	})
	const url = cloudinary.url(result.public_id, {
		secure: true,
		version: result.version,
		transformation: TRANSFORMATIONS[assetType],
	})
	return { url, providerId: result.public_id }
}
```

### 3.4. Эндпоинты

Все требуют `authMiddleware`. Регистрируются в `src/routes/routes.js`. Используют существующий multer-middleware.

#### `POST /api/org/:orgId/logo`

- **Auth:** authMiddleware
- **Авторизация:** `req.user` — `owner` или `admin` орг с `orgId`. Иначе 403 `forbidden`.
- **Body:** `multipart/form-data`, поле `file`
- **Логика:**
  1. multer валидирует MIME + size (по `ASSET_LIMITS['org-logo']`)
  2. Проверить `req.file` → 400 если нет
  3. `mediaServices.uploadAvatar({ assetType: 'org-logo', ownerId: orgId, file: req.file })`
  4. `Organization.findByIdAndUpdate(orgId, { 'settings.logoUrl': result.url }, { new: true })`
  5. Вернуть полный `OrgDto`
- **Response 200:**
  ```json
  { "data": { "id": "...", "name": "...", "logo": "https://res.cloudinary.com/...", ... },
    "statusCode": 200, "status": "success" }
  ```
- **Errors:** 400 `validationError`, 401, 403, 404, 500

#### `DELETE /api/org/:orgId/logo`

- **Auth + авторизация:** то же, что `POST`
- **Логика:**
  1. Если `org.settings.logoUrl` пустой — пропустить вызов провайдера
  2. Иначе `mediaServices.deleteAvatar({ assetType: 'org-logo', ownerId: orgId })`
  3. `$set { 'settings.logoUrl': '' }`
  4. Вернуть обновлённый `OrgDto`

#### `POST /api/event-types/:id/photo`

- **Auth:** authMiddleware
- **Авторизация:**
  - Найти `EventType` по `id` → 404 если нет
  - Если `eventType.type === 'org'`: `req.user` — `owner` или `admin` орг с `eventType.orgId`
  - Если `eventType.type === 'solo'`: `req.user.id === String(eventType.userId)`
  - Иначе 403 `forbidden`
- **Body:** `multipart/form-data`, поле `file`
- **Логика:**
  1. multer валидирует
  2. `mediaServices.uploadAvatar({ assetType: 'service-photo', ownerId: id, file: req.file })`
  3. `EventType.findByIdAndUpdate(id, { image: result.url }, { new: true })`
  4. Вернуть `EventTypeDto`

#### `DELETE /api/event-types/:id/photo`

- Аналогично — DELETE из Cloudinary + `$set { image: '' }`

### 3.5. Изменения существующих эндпоинтов

| Endpoint                    | Изменения                                               |
| --------------------------- | ------------------------------------------------------- | ---------------------------------- |
| `PATCH /api/org/:orgId`     | Удалить `logoUrl` из принимаемого body. Тесты обновить. |
| `GET /api/org/:orgId`       | Без изменений — `logo` уже отдаётся через `orgDto`.     |
| `GET /api/event-types/:id`  | DTO `eventTypeDto` — добавить `image` в выдачу.         |
| `GET /api/event-types?orgId | userId=`                                                | То же — `image` в каждом элементе. |

### 3.6. Авторизация

Используем существующую функцию-проверку `isOrgAdminOrOwner(userId, orgId)` (живёт в org/membership-сервисе шага 1). Если её нет — создать в `services/orgServices.js` или в новом `helpers/authorize.js` с одной публичной экспортируемой функцией.

### 3.7. Безопасность

- Все эндпоинты за `authMiddleware`
- multer file-size limit на уровне middleware (не доверять заголовкам клиента)
- Cloudinary секреты только в env, не логируются
- Magic-bytes проверка MIME — не нужна, Cloudinary отвергает не-картинки

---

## 4. Frontend — Next.js 16

### 4.1. Расширение типов

**`services/configs/media.types.ts`:**

```ts
type AssetType = 'user-avatar' | 'staff-avatar' | 'org-logo' | 'service-photo'

interface OrgLogoResponse {
	id: string
	name: string
	logo: string | null
	description: string | null
	address: string | null
	phone: string | null
	website: string | null
	active: boolean
	timezone?: string
}

interface ServicePhotoResponse {
	id: string
	name: string
	slug: string
	image: string
	durationMin: number
	price: number
	currency: string
	color: string
	description: string | null
	staffPolicy: 'any' | 'by_position' | 'specific'
	assignedPositions: string[]
	assignedStaff: string[]
}

export type {
	AssetType,
	UploadConfig,
	UploadAvatarResponse,
	StaffAvatarResponse,
	OrgLogoResponse,
	ServicePhotoResponse,
}
```

**`services/configs/booking.types.ts`** — добавить `image` в `EventType`:

```diff
 interface EventType {
   id: string
   name: string
   slug: string
+  image: string
   ...
 }
```

**`services/configs/org.types.ts`** — удалить `logoUrl` из `UpdateOrgBody` (теперь поле read-only через update):

```diff
 interface UpdateOrgBody {
   name?: string
   description?: string | null
   ...
-  logoUrl?: string | null
   brandColor?: string | null
   timezone?: string
 }
```

### 4.2. Расширение `services/configs/media.config.ts`

```ts
import type {
	UploadAvatarResponse,
	StaffAvatarResponse,
	OrgLogoResponse,
	ServicePhotoResponse,
} from './media.types'

const mediaApiConfig = {
	// ...existing user/staff endpoints...

	uploadOrgLogo: endpoint<FormData, ApiResponse<OrgLogoResponse>>({
		url: ({ orgId }) => `/api/org/${orgId}/logo`,
		method: postData,
		defaultErrorMessage: 'Failed to upload logo',
	}),
	deleteOrgLogo: endpoint<void, ApiResponse<OrgLogoResponse>>({
		url: ({ orgId }) => `/api/org/${orgId}/logo`,
		method: deleteData,
		defaultErrorMessage: 'Failed to delete logo',
	}),
	uploadServicePhoto: endpoint<FormData, ApiResponse<ServicePhotoResponse>>({
		url: ({ id }) => `/api/event-types/${id}/photo`,
		method: postData,
		defaultErrorMessage: 'Failed to upload service photo',
	}),
	deleteServicePhoto: endpoint<void, ApiResponse<ServicePhotoResponse>>({
		url: ({ id }) => `/api/event-types/${id}/photo`,
		method: deleteData,
		defaultErrorMessage: 'Failed to delete service photo',
	}),
}
```

### 4.3. Конфиги загрузки

**`components/media/AvatarUploader.config.ts`** — добавить алиасы:

```ts
export const AVATAR_UPLOAD_CONFIG: UploadConfig = {
	accept: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
	maxSizeBytes: 2 * 1024 * 1024,
	minDimensions: { width: 200, height: 200 },
}

export const ORG_LOGO_UPLOAD_CONFIG: UploadConfig = AVATAR_UPLOAD_CONFIG
export const SERVICE_PHOTO_UPLOAD_CONFIG: UploadConfig = AVATAR_UPLOAD_CONFIG
```

Лимиты идентичны → один объект, три алиаса. Отличаются — отделим в момент необходимости.

### 4.4. `<AvatarUploader>` — расширить через `labels`-prop

Сейчас тексты захардкожены через i18n-ключи `profile.changePhoto`/`profile.removePhoto` и т.д. Добавляем опциональный prop:

```ts
interface AvatarUploaderProps {
	currentAvatar: string
	fallbackText: string
	config: UploadConfig
	onUpload: (file: File) => Promise<{ avatar: string }>
	onDelete: () => Promise<{ avatar: string }>
	onSuccess: (avatarUrl: string) => void
	labels?: {
		triggerButton?: string
		dialogTitle?: string
		removeButton?: string
		confirmRemove?: string
		dropZone?: string
		successToast?: string
	}
}
```

Если `labels` не передан или поле отсутствует — fallback на текущие i18n-ключи. Шаг 1 (страницы профиля) не ломается.

### 4.5. UI: лого организации

**`app/[locale]/(org)/manage/[orgId]/profile/page.tsx`** — добавить секцию «Логотип» возле формы редактирования. Удалить существующее поле формы `logoUrl` (теперь оно read-only через upload).

```tsx
const uploadLogo = (file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return mediaApi
    .uploadOrgLogo({ pathParams: { orgId }, body: fd })
    .then((r) => ({ avatar: r.data.logo ?? '' }))
}

const deleteLogo = () =>
  mediaApi
    .deleteOrgLogo({ pathParams: { orgId } })
    .then((r) => ({ avatar: r.data.logo ?? '' }))

<AvatarUploader
  currentAvatar={org.logo ?? ''}
  fallbackText={org.name}
  config={ORG_LOGO_UPLOAD_CONFIG}
  labels={{
    triggerButton: t('org.logo.uploadLogo'),
    dialogTitle:   t('org.logo.uploadLogo'),
    removeButton:  t('org.logo.removeLogo'),
    successToast:  t('org.logo.logoUpdated'),
  }}
  onUpload={uploadLogo}
  onDelete={deleteLogo}
  onSuccess={(logo) =>
    setOrg((prev) => (prev ? { ...prev, logo } : prev))
  }
/>
```

### 4.6. UI: фото услуги

**`app/[locale]/(org)/manage/[orgId]/services/page.tsx`** — внутри **диалога редактирования** существующей услуги добавить блок «Фото услуги» сверху, до текстовых полей.

```tsx
const uploadServicePhoto = (eventTypeId: string) => (file: File) => {
	const fd = new FormData()
	fd.append('file', file)
	return mediaApi
		.uploadServicePhoto({ pathParams: { id: eventTypeId }, body: fd })
		.then((r) => ({ avatar: r.data.image }))
}

;<AvatarUploader
	currentAvatar={service.image}
	fallbackText={service.name}
	config={SERVICE_PHOTO_UPLOAD_CONFIG}
	labels={{
		triggerButton: t('services.photo.uploadPhoto'),
		dialogTitle: t('services.photo.uploadPhoto'),
		removeButton: t('services.photo.removePhoto'),
		successToast: t('services.photo.photoUpdated'),
	}}
	onUpload={uploadServicePhoto(service.id)}
	onDelete={() =>
		mediaApi
			.deleteServicePhoto({ pathParams: { id: service.id } })
			.then((r) => ({ avatar: r.data.image }))
	}
	onSuccess={(image) => mutateServicesList(service.id, { image })}
/>
```

**Создание новой услуги:** в диалоге создания блок «Фото» скрыт + сообщение «Сохраните услугу, чтобы добавить фото». Никаких черновиков на сервере, никаких временных ассетов.

### 4.7. UI: solo-услуги

Solo-услуги (`type='solo'`, `userId` set, `orgId=null`) управляются на странице, где фронт сейчас даёт CRUD по `eventTypeApi`. **Точное расположение страницы определяется при реализации** — поиском по использованиям `eventTypeApi.create`/`eventTypeApi.update` без `orgId` в pathParams.

Тот же `<AvatarUploader>`, тот же эндпоинт `/api/event-types/:id/photo` — авторизация на бэке решит, разрешено ли.

### 4.8. UI: миниатюра при выборе услуги

В каждом месте, где сейчас рендерится список услуг для выбора (`/book/[staffSlug]`, диалог выбора услуги в админке, любые карточки услуг) — добавить миниатюру `service.image` слева (или сверху) карточки с fallback-буквой если пусто.

Конкретные файлы определяются при реализации. Минимальный паттерн:

```tsx
<Avatar className="size-10 rounded-md">
	{service.image ? <AvatarImage src={service.image} alt="" /> : null}
	<AvatarFallback>{getInitial(service.name)}</AvatarFallback>
</Avatar>
```

### 4.9. i18n ключи

Добавить в `i18n/messages/en.json` и `uk.json`:

```json
{
	"org": {
		"logo": {
			"title": "Logo",
			"uploadLogo": "Upload logo",
			"removeLogo": "Remove logo",
			"logoUpdated": "Logo updated"
		}
	},
	"services": {
		"photo": {
			"title": "Photo",
			"uploadPhoto": "Upload photo",
			"removePhoto": "Remove photo",
			"photoUpdated": "Photo updated",
			"saveBeforePhoto": "Save the service to add a photo"
		}
	}
}
```

---

## 5. Порядок реализации

Внутри плана:

1. **Backend сначала** — нельзя тестировать фронт без работающих эндпоинтов
2. После того как curl-запросы работают — фронт

Конкретные шаги — в плане, не в спеке.

---

## 6. Acceptance Criteria

### Backend

- [ ] `EventType.image: { type: String, default: '' }` добавлен
- [ ] `ASSET_TYPES.ORG_LOGO`, `ASSET_TYPES.SERVICE_PHOTO` зарегистрированы с лимитами `≤2 MB`, `jpeg/png/webp/gif`
- [ ] `cloudinary.js` строит `slotix/orgs/{orgId}/logo` и `slotix/services/{eventTypeId}` детерминистично
- [ ] `TRANSFORMATIONS[assetType]`-таблица: `g_auto` для лого + фото услуги, `g_face` для аватарок
- [ ] `POST/DELETE /api/org/:orgId/logo` работают, отдают полный `OrgDto`
- [ ] `POST/DELETE /api/event-types/:id/photo` работают, отдают полный `EventTypeDto` с `image`
- [ ] 403 при попытке загрузки лого не-`owner`/`admin`'ом
- [ ] 403 при попытке загрузки фото чужой solo-услуги
- [ ] 403 при попытке загрузки фото org-услуги не-`owner`/`admin`'ом
- [ ] 400 `validationError` при mime не из белого списка / размере >2 MB / отсутствии файла
- [ ] 401 без авторизации
- [ ] Повторная загрузка перезаписывает (`overwrite: true`)
- [ ] DELETE удаляет объект в Cloudinary (проверить в дашборде)
- [ ] `PATCH /api/org/:orgId` с `logoUrl` в body — поле игнорируется (тест обновлён)
- [ ] `eventTypeDto` включает `image` во всех выдачах списка/одного объекта

### Frontend

- [ ] `mediaApi` экспортирует `uploadOrgLogo`, `deleteOrgLogo`, `uploadServicePhoto`, `deleteServicePhoto`
- [ ] `EventType` фронтенд-интерфейс имеет `image: string`
- [ ] `<AvatarUploader>` принимает опциональный `labels`-prop, шаг 1 не сломан (без `labels` работает как раньше)
- [ ] На `manage/[orgId]/profile` загрузка лого → отображается на этой же странице без рефреша
- [ ] На `manage/[orgId]/profile` удаление лого → fallback-буква показывается
- [ ] В диалоге редактирования услуги (org) загрузка фото → отображается без рефреша
- [ ] В диалоге создания услуги — блок фото скрыт, показывается «Сохраните, чтобы добавить»
- [ ] Solo-услуги: загрузка фото работает в соответствующем UI
- [ ] Список услуг при выборе показывает миниатюру `service.image` (fallback-буква если пусто)
- [ ] Файл >2 MB / неверный формат / <200×200 → toast с ошибкой, диалог не закрывается
- [ ] Сетевая ошибка от бэка → toast-interceptor показывает сообщение, диалог не закрывается
- [ ] i18n ключи добавлены в `en.json` + `uk.json` для `org.logo.*` и `services.photo.*`
- [ ] `npm run lint` и `npm run build` проходят

---

## 7. Out of scope (план #2 и далее)

- **SEO / Open Graph** — публичные страницы (`/book/[staffSlug]`, `/(public)/org/[orgId]`) с динамической `generateMetadata`, `og:image`, `og:title`, `og:description` — **отдельный план #2**
- Загрузка фото услуги во время её создания (без существующего id)
- Галереи / множественные фото услуги
- Кропы / ресайз на клиенте
- Direct signed uploads из браузера
- Отдельные форматы под OG (баннер 1200×600) — добавим в плане #2 как доп. трансформацию

Архитектура (`mediaServices` + `providers/cloudinary.js` + `ASSET_TYPES`-реестр + `mediaApi` + `<AvatarUploader>`) уже позволяет добавлять новые типы ассетов без переработки.
