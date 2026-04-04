# Профили и описания — план имплементации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить описания/контакты для организаций, личных пользователей и сотрудников; отображать на букинг-странице; удалить slug из организации.

**Architecture:** Расширяем существующие типы (`OrgByIdResponse`, `User`, `StaffBySlugResponse`) новыми полями. Создаём две страницы профиля (орга + личный) и секцию bio для сотрудника. На букинге — инфо-блок с контактами из расширенного `StaffBySlugResponse`.

**Tech Stack:** Next.js 16, React 19, TypeScript, react-hook-form + zod, Tailwind CSS 4, shadcn/ui, next-intl, lucide-react

---

### Task 1: Удалить slug из организации

**Files:**
- Modify: `services/configs/booking.types.ts` (строка с `slug` в `OrgByIdResponse`)
- Modify: `lib/booking-api-client.ts` (трансформер `toFrontendOrg` или аналог)
- Modify: `lib/mock-api.ts` (mock `getOrgById`)

- [ ] **Step 1: Удалить `slug` из `OrgByIdResponse` в типах**

В `services/configs/booking.types.ts` убрать строку `slug: string` из `OrgByIdResponse`:

```typescript
interface OrgByIdResponse {
	id: string
	name: string
	logo: string | null
}
```

- [ ] **Step 2: Убрать `slug` из трансформера в `lib/booking-api-client.ts`**

Найти функцию, которая маппит `OrgByIdResponse` (вероятно `toFrontendOrg` или в `getOrgById`). Убрать `slug: raw.slug` из маппинга.

- [ ] **Step 3: Убрать `slug` из мока в `lib/mock-api.ts`**

В `getOrgById()` убрать `slug: 'demo-org'` из возвращаемого объекта.

- [ ] **Step 4: Проверить сборку**

```bash
npm run build
```

Expected: сборка проходит без ошибок, связанных со `slug`.

- [ ] **Step 5: Коммит**

```bash
git add services/configs/booking.types.ts lib/booking-api-client.ts lib/mock-api.ts
git commit -m "refactor: удалить slug из OrgByIdResponse"
```

---

### Task 2: Расширить типы организации

**Files:**
- Modify: `services/configs/booking.types.ts` (`OrgByIdResponse`)
- Modify: `services/configs/org.types.ts` (`CreateOrgBody`, новый `UpdateOrgBody`)

- [ ] **Step 1: Добавить поля описания в `OrgByIdResponse`**

В `services/configs/booking.types.ts`:

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

- [ ] **Step 2: Добавить опциональные поля в `CreateOrgBody`**

В `services/configs/org.types.ts`:

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

- [ ] **Step 3: Создать `UpdateOrgBody` и экспортировать**

В `services/configs/org.types.ts` добавить:

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

Добавить `UpdateOrgBody` в `export type { ... }`.

- [ ] **Step 4: Экспортировать `UpdateOrgBody` из `services/index.ts`**

Добавить `UpdateOrgBody` в строку экспорта `org.types`:

```typescript
export type {
	OrgListItem,
	CreateOrgBody,
	AddStaffBody,
	UpdateOrgBody,
} from './configs/org.types'
```

- [ ] **Step 5: Коммит**

```bash
git add services/configs/booking.types.ts services/configs/org.types.ts services/index.ts
git commit -m "feat: расширить типы организации полями описания"
```

---

### Task 3: Добавить эндпоинт обновления организации

**Files:**
- Modify: `services/configs/org.config.ts` (новый эндпоинт `update`)

- [ ] **Step 1: Добавить import `putData`**

В `services/configs/org.config.ts` добавить `putData` в импорт:

```typescript
import { getData, postData, patchData, deleteData, putData } from '@/services/api/methods'
```

- [ ] **Step 2: Добавить import `UpdateOrgBody`**

```typescript
import type { OrgListItem, CreateOrgBody, AddStaffBody, UpdateOrgBody } from './org.types'
```

- [ ] **Step 3: Добавить эндпоинт `update` в `orgApiConfig`**

После `create`:

```typescript
update: endpoint<UpdateOrgBody, ApiResponse<OrgByIdResponse>>({
	url: ({ id }) => `/api/org/${id}`,
	method: putData,
	defaultErrorMessage: 'Failed to update organization',
}),
```

- [ ] **Step 4: Коммит**

