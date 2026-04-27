# Frontend: лого организации и фото услуг через Cloudinary

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Подключить 4 новых эндпоинта медиа-API на фронте и интегрировать загрузку лого организации + фото услуги в существующий UI, переиспользуя `<AvatarUploader>` через новый `labels`-prop. В карточках выбора услуги в публичном букинге показать миниатюру `service.image`.

**Architecture:** Расширяем `mediaApi` четырьмя методами. `<AvatarUploader>` параметризуется через опциональный `labels`-prop (шаг 1 не ломаем). Лого добавляется отдельной секцией на `manage/[orgId]/profile`. Фото услуги — внутри существующего `ServiceDialog` (сразу для org и solo: страницы `manage/[orgId]/services` и `(personal)/my-services` обе используют один и тот же `<ServicesList>` → `<ServiceDialog>`). При создании услуги фото-блок скрыт.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5, Tailwind 4, shadcn/ui, react-hook-form, sonner, next-intl.

**Spec:** [`docs/superpowers/specs/2026-04-27-cloudinary-org-service-photos-design.md`](../specs/2026-04-27-cloudinary-org-service-photos-design.md)

**Backend prerequisite:** [`2026-04-27-cloudinary-org-service-photos-backend-plan.md`](./2026-04-27-cloudinary-org-service-photos-backend-plan.md) должен быть полностью выполнен — иначе на фронте все тоасты будут красные.

**Working directory:** `/Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted`

---

## File Structure

| Файл | Что делаем | Ответственность |
| --- | --- | --- |
| `services/configs/media.types.ts` | Modify | Добавить `'org-logo' \| 'service-photo'` в `AssetType`, экспортировать `OrgLogoResponse`, `ServicePhotoResponse` |
| `services/configs/media.config.ts` | Modify | 4 новых эндпоинта: `uploadOrgLogo`, `deleteOrgLogo`, `uploadServicePhoto`, `deleteServicePhoto` |
| `services/configs/booking.types.ts` | Modify | Добавить `image: string` в `EventType` |
| `services/configs/org.types.ts` | Modify | Убрать `logoUrl` из `UpdateOrgBody` |
| `components/media/AvatarUploader.tsx` | Modify | Опциональный `labels`-prop с fallback на текущие i18n-ключи |
| `components/media/AvatarUploader.config.ts` | Modify | Алиасы `ORG_LOGO_UPLOAD_CONFIG`, `SERVICE_PHOTO_UPLOAD_CONFIG` |
| `i18n/messages/en.json` | Modify | Ключи `org.logo.*`, `services.photo.*` |
| `i18n/messages/uk.json` | Modify | Те же ключи на украинском |
| `app/[locale]/(org)/manage/[orgId]/profile/page.tsx` | Modify | Секция «Логотип» с `<AvatarUploader>` |
| `components/services/ServiceDialog.tsx` | Modify | Блок «Фото услуги» сверху диалога (только в edit-режиме) |
| `components/booking/ServiceList.tsx` | Modify | Миниатюра `service.image` слева от названия услуги |

---

## Pre-flight

```bash
cd /Users/egorzozula/Desktop/Slotix-fronted/Slotix-fronted
git status
npm run lint
npm run build
```

Все три должны пройти. Если нет — сначала почини существующие проблемы.

---

## Task 1: Расширить media-типы

**Files:**
- Modify: `services/configs/media.types.ts`

- [ ] **Step 1: Открыть файл**

```bash
cat services/configs/media.types.ts
```

- [ ] **Step 2: Заменить содержимое на:**

