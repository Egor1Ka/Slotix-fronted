# Удаление захардкоженных базовых полей phone/email — План реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Убрать захардкоженные базовые поля phone/email из формы бронирования. Единственное базовое поле — `name` (always required). Phone и email добавляются как обычные кастомные поля.

**Architecture:** Удаляем типы `BookingFormConfig`, `UpdateBookingFormConfigBody`, `BaseFieldOverrides`, `MergedBaseField`. Упрощаем `MergedBookingForm` до `{ baseFields: { name: { required: true } }, customFields: BookingField[] }`. Убираем phone/email override из ServiceDialog и Switch'и из BookingFormSettings. Адаптируем ClientInfoForm — рендерит только name + customFields.

**Tech Stack:** TypeScript, React, zod, react-hook-form, Next.js

---

### Task 1: Очистить типы в `booking-field.types.ts`

**Files:**

- Modify: `services/configs/booking-field.types.ts`

- [ ] **Step 1: Удалить ненужные типы и упростить MergedBookingForm**

Заменить содержимое файла:

```ts
type BookingFieldType = 'email' | 'phone' | 'text' | 'textarea'

interface BookingField {
	id: string
	ownerId: string
	ownerType: 'org' | 'user'
	eventTypeId: string | null
	type: BookingFieldType
	label: string
	required: boolean
	createdAt: string
}

interface CreateBookingFieldBody {
	ownerId: string
	ownerType: 'org' | 'user'
	eventTypeId?: string | null
	type: BookingFieldType
	label: string
	required: boolean
}

interface UpdateBookingFieldBody {
	label?: string
	type?: BookingFieldType
	required?: boolean
}

interface MergedBookingForm {
	baseFields: {
		name: { required: true }
	}
	customFields: BookingField[]
}

interface CustomFieldValue {
	fieldId: string
	label: string
	value: string
}

export type {
	BookingFieldType,
	BookingField,
	CreateBookingFieldBody,
	UpdateBookingFieldBody,
	MergedBookingForm,
	CustomFieldValue,
}
```

Удалены: `BookingFormConfig`, `UpdateBookingFormConfigBody`, `BaseFieldOverrides`, `MergedBaseField`.

- [ ] **Step 2: Commit**

```bash
git add services/configs/booking-field.types.ts
git commit -m "refactor: удалить типы BookingFormConfig, BaseFieldOverrides, MergedBaseField"
```

---

### Task 2: Убрать `baseFieldOverrides` из event-type типов

**Files:**

- Modify: `services/configs/event-type.types.ts`

- [ ] **Step 1: Убрать импорт и поле baseFieldOverrides**

```ts
type StaffPolicy = 'any' | 'by_position' | 'specific'

interface CreateEventTypeBody {
	orgId?: string
	userId?: string
	name: string
	durationMin: number
	price: number
	currency: string
	color?: string
	description?: string
	staffPolicy?: StaffPolicy
	assignedPositions?: string[]
	assignedStaff?: string[]
}

interface UpdateEventTypeBody {
	name?: string
	durationMin?: number
	price?: number
	currency?: string
	color?: string
	description?: string
	staffPolicy?: StaffPolicy
	assignedPositions?: string[]
	assignedStaff?: string[]
}

export type { StaffPolicy, CreateEventTypeBody, UpdateEventTypeBody }
```

- [ ] **Step 2: Убрать `baseFieldOverrides` из `EventType` в `booking.types.ts`**

В файле `services/configs/booking.types.ts`:

- Удалить строку `import type { BaseFieldOverrides } from './booking-field.types'`
- Удалить строку `baseFieldOverrides: BaseFieldOverrides | null` из интерфейса `EventType`

Итоговый `EventType`:

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

- [ ] **Step 3: Commit**

```bash
git add services/configs/event-type.types.ts services/configs/booking.types.ts
git commit -m "refactor: убрать baseFieldOverrides из EventType и event-type типов"
```

---

### Task 3: Очистить реэкспорты в `services/index.ts`

**Files:**

- Modify: `services/index.ts`

- [ ] **Step 1: Убрать удалённые типы из реэкспорта**

Заменить блок реэкспорта `booking-field.types`:

```ts
export type {
	BookingFieldType,
	BookingField,
	CreateBookingFieldBody,
	UpdateBookingFieldBody,
	MergedBookingForm,
	CustomFieldValue,
} from './configs/booking-field.types'
```