```bash
git add services/configs/org.config.ts
git commit -m "feat: добавить эндпоинт обновления организации"
```

---

### Task 4: Расширить типы пользователя и сотрудника

**Files:**
- Modify: `services/configs/user.config.ts` (`User`, `UpdateUserBody`)
- Modify: `services/configs/booking.types.ts` (`StaffMember`, `StaffBySlugResponse`)

- [ ] **Step 1: Добавить поля описания в `User`**

В `services/configs/user.config.ts`:

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

- [ ] **Step 2: Расширить `UpdateUserBody`**

В `services/configs/user.config.ts`:

```typescript
interface UpdateUserBody {
	name?: string
	description?: string | null
	address?: string | null
	phone?: string | null
	website?: string | null
}
```

- [ ] **Step 3: Добавить `bio` в `StaffMember`**

В `services/configs/booking.types.ts`:

```typescript
interface StaffMember {
	id: string
	name: string
	avatar: string
	position: string | null
	bio: string | null
}
```

- [ ] **Step 4: Расширить `StaffBySlugResponse` полями контактов и bio**

В `services/configs/booking.types.ts`:

```typescript
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

- [ ] **Step 5: Проверить сборку**

```bash
npm run build
```

Могут появиться ошибки в местах, которые создают объекты `StaffMember` без `bio` (например, `toStaffMember` в `BookingPage.tsx`). Исправить — добавить `bio: staff.bio ?? null`.

- [ ] **Step 6: Коммит**

```bash
git add services/configs/user.config.ts services/configs/booking.types.ts
git commit -m "feat: расширить типы User и Staff полями описания и bio"
```

---

### Task 5: Обновить моки и трансформеры

**Files:**
- Modify: `lib/booking-api-client.ts` (трансформеры staff/org)
- Modify: `lib/mock-api.ts` (моки)
- Modify: `lib/mock.ts` (mock data)
- Modify: `app/[locale]/book/[staffSlug]/BookingPage.tsx` (`toStaffMember`)

- [ ] **Step 1: Обновить `toStaffMember` в `BookingPage.tsx`**

Добавить `bio` в `toStaffMember`:

```typescript
const toStaffMember = (staff: {
	id: string
	name: string
	avatar?: string
	position?: string | null
	bio?: string | null
}): OrgStaffMember => ({
	id: staff.id,
	name: staff.name,
	avatar: staff.avatar ?? '',
	position: staff.position ?? null,
	bio: staff.bio ?? null,
	bookingCount: 0,
})
```

- [ ] **Step 2: Обновить трансформеры в `lib/booking-api-client.ts`**

В функции трансформации staff-ответа добавить новые поля: `bio`, `description`, `address`, `phone`, `website`, `orgName`, `orgLogo`. Маппить из бэкенд-ответа или ставить `null` по умолчанию.

В функции трансформации org-ответа добавить: `description`, `address`, `phone`, `website`.

- [ ] **Step 3: Обновить моки**

В `lib/mock-api.ts` и `lib/mock.ts` добавить новые поля со значениями `null` или тестовыми данными.

- [ ] **Step 4: Проверить сборку**

```bash
npm run build
```

Expected: сборка проходит без ошибок.

- [ ] **Step 5: Коммит**

```bash
git add app/[locale]/book/[staffSlug]/BookingPage.tsx lib/booking-api-client.ts lib/mock-api.ts lib/mock.ts
git commit -m "fix: обновить моки и трансформеры для новых полей профиля"
```

---

### Task 6: i18n — добавить ключи переводов

**Files:**
- Modify: `i18n/messages/en.json`
- Modify: `i18n/messages/uk.json`

- [ ] **Step 1: Добавить ключи `profile` в `en.json`**

Добавить новый раздел `profile` на верхнем уровне:

```json
"profile": {
  "title": "Profile",
  "orgTitle": "Organization Profile",
  "myTitle": "My Profile",
  "description": "Description",
  "descriptionPlaceholder": "Tell about yourself or your business...",
  "address": "Address",
  "addressPlaceholder": "City, street, building",
  "phone": "Phone",
  "phonePlaceholder": "+380 XX XXX XX XX",
  "website": "Website",
  "websitePlaceholder": "https://example.com",
  "bio": "About",
  "bioPlaceholder": "A few words about yourself...",
  "save": "Save",
  "saved": "Profile saved",
  "showMore": "Show more",
  "showLess": "Show less"
}
```

- [ ] **Step 2: Добавить ключи `profile` в `uk.json`**

```json
"profile": {
  "title": "Профіль",
  "orgTitle": "Профіль організації",
  "myTitle": "Мій профіль",
  "description": "Опис",
  "descriptionPlaceholder": "Розкажіть про себе або свій бізнес...",
  "address": "Адреса",
  "addressPlaceholder": "Місто, вулиця, будинок",
  "phone": "Телефон",
  "phonePlaceholder": "+380 XX XXX XX XX",
  "website": "Вебсайт",
  "websitePlaceholder": "https://example.com",
  "bio": "Про себе",
  "bioPlaceholder": "Кілька слів про себе...",
  "save": "Зберегти",
  "saved": "Профіль збережено",
  "showMore": "Показати ще",
  "showLess": "Сховати"
}
```

- [ ] **Step 3: Добавить ключ `profile` в `sidebar` раздел обоих файлов**

В `en.json` в раздел `sidebar`:

```json
"profile": "Profile"
```

В `uk.json` в раздел `sidebar`:

```json
"profile": "Профіль"
```

- [ ] **Step 4: Коммит**

```bash
git add i18n/messages/en.json i18n/messages/uk.json
git commit -m "feat: i18n ключи для профилей и описаний"
```

---

### Task 7: Компонент формы профиля (переиспользуемый)

**Files:**
- Create: `components/profile/ProfileForm.tsx`

- [ ] **Step 1: Создать компонент `ProfileForm`**

Файл `components/profile/ProfileForm.tsx`:

```typescript
'use client'

