# Cloudinary Avatars — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Реализовать UI для загрузки/удаления личной и per-org аватарок юзеров — кнопка "Сменить фото" на страницах `/profile` и `/org/[orgId]/my-profile`, диалог с превью и валидацией.

**Architecture:** Generic `mediaApi` слой (фронт не знает про Cloudinary), переиспользуемый компонент `AvatarUploader` с конфиг-driven лимитами. Существующий `request.ts` уже корректно обрабатывает `FormData` — никаких правок в `methods.ts` не нужно.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, react-hook-form + zod, sonner (toasts), shadcn/ui (Dialog, Button, Avatar), next-intl (i18n).

**Spec:** `docs/superpowers/specs/2026-04-27-cloudinary-avatars-design.md` (секции 4 и 6).

**Prerequisite:** Backend-план должен быть выполнен (`BackendTemplate/docs/superpowers/plans/2026-04-27-cloudinary-avatars-backend-plan.md`) — без него фронт нельзя протестировать.

---

## File Structure

### Создаются:

- `services/configs/media.types.ts` — `AssetType`, `UploadConfig`, response types
- `services/configs/media.config.ts` — `mediaApiConfig` (4 эндпоинта)
- `components/media/AvatarUploader.tsx` — компонент кнопки + диалога
- `components/media/AvatarUploader.config.ts` — `AVATAR_UPLOAD_CONFIG`
- `hooks/use-file-validation.ts` — `validateFile()` хелпер

### Модифицируются:

- `services/configs/org.types.ts` — добавить `avatar: string` в `OrgMembership`
- `services/configs/booking.types.ts` — добавить `avatar: string` в `OrgStaffMember`
- `services/index.ts` — экспорт `mediaApi`
- `i18n/messages/en.json`, `i18n/messages/uk.json` — новые ключи
- `app/[locale]/(personal)/profile/page.tsx` — вставить `<AvatarUploader>`
- `app/[locale]/(org)/org/[orgId]/my-profile/page.tsx` — вставить `<AvatarUploader>`, заменить `user.avatar` → `membership.avatar`

---

## Phase 1 — Types & API Layer

### Task 1: Добавить `avatar` в типы membership

**Files:**

- Modify: `services/configs/org.types.ts`
- Modify: `services/configs/booking.types.ts`

- [ ] **Step 1: Дополнить `OrgMembership`**

В `services/configs/org.types.ts`, в интерфейсе `OrgMembership`, после `status`:

```ts
interface OrgMembership {
	role: 'owner' | 'admin' | 'member'
	status: 'active' | 'invited' | 'suspended' | 'left'
	avatar: string // НОВОЕ — per-org аватарка, '' если нет
	displayName: string | null
	bio: string | null
	positionId: string | null
	position: string | null
}
```

- [ ] **Step 2: Дополнить `OrgStaffMember` в booking.types.ts**

```bash
grep -n "OrgStaffMember" services/configs/booking.types.ts
```

В найденном интерфейсе добавить `avatar: string`. Если поле уже есть — пропустить.

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 ошибок (либо ошибки только в файлах, которые мы будем менять дальше — например, `org/.../my-profile/page.tsx` если он использует свойства membership через destructuring без avatar — это нормально).

- [ ] **Step 4: Commit**

```bash
git add services/configs/org.types.ts services/configs/booking.types.ts
git commit -m "feat(types): add avatar field to OrgMembership and OrgStaffMember"
```

---

### Task 2: Создать `media.types.ts`

**Files:**

- Create: `services/configs/media.types.ts`

- [ ] **Step 1: Создать файл**

```ts
// services/configs/media.types.ts

type AssetType = 'user-avatar' | 'staff-avatar'

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

export type {
	AssetType,
	UploadConfig,
	UploadAvatarResponse,
	StaffAvatarResponse,
}
```

- [ ] **Step 2: Commit**

```bash
git add services/configs/media.types.ts
git commit -m "feat(types): add media types for avatar uploads"
```

---

### Task 3: Создать `media.config.ts`

**Files:**

- Create: `services/configs/media.config.ts`

- [ ] **Step 1: Создать config**

```ts
// services/configs/media.config.ts
import { postData, deleteData } from '@/services/api/methods'
import { endpoint } from '@/services/api/types'
import type { ApiResponse, User } from './user.config'
import type { UploadAvatarResponse, StaffAvatarResponse } from './media.types'

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
}

export default mediaApiConfig
export type { UploadAvatarResponse, StaffAvatarResponse }
```