```ts
// services/configs/media.types.ts

type AssetType = 'user-avatar' | 'staff-avatar' | 'org-logo' | 'service-photo'

interface UploadConfig {
	accept: string[]
	maxSizeBytes: number
	minDimensions?: { width: number; height: number }
}

interface UploadAvatarResponse {
	avatar: string
}

interface StaffAvatarResponse {
	avatar: string
	displayName: string | null
	bio: string | null
	role: 'owner' | 'admin' | 'member'
	status: 'active' | 'invited' | 'suspended' | 'left'
	position: string | null
}

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
	price: { amount: number; currency: string } | null
	currency?: string
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

- [ ] **Step 3: Проверка типов**

```bash
npx tsc --noEmit
```

Ожидаем: clean (новые типы не используются нигде ещё, но и не ломают существующее).

- [ ] **Step 4: Commit**

```bash
git add services/configs/media.types.ts
git commit -m "feat(media): добавить типы OrgLogoResponse и ServicePhotoResponse"
```

---

## Task 2: Расширить mediaApi-конфиг

**Files:**
- Modify: `services/configs/media.config.ts`

- [ ] **Step 1: Заменить содержимое на:**

```ts
// services/configs/media.config.ts
import { postData, deleteData } from '@/services/api/methods'
import { endpoint } from '@/services/api/types'
import type { ApiResponse, User } from './user.config'
import type {
	UploadAvatarResponse,
	StaffAvatarResponse,
	OrgLogoResponse,
	ServicePhotoResponse,
} from './media.types'