Убраны: `BookingFormConfig`, `UpdateBookingFormConfigBody`, `BaseFieldOverrides`, `MergedBaseField`.

- [ ] **Step 2: Commit**

```bash
git add services/index.ts
git commit -m "refactor: убрать удалённые типы из реэкспорта services/index.ts"
```

---

### Task 4: Очистить API конфиг `booking-field.config.ts`

**Files:**

- Modify: `services/configs/booking-field.config.ts`

- [ ] **Step 1: Убрать эндпоинты getFormConfig и updateFormConfig**

```ts
import {
	getData,
	postData,
	patchData,
	deleteData,
} from '@/services/api/methods'
import { endpoint } from '@/services/api/types'
import type {
	BookingField,
	CreateBookingFieldBody,
	UpdateBookingFieldBody,
	MergedBookingForm,
} from './booking-field.types'
import type { ApiResponse } from './user.config'

const bookingFieldApiConfig = {
	getAll: endpoint<void, ApiResponse<BookingField[]>>({
		url: ({ ownerId, ownerType, eventTypeId }) => {
			const params = new URLSearchParams({
				ownerId: String(ownerId),
				ownerType: String(ownerType),
			})
			if (eventTypeId) params.set('eventTypeId', String(eventTypeId))
			return `/api/booking-fields?${params.toString()}`
		},
		method: getData,
	}),

	create: endpoint<CreateBookingFieldBody, ApiResponse<BookingField>>({
		url: () => `/api/booking-fields`,
		method: postData,
	}),

	update: endpoint<UpdateBookingFieldBody, ApiResponse<BookingField>>({
		url: ({ id }) => `/api/booking-fields/${id}`,
		method: patchData,
	}),

	remove: endpoint<void, ApiResponse<null>>({
		url: ({ id }) => `/api/booking-fields/${id}`,
		method: deleteData,
	}),

	getMergedForm: endpoint<void, ApiResponse<MergedBookingForm>>({
		url: ({ eventTypeId }) => `/api/booking-form/${eventTypeId}`,
		method: getData,
	}),
}

export default bookingFieldApiConfig
```

Убраны: `getFormConfig`, `updateFormConfig`, импорты `BookingFormConfig` и `UpdateBookingFormConfigBody`.

- [ ] **Step 2: Commit**

```bash
git add services/configs/booking-field.config.ts
git commit -m "refactor: убрать getFormConfig/updateFormConfig из bookingFieldApiConfig"
```

---

### Task 5: Очистить mock-данные в `lib/mock.ts`

**Files:**

- Modify: `lib/mock.ts`

- [ ] **Step 1: Убрать mockBookingFormConfig и baseFieldOverrides из mock EventTypes**

1. Удалить импорт `BookingFormConfig` из `'@/services/configs/booking-field.types'`.
2. Удалить экспорт `mockBookingFormConfig`.
3. Удалить поле `baseFieldOverrides` из каждого элемента `mockEventTypes`.

Импорт должен стать:

```ts
import type { BookingField } from '@/services/configs/booking-field.types'
```

Каждый элемент `mockEventTypes` без `baseFieldOverrides`:

```ts
{
	id: '607f1f77bcf86cd799439001',
	name: 'Стрижка',
	slug: 'haircut',
	durationMin: 60,
	price: 500,
	currency: 'UAH',
	color: '#8B5CF6',
	description: null,
	staffPolicy: 'any',
	assignedPositions: [],
	assignedStaff: [],
},
```

(Аналогично для остальных 3 элементов — просто удалить строку `baseFieldOverrides: null,`)

- [ ] **Step 2: Commit**

```bash
git add lib/mock.ts
git commit -m "refactor: убрать mockBookingFormConfig и baseFieldOverrides из mock данных"
```

---

### Task 6: Очистить mock API в `lib/mock-api.ts`

**Files:**

- Modify: `lib/mock-api.ts`

- [ ] **Step 1: Убрать bookingFormConfigApi и упростить getMergedBookingForm**

1. Из импорта `'./mock'` убрать `mockBookingFormConfig`.
2. Из импорта `'@/services/configs/booking-field.types'` убрать `BookingFormConfig`, `UpdateBookingFormConfigBody`.
3. Удалить `formConfigStore` (строка 306).
4. Удалить весь блок `// ── Booking Form Config API ──` (функции `getFormConfig`, `updateFormConfig`).
5. Удалить экспорт `bookingFormConfigApi`.
6. Упростить `getMergedBookingForm` — убрать логику phone/email override:

```ts
const getMergedBookingForm = async (
	eventTypeId: string,
): Promise<MergedBookingForm> => {
	await delay()

	const orgFields = bookingFieldsStore.filter(isOrgLevel)
	const serviceFields = bookingFieldsStore.filter(isForEventType(eventTypeId))
	const customFields = [...orgFields, ...serviceFields].sort(sortByCreatedAt)

	return {
		baseFields: {
			name: { required: true as const },
		},
		customFields,
	}
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/mock-api.ts
git commit -m "refactor: убрать bookingFormConfigApi и phone/email из getMergedBookingForm"
```

---

### Task 7: Очистить `lib/booking-api-client.ts`

**Files:**

- Modify: `lib/booking-api-client.ts`

- [ ] **Step 1: Убрать baseFieldOverrides из toFrontendEventType**

В функции `toFrontendEventType` удалить строку:

```ts
baseFieldOverrides: raw.baseFieldOverrides ?? null,
```

В интерфейсе `BackendEventType` удалить:

```ts
baseFieldOverrides: {
	phoneRequired?: boolean | null
	emailRequired?: boolean | null
} | null
```

- [ ] **Step 2: Commit**

```bash
git add lib/booking-api-client.ts
git commit -m "refactor: убрать baseFieldOverrides из booking-api-client"
```

---

### Task 8: Упростить `BookingFormSettings`

**Files:**

- Modify: `components/booking/BookingFormSettings.tsx`

- [ ] **Step 1: Убрать секцию базовых полей, оставить только кастомные**

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2, Pencil, Plus } from 'lucide-react'
import { BookingFieldEditor } from './BookingFieldEditor'
import { bookingFieldApi } from '@/lib/mock-api'
import type {
	BookingField,
	BookingFieldType,
} from '@/services/configs/booking-field.types'

interface BookingFormSettingsProps {
	ownerId: string
	ownerType: 'org' | 'user'
}

function BookingFormSettings({ ownerId, ownerType }: BookingFormSettingsProps) {
	const t = useTranslations('booking')

	const [fields, setFields] = useState<BookingField[]>([])
	const [editingField, setEditingField] = useState<BookingField | null>(null)
	const [isAdding, setIsAdding] = useState(false)
	const [isSaving, setIsSaving] = useState(false)

	const TYPE_LABELS: Record<BookingFieldType, string> = {
		text: t('bookingForm.typeText'),
		textarea: t('bookingForm.typeTextarea'),
		email: t('bookingForm.typeEmail'),
		phone: t('bookingForm.typePhone'),
	}

	// ── Загрузка данных ──

	const loadData = useCallback(async () => {
		const bookingFields = await bookingFieldApi.getFields(
			ownerId,
			ownerType,
			null,
		)
		setFields(bookingFields)
	}, [ownerId, ownerType])

	useEffect(() => {
		loadData()
	}, [loadData])

	// ── Добавление / редактирование ──

	const handleStartAdd = useCallback(() => {
		setEditingField(null)
		setIsAdding(true)
	}, [])

	const handleStartEdit = useCallback((field: BookingField) => {
		setEditingField(field)
		setIsAdding(true)
	}, [])

	const handleCancel = useCallback(() => {
		setEditingField(null)
		setIsAdding(false)
	}, [])

	const handleSave = useCallback(
		async (data: {
			label: string
			type: BookingFieldType
			required: boolean
		}) => {
			setIsSaving(true)
			try {
				if (editingField) {
					await bookingFieldApi.update(editingField.id, {
						label: data.label,
						type: data.type,
						required: data.required,
					})
					toast.success(t('bookingForm.fieldUpdated'))
				} else {
					await bookingFieldApi.create({
						ownerId,
						ownerType,
						eventTypeId: null,
						type: data.type,
						label: data.label,
						required: data.required,
					})
					toast.success(t('bookingForm.fieldCreated'))
				}
				setEditingField(null)
				setIsAdding(false)
				await loadData()
			} finally {
				setIsSaving(false)
			}
		},
		[editingField, ownerId, ownerType, t, loadData],
	)

	// ── Удаление ──

	const handleDelete = useCallback(
		async (fieldId: string) => {
			await bookingFieldApi.remove(fieldId)
			toast.success(t('bookingForm.fieldDeleted'))
			await loadData()
		},
		[t, loadData],
	)

	// ── Рендер элемента списка ──

	const createEditHandler = (field: BookingField) => () => {
		handleStartEdit(field)
	}

	const createDeleteHandler = (fieldId: string) => () => {
		handleDelete(fieldId)
	}

	const renderFieldItem = (field: BookingField) => (
		<div
			key={field.id}
			className="flex items-center justify-between rounded-lg border p-3"
		>
			<div className="flex items-center gap-2">
				<span className="font-medium">{field.label}</span>
				<Badge variant="secondary">{TYPE_LABELS[field.type]}</Badge>
				{field.required && (
					<Badge variant="outline">{t('bookingForm.required')}</Badge>
				)}
			</div>
			<div className="flex gap-1">
				<Button variant="ghost" size="icon" onClick={createEditHandler(field)}>
					<Pencil className="h-4 w-4" />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					onClick={createDeleteHandler(field.id)}
				>
					<Trash2 className="h-4 w-4" />
				</Button>
			</div>
		</div>
	)

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-semibold">
					{t('bookingForm.customFields')}
				</h3>
				{!isAdding && (
					<Button variant="outline" size="sm" onClick={handleStartAdd}>
						<Plus className="mr-1 h-4 w-4" />
						{t('bookingForm.addField')}
					</Button>
				)}
			</div>

			{isAdding && (
				<BookingFieldEditor
					field={editingField}
					onSave={handleSave}
					onCancel={handleCancel}
					isSaving={isSaving}
				/>
			)}

			{fields.length === 0 && !isAdding && (
				<p className="text-muted-foreground text-sm">
					{t('bookingForm.noCustomFields')}
				</p>
			)}

			<div className="space-y-2">{fields.map(renderFieldItem)}</div>
		</div>
	)
}