import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { setServerErrors } from '@/services'

const profileSchema = z.object({
	name: z
		.string()
		.min(1, 'Name is required')
		.min(2, 'Name must be at least 2 characters'),
	description: z.string().max(1000).optional().or(z.literal('')),
	address: z.string().optional().or(z.literal('')),
	phone: z.string().optional().or(z.literal('')),
	website: z
		.string()
		.url('Must be a valid URL')
		.optional()
		.or(z.literal('')),
})

type ProfileFormData = z.infer<typeof profileSchema>

interface ProfileFormProps {
	defaultValues: ProfileFormData
	onSubmit: (data: ProfileFormData) => Promise<void>
}

function ProfileForm({ defaultValues, onSubmit }: ProfileFormProps) {
	const t = useTranslations('profile')

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
		setError,
	} = useForm<ProfileFormData>({
		resolver: zodResolver(profileSchema),
		defaultValues,
	})

	const handleFormSubmit = async (data: ProfileFormData) => {
		try {
			await onSubmit(data)
			toast.success(t('saved'))
		} catch (err) {
			if (!setServerErrors(err, setError)) {
				// toast уже показан интерцептором
			}
		}
	}

	return (
		<form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
			<Field data-invalid={!!errors.name || undefined}>
				<FieldLabel htmlFor="profile-name">{t('name')}</FieldLabel>
				<Input id="profile-name" {...register('name')} />
				<FieldError errors={[errors.name]} />
			</Field>

			<Field data-invalid={!!errors.description || undefined}>
				<FieldLabel htmlFor="profile-description">
					{t('description')}
				</FieldLabel>
				<Textarea
					id="profile-description"
					placeholder={t('descriptionPlaceholder')}
					rows={4}
					{...register('description')}
				/>
				<FieldError errors={[errors.description]} />
			</Field>

			<Field data-invalid={!!errors.address || undefined}>
				<FieldLabel htmlFor="profile-address">{t('address')}</FieldLabel>
				<Input
					id="profile-address"
					placeholder={t('addressPlaceholder')}
					{...register('address')}
				/>
				<FieldError errors={[errors.address]} />
			</Field>

			<Field data-invalid={!!errors.phone || undefined}>
				<FieldLabel htmlFor="profile-phone">{t('phone')}</FieldLabel>
				<Input
					id="profile-phone"
					placeholder={t('phonePlaceholder')}
					{...register('phone')}
				/>
				<FieldError errors={[errors.phone]} />
			</Field>

			<Field data-invalid={!!errors.website || undefined}>
				<FieldLabel htmlFor="profile-website">{t('website')}</FieldLabel>
				<Input
					id="profile-website"
					placeholder={t('websitePlaceholder')}
					{...register('website')}
				/>
				<FieldError errors={[errors.website]} />
			</Field>

			<Button type="submit" disabled={isSubmitting}>
				{t('save')}
			</Button>
		</form>
	)
}

