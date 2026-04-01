# Custom Booking Fields — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Дать владельцам org/personal настраивать форму бронирования — управлять обязательностью phone/email и добавлять кастомные поля (email, phone, text, textarea) на уровне org/user и per-service.

**Architecture:** Новая сущность BookingField (CRUD через API) + BookingFormConfig на уровне org/user + baseFieldOverrides на EventType. Публичный эндпоинт возвращает merged форму. ClientInfoForm становится динамическим — строит zod-схему и рендерит поля на основе конфига.

**Tech Stack:** Next.js 16, React 19, TypeScript, Zod 4, react-hook-form 7, shadcn/ui, next-intl

**Spec:** `docs/superpowers/specs/2026-04-01-custom-booking-fields-design.md`

---

## File Structure

### Новые файлы

| Файл | Ответственность |
| ---- | --------------- |
| `services/configs/booking-field.types.ts` | Типы BookingField, BookingFormConfig, MergedBookingForm |
| `services/configs/booking-field.config.ts` | API endpoints для BookingField CRUD + form config + merged form |
| `components/booking/BookingFieldEditor.tsx` | Форма создания/редактирования одного кастомного поля |
| `components/booking/BookingFormSettings.tsx` | Настройки формы бронирования (base field toggles + список кастомных полей) |
| `components/booking/DynamicFieldRenderer.tsx` | Рендер одного кастомного поля по типу (email/phone/text/textarea) |

### Модифицируемые файлы

| Файл | Что меняется |
| ---- | ------------ |
| `services/configs/booking.types.ts` | Добавить `customFieldValues` в `CreateBookingBody` |
| `services/configs/event-type.types.ts` | Добавить `baseFieldOverrides` в Create/UpdateEventTypeBody |
| `services/index.ts` | Экспорт новых типов и bookingFieldApi |
| `lib/mock.ts` | Mock данные: bookingFormConfig, bookingFields, mockMergedForm |
| `lib/mock-api.ts` | Mock API handlers для booking-field CRUD и merged form |
| `components/booking/ClientInfoForm.tsx` | Рефакторинг: динамическая zod-схема + рендер кастомных полей |
| `components/booking/StaffBookingPanel.tsx` | Прокинуть MergedBookingForm в ClientInfoForm |
| `lib/calendar/hooks/useBookingActions.ts` | Добавить customFieldValues в handleConfirmWithClient |
| `components/services/ServiceDialog.tsx` | Секция "Форма бронирования" с overrides + кастомные поля |
| `i18n/messages/en.json` | Новые ключи для booking fields UI |
| `i18n/messages/uk.json` | Украинские переводы |

---

## Task 1: Типы и API конфиг

**Files:**
- Create: `services/configs/booking-field.types.ts`
- Create: `services/configs/booking-field.config.ts`
- Modify: `services/configs/booking.types.ts:95-101`
- Modify: `services/configs/event-type.types.ts:3-27`
- Modify: `services/index.ts`

- [ ] **Step 1: Создать типы BookingField**

```typescript
// services/configs/booking-field.types.ts

import type { EventType } from './booking.types'

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

interface BookingFormConfig {
	phoneRequired: boolean
	emailRequired: boolean
}

interface UpdateBookingFormConfigBody {
	ownerId: string
	ownerType: 'org' | 'user'
	phoneRequired?: boolean
	emailRequired?: boolean
}

interface BaseFieldOverrides {
	phoneRequired?: boolean | null
	emailRequired?: boolean | null
}

interface MergedBaseField {
	required: boolean
}

interface MergedBookingForm {
	baseFields: {
		name: { required: true }
		phone: MergedBaseField
		email: MergedBaseField
	}
	customFields: BookingField[]
}

interface CustomFieldValue {
	fieldId: string
	value: string
}

export type {
	BookingFieldType,
	BookingField,
	CreateBookingFieldBody,
	UpdateBookingFieldBody,
	BookingFormConfig,
	UpdateBookingFormConfigBody,
	BaseFieldOverrides,
	MergedBaseField,
	MergedBookingForm,
	CustomFieldValue,
}
```

- [ ] **Step 2: Создать API конфиг**

```typescript
// services/configs/booking-field.config.ts

import { getData, postData, patchData, deleteData } from '@/services/api/methods'
import { endpoint } from '@/services/api/types'
import type {
	BookingField,
	CreateBookingFieldBody,
	UpdateBookingFieldBody,
	BookingFormConfig,
	UpdateBookingFormConfigBody,
	MergedBookingForm,
} from './booking-field.types'
import type { ApiResponse } from '@/services/api/types'

const bookingFieldApiConfig = {
	getAll: endpoint<void, ApiResponse<BookingField[]>>({
		url: ({ ownerId, ownerType, eventTypeId }) => {
			const params = new URLSearchParams({ ownerId, ownerType })
			if (eventTypeId) params.set('eventTypeId', eventTypeId)
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

	getFormConfig: endpoint<void, ApiResponse<BookingFormConfig>>({
		url: ({ ownerId, ownerType }) =>
			`/api/booking-form-config?ownerId=${ownerId}&ownerType=${ownerType}`,
		method: getData,
	}),

	updateFormConfig: endpoint<UpdateBookingFormConfigBody, ApiResponse<BookingFormConfig>>({
		url: () => `/api/booking-form-config`,
		method: patchData,
	}),

	getMergedForm: endpoint<void, ApiResponse<MergedBookingForm>>({
		url: ({ eventTypeId }) => `/api/booking-form/${eventTypeId}`,
		method: getData,
	}),
}

export default bookingFieldApiConfig
```