**Note:** `request.ts` (строки 106-117) уже корректно обрабатывает `FormData` — не выставляет `Content-Type: application/json` если body это FormData. Поэтому отдельный `postFormData` метод не нужен.

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 ошибок.

- [ ] **Step 3: Commit**

```bash
git add services/configs/media.config.ts
git commit -m "feat(api): add mediaApi config with avatar upload/delete endpoints"
```

---

### Task 4: Подключить mediaApi в services/index.ts

**Files:**

- Modify: `services/index.ts`

- [ ] **Step 1: Добавить импорт config'a**

После `import userSearchApiConfig from './configs/user-search.config'`:

```ts
import mediaApiConfig from './configs/media.config'
```

- [ ] **Step 2: Создать API instance**

После `export const userSearchApi = ...`:

```ts
export const mediaApi = createApiMethods(mediaApiConfig, defaultInterceptors)
```

- [ ] **Step 3: Реэкспортировать типы**

В блок `export type { ... }` (где экспортируются типы из других configs), добавить:

```ts
export type {
	UploadAvatarResponse,
	StaffAvatarResponse,
} from './configs/media.config'
export type { AssetType, UploadConfig } from './configs/media.types'
```

- [ ] **Step 4: Type-check + lint**

```bash
npx tsc --noEmit
npm run lint
```

Expected: 0 ошибок и предупреждений.

- [ ] **Step 5: Commit**

```bash
git add services/index.ts
git commit -m "feat(api): export mediaApi from services/index.ts"
```

---

## Phase 2 — AvatarUploader Component

### Task 5: Создать AVATAR_UPLOAD_CONFIG

**Files:**

- Create: `components/media/AvatarUploader.config.ts`

- [ ] **Step 1: Создать файл**

```ts
// components/media/AvatarUploader.config.ts
import type { UploadConfig } from '@/services/configs/media.types'

export const AVATAR_UPLOAD_CONFIG: UploadConfig = {
	accept: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
	maxSizeBytes: 2 * 1024 * 1024,
	minDimensions: { width: 200, height: 200 },
}
```

- [ ] **Step 2: Commit**

```bash
git add components/media/AvatarUploader.config.ts
git commit -m "feat(media): add AVATAR_UPLOAD_CONFIG with default limits"
```

---

### Task 6: Создать `use-file-validation.ts`

**Files:**

- Create: `hooks/use-file-validation.ts`

- [ ] **Step 1: Создать хук**

```ts
// hooks/use-file-validation.ts
import type { UploadConfig } from '@/services/configs/media.types'

interface ValidationError {
	key: string
	params?: Record<string, string | number>
}

const formatBytes = (bytes: number): string => {
	const mb = bytes / (1024 * 1024)
	return `${mb} MB`
}

const readImageDimensions = (
	file: File,
): Promise<{ width: number; height: number }> =>
	new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file)
		const img = new Image()
		img.onload = () => {
			URL.revokeObjectURL(url)
			resolve({ width: img.naturalWidth, height: img.naturalHeight })
		}
		img.onerror = () => {
			URL.revokeObjectURL(url)
			reject(new Error('Failed to read image dimensions'))
		}
		img.src = url
	})

export const validateFile = async (
	file: File,
	config: UploadConfig,
): Promise<ValidationError | null> => {
	if (!config.accept.includes(file.type)) {
		return { key: 'errors.upload.invalidFormat' }
	}
	if (file.size > config.maxSizeBytes) {
		return {
			key: 'errors.upload.tooLarge',
			params: { max: formatBytes(config.maxSizeBytes) },
		}
	}
	if (config.minDimensions) {
		try {
			const dims = await readImageDimensions(file)
			if (
				dims.width < config.minDimensions.width ||
				dims.height < config.minDimensions.height
			) {
				return {
					key: 'errors.upload.tooSmall',
					params: {
						min: `${config.minDimensions.width}×${config.minDimensions.height}`,
					},
				}
			}
		} catch {
			return { key: 'errors.upload.invalidFormat' }
		}
	}
	return null
}

export type { ValidationError }
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add hooks/use-file-validation.ts
git commit -m "feat(hooks): add validateFile helper for client-side upload validation"
```

---

### Task 7: Создать `AvatarUploader` компонент

**Files:**

- Create: `components/media/AvatarUploader.tsx`

- [ ] **Step 1: Создать файл**