export { ProfileForm, profileSchema }
export type { ProfileFormData }
```

- [ ] **Step 2: Проверить сборку**

```bash
npm run build
```

- [ ] **Step 3: Коммит**

```bash
git add components/profile/ProfileForm.tsx
git commit -m "feat: переиспользуемый компонент ProfileForm"
```

---

### Task 8: Страница профиля организации

**Files:**
- Create: `app/[locale]/(org)/manage/[orgId]/profile/page.tsx`
- Modify: `components/sidebar/OrgSidebar.tsx` (новый пункт меню)

- [ ] **Step 1: Создать страницу профиля организации**

Файл `app/[locale]/(org)/manage/[orgId]/profile/page.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { orgApi } from '@/services'
import type { OrgByIdResponse } from '@/services'
import { ProfileForm } from '@/components/profile/ProfileForm'
import type { ProfileFormData } from '@/components/profile/ProfileForm'

function OrgProfilePage() {
	const params = useParams<{ orgId: string }>()
	const t = useTranslations('profile')
	const [org, setOrg] = useState<OrgByIdResponse | null>(null)
	const [loading, setLoading] = useState(true)

	const orgId = params.orgId

	useEffect(() => {
		const fetchOrg = async () => {
			try {
				const response = await orgApi.getById({
					pathParams: { id: orgId },
				})
				setOrg(response.data)
			} catch {
				// toast интерцептор
			} finally {
				setLoading(false)
			}
		}

		fetchOrg()
	}, [orgId])

	if (loading) {
		return (
			<div className="flex items-center justify-center py-20">
				<p className="text-muted-foreground text-sm">Loading...</p>
			</div>
		)
	}

	if (!org) return null

	const defaultValues: ProfileFormData = {
		name: org.name,
		description: org.description ?? '',
		address: org.address ?? '',
		phone: org.phone ?? '',
		website: org.website ?? '',
	}

	const handleSubmit = async (data: ProfileFormData) => {
		await orgApi.update({
			pathParams: { id: orgId },
			body: {
				name: data.name,
				description: data.description || null,
				address: data.address || null,
				phone: data.phone || null,
				website: data.website || null,
			},
		})
		setOrg((prev) =>
			prev
				? {
						...prev,
						name: data.name,
						description: data.description || null,
						address: data.address || null,
						phone: data.phone || null,
						website: data.website || null,
					}
				: prev,
		)
	}

	return (
		<div className="mx-auto max-w-2xl p-6">
			<h1 className="mb-6 text-2xl font-bold">{t('orgTitle')}</h1>
			<ProfileForm defaultValues={defaultValues} onSubmit={handleSubmit} />
		</div>
	)
}

export default OrgProfilePage
```

- [ ] **Step 2: Добавить пункт "Профіль" в `OrgSidebar`**

В `components/sidebar/OrgSidebar.tsx`:

1. Добавить импорт `UserCircle` из `lucide-react`
2. Добавить переменную `profileHref`:
```typescript
const profileHref = buildHref(`/manage/${orgId}/profile`)
```
3. Добавить пункт меню перед `generalSchedule`:
```tsx
<SidebarMenuItem>
	<SidebarMenuButton
		render={<Link href={profileHref} />}
		isActive={isActive(profileHref)}
	>
		<UserCircle className="size-4" />
		<span>{t('profile')}</span>
	</SidebarMenuButton>
</SidebarMenuItem>
```

- [ ] **Step 3: Проверить сборку**

```bash
npm run build
```

- [ ] **Step 4: Коммит**

```bash
git add app/[locale]/(org)/manage/[orgId]/profile/page.tsx components/sidebar/OrgSidebar.tsx
git commit -m "feat: страница профиля организации + пункт в сайдбаре"
```

---

### Task 9: Страница личного профиля

**Files:**
- Create: `app/[locale]/(personal)/profile/page.tsx`
- Modify: `components/sidebar/PersonalSidebar.tsx` (новый пункт меню)

- [ ] **Step 1: Создать страницу личного профиля**

Файл `app/[locale]/(personal)/profile/page.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { userApi } from '@/services'
import type { User } from '@/services'
import { ProfileForm } from '@/components/profile/ProfileForm'
import type { ProfileFormData } from '@/components/profile/ProfileForm'