- [ ] **Step 3: Добавить customFieldValues в CreateBookingBody**

В `services/configs/booking.types.ts`, добавить в интерфейс `CreateBookingBody` (строка 95-101):

```typescript
interface CreateBookingBody {
	eventTypeId: string
	staffId: string
	startAt: string
	timezone: string
	invitee: Invitee
	customFieldValues?: CustomFieldValue[]
}
```

Добавить импорт `CustomFieldValue` из `./booking-field.types`.

- [ ] **Step 4: Добавить baseFieldOverrides в EventType types**

В `services/configs/event-type.types.ts`, добавить в оба интерфейса:

```typescript
import type { BaseFieldOverrides } from './booking-field.types'

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
	baseFieldOverrides?: BaseFieldOverrides
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
	baseFieldOverrides?: BaseFieldOverrides
}
```

- [ ] **Step 5: Добавить baseFieldOverrides в EventType интерфейс**

В `services/configs/booking.types.ts`, добавить поле в интерфейс `EventType` (строка 30-42):

```typescript
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
	baseFieldOverrides: BaseFieldOverrides | null
}
```

- [ ] **Step 6: Экспортировать новый API и типы в services/index.ts**

Добавить в `services/index.ts`:

```typescript
import { createApiMethods } from './api/create-api-methods'
import bookingFieldApiConfig from './configs/booking-field.config'

export const bookingFieldApi = createApiMethods(bookingFieldApiConfig, {
	interceptors: defaultInterceptors,
})

// В секцию экспорта типов добавить:
export type {
	BookingFieldType,
	BookingField,
	CreateBookingFieldBody,
	UpdateBookingFieldBody,
	BookingFormConfig,
	UpdateBookingFormConfigBody,
	BaseFieldOverrides,
	MergedBookingForm,
	CustomFieldValue,
} from './configs/booking-field.types'
```

- [ ] **Step 7: Коммит**

```bash
git add services/configs/booking-field.types.ts services/configs/booking-field.config.ts services/configs/booking.types.ts services/configs/event-type.types.ts services/index.ts
git commit -m "feat: добавить типы и API конфиг для кастомных полей бронирования"
```

---

## Task 2: Mock данные и Mock API

**Files:**
- Modify: `lib/mock.ts`
- Modify: `lib/mock-api.ts`

- [ ] **Step 1: Добавить mock данные в lib/mock.ts**

Добавить после `mockEventTypes`:

```typescript
import type {
	BookingField,
	BookingFormConfig,
	MergedBookingForm,
} from '@/services/configs/booking-field.types'

export const mockBookingFormConfig: BookingFormConfig = {
	phoneRequired: false,
	emailRequired: false,
}

export const mockBookingFields: BookingField[] = [
	{
		id: 'bf-001',
		ownerId: '507f1f77bcf86cd799439011',
		ownerType: 'org',
		eventTypeId: null,
		type: 'textarea',
		label: 'Комментарій',
		required: false,
		createdAt: '2026-03-01T10:00:00Z',
	},
	{
		id: 'bf-002',
		ownerId: '507f1f77bcf86cd799439011',
		ownerType: 'org',
		eventTypeId: '607f1f77bcf86cd799439002',
		type: 'text',
		label: 'Алергії',
		required: true,
		createdAt: '2026-03-15T10:00:00Z',
	},
]
```

Добавить `baseFieldOverrides: null` в каждый элемент `mockEventTypes`.

- [ ] **Step 2: Добавить mock API handlers в lib/mock-api.ts**

Добавить в mock-api.ts CRUD для booking fields и merged form:

```typescript
import {
	mockBookingFields,
	mockBookingFormConfig,
} from './mock'
import type {
	BookingField,
	BookingFormConfig,
	CreateBookingFieldBody,
	UpdateBookingFieldBody,
	MergedBookingForm,
	UpdateBookingFormConfigBody,
} from '@/services/configs/booking-field.types'

const bookingFieldsStore = [...mockBookingFields]
const formConfigStore = { ...mockBookingFormConfig }

const getBookingFields = (
	ownerId: string,
	ownerType: 'org' | 'user',
	eventTypeId?: string | null,
): BookingField[] => {
	const matchesOwner = (field: BookingField) =>
		field.ownerId === ownerId && field.ownerType === ownerType
	const matchesEventType = (field: BookingField) =>
		eventTypeId ? field.eventTypeId === eventTypeId : field.eventTypeId === null

	return bookingFieldsStore
		.filter(matchesOwner)
		.filter(matchesEventType)
}

const createBookingField = (body: CreateBookingFieldBody): BookingField => {
	const newField: BookingField = {
		id: `bf-${Date.now()}`,
		ownerId: body.ownerId,
		ownerType: body.ownerType,
		eventTypeId: body.eventTypeId ?? null,
		type: body.type,
		label: body.label,
		required: body.required,
		createdAt: new Date().toISOString(),
	}
	bookingFieldsStore.push(newField)
	return newField
}

const updateBookingField = (id: string, body: UpdateBookingFieldBody): BookingField => {
	const index = bookingFieldsStore.findIndex((f) => f.id === id)
	if (index === -1) throw new Error('Field not found')
	bookingFieldsStore[index] = { ...bookingFieldsStore[index], ...body }
	return bookingFieldsStore[index]
}

const deleteBookingField = (id: string): void => {
	const index = bookingFieldsStore.findIndex((f) => f.id === id)
	if (index !== -1) bookingFieldsStore.splice(index, 1)
}

const getFormConfig = (): BookingFormConfig => ({ ...formConfigStore })

const updateFormConfig = (body: UpdateBookingFormConfigBody): BookingFormConfig => {
	if (body.phoneRequired !== undefined) formConfigStore.phoneRequired = body.phoneRequired
	if (body.emailRequired !== undefined) formConfigStore.emailRequired = body.emailRequired
	return { ...formConfigStore }
}

const sortByCreatedAt = (a: BookingField, b: BookingField) =>
	new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()

const getMergedBookingForm = (eventTypeId: string): MergedBookingForm => {
	const eventType = mockEventTypes.find((et) => et.id === eventTypeId)
	const overrides = eventType?.baseFieldOverrides

	const phoneRequired = overrides?.phoneRequired ?? formConfigStore.phoneRequired
	const emailRequired = overrides?.emailRequired ?? formConfigStore.emailRequired

	const orgFields = bookingFieldsStore
		.filter((f) => f.eventTypeId === null)
	const serviceFields = bookingFieldsStore
		.filter((f) => f.eventTypeId === eventTypeId)
	const customFields = [...orgFields, ...serviceFields].sort(sortByCreatedAt)

	return {
		baseFields: {
			name: { required: true as const },
			phone: { required: phoneRequired },
			email: { required: emailRequired },
		},
		customFields,
	}
}
```

- [ ] **Step 3: Коммит**

```bash
git add lib/mock.ts lib/mock-api.ts
git commit -m "feat: добавить mock данные и API handlers для booking fields"
```

---

## Task 3: i18n ключи

**Files:**
- Modify: `i18n/messages/en.json`
- Modify: `i18n/messages/uk.json`

- [ ] **Step 1: Добавить английские ключи**

Добавить в секцию `"booking"` в `en.json`:

```json
"bookingForm": {
  "title": "Booking form",
  "baseFields": "Base fields",
  "phoneRequired": "Phone required",
  "emailRequired": "Email required",
  "customFields": "Custom fields",
  "serviceFields": "Service-specific fields",
  "addField": "Add field",
  "editField": "Edit field",
  "fieldLabel": "Field label",
  "fieldType": "Field type",
  "fieldRequired": "Required",
  "inherit": "Inherit",
  "required": "Required",
  "optional": "Optional",
  "typeEmail": "Email",
  "typePhone": "Phone",
  "typeText": "Text",
  "typeTextarea": "Text (multiline)",
  "deleteFieldConfirm": "Delete this field?",
  "fieldCreated": "Field added",
  "fieldUpdated": "Field updated",
  "fieldDeleted": "Field deleted",
  "configUpdated": "Form settings updated",
  "overrides": "Override for this service",
  "noCustomFields": "No custom fields yet"
}
```

- [ ] **Step 2: Добавить украинские ключи**

Добавить в секцию `"booking"` в `uk.json`:

```json
"bookingForm": {
  "title": "Форма бронювання",
  "baseFields": "Базові поля",
  "phoneRequired": "Телефон обов'язковий",
  "emailRequired": "Email обов'язковий",
  "customFields": "Додаткові поля",
  "serviceFields": "Поля для цієї послуги",
  "addField": "Додати поле",
  "editField": "Редагувати поле",
  "fieldLabel": "Назва поля",
  "fieldType": "Тип поля",
  "fieldRequired": "Обов'язкове",
  "inherit": "Успадкувати",
  "required": "Обов'язкове",
  "optional": "Необов'язкове",
  "typeEmail": "Email",
  "typePhone": "Телефон",
  "typeText": "Текст",
  "typeTextarea": "Текст (багаторядковий)",
  "deleteFieldConfirm": "Видалити це поле?",
  "fieldCreated": "Поле додано",
  "fieldUpdated": "Поле оновлено",
  "fieldDeleted": "Поле видалено",
  "configUpdated": "Налаштування форми оновлено",
  "overrides": "Перевизначення для цієї послуги",
  "noCustomFields": "Додаткових полів поки немає"
}
```