```tsx
'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Camera, Trash2, Upload } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { validateFile } from '@/hooks/use-file-validation'
import type { UploadConfig } from '@/services/configs/media.types'

interface AvatarUploaderProps {
	currentAvatar: string
	fallbackText: string
	config: UploadConfig
	onUpload: (file: File) => Promise<{ avatar: string }>
	onDelete: () => Promise<{ avatar: string }>
	onSuccess: (avatarUrl: string) => void
}

const getInitial = (text: string): string => {
	const trimmed = text.trim()
	return trimmed ? trimmed.charAt(0).toUpperCase() : '?'
}

function AvatarUploader({
	currentAvatar,
	fallbackText,
	config,
	onUpload,
	onDelete,
	onSuccess,
}: AvatarUploaderProps) {
	const t = useTranslations()
	const [open, setOpen] = React.useState(false)
	const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
	const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
	const [uploading, setUploading] = React.useState(false)
	const [confirmingDelete, setConfirmingDelete] = React.useState(false)

	const cleanupPreview = React.useCallback(() => {
		if (previewUrl) URL.revokeObjectURL(previewUrl)
		setPreviewUrl(null)
		setSelectedFile(null)
	}, [previewUrl])

	const closeDialog = () => {
		cleanupPreview()
		setConfirmingDelete(false)
		setOpen(false)
	}

	const handleSelectFile = async (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = event.target.files?.[0]
		if (!file) return
		const error = await validateFile(file, config)
		if (error) {
			toast.error(t(error.key, error.params ?? {}))
			event.target.value = ''
			return
		}
		cleanupPreview()
		setSelectedFile(file)
		setPreviewUrl(URL.createObjectURL(file))
		event.target.value = ''
	}

	const handleSave = async () => {
		if (!selectedFile) return
		setUploading(true)
		try {
			const { avatar } = await onUpload(selectedFile)
			onSuccess(avatar)
			toast.success(t('profile.photoUpdated'))
			closeDialog()
		} catch {
			// toast-interceptor уже показал ошибку
		} finally {
			setUploading(false)
		}
	}

	const handleDeleteClick = async () => {
		if (!confirmingDelete) {
			setConfirmingDelete(true)
			return
		}
		setUploading(true)
		try {
			const { avatar } = await onDelete()
			onSuccess(avatar)
			toast.success(t('profile.photoUpdated'))
			closeDialog()
		} catch {
			// toast-interceptor
		} finally {
			setUploading(false)
		}
	}

	const previewSrc = previewUrl ?? currentAvatar
	const allowDelete = currentAvatar !== '' && !selectedFile

	return (
		<div className="flex items-center gap-3">
			<Button
				variant="outline"
				size="sm"
				onClick={() => setOpen(true)}
				type="button"
			>
				<Camera className="size-4" />
				{t('profile.changePhoto')}
			</Button>
			<Dialog
				open={open}
				onOpenChange={(value) => {
					if (uploading) return
					if (value) setOpen(true)
					else closeDialog()
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t('profile.changePhoto')}</DialogTitle>
					</DialogHeader>
					<div className="flex flex-col items-center gap-4 py-2">
						<Avatar className="size-32">
							{previewSrc ? <AvatarImage src={previewSrc} alt="" /> : null}
							<AvatarFallback className="text-3xl">
								{getInitial(fallbackText)}
							</AvatarFallback>
						</Avatar>
						{uploading ? (
							<div className="flex items-center gap-2 text-sm">
								<Spinner /> {t('profile.uploadingPhoto')}
							</div>
						) : (
							<label className="border-input bg-background hover:bg-accent flex w-full cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed p-6 text-sm">
								<Upload className="text-muted-foreground size-5" />
								<span>{t('profile.dropOrClick')}</span>
								<span className="text-muted-foreground text-xs">
									{t('profile.acceptedFormats')}
								</span>
								<input
									type="file"
									accept={config.accept.join(',')}
									onChange={handleSelectFile}
									className="hidden"
									disabled={uploading}
								/>
							</label>
						)}
					</div>
					<DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
						{allowDelete ? (
							<Button
								type="button"
								variant={confirmingDelete ? 'destructive' : 'outline'}
								size="sm"
								onClick={handleDeleteClick}
								disabled={uploading}
							>
								<Trash2 className="size-4" />
								{confirmingDelete
									? t('profile.confirmRemove')
									: t('profile.removePhoto')}
							</Button>
						) : (
							<span />
						)}
						<div className="flex gap-2">
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={closeDialog}
								disabled={uploading}
							>
								{t('common.cancel')}
							</Button>
							<Button
								type="button"
								size="sm"
								onClick={handleSave}
								disabled={uploading || !selectedFile}
							>
								{t('common.save')}
							</Button>
						</div>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}

export { AvatarUploader }
export type { AvatarUploaderProps }
```