function PersonalProfilePage() {
	const t = useTranslations('profile')
	const [user, setUser] = useState<User | null>(null)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		const fetchUser = async () => {
			try {
				const response = await userApi.me()
				setUser(response.data)
			} catch {
				// toast интерцептор
			} finally {
				setLoading(false)
			}
		}

		fetchUser()
	}, [])

	if (loading) {
		return (
			<div className="flex items-center justify-center py-20">
				<p className="text-muted-foreground text-sm">Loading...</p>
			</div>
		)
	}

	if (!user) return null

	const defaultValues: ProfileFormData = {
		name: user.name,
		description: user.description ?? '',
		address: user.address ?? '',
		phone: user.phone ?? '',
		website: user.website ?? '',
	}

	const handleSubmit = async (data: ProfileFormData) => {
		await userApi.update({
			pathParams: { id: user.id },
			body: {
				name: data.name,
				description: data.description || null,
				address: data.address || null,
				phone: data.phone || null,
				website: data.website || null,
			},
		})
		setUser((prev) =>
			prev
				? {
						...prev,
						name: data.name,
						description: data.description ?? null,
						address: data.address ?? null,
						phone: data.phone ?? null,
						website: data.website ?? null,
					}
				: prev,
		)
	}

	return (
		<div className="mx-auto max-w-2xl p-6">
			<h1 className="mb-6 text-2xl font-bold">{t('myTitle')}</h1>
			<ProfileForm defaultValues={defaultValues} onSubmit={handleSubmit} />
		</div>
	)
}

export default PersonalProfilePage
```

- [ ] **Step 2: Добавить пункт "Мій профіль" в `PersonalSidebar`**

В `components/sidebar/PersonalSidebar.tsx`:

1. Добавить импорт `UserCircle` из `lucide-react`
2. Добавить переменную:
```typescript
const profileHref = buildHref('/profile')
```
3. Добавить пункт меню первым в списке (перед `scheduleHref`):
```tsx
<SidebarMenuItem>
	<SidebarMenuButton
		render={<Link href={profileHref} />}
		isActive={isActive(profileHref)}
	>
		<UserCircle className="size-4" />
		<span>{t('profile')}</span>
	</SidebarMenuButton>
</SidebarMenuItem>
```

- [ ] **Step 3: Проверить сборку**

```bash
npm run build
```

- [ ] **Step 4: Коммит**

```bash
git add app/[locale]/(personal)/profile/page.tsx components/sidebar/PersonalSidebar.tsx
git commit -m "feat: страница личного профиля + пункт в сайдбаре"
```

---

### Task 10: Bio сотрудника — страница и эндпоинт

**Files:**
- Create: `app/[locale]/(org)/org/[orgId]/my-profile/page.tsx`
- Modify: `services/configs/org.config.ts` (эндпоинт updateStaffBio)
- Modify: `components/sidebar/OrgSidebar.tsx` (пункт меню "Мій профіль")

- [ ] **Step 1: Добавить эндпоинт `updateStaffBio` в `org.config.ts`**

```typescript
updateStaffBio: endpoint<{ bio: string | null }, ApiResponse<OrgStaffMember>>({
	url: ({ orgId, staffId }) => `/api/org/${orgId}/staff/${staffId}`,
	method: patchData,
	defaultErrorMessage: 'Failed to update bio',
}),
```

- [ ] **Step 2: Создать страницу my-profile для сотрудника**

Файл `app/[locale]/(org)/org/[orgId]/my-profile/page.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { orgApi, userApi } from '@/services'
import { setServerErrors } from '@/services'

const bioSchema = z.object({
	bio: z.string().max(500).optional().or(z.literal('')),
})

type BioFormData = z.infer<typeof bioSchema>