- [ ] **Step 3: Коммит**

```bash
git add i18n/messages/en.json i18n/messages/uk.json
git commit -m "feat: добавить i18n ключи для кастомных полей бронирования"
```

---

## Task 4: DynamicFieldRenderer — рендер кастомного поля

**Files:**
- Create: `components/booking/DynamicFieldRenderer.tsx`

- [ ] **Step 1: Создать компонент**

```tsx
// components/booking/DynamicFieldRenderer.tsx
'use client'

import { useFormContext } from 'react-hook-form'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
	Field,
	FieldLabel,
	FieldError,
} from '@/components/ui/field'
import type { BookingField } from '@/services/configs/booking-field.types'

interface DynamicFieldRendererProps {
	field: BookingField
}

const INPUT_TYPE_MAP: Record<BookingField['type'], string> = {
	email: 'email',
	phone: 'tel',
	text: 'text',
	textarea: 'text',
}

function DynamicFieldRenderer({ field }: DynamicFieldRendererProps) {
	const {
		register,
		formState: { errors },
	} = useFormContext()
	const t = useTranslations('booking.bookingForm')

	const fieldName = `custom_${field.id}`
	const error = errors[fieldName]
	const label = field.required ? `${field.label} *` : field.label

	const isTextarea = field.type === 'textarea'

	return (
		<Field data-invalid={!!error || undefined}>
			<FieldLabel htmlFor={fieldName}>{label}</FieldLabel>
			{isTextarea ? (
				<Textarea
					id={fieldName}
					{...register(fieldName)}
					placeholder={field.label}
				/>
			) : (
				<Input
					id={fieldName}
					type={INPUT_TYPE_MAP[field.type]}
					{...register(fieldName)}
					placeholder={field.label}
				/>
			)}
			<FieldError errors={[error]} />
		</Field>
	)
}

export { DynamicFieldRenderer }
```

- [ ] **Step 2: Коммит**

```bash
git add components/booking/DynamicFieldRenderer.tsx
git commit -m "feat: добавить DynamicFieldRenderer для кастомных полей"
```

---

## Task 5: Рефакторинг ClientInfoForm — динамическая форма

**Files:**
- Modify: `components/booking/ClientInfoForm.tsx`

- [ ] **Step 1: Переписать ClientInfoForm**

Полная замена содержимого `components/booking/ClientInfoForm.tsx`:

```tsx
'use client'

import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
	Field,
	FieldLabel,
	FieldError,
} from '@/components/ui/field'
import { DynamicFieldRenderer } from './DynamicFieldRenderer'
import type { MergedBookingForm, BookingField } from '@/services/configs/booking-field.types'

interface ClientInfoData {
	name: string
	phone?: string
	email?: string
	[key: string]: string | undefined
}

interface ClientInfoFormProps {
	formConfig: MergedBookingForm
	onSubmit: (data: ClientInfoData) => void
	isSubmitting: boolean
}

const buildBaseFieldSchema = (
	field: { required: boolean },
	fieldName: string,
	t: ReturnType<typeof useTranslations>,
) => {
	if (fieldName === 'email') {
		const base = z.string().email(t('validation.invalidEmail'))
		return field.required ? base : base.optional().or(z.literal(''))
	}
	if (fieldName === 'phone') {
		return field.required ? z.string().min(1, t('validation.contactRequired')) : z.string().optional()
	}
	return z.string().optional()
}

const buildCustomFieldSchema = (field: BookingField) => {
	if (field.type === 'email') {
		return field.required
			? z.string().email()
			: z.string().email().optional().or(z.literal(''))
	}
	return field.required
		? z.string().min(1)
		: z.string().optional()
}

const buildSchema = (
	formConfig: MergedBookingForm,
	t: ReturnType<typeof useTranslations>,
) => {
	const baseShape: Record<string, z.ZodTypeAny> = {
		name: z.string().min(2, t('validation.nameMin')),
		phone: buildBaseFieldSchema(formConfig.baseFields.phone, 'phone', t),
		email: buildBaseFieldSchema(formConfig.baseFields.email, 'email', t),
	}

	const customShape: Record<string, z.ZodTypeAny> = {}
	const addCustomField = (field: BookingField) => {
		customShape[`custom_${field.id}`] = buildCustomFieldSchema(field)
	}
	formConfig.customFields.forEach(addCustomField)

	const schema = z.object({ ...baseShape, ...customShape })

	const bothOptional =
		!formConfig.baseFields.phone.required && !formConfig.baseFields.email.required

	if (bothOptional) {
		return schema.refine(
			(data) => (data.email && data.email.length > 0) || (data.phone && data.phone.length > 0),
			{ message: t('validation.contactRequired'), path: ['phone'] },
		)
	}

	return schema
}

function ClientInfoForm({ formConfig, onSubmit, isSubmitting }: ClientInfoFormProps) {
	const t = useTranslations('booking')
	const schema = buildSchema(formConfig, t)
	type FormData = z.infer<typeof schema>

	const methods = useForm<FormData>({
		resolver: zodResolver(schema),
	})

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = methods

	const phoneLabel = formConfig.baseFields.phone.required
		? `${t('phone')} *`
		: t('phone')
	const emailLabel = formConfig.baseFields.email.required
		? `${t('email')} *`
		: t('email')

	const renderCustomField = (field: BookingField) => (
		<DynamicFieldRenderer key={field.id} field={field} />
	)

	return (
		<FormProvider {...methods}>
			<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
				<Field data-invalid={!!errors.name || undefined}>
					<FieldLabel htmlFor="client-name">{t('clientName')}</FieldLabel>
					<Input
						id="client-name"
						{...register('name')}
						placeholder={t('enterName')}
					/>
					<FieldError errors={[errors.name]} />
				</Field>

				<Field data-invalid={!!errors.phone || undefined}>
					<FieldLabel htmlFor="client-phone">{phoneLabel}</FieldLabel>
					<Input
						id="client-phone"
						type="tel"
						{...register('phone')}
						placeholder="+380..."
					/>
					<FieldError errors={[errors.phone]} />
				</Field>

				<Field data-invalid={!!errors.email || undefined}>
					<FieldLabel htmlFor="client-email">{emailLabel}</FieldLabel>
					<Input
						id="client-email"
						type="email"
						{...register('email')}
						placeholder="email@example.com"
					/>
					<FieldError errors={[errors.email]} />
				</Field>

				{formConfig.customFields.map(renderCustomField)}

				<Button type="submit" className="w-full" disabled={isSubmitting}>
					{isSubmitting ? t('creating') : t('confirmBooking')}
				</Button>
			</form>
		</FormProvider>
	)
}

export { ClientInfoForm }
export type { ClientInfoData }
```

- [ ] **Step 2: Коммит**

```bash
git add components/booking/ClientInfoForm.tsx
git commit -m "refactor: ClientInfoForm — динамическая zod-схема на основе MergedBookingForm"
```

---

## Task 6: Интеграция в booking flow

**Files:**
- Modify: `components/booking/StaffBookingPanel.tsx`
- Modify: `lib/calendar/hooks/useBookingActions.ts`

- [ ] **Step 1: Прокинуть formConfig в StaffBookingPanel**

В `StaffBookingPanel.tsx`, добавить проп `formConfig` в `StaffBookingPanelProps`:

```typescript
import type { MergedBookingForm } from '@/services/configs/booking-field.types'

interface StaffBookingPanelProps {
	// ... существующие пропы
	formConfig: MergedBookingForm | null
}
```

В `PendingSlotWithClientForm` добавить проп и передать в ClientInfoForm:

```tsx
interface PendingSlotProps {
	// ... существующие пропы
	formConfig: MergedBookingForm
}

// В рендере:
<ClientInfoForm
	formConfig={formConfig}
	onSubmit={onConfirmWithClient}
	isSubmitting={isSubmitting}
/>
```

В основном компоненте `StaffBookingPanel` передать `formConfig` в `PendingSlotWithClientForm`.

- [ ] **Step 2: Добавить customFieldValues в useBookingActions**

В `lib/calendar/hooks/useBookingActions.ts`, изменить `handleConfirmWithClient`:

```typescript
import type { CustomFieldValue } from '@/services/configs/booking-field.types'

const extractCustomFieldValues = (data: Record<string, unknown>): CustomFieldValue[] => {
	const isCustomField = (key: string) => key.startsWith('custom_')
	const toCustomFieldValue = (key: string): CustomFieldValue => ({
		fieldId: key.replace('custom_', ''),
		value: String(data[key] ?? ''),
	})
	const hasValue = (entry: CustomFieldValue) => entry.value.length > 0

	return Object.keys(data)
		.filter(isCustomField)
		.map(toCustomFieldValue)
		.filter(hasValue)
}

// В handleConfirmWithClient:
const handleConfirmWithClient = async (data: ClientInfoData) => {
	// ... существующая логика ...
	const customFieldValues = extractCustomFieldValues(data)

	const response = await bookingApi.create({
		body: {
			eventTypeId: selectedEventTypeId,
			staffId: resolvedStaffId,
			startAt,
			timezone: browserTimezone(),
			invitee: {
				name: data.name,
				email: data.email || null,
				phone: data.phone || null,
				phoneCountry: null,
			},
			customFieldValues,
		},
	})
	// ... остальная логика ...
}
```