- [ ] **Step 2: Verify Dialog import path**

```bash
ls components/ui/dialog.tsx 2>/dev/null && echo "OK" || echo "MISSING — check shadcn dialog component path"
```

Expected: `OK`. Если нет — установить через `npx shadcn@latest add dialog`.

- [ ] **Step 3: Type-check + lint**

```bash
npx tsc --noEmit
npm run lint
```

Expected: 0 ошибок (могут быть предупреждения про "missing translation key" — это нормально, ключи добавим в Task 8).

- [ ] **Step 4: Commit**

```bash
git add components/media/AvatarUploader.tsx
git commit -m "feat(media): add AvatarUploader component with dialog and validation"
```

---

## Phase 3 — i18n

### Task 8: Добавить ключи в en.json и uk.json

**Files:**

- Modify: `i18n/messages/en.json`
- Modify: `i18n/messages/uk.json`

- [ ] **Step 1: Найти секции profile и errors**

```bash
grep -n '"profile"\|"errors"\|"common"' i18n/messages/en.json
```

- [ ] **Step 2: Дополнить en.json**

В блок `"profile": { ... }` добавить:

```json
"changePhoto": "Change photo",
"removePhoto": "Remove photo",
"confirmRemove": "Confirm remove?",
"uploadingPhoto": "Uploading...",
"photoUpdated": "Photo updated",
"dropOrClick": "Drop a file or click to choose",
"acceptedFormats": "JPEG, PNG, WebP, GIF · up to 2 MB"
```

В блок `"errors"` (если есть `"upload"` подблок — дополнить, если нет — создать):

```json
"upload": {
	"invalidFormat": "Invalid file format. Allowed: JPEG, PNG, WebP, GIF",
	"tooLarge": "File too large (max {max})",
	"tooSmall": "Image too small (min {min})"
}
```

В блок `"common"` (если ещё нет ключей `cancel` и `save`):

```json
"cancel": "Cancel",
"save": "Save"
```

(Если такие ключи уже существуют под другими именами в проекте — использовать существующие имена и поправить компонент.)

- [ ] **Step 3: Дополнить uk.json теми же ключами с украинским переводом**

```json
// profile
"changePhoto": "Змінити фото",
"removePhoto": "Видалити фото",
"confirmRemove": "Підтвердити видалення?",
"uploadingPhoto": "Завантаження...",
"photoUpdated": "Фото оновлено",
"dropOrClick": "Перетягніть файл або натисніть, щоб обрати",
"acceptedFormats": "JPEG, PNG, WebP, GIF · до 2 МБ"

// errors.upload
"invalidFormat": "Невірний формат файлу. Дозволено: JPEG, PNG, WebP, GIF",
"tooLarge": "Файл завеликий (макс. {max})",
"tooSmall": "Зображення замале (мін. {min})"

// common
"cancel": "Скасувати",
"save": "Зберегти"
```

- [ ] **Step 4: Проверить валидность JSON**

```bash
node -e "JSON.parse(require('fs').readFileSync('i18n/messages/en.json'))" && echo "en OK"
node -e "JSON.parse(require('fs').readFileSync('i18n/messages/uk.json'))" && echo "uk OK"
```

Expected: `en OK` и `uk OK`.

- [ ] **Step 5: Commit**

```bash
git add i18n/messages/en.json i18n/messages/uk.json
git commit -m "i18n: add keys for avatar uploader UI"
```

---

## Phase 4 — Page Integrations

### Task 9: Подключить AvatarUploader на личной странице

**Files:**

- Modify: `app/[locale]/(personal)/profile/page.tsx`

- [ ] **Step 1: Добавить импорты**

В импорт-блок:

```tsx
import { AvatarUploader } from '@/components/media/AvatarUploader'
import { AVATAR_UPLOAD_CONFIG } from '@/components/media/AvatarUploader.config'
import { mediaApi } from '@/services'
```

- [ ] **Step 2: Реализовать handlers**

Внутри `PersonalProfilePage()`, рядом с существующими handler'ами:

```tsx
const handleAvatarUpload = async (file: File) => {
	const formData = new FormData()
	formData.append('file', file)
	const response = await mediaApi.uploadUserAvatar({ body: formData })
	return { avatar: response.data.avatar }
}

const handleAvatarDelete = async () => {
	const response = await mediaApi.deleteUserAvatar()
	return { avatar: response.data.avatar }
}

const handleAvatarSuccess = (avatarUrl: string) => {
	setUser((prev) => (prev ? { ...prev, avatar: avatarUrl } : prev))
}
```

- [ ] **Step 3: Вставить компонент в JSX**

Сразу после `<ProfileHeader ... />`:

```tsx
<AvatarUploader
	currentAvatar={user.avatar}
	fallbackText={user.name}
	config={AVATAR_UPLOAD_CONFIG}
	onUpload={handleAvatarUpload}
	onDelete={handleAvatarDelete}
	onSuccess={handleAvatarSuccess}
/>
```

- [ ] **Step 4: Type-check + lint**

```bash
npx tsc --noEmit
npm run lint
```

- [ ] **Step 5: Commit**

```bash
git add app/[locale]/\(personal\)/profile/page.tsx
git commit -m "feat(profile): wire AvatarUploader on personal profile page"
```

---

### Task 10: Подключить AvatarUploader на org-странице + замена avatar source

**Files:**

- Modify: `app/[locale]/(org)/org/[orgId]/my-profile/page.tsx`

- [ ] **Step 1: Добавить импорты**

```tsx
import { AvatarUploader } from '@/components/media/AvatarUploader'
import { AVATAR_UPLOAD_CONFIG } from '@/components/media/AvatarUploader.config'
import { mediaApi } from '@/services'
```

- [ ] **Step 2: Заменить источник avatar в ProfileHeader**

Найти строку (~138):

```tsx
<ProfileHeader
	avatar={user.avatar}
	name={effectiveName}
	badges={renderBadges()}
/>
```

Заменить на:

```tsx
<ProfileHeader
	avatar={membership.avatar}
	name={effectiveName}
	badges={renderBadges()}
/>
```

**Why:** по дизайну (спек, секция 2 — display fallback) — в org-странице показываем строго `membership.avatar`, без каскада к `user.avatar`. Если пусто — фолбэк на букву (это уже реализовано в `ProfileHeader`).

- [ ] **Step 3: Реализовать handlers**

Внутри `StaffMyProfilePage()`:

```tsx
const handleAvatarUpload = async (file: File) => {
	const formData = new FormData()
	formData.append('file', file)
	const response = await mediaApi.uploadStaffAvatar({
		pathParams: { orgId, staffId: user.id },
		body: formData,
	})
	return { avatar: response.data.avatar }
}

const handleAvatarDelete = async () => {
	const response = await mediaApi.deleteStaffAvatar({
		pathParams: { orgId, staffId: user.id },
	})
	return { avatar: response.data.avatar }
}

const handleAvatarSuccess = (avatarUrl: string) => {
	setMembership((prev) => (prev ? { ...prev, avatar: avatarUrl } : prev))
}
```

- [ ] **Step 4: Вставить компонент в JSX**

Сразу после `<ProfileHeader ... />`:

```tsx
<AvatarUploader
	currentAvatar={membership.avatar}
	fallbackText={effectiveName}
	config={AVATAR_UPLOAD_CONFIG}
	onUpload={handleAvatarUpload}
	onDelete={handleAvatarDelete}
	onSuccess={handleAvatarSuccess}
/>
```

- [ ] **Step 5: Type-check + lint**

```bash
npx tsc --noEmit
npm run lint
```

- [ ] **Step 6: Commit**

```bash
git add "app/[locale]/(org)/org/[orgId]/my-profile/page.tsx"
git commit -m "feat(profile): wire AvatarUploader and use membership.avatar in org profile"
```

---

## Phase 5 — Verification

### Task 11: Проверить production build

**Files:** —

- [ ] **Step 1: Полный build**

```bash
npm run build
```

Expected: build проходит без ошибок и type-warnings.

- [ ] **Step 2: Lint полным проходом**

```bash
npm run lint
```

Expected: 0 ошибок.

- [ ] **Step 3: Format check**

```bash
npm run format:check
```

Если не проходит — `npm run format` и закоммитить:

```bash
git add -A
git commit -m "chore: format media files"
```

---

### Task 12: Manual browser testing

**Files:** —

**Pre-requisite:** backend-план выполнен, бэкенд работает на `localhost:9000` с настоящими CLOUDINARY\_\* env-переменными.