export { BookingFormSettings }
```

Убраны: импорты `Switch`, `Field`, `FieldLabel`, `Separator`, `BookingFormConfig`, `bookingFormConfigApi`. Убраны стейт `config`, хэндлеры `handlePhoneToggle`/`handleEmailToggle`, секция "Базовые поля".

- [ ] **Step 2: Commit**

```bash
git add components/booking/BookingFormSettings.tsx
git commit -m "refactor: убрать секцию базовых полей phone/email из BookingFormSettings"
```

---

### Task 9: Убрать phone/email override из `ServiceDialog`

**Files:**

- Modify: `components/services/ServiceDialog.tsx`

- [ ] **Step 1: Убрать phoneOverride/emailOverride из zod-схемы**

Убрать `overrideEnum` (строка 52).

Из `baseServiceSchema` убрать:

```ts
phoneOverride: overrideEnum,
emailOverride: overrideEnum,
```

Убрать весь блок `// ── Override helpers ──` (строки 96-113): `OVERRIDE_MAP`, `toOverrideValue`, `OverrideOption`, `fromOverrideValue`.

- [ ] **Step 2: Убрать override из defaultValues и reset**

В `defaultValues` убрать:

```ts
phoneOverride: 'inherit',
emailOverride: 'inherit',
```

В `useEffect` при `reset` убрать:

```ts
phoneOverride: fromOverrideValue(overrides?.phoneRequired),
emailOverride: fromOverrideValue(overrides?.emailRequired),
```

И убрать:

```ts
const overrides = eventType?.baseFieldOverrides
```

Reset должен стать:

```ts
const baseDefaults = {
	name: eventType?.name ?? '',
	durationMin: eventType?.durationMin ?? 30,
	price: eventType?.price ?? 0,
	color: eventType?.color ?? PALETTE[0],
	description: eventType?.description ?? '',
}
```

- [ ] **Step 3: Убрать baseFieldOverrides из onSubmit**

Удалить:

```ts
const baseFieldOverrides = {
	phoneRequired: toOverrideValue(data.phoneOverride),
	emailRequired: toOverrideValue(data.emailOverride),
}
```

Из обоих вызовов `eventTypeApi.update` и `eventTypeApi.create` убрать `baseFieldOverrides`.

- [ ] **Step 4: Убрать phone/email override селекты из JSX**

Удалить блок (строки 691-731):

```tsx
{/* Секція: Форма бронювання */}
<Separator className="my-4" />
<h4 className="font-medium">{t('bookingForm.title')}</h4>

<div className="grid grid-cols-2 gap-3">
	<Field>
		<FieldLabel>{t('bookingForm.phoneOverride')}</FieldLabel>
		...
	</Field>

	<Field>
		<FieldLabel>{t('bookingForm.emailOverride')}</FieldLabel>
		...
	</Field>
</div>
```