- [ ] **Step 3: Загрузить MergedBookingForm при выборе услуги**

В хуке или компоненте, который управляет выбором услуги, добавить загрузку формы. В `useBookingActions.ts` добавить state и эффект:

```typescript
import { bookingFieldApi } from '@/services'
import type { MergedBookingForm } from '@/services/configs/booking-field.types'

// Внутри хука:
const [formConfig, setFormConfig] = useState<MergedBookingForm | null>(null)

useEffect(() => {
	if (!selectedEventTypeId) {
		setFormConfig(null)
		return
	}
	const loadFormConfig = async () => {
		const result = await bookingFieldApi.getMergedForm({
			pathParams: { eventTypeId: selectedEventTypeId },
		})
		setFormConfig(result)
	}
	loadFormConfig()
}, [selectedEventTypeId])
```

Добавить `formConfig` в возвращаемый объект хука.

- [ ] **Step 4: Коммит**

```bash
git add components/booking/StaffBookingPanel.tsx lib/calendar/hooks/useBookingActions.ts
git commit -m "feat: интеграция MergedBookingForm в booking flow"
```

---

## Task 7: BookingFieldEditor — форма создания/редактирования поля

**Files:**
- Create: `components/booking/BookingFieldEditor.tsx`

- [ ] **Step 1: Создать компонент**

```tsx
// components/booking/BookingFieldEditor.tsx
'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import {
	Field,
	FieldLabel,
	FieldError,
} from '@/components/ui/field'
import type { BookingField, BookingFieldType } from '@/services/configs/booking-field.types'

interface BookingFieldEditorProps {
	field?: BookingField | null
	onSave: (data: { label: string; type: BookingFieldType; required: boolean }) => void
	onCancel: () => void
	isSaving: boolean
}

const FIELD_TYPES: BookingFieldType[] = ['text', 'textarea', 'email', 'phone']

function BookingFieldEditor({ field, onSave, onCancel, isSaving }: BookingFieldEditorProps) {
	const t = useTranslations('booking.bookingForm')

	const schema = z.object({
		label: z.string().min(1),
		type: z.enum(['email', 'phone', 'text', 'textarea']),
		required: z.boolean(),
	})

	type FormData = z.infer<typeof schema>

	const {
		register,
		handleSubmit,
		control,
		formState: { errors },
	} = useForm<FormData>({
		resolver: zodResolver(schema),
		defaultValues: {
			label: field?.label ?? '',
			type: field?.type ?? 'text',
			required: field?.required ?? false,
		},
	})

	const TYPE_LABELS: Record<BookingFieldType, string> = {
		text: t('typeText'),
		textarea: t('typeTextarea'),
		email: t('typeEmail'),
		phone: t('typePhone'),
	}

	const renderTypeOption = (type: BookingFieldType) => (
		<SelectItem key={type} value={type}>
			{TYPE_LABELS[type]}
		</SelectItem>
	)

	return (
		<form onSubmit={handleSubmit(onSave)} className="space-y-4 rounded-lg border p-4">
			<Field data-invalid={!!errors.label || undefined}>
				<FieldLabel htmlFor="field-label">{t('fieldLabel')}</FieldLabel>
				<Input id="field-label" {...register('label')} />
				<FieldError errors={[errors.label]} />
			</Field>

			<Field data-invalid={!!errors.type || undefined}>
				<FieldLabel>{t('fieldType')}</FieldLabel>
				<Controller
					control={control}
					name="type"
					render={({ field: controllerField }) => (
						<Select
							value={controllerField.value}
							onValueChange={controllerField.onChange}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{FIELD_TYPES.map(renderTypeOption)}
							</SelectContent>
						</Select>
					)}
				/>
			</Field>

			<Field orientation="horizontal">
				<FieldLabel>{t('fieldRequired')}</FieldLabel>
				<Controller
					control={control}
					name="required"
					render={({ field: controllerField }) => (
						<Switch
							checked={controllerField.value}
							onCheckedChange={controllerField.onChange}
						/>
					)}
				/>
			</Field>

			<div className="flex gap-2">
				<Button type="submit" disabled={isSaving}>
					{field ? t('editField') : t('addField')}
				</Button>
				<Button type="button" variant="outline" onClick={onCancel}>
					Cancel
				</Button>
			</div>
		</form>
	)
}

export { BookingFieldEditor }
```

- [ ] **Step 2: Коммит**

```bash
git add components/booking/BookingFieldEditor.tsx
git commit -m "feat: добавить BookingFieldEditor — форма создания/редактирования кастомного поля"
```

---

## Task 8: BookingFormSettings — настройки формы на уровне org/user

**Files:**
- Create: `components/booking/BookingFormSettings.tsx`

- [ ] **Step 1: Создать компонент**

