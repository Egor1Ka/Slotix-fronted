# Позиції та Послуги — CRUD управління

**Дата:** 2026-03-30
**Статус:** Затверджено

## Контекст

На бекенді вже існують моделі `Position` та `EventType` зі зв'язками через `staffPolicy` / `assignedPositions`. Але:

- Немає API ендпоінтів для CRUD позицій
- Немає API ендпоінтів для створення/редагування/видалення послуг (EventType)
- На фронтенді немає UI для управління позиціями та послугами
- Позиція на фронті — просто `string | null`, а не посилання на сутність

## Що будуємо

Два нових розділи в сайдбарі організації:

- **Позиції** — CRUD позицій організації
- **Послуги** — CRUD послуг з налаштуванням staffPolicy та прив'язкою до позицій/співробітників

Для соло-підприємців (PersonalSidebar) ці пункти не відображаються.

---

## 1. Сайдбар і роутинг

### Нові пункти в OrgSidebar

```
Загальний розклад     → /manage/[orgId]
Позиції               → /manage/[orgId]/positions
Послуги               → /manage/[orgId]/services
Персонал              → (список співробітників)
```

### Нові роути

- `app/[locale]/(org)/manage/[orgId]/positions/page.tsx`
- `app/[locale]/(org)/manage/[orgId]/services/page.tsx`

### Захист за роллю

Пункти меню та сторінки доступні тільки `owner` і `admin`. Для `member` — не показуємо в сайдбарі.

---

## 2. Бекенд — Position CRUD API

### Ендпоінти

| Метод    | Шлях                 | Опис                                                    |
| -------- | -------------------- | ------------------------------------------------------- |
| `GET`    | `/positions?orgId=X` | Список позицій організації (кожна включає `staffCount`) |
| `POST`   | `/positions`         | Створити позицію (`orgId`, `name`, `level`, `color`)    |
| `PATCH`  | `/positions/:id`     | Оновити позицію                                         |
| `DELETE` | `/positions/:id`     | Видалити позицію                                        |

### Файли на бекенді

- `src/routes/positionRoutes.js` — роути
- `src/controllers/positionController.js` — хендлери
- `src/services/positionService.js` — бізнес-логіка
- `src/repository/positionRepository.js` — розширити (додати `getByOrgId`, `create`, `update`, `delete`)

### Валідація при видаленні

Якщо до позиції прив'язані співробітники (Membership.positionId) або послуги (EventType.assignedPositions), повернути 400 з описом помилки.

### Авторизація

Тільки `owner` та `admin` (перевірка через Membership.role).

---

## 3. Бекенд — EventType CRUD API

### Ендпоінти

| Метод    | Шлях                     | Опис                               |
| -------- | ------------------------ | ---------------------------------- |
| `GET`    | `/event-types?orgId=X`   | Вже існує — список послуг          |
| `GET`    | `/event-types/:id/staff` | Вже існує — доступні співробітники |
| `POST`   | `/event-types`           | Створити послугу                   |
| `PATCH`  | `/event-types/:id`       | Оновити послугу                    |
| `DELETE` | `/event-types/:id`       | Видалити послугу                   |

### Тіло запиту (POST/PATCH)

```typescript
{
  name: string             // обов'язкове
  durationMin: number      // обов'язкове, > 0
  price: number            // обов'язкове, >= 0
  currency: string         // з організації
  color: string            // hex
  description?: string
  type: "org"              // завжди "org" для організації
  staffPolicy: "any" | "by_position" | "specific"
  assignedPositions?: string[]  // ID позицій, якщо staffPolicy = "by_position"
  assignedStaff?: string[]      // ID співробітників, якщо staffPolicy = "specific"
}
```

### Валідація

- `staffPolicy: "by_position"` → `assignedPositions` обов'язковий і непорожній
- `staffPolicy: "specific"` → `assignedStaff` обов'язковий і непорожній
- `staffPolicy: "any"` → обидва поля ігноруються
- При видаленні — перевірка на активні бронювання (pending/confirmed)

### Авторизація

Тільки `owner` та `admin`.

---

## 4. Фронтенд — Сторінка позицій

### Маршрут

`/manage/[orgId]/positions`

### Список позицій

Таблиця/картки:

- Колір (кружок) + Назва
- Рівень (level)
- Кількість співробітників (скільки Membership з цією positionId)
- Дії: редагувати, видалити