function StaffMyProfilePage() {
	const params = useParams<{ orgId: string }>()
	const t = useTranslations('profile')
	const [staffId, setStaffId] = useState<string | null>(null)
	const [loading, setLoading] = useState(true)
	const [currentBio, setCurrentBio] = useState<string>('')

	const orgId = params.orgId

	useEffect(() => {
		const fetchData = async () => {
			try {
				const userResponse = await userApi.me()
				const userId = userResponse.data.id

				const staffResponse = await orgApi.getStaff({
					pathParams: { id: orgId },
				})
				const me = staffResponse.data.find(
					(s) => s.id === userId,
				)
				if (me) {
					setStaffId(me.id)
					setCurrentBio(me.bio ?? '')
				}
			} catch {
				// toast интерцептор
			} finally {
				setLoading(false)
			}
		}

		fetchData()
	}, [orgId])

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
		setError,
	} = useForm<BioFormData>({
		resolver: zodResolver(bioSchema),
		values: { bio: currentBio },
	})

	const onSubmit = async (data: BioFormData) => {
		if (!staffId) return
		try {
			await orgApi.updateStaffBio({
				pathParams: { orgId, staffId },
				body: { bio: data.bio || null },
			})
			toast.success(t('saved'))
		} catch (err) {
			if (!setServerErrors(err, setError)) {
				// toast уже показан
			}
		}
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center py-20">
				<p className="text-muted-foreground text-sm">Loading...</p>
			</div>
		)
	}

	if (!staffId) return null

	return (
		<div className="mx-auto max-w-2xl p-6">
			<h1 className="mb-6 text-2xl font-bold">{t('myTitle')}</h1>
			<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
				<Field data-invalid={!!errors.bio || undefined}>
					<FieldLabel htmlFor="staff-bio">{t('bio')}</FieldLabel>
					<Textarea
						id="staff-bio"
						placeholder={t('bioPlaceholder')}
						rows={4}
						{...register('bio')}
					/>
					<FieldError errors={[errors.bio]} />
				</Field>
				<Button type="submit" disabled={isSubmitting}>
					{t('save')}
				</Button>
			</form>
		</div>
	)
}

export default StaffMyProfilePage
```

- [ ] **Step 3: Добавить пункт "Мій профіль" в `OrgSidebar`**

Добавить после `myScheduleHref`:

```typescript
const myProfileHref = buildHref(`/org/${orgId}/my-profile`)
```

И пункт меню после `mySchedule`:

```tsx
<SidebarMenuItem>
	<SidebarMenuButton
		render={<Link href={myProfileHref} />}
		isActive={isActive(myProfileHref)}
	>
		<UserCircle className="size-4" />
		<span>{t('profile')}</span>
	</SidebarMenuButton>
</SidebarMenuItem>
```

- [ ] **Step 4: Проверить сборку**

```bash
npm run build
```

- [ ] **Step 5: Коммит**

```bash
git add app/[locale]/(org)/org/[orgId]/my-profile/page.tsx services/configs/org.config.ts components/sidebar/OrgSidebar.tsx
git commit -m "feat: страница bio сотрудника + пункт в сайдбаре"
```

---

### Task 11: Инфо-блок на букинг-странице

**Files:**
- Create: `components/booking/ProfileInfoBlock.tsx`
- Modify: `app/[locale]/book/[staffSlug]/BookingPage.tsx` (передать данные)
- Modify: `lib/calendar/CalendarCore.tsx` (отрендерить блок)

- [ ] **Step 1: Создать компонент `ProfileInfoBlock`**

Файл `components/booking/ProfileInfoBlock.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { MapPin, Phone, Globe } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface ProfileInfoBlockProps {
	name: string
	logo: string | null
	avatar: string | null
	description: string | null
	address: string | null
	phone: string | null
	website: string | null
	isOrg: boolean
}

const MAX_DESCRIPTION_LENGTH = 150