- [ ] **Step 1: Запустить dev server**

```bash
npm run dev
```

Открыть http://localhost:3000.

- [ ] **Step 2: Залогиниться**

Через существующий auth-flow (Google OAuth).

- [ ] **Step 3: Тест личной аватарки**

Перейти на `/profile`:

- [ ] Видна кнопка "Сменить фото" под `ProfileHeader`
- [ ] Клик открывает диалог
- [ ] В диалоге видна текущая аватарка (или fallback-буква)
- [ ] Выбор jpg-файла <2 MB → видно превью нового файла
- [ ] Клик "Сохранить" → спиннер → диалог закрывается → новая аватарка в `ProfileHeader` → toast "Photo updated"
- [ ] Без рефреша страницы новая аватарка видна

- [ ] **Step 4: Тест валидации**

- [ ] Выбор PDF → toast "Invalid file format..."
- [ ] Выбор файла >2 MB → toast "File too large (max 2 MB)"
- [ ] Выбор картинки <200×200 → toast "Image too small (min 200×200)"

- [ ] **Step 5: Тест удаления личной аватарки**

- [ ] Открыть диалог → виден "Удалить фото" (т.к. аватарка есть)
- [ ] Клик "Удалить фото" → текст меняется на "Подтвердить удаление?", кнопка красная
- [ ] Клик ещё раз → диалог закрывается → в `ProfileHeader` буква-fallback
- [ ] Открыть диалог снова → кнопки "Удалить фото" больше нет (currentAvatar пустой)

- [ ] **Step 6: Тест per-org аватарки**

Перейти на `/org/{orgId}/my-profile` (любая орг где ты состоишь):

- [ ] В `ProfileHeader` показывается **per-org** avatar (не глобальная) — в первый раз = буква (поле пустое)
- [ ] Загрузить аватарку через диалог → отображается в орг-профиле
- [ ] **Не** меняется аватарка на `/profile` (личная не задета)

- [ ] **Step 7: Тест что глобальная и per-org независимы**

- [ ] На `/profile` — личная аватарка X
- [ ] На `/org/A/my-profile` — per-org аватарка Y (отличается от X)
- [ ] Перейти на `/org/A/my-profile` → видна Y
- [ ] Перейти на `/profile` → видна X
- [ ] Удалить per-org → в орге fallback-буква (НЕ X — без каскада)

- [ ] **Step 8: Тест ошибок сети**

- [ ] Стопнуть бэкенд (`kill` процесса)
- [ ] Попытаться загрузить аватарку → toast с ошибкой сети, диалог не закрывается, можно повторить
- [ ] Запустить бэкенд снова → повтор работает

- [ ] **Step 9: Тест локализации**

- [ ] Переключить язык на UK
- [ ] Все тексты в диалоге на украинском

- [ ] **Step 10: Сверить с Acceptance Criteria из спека**

Открыть `docs/superpowers/specs/2026-04-27-cloudinary-avatars-design.md`, секция 6 "Frontend". Проверить каждый чекбокс:

- [ ] mediaApi экспортируется из services/index.ts
- [ ] postFormData работает (используем существующий postData с FormData — он уже это поддерживает)
- [ ] AvatarUploader рендерится на /profile и /org/[orgId]/my-profile
- [ ] Личная страница: загрузка → новая аватарка отображается без рефреша
- [ ] Орг-страница: загрузка per-org → отображается, не ломает глобальную
- [ ] Удаление личной → fallback-буква
- [ ] Удаление орг → fallback-буква (НЕ глобальная)
- [ ] Файл >2 MB → toast с ошибкой, диалог не закрывается
- [ ] Файл не из белого списка → toast
- [ ] Файл <200×200 → toast
- [ ] При успехе диалог закрывается, тост "Photo updated"
- [ ] Сетевая ошибка от бэка → toast, диалог не закрывается
- [ ] i18n ключи добавлены в en.json и uk.json
- [ ] npm run lint и npm run build проходят

---

## Done — Frontend готов

После прохождения всех 12 задач фича "смена аватарок (личная + per-org)" полностью реализована и протестирована end-to-end. Спек выполнен.

Следующие шаги (вне скоупа этой работы):

- Логотипы организаций (`Organization.logo`) — переиспользовать `AvatarUploader` с другим конфигом и новым `assetType: 'org-logo'`
- Фото услуг / event types
- Direct signed uploads (миграция архитектуры с A на C — без правок UI, только провайдер на бэке + новый upload-flow в `mediaApi`)