### Створення/Редагування

Dialog (модалка) з формою:

- `name` — текстове поле (обов'язкове, min 2 символи)
- `level` — числове поле (за замовчуванням 0)
- `color` — color picker (вибір з палітри або hex)

### Видалення

AlertDialog з підтвердженням. Помилка від бекенду → toast з поясненням.

### Порожній стан

Компонент `Empty` з текстом "Позицій ще немає" + кнопка "Додати позицію".

### API на фронті

- `services/configs/position.config.ts` — ендпоінти
- `services/configs/position.types.ts` — типи `Position`, `CreatePositionBody`, `UpdatePositionBody`
- Експорт `positionApi` в `services/index.ts`

---

## 5. Фронтенд — Сторінка послуг

### Маршрут

`/manage/[orgId]/services`

### Список послуг

Картки:

- Колір (кружок) + Назва
- Тривалість (durationMin) + Ціна (price + currency)
- Політика персоналу — бейдж: "Усі" / "За позицією" / "Конкретні"
- Дії: редагувати, видалити

### Створення/Редагування

Dialog з формою:

- `name` — текстове поле (обов'язкове, min 2)
- `durationMin` — число в хвилинах (обов'язкове, > 0)
- `price` — число (обов'язкове, >= 0)
- `currency` — береться з організації (не редагується)
- `color` — color picker
- `description` — textarea (опціонально)
- `staffPolicy` — RadioGroup: "Усі" / "За позицією" / "Конкретні співробітники"
  - "За позицією" → MultiSelect з позиціями організації (з `positionApi.getAll`)
  - "Конкретні" → MultiSelect зі співробітниками організації (з `orgApi.getStaff`)

### Видалення

AlertDialog. Помилка при активних бронюваннях → toast.

### API на фронті

- `services/configs/event-type.config.ts` — CRUD ендпоінти
- `services/configs/event-type.types.ts` — типи `CreateEventTypeBody`, `UpdateEventTypeBody`
- Експорт `eventTypeApi` в `services/index.ts`

### Порожній стан

`Empty` з текстом "Послуг ще немає" + кнопка "Додати послугу".

---

## 6. i18n

Нові ключі в `i18n/messages/{en,uk}.json`:

- `positions.*` — заголовки, кнопки, форми, порожній стан, помилки видалення
- `services.*` — аналогічно + staffPolicy лейбли ("Усі", "За позицією", "Конкретні")
- `sidebar.positions`, `sidebar.services` — пункти меню

---

## 7. Валідація форм (zod)

### Position

```typescript
z.object({
	name: z.string().min(2),
	level: z.number().min(0).default(0),
	color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
})
```

### EventType

```typescript
z.object({
	name: z.string().min(2),
	durationMin: z.number().positive(),
	price: z.number().min(0),
	color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
	description: z.string().optional(),
	staffPolicy: z.enum(['any', 'by_position', 'specific']),
	assignedPositions: z.array(z.string()).optional(),
	assignedStaff: z.array(z.string()).optional(),
}).refine(
	(data) => {
		if (data.staffPolicy === 'by_position')
			return data.assignedPositions && data.assignedPositions.length > 0
		if (data.staffPolicy === 'specific')
			return data.assignedStaff && data.assignedStaff.length > 0
		return true
	},
	{
		message:
			'Оберіть позиції або співробітників відповідно до обраної політики',
	},
)
```

---

## 8. Оновлення існуючих типів

Існуючий `EventType` в `booking.types.ts` не має полів `staffPolicy`, `assignedPositions`, `assignedStaff`. Потрібно розширити:

```typescript
interface EventType {
	// існуючі поля залишаються
	id: string
	name: string
	slug: string
	durationMin: number
	price: number
	currency: string
	color: string
	description: string | null
	// нові поля
	staffPolicy: 'any' | 'by_position' | 'specific'
	assignedPositions: string[]
	assignedStaff: string[]
}
```

Існуючий `StaffMember.position: string | null` — бекенд вже повертає `position` як рядок (name з Position). Це залишається без змін — DTO на бекенді розгортає `positionId` у `position.name`.

---

## 9. Порядок реалізації

1. Бекенд Position CRUD → фронтенд Position API + типи + сторінка
2. Бекенд EventType CRUD → фронтенд EventType API + типи + сторінка
3. Сайдбар (нові пункти) + роутинг + захист за роллю
4. i18n (en + uk)