function ProfileInfoBlock({
	name,
	logo,
	avatar,
	description,
	address,
	phone,
	website,
	isOrg,
}: ProfileInfoBlockProps) {
	const t = useTranslations('profile')
	const [expanded, setExpanded] = useState(false)

	const hasContactInfo = address || phone || website
	const hasDescription = description && description.length > 0
	const isLongDescription =
		hasDescription && description.length > MAX_DESCRIPTION_LENGTH

	if (!hasDescription && !hasContactInfo) return null

	const toggleExpanded = () => setExpanded((prev) => !prev)

	const displayedDescription =
		hasDescription && !expanded && isLongDescription
			? `${description.slice(0, MAX_DESCRIPTION_LENGTH)}...`
			: description

	const imageSource = isOrg ? logo : avatar
	const getInitial = (n: string): string => n.charAt(0).toUpperCase()

	return (
		<div className="flex flex-col gap-3 rounded-lg border p-4">
			<div className="flex items-center gap-3">
				{isOrg && imageSource ? (
					<img
						src={imageSource}
						alt={name}
						className="size-8 rounded"
					/>
				) : (
					<Avatar className="size-8">
						<AvatarImage src={imageSource ?? undefined} />
						<AvatarFallback className="text-xs">
							{getInitial(name)}
						</AvatarFallback>
					</Avatar>
				)}
				<span className="text-sm font-semibold">{name}</span>
			</div>

			{hasDescription && (
				<div className="text-muted-foreground text-xs">
					<p>{displayedDescription}</p>
					{isLongDescription && (
						<button
							type="button"
							onClick={toggleExpanded}
							className="text-primary mt-1 hover:underline"
						>
							{expanded ? t('showLess') : t('showMore')}
						</button>
					)}
				</div>
			)}

			{hasContactInfo && (
				<div className="flex flex-col gap-1.5">
					{address && (
						<div className="text-muted-foreground flex items-center gap-2 text-xs">
							<MapPin className="size-3.5 shrink-0" />
							<span>{address}</span>
						</div>
					)}
					{phone && (
						<div className="text-muted-foreground flex items-center gap-2 text-xs">
							<Phone className="size-3.5 shrink-0" />
							<a href={`tel:${phone}`} className="hover:underline">
								{phone}
							</a>
						</div>
					)}
					{website && (
						<div className="text-muted-foreground flex items-center gap-2 text-xs">
							<Globe className="size-3.5 shrink-0" />
							<a
								href={website}
								target="_blank"
								rel="noopener noreferrer"
								className="hover:underline"
							>
								{website}
							</a>
						</div>
					)}
				</div>
			)}
		</div>
	)
}

export { ProfileInfoBlock }
export type { ProfileInfoBlockProps }
```

- [ ] **Step 2: Интегрировать `ProfileInfoBlock` в букинг**

В `BookingPage.tsx` передать данные из `staff` (расширенный `StaffBySlugResponse`) в `CalendarCore` через новый проп `profileInfo`.

В `CalendarCore.tsx` отрендерить `ProfileInfoBlock` в сайдбаре/хедере над панелью букинга.

Пропсы:

```typescript
const profileInfo = {
	name: staff.orgName ?? staff.name,
	logo: staff.orgLogo,
	avatar: staff.avatar,
	description: staff.description,
	address: staff.address,
	phone: staff.phone,
	website: staff.website,
	isOrg: !!staff.orgId,
}
```

- [ ] **Step 3: Добавить отображение bio сотрудника**

В месте, где отображается аватар/имя/позиция сотрудника (в `BookingPanel` или в strategy-компонентах), добавить `bio` под позицией:

```tsx
{staff.bio && (
	<p className="text-muted-foreground text-xs">{staff.bio}</p>
)}
```

- [ ] **Step 4: Проверить сборку**

```bash
npm run build
```

- [ ] **Step 5: Коммит**

```bash
git add components/booking/ProfileInfoBlock.tsx app/[locale]/book/[staffSlug]/BookingPage.tsx lib/calendar/CalendarCore.tsx
git commit -m "feat: инфо-блок с контактами на странице букинга"
```

---

### Task 12: Добавить ключ `name` в i18n profile

**Files:**
- Modify: `i18n/messages/en.json`
- Modify: `i18n/messages/uk.json`

- [ ] **Step 1: Добавить ключ `name` в раздел `profile`**

В `en.json`:
```json
"name": "Name"
```

В `uk.json`:
```json
"name": "Ім'я"
```

- [ ] **Step 2: Коммит**

```bash
git add i18n/messages/en.json i18n/messages/uk.json
git commit -m "fix: добавить ключ name в i18n profile"
```

---

### Task 13: Финальная проверка

- [ ] **Step 1: Проверить lint**

```bash
npm run lint
```

- [ ] **Step 2: Проверить форматирование**

```bash
npm run format
```

- [ ] **Step 3: Проверить сборку**

```bash
npm run build
```

- [ ] **Step 4: Исправить все ошибки если есть**

- [ ] **Step 5: Финальный коммит (если были исправления)**

```bash
git add -A
git commit -m "fix: исправления после финальной проверки"
```