```tsx
// components/booking/BookingFormSettings.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Separator } from '@/components/ui/separator'
import { Trash2, Pencil, Plus } from 'lucide-react'
import { bookingFieldApi } from '@/services'
import { BookingFieldEditor } from './BookingFieldEditor'
import type {
	BookingField,
	BookingFormConfig,
	BookingFieldType,
} from '@/services/configs/booking-field.types'

interface BookingFormSettingsProps {
	ownerId: string
	ownerType: 'org' | 'user'
}

function BookingFormSettings({ ownerId, ownerType }: BookingFormSettingsProps) {
	const t = useTranslations('booking.bookingForm')

	const [config, setConfig] = useState<BookingFormConfig>({
		phoneRequired: false,
		emailRequired: false,
	})
	const [fields, setFields] = useState<BookingField[]>([])
	const [editingField, setEditingField] = useState<BookingField | null>(null)
	const [isAdding, setIsAdding] = useState(false)
	const [isSaving, setIsSaving] = useState(false)

	const loadData = useCallback(async () => {
		const [configRes, fieldsRes] = await Promise.all([
			bookingFieldApi.getFormConfig({
				pathParams: { ownerId, ownerType },
			}),
			bookingFieldApi.getAll({
				pathParams: { ownerId, ownerType },
			}),
		])
		setConfig(configRes)
		setFields(fieldsRes)
	}, [ownerId, ownerType])

	useEffect(() => {
		loadData()
	}, [loadData])

	const handleTogglePhone = async (checked: boolean) => {
		await bookingFieldApi.updateFormConfig({
			body: { ownerId, ownerType, phoneRequired: checked },
		})
		setConfig((prev) => ({ ...prev, phoneRequired: checked }))
		toast.success(t('configUpdated'))
	}

	const handleToggleEmail = async (checked: boolean) => {
		await bookingFieldApi.updateFormConfig({
			body: { ownerId, ownerType, emailRequired: checked },
		})
		setConfig((prev) => ({ ...prev, emailRequired: checked }))
		toast.success(t('configUpdated'))
	}

	const handleSaveField = async (data: {
		label: string
		type: BookingFieldType
		required: boolean
	}) => {
		setIsSaving(true)
		if (editingField) {
			await bookingFieldApi.update({
				pathParams: { id: editingField.id },
				body: data,
			})
			toast.success(t('fieldUpdated'))
		} else {
			await bookingFieldApi.create({
				body: { ownerId, ownerType, eventTypeId: null, ...data },
			})
			toast.success(t('fieldCreated'))
		}
		setIsSaving(false)
		setEditingField(null)
		setIsAdding(false)
		await loadData()
	}

	const handleDeleteField = async (id: string) => {
		await bookingFieldApi.remove({ pathParams: { id } })
		toast.success(t('fieldDeleted'))
		await loadData()
	}

	const handleCancelEdit = () => {
		setEditingField(null)
		setIsAdding(false)
	}

	const renderFieldItem = (field: BookingField) => (
		<div key={field.id} className="flex items-center justify-between rounded-md border p-3">
			<div>
				<span className="font-medium">{field.label}</span>
				<span className="text-muted-foreground ml-2 text-sm">
					({t(`type${field.type.charAt(0).toUpperCase() + field.type.slice(1)}` as 'typeText')})
				</span>
				{field.required && (
					<span className="text-destructive ml-2 text-xs">{t('required')}</span>
				)}
			</div>
			<div className="flex gap-1">
				<Button
					variant="ghost"
					size="sm"
					onClick={() => setEditingField(field)}
				>
					<Pencil className="h-4 w-4" />
				</Button>
				<Button
					variant="ghost"
					size="sm"
					onClick={() => handleDeleteField(field.id)}
				>
					<Trash2 className="h-4 w-4" />
				</Button>
			</div>
		</div>
	)

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-semibold">{t('baseFields')}</h3>
				<div className="mt-3 space-y-3">
					<Field orientation="horizontal">
						<FieldLabel>{t('phoneRequired')}</FieldLabel>
						<Switch
							checked={config.phoneRequired}
							onCheckedChange={handleTogglePhone}
						/>
					</Field>
					<Field orientation="horizontal">
						<FieldLabel>{t('emailRequired')}</FieldLabel>
						<Switch
							checked={config.emailRequired}
							onCheckedChange={handleToggleEmail}
						/>
					</Field>
				</div>
			</div>

			<Separator />

			<div>
				<h3 className="text-lg font-semibold">{t('customFields')}</h3>
				<div className="mt-3 space-y-2">
					{fields.length === 0 && (
						<p className="text-muted-foreground text-sm">{t('noCustomFields')}</p>
					)}
					{fields.map(renderFieldItem)}
				</div>

				{(isAdding || editingField) && (
					<div className="mt-3">
						<BookingFieldEditor
							field={editingField}
							onSave={handleSaveField}
							onCancel={handleCancelEdit}
							isSaving={isSaving}
						/>
					</div>
				)}

				{!isAdding && !editingField && (
					<Button
						variant="outline"
						className="mt-3"
						onClick={() => setIsAdding(true)}
					>
						<Plus className="mr-2 h-4 w-4" />
						{t('addField')}
					</Button>
				)}
			</div>
		</div>
	)
}

export { BookingFormSettings }
```