const mediaApiConfig = {
	uploadUserAvatar: endpoint<FormData, ApiResponse<User>>({
		url: () => `/api/user/avatar`,
		method: postData,
		defaultErrorMessage: 'Failed to upload avatar',
	}),
	deleteUserAvatar: endpoint<void, ApiResponse<User>>({
		url: () => `/api/user/avatar`,
		method: deleteData,
		defaultErrorMessage: 'Failed to delete avatar',
	}),
	uploadStaffAvatar: endpoint<FormData, ApiResponse<StaffAvatarResponse>>({
		url: ({ orgId, staffId }) => `/api/org/${orgId}/staff/${staffId}/avatar`,
		method: postData,
		defaultErrorMessage: 'Failed to upload avatar',
	}),
	deleteStaffAvatar: endpoint<void, ApiResponse<StaffAvatarResponse>>({
		url: ({ orgId, staffId }) => `/api/org/${orgId}/staff/${staffId}/avatar`,
		method: deleteData,
		defaultErrorMessage: 'Failed to delete avatar',
	}),

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

export default mediaApiConfig
export type {
	UploadAvatarResponse,
	StaffAvatarResponse,
	OrgLogoResponse,
	ServicePhotoResponse,
}
```

- [ ] **Step 2: Проверка типов**

```bash
npx tsc --noEmit
```

Ожидаем: clean.

- [ ] **Step 3: Commit**

```bash
git add services/configs/media.config.ts
git commit -m "feat(media-api): эндпоинты uploadOrgLogo / uploadServicePhoto и DELETE-парные"
```

---

## Task 3: Добавить поле `image` в `EventType`

**Files:**
- Modify: `services/configs/booking.types.ts`

- [ ] **Step 1: Найти и расширить интерфейс**

В `services/configs/booking.types.ts` найти (строка ~32):

```ts
interface EventType {
	id: string
	name: string
	slug: string
	durationMin: number
	price: number
	currency: string
	color: string
	description: string | null
	staffPolicy: 'any' | 'by_position' | 'specific'
	assignedPositions: string[]
	assignedStaff: string[]
}
```

Заменить на:

```ts
interface EventType {
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
```

- [ ] **Step 2: Проверить, что nigde EventType не создаётся вручную без `image`**

```bash
grep -rn "as EventType\|: EventType =\|<EventType>\b" --include="*.ts" --include="*.tsx" .
```

Если попадаются объектные литералы без `image` — добавить туда `image: ''`. Если есть только касты к типу из API-ответов — без изменений (API выдаст `image` сразу после Backend Task 4).

- [ ] **Step 3: Проверка типов и сборка**

```bash
npx tsc --noEmit
```

Ожидаем: clean.

- [ ] **Step 4: Commit**

```bash
git add services/configs/booking.types.ts
git commit -m "feat(event-type): добавить поле image в фронтовый EventType"
```

---

## Task 4: Убрать `logoUrl` из `UpdateOrgBody`

**Files:**
- Modify: `services/configs/org.types.ts`

- [ ] **Step 1: Удалить поле**

В `services/configs/org.types.ts` найти (строка ~25):

```ts
interface UpdateOrgBody {
	name?: string
	description?: string | null
	address?: string | null
	phone?: string | null
	website?: string | null
	logoUrl?: string | null
	brandColor?: string | null
	timezone?: string
}
```

Удалить строку `logoUrl?: string | null`.

Аналогично в `CreateOrgBody` (строка ~12) — удалить `logoUrl?: string`.

- [ ] **Step 2: Найти консьюмеров — должно быть 0 вне типов**

```bash
grep -rn "logoUrl" --include="*.ts" --include="*.tsx" .
```

Если кто-то всё ещё передаёт `logoUrl` в `orgApi.update`/`orgApi.create` — удалить эти строки. Документ-форму на странице org-profile не трогаем (там вообще нет такого поля по факту).

- [ ] **Step 3: Проверка типов**

```bash
npx tsc --noEmit
```

Ожидаем: clean.

- [ ] **Step 4: Commit**

```bash
git add services/configs/org.types.ts
git commit -m "refactor(org): убрать logoUrl из CreateOrgBody / UpdateOrgBody"
```

---

## Task 5: Добавить `labels`-prop в `<AvatarUploader>`

**Files:**
- Modify: `components/media/AvatarUploader.tsx`

- [ ] **Step 1: Расширить пропсы**

В `components/media/AvatarUploader.tsx` найти `interface AvatarUploaderProps` (строка ~20). Заменить блок на:

```tsx
interface AvatarUploaderLabels {
	triggerButton?: string
	dialogTitle?: string
	removeButton?: string
	confirmRemove?: string
	dropZone?: string
	successToast?: string
}

interface AvatarUploaderProps {
	currentAvatar: string
	fallbackText: string
	config: UploadConfig
	onUpload: (file: File) => Promise<{ avatar: string }>
	onDelete: () => Promise<{ avatar: string }>
	onSuccess: (avatarUrl: string) => void
	labels?: AvatarUploaderLabels
}
```

- [ ] **Step 2: Внутри компонента — резолвить тексты с fallback на i18n**

В функции `AvatarUploader({...})` перед `return (` добавить:

```tsx
const resolvedLabels = {
	triggerButton: labels?.triggerButton ?? t('profile.changePhoto'),
	dialogTitle:   labels?.dialogTitle   ?? t('profile.changePhoto'),
	removeButton:  labels?.removeButton  ?? t('profile.removePhoto'),
	confirmRemove: labels?.confirmRemove ?? t('profile.confirmRemove'),
	dropZone:      labels?.dropZone      ?? t('profile.dropOrClick'),
	successToast:  labels?.successToast  ?? t('profile.photoUpdated'),
}
```

И в JSX заменить:

| Было | Стало |
| --- | --- |
| `t('profile.changePhoto')` (в `<Button>` триггера) | `resolvedLabels.triggerButton` |
| `t('profile.changePhoto')` (в `<DialogTitle>`) | `resolvedLabels.dialogTitle` |
| `t('profile.removePhoto')` | `resolvedLabels.removeButton` |
| `t('profile.confirmRemove')` | `resolvedLabels.confirmRemove` |
| `t('profile.dropOrClick')` | `resolvedLabels.dropZone` |
| `t('profile.photoUpdated')` (в обоих `toast.success`-ах) | `resolvedLabels.successToast` |

(`t('profile.uploadingPhoto')` и `t('common.cancel')` / `t('common.save')` оставить как есть — они общие и не зависят от типа ассета.)

В `function AvatarUploader({ ... })` добавить `labels` в деструктурирование пропсов.

- [ ] **Step 3: Расширить экспорт типов**

В конце файла:

```tsx
export { AvatarUploader }
export type { AvatarUploaderProps, AvatarUploaderLabels }
```

- [ ] **Step 4: Проверка типов и сборка**

```bash
npx tsc --noEmit
```

Ожидаем: clean. Шаг 1 (`/profile`, `/org/[orgId]/my-profile`) использует компонент без `labels` — fallback должен сохранить старое поведение.

- [ ] **Step 5: Smoke-test шага 1 в браузере**

```bash
npm run dev
```

Открыть `http://localhost:3000/{locale}/profile`, открыть диалог смены аватарки, убедиться, что тексты «Change photo / Uploading… / Remove photo / Drop or click…» — на месте. Никаких пропавших строк.

Остановить сервер.

- [ ] **Step 6: Commit**

```bash
git add components/media/AvatarUploader.tsx
git commit -m "feat(avatar-uploader): опциональный labels-prop, шаг 1 не ломаем"
```

---

## Task 6: Алиасы конфигов загрузки

**Files:**
- Modify: `components/media/AvatarUploader.config.ts`

- [ ] **Step 1: Добавить алиасы в конец файла**

После существующего `export const AVATAR_UPLOAD_CONFIG: UploadConfig = { ... }`:

```ts
export const ORG_LOGO_UPLOAD_CONFIG: UploadConfig = AVATAR_UPLOAD_CONFIG
export const SERVICE_PHOTO_UPLOAD_CONFIG: UploadConfig = AVATAR_UPLOAD_CONFIG
```

(Лимиты идентичны — тот же accept-список, 2 MB, мин. 200×200. Если в будущем потребуется развести — просто меняем алиас на свой объект.)

- [ ] **Step 2: Проверка типов**

```bash
npx tsc --noEmit
```

Ожидаем: clean.

- [ ] **Step 3: Commit**

```bash
git add components/media/AvatarUploader.config.ts
git commit -m "feat(media): алиасы ORG_LOGO_UPLOAD_CONFIG и SERVICE_PHOTO_UPLOAD_CONFIG"
```

---

## Task 7: i18n-ключи

**Files:**
- Modify: `i18n/messages/en.json`
- Modify: `i18n/messages/uk.json`

- [ ] **Step 1: en.json — добавить блоки**

Открыть `i18n/messages/en.json`. В корневой объект добавить (если ключ `org` уже существует — мерджить с ним; если нет — создать):

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

(Слить с существующим JSON — не перезаписывать. Если уже есть `org.{...}`, добавь только подключ `logo`. Если есть `services.{...}`, добавь только подключ `photo`.)

- [ ] **Step 2: uk.json — добавить те же ключи на украинском**

```json
{
	"org": {
		"logo": {
			"title": "Логотип",
			"uploadLogo": "Завантажити логотип",
			"removeLogo": "Видалити логотип",
			"logoUpdated": "Логотип оновлено"
		}
	},
	"services": {
		"photo": {
			"title": "Фото",
			"uploadPhoto": "Завантажити фото",
			"removePhoto": "Видалити фото",
			"photoUpdated": "Фото оновлено",
			"saveBeforePhoto": "Збережіть послугу, щоб додати фото"
		}
	}
}
```

- [ ] **Step 3: Запустить prettier (он сортирует/форматирует JSON)**

```bash
npm run format -- i18n/messages/en.json i18n/messages/uk.json
```

- [ ] **Step 4: Запустить build (next-intl валидирует ключи)**

```bash
npm run build
```

Ожидаем: clean.

- [ ] **Step 5: Commit**

```bash
git add i18n/messages/en.json i18n/messages/uk.json
git commit -m "i18n: добавить ключи org.logo.* и services.photo.* (en/uk)"
```

---

## Task 8: Лого организации на `manage/[orgId]/profile`

**Files:**
- Modify: `app/[locale]/(org)/manage/[orgId]/profile/page.tsx`

- [ ] **Step 1: Добавить импорты**

В верх файла:

```tsx
import { mediaApi } from '@/services'
import { AvatarUploader } from '@/components/media/AvatarUploader'
import { ORG_LOGO_UPLOAD_CONFIG } from '@/components/media/AvatarUploader.config'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
```

- [ ] **Step 2: Добавить две функции внутри компонента**

После существующего `handleTimezoneCancel` (строка ~120) и перед `return (`:

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

const handleLogoSuccess = (logo: string) =>
	setOrg((prev) => (prev ? { ...prev, logo: logo || null } : prev))

const getInitial = (text: string) =>
	text.trim() ? text.trim().charAt(0).toUpperCase() : '?'
```

- [ ] **Step 3: Вставить секцию в JSX**

В JSX между `<h1>` и `<ProfileForm>` (строка ~127) добавить:

```tsx
<section className="flex flex-col items-start gap-3">
	<h2 className="text-lg font-semibold">{tOrg('logo.title')}</h2>
	<Avatar className="size-24 rounded-md">
		{org.logo ? <AvatarImage src={org.logo} alt="" /> : null}
		<AvatarFallback className="text-2xl">
			{getInitial(org.name)}
		</AvatarFallback>
	</Avatar>
	<AvatarUploader
		currentAvatar={org.logo ?? ''}
		fallbackText={org.name}
		config={ORG_LOGO_UPLOAD_CONFIG}
		labels={{
			triggerButton: tOrg('logo.uploadLogo'),
			dialogTitle: tOrg('logo.uploadLogo'),
			removeButton: tOrg('logo.removeLogo'),
			successToast: tOrg('logo.logoUpdated'),
		}}
		onUpload={uploadLogo}
		onDelete={deleteLogo}
		onSuccess={handleLogoSuccess}
	/>
</section>
<Separator />
```

(`tOrg` — это уже импортированный `useTranslations('organizations')`. Если ключи `logo.*` лежат в другой неймспейсе — используй `useTranslations('org')` отдельно. Сверь с `i18n/messages/en.json`: блок `"org": { "logo": {...} }` ⇒ `useTranslations('org')` и `t('logo.uploadLogo')`.)

> **Если в файле уже есть `useTranslations('org')`** — используй его. **Иначе** добавь:
>
> ```tsx
> const tLogo = useTranslations('org.logo')
> ```
> и обращайся как `tLogo('uploadLogo')`, `tLogo('title')`, и т.д.

- [ ] **Step 4: Проверка типов**

```bash
npx tsc --noEmit
```

Ожидаем: clean.

- [ ] **Step 5: Smoke-test в браузере**

```bash
npm run dev
```

Зайти на `/{locale}/manage/{orgId}/profile`. Должна быть секция «Logo» с кружком и кнопкой «Upload logo». Загрузить картинку — после успеха она показывается без рефреша. Удалить — fallback-буква.

Остановить сервер.

- [ ] **Step 6: Commit**

```bash
git add app/[locale]/(org)/manage/[orgId]/profile/page.tsx
git commit -m "feat(org-profile): загрузка лого организации через <AvatarUploader>"
```

---

## Task 9: Фото услуги в `ServiceDialog`

**Files:**
- Modify: `components/services/ServiceDialog.tsx`

`<ServicesList>` используется на двух страницах: `manage/[orgId]/services/page.tsx` (org) и `(personal)/my-services/page.tsx` (solo). Обе показывают тот же `<ServiceDialog>`. Изменения здесь покрывают оба сценария.

- [ ] **Step 1: Добавить импорты**

В верх файла:

```tsx
import { mediaApi } from '@/services'
import { AvatarUploader } from '@/components/media/AvatarUploader'
import { SERVICE_PHOTO_UPLOAD_CONFIG } from '@/components/media/AvatarUploader.config'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
```

- [ ] **Step 2: Найти, где уже хранится текущая редактируемая услуга**

В `ServiceDialog.tsx` посмотреть `interface ServiceDialogProps` (строка ~90). Скорее всего, есть пропс `service: EventType | null` и `mode: 'create' | 'edit'` (или эквивалент по факту). **Цель:** идентифицировать, какой объект мы редактируем сейчас, и есть ли у него `id`. Используй существующее имя пропсов.

- [ ] **Step 3: Добавить хелпер `getInitial` (если ещё нет в файле)**

```tsx
const getInitial = (text: string) =>
	text.trim() ? text.trim().charAt(0).toUpperCase() : '?'
```

- [ ] **Step 4: Перед формой в JSX вставить блок «Фото услуги»**

Внутри `<DialogContent>`, перед текстовыми полями (как первый блок после `<DialogHeader>`):

```tsx
{service && service.id ? (
	<section className="mb-4 flex flex-col items-start gap-3">
		<h3 className="text-sm font-medium">{tPhoto('title')}</h3>
		<Avatar className="size-20 rounded-md">
			{currentImage ? <AvatarImage src={currentImage} alt="" /> : null}
			<AvatarFallback className="text-xl">
				{getInitial(service.name)}
			</AvatarFallback>
		</Avatar>
		<AvatarUploader
			currentAvatar={currentImage}
			fallbackText={service.name}
			config={SERVICE_PHOTO_UPLOAD_CONFIG}
			labels={{
				triggerButton: tPhoto('uploadPhoto'),
				dialogTitle: tPhoto('uploadPhoto'),
				removeButton: tPhoto('removePhoto'),
				successToast: tPhoto('photoUpdated'),
			}}
			onUpload={uploadPhoto}
			onDelete={deletePhoto}
			onSuccess={handlePhotoSuccess}
		/>
	</section>
) : (
	<p className="text-muted-foreground mb-4 text-sm">
		{tPhoto('saveBeforePhoto')}
	</p>
)}
```

- [ ] **Step 5: Добавить локальный state для image и три callback'а**

Внутри компонента, рядом с другими `useState`:

```tsx
const [currentImage, setCurrentImage] = useState<string>(service?.image ?? '')

useEffect(() => {
	setCurrentImage(service?.image ?? '')
}, [service?.id, service?.image])

const uploadPhoto = (file: File) => {
	if (!service || !service.id) {
		return Promise.reject(new Error('saveBeforePhoto'))
	}
	const fd = new FormData()
	fd.append('file', file)
	return mediaApi
		.uploadServicePhoto({ pathParams: { id: service.id }, body: fd })
		.then((r) => ({ avatar: r.data.image }))
}

const deletePhoto = () => {
	if (!service || !service.id) {
		return Promise.reject(new Error('saveBeforePhoto'))
	}
	return mediaApi
		.deleteServicePhoto({ pathParams: { id: service.id } })
		.then((r) => ({ avatar: r.data.image }))
}

const handlePhotoSuccess = (image: string) => {
	setCurrentImage(image)
	if (props.onPhotoChanged) {
		props.onPhotoChanged(service!.id, image)
	}
}
```

(Если в файле нет prop `onPhotoChanged`, добавь его в `ServiceDialogProps` как `onPhotoChanged?: (id: string, image: string) => void` и пробрось его на уровень выше — `<ServicesList>` обновляет свой локальный массив через этот колбэк. Если родителю проще делать рефетч списка — `props.onPhotoChanged` можно опустить и просто полагаться на закрытие диалога с дальнейшим refresh-ом.)

- [ ] **Step 6: Перевод**

В верх компонента, рядом с другими `useTranslations`:

```tsx
const tPhoto = useTranslations('services.photo')
```

- [ ] **Step 7: Проверка типов**

```bash
npx tsc --noEmit
```

Ожидаем: clean.

- [ ] **Step 8: Smoke-test (org)**

```bash
npm run dev
```

Зайти на `/{locale}/manage/{orgId}/services`. Открыть редактирование услуги — должен быть блок «Фото» сверху с фолбэк-буквой. Загрузить → миниатюра обновляется. Закрыть/открыть диалог снова → картинка на месте.

Создать новую услугу — блок «Photo» скрыт, видно сообщение «Save the service to add a photo».

- [ ] **Step 9: Smoke-test (solo)**

Залогиниться под пользователем без org / просто перейти на `/{locale}/my-services`. Открыть редактирование услуги — то же поведение, тот же диалог.

- [ ] **Step 10: Commit**

```bash
git add components/services/ServiceDialog.tsx
git commit -m "feat(services): загрузка фото услуги в ServiceDialog (org + solo)"
```

---

## Task 10: Миниатюры услуг в `<ServiceList>` (публичный букинг)

**Files:**
- Modify: `components/booking/ServiceList.tsx`

- [ ] **Step 1: Добавить импорт `Avatar`**

В верх файла:

```tsx
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
```

- [ ] **Step 2: Хелпер инициала**

После существующих `renderSkeleton*` (строка ~31):

```tsx
const getInitial = (text: string) =>
	text.trim() ? text.trim().charAt(0).toUpperCase() : '?'
```

- [ ] **Step 3: Заменить «цветную точку» на миниатюру `image`**

В `renderEventType` (строка ~45) внутри обоих веток (`isHorizontal` и вертикальной), там где сейчас `<div className="size-3 shrink-0 rounded-full" style={{ backgroundColor: eventType.color }} />`, заменить на:

```tsx
<Avatar className="size-10 shrink-0 rounded-md">
	{eventType.image ? <AvatarImage src={eventType.image} alt="" /> : null}
	<AvatarFallback
		className="text-sm"
		style={{ backgroundColor: eventType.color }}
	>
		{getInitial(eventType.name)}
	</AvatarFallback>
</Avatar>
```

(Цвет услуги остаётся в `<AvatarFallback>` — когда фото нет, видим букву на фирменном цвете услуги. Когда фото есть — фото перекрывает фолбэк.)

- [ ] **Step 4: Те же миниатюры в скелетоне**

В `renderSkeletonItem` и `renderSkeletonChip` заменить `<Skeleton className="size-3 shrink-0 rounded-full" />` на `<Skeleton className="size-10 shrink-0 rounded-md" />`.

- [ ] **Step 5: Проверка типов и сборка**

```bash
npx tsc --noEmit
npm run build
```

Ожидаем: clean.

- [ ] **Step 6: Smoke-test**

```bash
npm run dev
```

Открыть публичный букинг по `/{locale}/book/{slug}`. У услуги без `image` — буква-fallback на цвете. У услуги с `image` — миниатюра.

- [ ] **Step 7: Commit**

```bash
git add components/booking/ServiceList.tsx
git commit -m "feat(booking-list): показывать миниатюру service.image в карточке выбора услуги"
```

---

## Task 11: Финальная проверка

- [ ] **Step 1: Lint + format-check + build**

```bash
npm run lint
npm run format:check
npm run build
```

Ожидаем все три PASS.

- [ ] **Step 2: Полный manual-acceptance**

Прогнать чек-лист из спека (§6 frontend):

- На `manage/[orgId]/profile` загрузка лого → отображается без рефреша
- На `manage/[orgId]/profile` удаление лого → fallback-буква
- В диалоге редактирования услуги (org) загрузка → миниатюра
- В диалоге создания услуги — блок «Photo» скрыт, текст «Save…»
- Solo-услуги (`/my-services`): загрузка фото работает
- В `<ServiceList>` (публичный букинг) миниатюра видна
- Файл >2 MB / неверный формат / <200×200 → красный toast, диалог открыт
- Сетевая ошибка от бэка → toast, диалог открыт
- Шаг 1 (`/profile`, `/org/[orgId]/my-profile`) — без регрессий

- [ ] **Step 3: Готово**

Если всё зелёное — план #1 закрыт. Передавать на план #2 (SEO/Open Graph) — отдельным спеком/планом, **уже после** того как этот план зашит и зашиплен.
