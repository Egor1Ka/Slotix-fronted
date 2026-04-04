# Personal Services — Design Spec

**Date:** 2026-03-31
**Approach:** C — переиспользование `ServicesList` + `ServiceDialog` с `ownerType`

## Цель

Дать пользователю возможность управлять личными услугами (без привязки к организации) через интерфейс, аналогичный орг-странице услуг. Личные услуги привязаны к `userId`, не имеют staff policy.

## Scope

### В scope

- Новая страница `/{locale}/my-services`
- Рефакторинг `ServicesList` и `ServiceDialog` для поддержки `ownerType: 'org' | 'user'`
- Новый API-эндпоинт `getByUser` в `event-type.config.ts`
- Новый метод `getEventTypesByUser` в `booking-api-client.ts`
- Ссылка в `PersonalSidebar`

### Вне scope

- Бэкенд-изменения (бэкенд уже поддерживает `userId` в `BackendEventType`)
- Изменение логики букинга/календаря для личных услуг
- Позиции и сотрудники для личных услуг

## API-слой

### 1. `event-type.types.ts`

```ts
interface CreateEventTypeBody {
	orgId?: string // было обязательным → опциональное
	userId?: string // новое поле
	name: string
	durationMin: number
	price: number
	currency: string
	color?: string
	description?: string
	staffPolicy?: StaffPolicy // опциональное — не нужно для personal
	assignedPositions?: string[]
	assignedStaff?: string[]
}
```

`UpdateEventTypeBody` — без изменений (уже все поля опциональные).

### 2. `event-type.config.ts`

Добавить эндпоинт:

```ts
getByUser: endpoint<void, ApiResponse<EventType[]>>({
	url: ({ userId }) => `/api/event-types?userId=${userId}`,
	method: getData,
	defaultErrorMessage: 'Failed to fetch personal services',
})
```

### 3. `booking-api-client.ts`

Добавить метод `getEventTypesByUser(userId: string): Promise<EventType[]>` по аналогии с `getEventTypesByOrg`.

## Компоненты

### `ServicesList`

Изменение пропсов:

```ts
// было
interface ServicesListProps {
	orgId: string
	currency: string
}

// стало
interface ServicesListProps {
	ownerId: string
	ownerType: 'org' | 'user'
	currency: string
}
```

Логика:

- `ownerType === 'org'` → `bookingEventTypeApi.getByOrg(ownerId)`
- `ownerType === 'user'` → `bookingEventTypeApi.getByUser(ownerId)`
- Передаёт `ownerId` и `ownerType` в `ServiceDialog`

### `ServiceDialog`

Изменение пропсов:

```ts
// было
interface ServiceDialogProps {
	orgId: string
	// ...
}

// стало
interface ServiceDialogProps {
	ownerId: string
	ownerType: 'org' | 'user'
	// ...
}
```

Логика:

- `ownerType === 'user'`:
  - Скрыть секцию staff policy (radio group + позиции/сотрудники)
  - Не загружать `positionApi.getByOrg` и `orgApi.getStaff`
  - При create: отправлять `{ userId: ownerId }` вместо `{ orgId: ownerId }`
  - Zod-схема: убрать валидацию staffPolicy (сделать опциональным)
- `ownerType === 'org'`:
  - Всё как было, передавать `{ orgId: ownerId }`

### Zod-схема в `ServiceDialog`

Разделить на две схемы или сделать условную:

```ts
// базовая схема (общая)
const baseSchema = z.object({
  name: z.string().min(1),
  durationMin: z.coerce.number().min(5),
  price: z.coerce.number().min(0),
  color: z.string(),
  description: z.string().optional(),
})

// орг-схема: добавляет staffPolicy + условную валидацию
const orgSchema = baseSchema.extend({
  staffPolicy: z.enum(['any', 'by_position', 'specific']),
  assignedPositions: z.array(z.string()).optional(),
  assignedStaff: z.array(z.string()).optional(),
}).superRefine(...)

// personal-схема: без staffPolicy
const personalSchema = baseSchema
```

Выбор схемы по `ownerType`.

## Роутинг

### Новая страница

`app/[locale]/(personal)/my-services/page.tsx`:

```tsx
import { getUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ServicesList } from '@/components/services/ServicesList'

export default async function MyServicesPage() {
	const user = await getUser()
	if (!user) redirect('/login')

	return (
		<div className="container max-w-3xl py-6">
			<ServicesList ownerId={user.id} ownerType="user" currency="UAH" />
		</div>
	)
}
```

## Навигация

### `PersonalSidebar`

Добавить ссылку между "My Schedule Settings" и "My Organizations":

```tsx
{
  title: t('myServices'),  // или 'services.title'
  url: '/my-services',
  icon: Settings2,
}
```

## Обновление орг-страницы

`app/[locale]/(org)/manage/[orgId]/services/page.tsx` — обновить вызов:

```tsx
<ServicesList ownerId={orgId} ownerType="org" currency="UAH" />
```

## Файлы для изменения

| Файл                                                  | Изменение                                                              |
| ----------------------------------------------------- | ---------------------------------------------------------------------- |
| `services/configs/event-type.types.ts`                | `orgId` → optional, добавить `userId`, `staffPolicy` → optional        |
| `services/configs/event-type.config.ts`               | Добавить `getByUser` эндпоинт                                          |
| `lib/booking-api-client.ts`                           | Добавить `getEventTypesByUser`                                         |
| `components/services/ServicesList.tsx`                | `orgId` → `ownerId` + `ownerType`, условный fetch                      |
| `components/services/ServiceDialog.tsx`               | `orgId` → `ownerId` + `ownerType`, скрыть staff policy, условная схема |
| `app/[locale]/(personal)/my-services/page.tsx`        | **Новый файл** — страница личных услуг                                 |
| `app/[locale]/(org)/manage/[orgId]/services/page.tsx` | Обновить пропсы `ServicesList`                                         |
| `components/sidebar/PersonalSidebar.tsx`              | Добавить ссылку "Мои услуги"                                           |

## Что НЕ меняется

- `UpdateEventTypeBody` — уже все поля optional
- UI карточки услуги (цвет, название, длительность, цена)
- Диалог подтверждения удаления
- API для update/delete (работают по `id`, не зависят от owner)