Удалить `OVERRIDE_OPTIONS` и `renderOverrideOption`.

- [ ] **Step 5: Очистить неиспользуемые импорты**

Убрать из импортов то, что больше не используется: `Separator` (если не используется в другом месте), проверить `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` — если они используются только для override, убрать их тоже.

- [ ] **Step 6: Commit**

```bash
git add components/services/ServiceDialog.tsx
git commit -m "refactor: убрать phone/email override из ServiceDialog"
```

---

### Task 10: Адаптировать `ClientInfoForm`

**Files:**

- Modify: `components/booking/ClientInfoForm.tsx`

- [ ] **Step 1: Убрать hardcoded phone/email поля, рендерить только name + customFields**

```tsx
'use client'

import { useForm, FormProvider, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { DynamicFieldRenderer } from './DynamicFieldRenderer'
import type {
	MergedBookingForm,
	BookingField,
} from '@/services/configs/booking-field.types'

interface ClientInfoData {
	name: string
	[key: string]: string | undefined
}

interface ClientInfoFormProps {
	formConfig: MergedBookingForm
	onSubmit: (data: ClientInfoData) => void
	isSubmitting: boolean
}

// --- Билдеры схем ---

const buildCustomFieldSchema = (field: BookingField) => {
	if (field.type === 'email') {
		return field.required
			? z.string().email()
			: z.string().email().optional().or(z.literal(''))
	}
	return field.required ? z.string().min(1) : z.string().optional()
}

const buildSchema = (
	formConfig: MergedBookingForm,
	t: ReturnType<typeof useTranslations>,
) => {
	const baseShape: Record<string, z.ZodTypeAny> = {
		name: z.string().min(2, t('validation.nameMin')),
	}

	const customShape: Record<string, z.ZodTypeAny> = {}
	const addCustomField = (field: BookingField) => {
		customShape[`custom_${field.id}`] = buildCustomFieldSchema(field)
	}
	formConfig.customFields.forEach(addCustomField)

	return z.object({ ...baseShape, ...customShape })
}

// --- Компонент ---

function ClientInfoForm({
	formConfig,
	onSubmit,
	isSubmitting,
}: ClientInfoFormProps) {
	const t = useTranslations('booking')
	const schema = buildSchema(formConfig, t)

	const methods = useForm<ClientInfoData>({
		resolver: zodResolver(schema) as unknown as Resolver<ClientInfoData>,
	})

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = methods

	const renderCustomField = (field: BookingField) => (
		<DynamicFieldRenderer key={field.id} field={field} />
	)

	return (
		<FormProvider {...methods}>
			<form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
				<h4 className="text-sm font-medium">{t('clientInfo')}</h4>

				<Field data-invalid={!!errors.name || undefined}>
					<FieldLabel htmlFor="client-name">{t('clientName')}</FieldLabel>
					<Input
						id="client-name"
						{...register('name')}
						placeholder={t('enterName')}
					/>
					<FieldError errors={[errors.name]} />
				</Field>

				{formConfig.customFields.map(renderCustomField)}

				<Button type="submit" className="mt-1 w-full" disabled={isSubmitting}>
					{isSubmitting ? t('creating') : t('confirmBooking')}
				</Button>
			</form>
		</FormProvider>
	)
}

export { ClientInfoForm }
export type { ClientInfoData }
```

Убраны: hardcoded поля phone/email, `buildEmailSchema`, `buildPhoneSchema`, логика `bothOptional` refine.

- [ ] **Step 2: Commit**

```bash
git add components/booking/ClientInfoForm.tsx
git commit -m "refactor: убрать hardcoded phone/email из ClientInfoForm"
```

---

### Task 11: Проверить сборку

**Files:** нет изменений

- [ ] **Step 1: Запустить сборку**

```bash
npm run build
```

Expected: сборка проходит без ошибок. Если есть ошибки — это остаточные ссылки на удалённые типы, которые нужно починить.

- [ ] **Step 2: Исправить ошибки сборки (если есть)**

Типичные ошибки: импорт удалённого типа где-то в коде. Найти через сообщение ошибки, убрать импорт.

- [ ] **Step 3: Финальный commit (если были фиксы)**

```bash
git add -A
git commit -m "fix: исправить остаточные ссылки на удалённые типы phone/email"
```