- [ ] **Step 2: Коммит**

```bash
git add components/booking/BookingFormSettings.tsx
git commit -m "feat: добавить BookingFormSettings — настройки формы бронирования"
```

---

## Task 9: Интеграция в ServiceDialog — override и per-service поля

**Files:**
- Modify: `components/services/ServiceDialog.tsx`

- [ ] **Step 1: Добавить baseFieldOverrides в схему**

В `ServiceDialog.tsx`, расширить `orgServiceSchema` и `personalServiceSchema`:

```typescript
import type { BaseFieldOverrides } from '@/services/configs/booking-field.types'

// Добавить в baseServiceSchema:
const baseServiceSchema = z.object({
	name: z.string().min(2, t('validation.nameMin')),
	durationMin: z.number().min(1),
	price: z.number().min(0),
	color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
	description: z.string().optional(),
	phoneOverride: z.enum(['inherit', 'required', 'optional']),
	emailOverride: z.enum(['inherit', 'required', 'optional']),
})
```

- [ ] **Step 2: Добавить UI секцию в форму**

После существующих полей, добавить секцию "Форма бронирования":

```tsx
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { BookingFieldEditor } from '@/components/booking/BookingFieldEditor'
import { bookingFieldApi } from '@/services'

// В рендере формы, после секции staffPolicy:
<Separator className="my-4" />
<h4 className="font-medium">{t('bookingForm.overrides')}</h4>

<Field>
	<FieldLabel>{t('bookingForm.phoneRequired')}</FieldLabel>
	<Controller
		control={control}
		name="phoneOverride"
		render={({ field }) => (
			<Select value={field.value} onValueChange={field.onChange}>
				<SelectTrigger>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="inherit">{t('bookingForm.inherit')}</SelectItem>
					<SelectItem value="required">{t('bookingForm.required')}</SelectItem>
					<SelectItem value="optional">{t('bookingForm.optional')}</SelectItem>
				</SelectContent>
			</Select>
		)}
	/>
</Field>

<Field>
	<FieldLabel>{t('bookingForm.emailRequired')}</FieldLabel>
	<Controller
		control={control}
		name="emailOverride"
		render={({ field }) => (
			<Select value={field.value} onValueChange={field.onChange}>
				<SelectTrigger>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="inherit">{t('bookingForm.inherit')}</SelectItem>
					<SelectItem value="required">{t('bookingForm.required')}</SelectItem>
					<SelectItem value="optional">{t('bookingForm.optional')}</SelectItem>
				</SelectContent>
			</Select>
		)}
	/>
</Field>
```

- [ ] **Step 3: Конвертировать override значения при submit**

Добавить хелпер для маппинга form values → `BaseFieldOverrides`:

```typescript
const OVERRIDE_MAP: Record<string, boolean | null> = {
	inherit: null,
	required: true,
	optional: false,
}

const toOverrideValue = (value: string): boolean | null => OVERRIDE_MAP[value] ?? null

// В onSubmit:
const baseFieldOverrides = {
	phoneRequired: toOverrideValue(data.phoneOverride),
	emailRequired: toOverrideValue(data.emailOverride),
}
```

- [ ] **Step 4: Загрузить per-service поля и показать список**

Добавить загрузку и рендер кастомных полей для конкретной услуги (аналогично BookingFormSettings, но с `eventTypeId`). Использовать `BookingFieldEditor` для CRUD.

- [ ] **Step 5: Коммит**

```bash
git add components/services/ServiceDialog.tsx
git commit -m "feat: добавить секцию 'Форма бронирования' в ServiceDialog"
```

---

## Task 10: Финальная проверка и cleanup

**Files:**
- All modified files

- [ ] **Step 1: Проверить TypeScript**

```bash
npm run build
```

Expected: Build succeeds without type errors.

- [ ] **Step 2: Проверить lint**

```bash
npm run lint
```

Expected: No new lint errors.

- [ ] **Step 3: Проверить форматирование**

```bash
npm run format
```

- [ ] **Step 4: Ручной smoke test**

1. Открыть dev server (`npm run dev`)
2. Перейти на страницу бронирования — форма должна рендериться с базовыми полями
3. Открыть настройки орг → проверить тогглы phone/email
4. Добавить кастомное поле → проверить что появляется в форме бронирования
5. Открыть редактирование услуги → проверить override тогглы и per-service поля

- [ ] **Step 5: Финальный коммит**

```bash
npm run format
git add -A
git commit -m "chore: форматирование и cleanup после custom booking fields"
```
