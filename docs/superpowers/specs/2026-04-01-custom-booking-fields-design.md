# Custom Booking Fields — Design Spec

## Цель

Дать владельцам организаций и персональным пользователям возможность настраивать форму бронирования:
- Управлять обязательностью базовых полей (phone, email) на уровне org/user
- Переопределять обязательность базовых полей per-service
- Добавлять кастомные поля (org-level и per-service)

## Требования

- **name** — всегда required, не настраивается
- **phone / email** — обязательность настраивается на уровне org/user, с возможностью override per-service
- 4 значения типов кастомных полей: `email`, `phone`, `text`, `textarea` (text — однострочный input, textarea — многострочный)
- Каждое кастомное поле: required или optional (настраивает владелец)
- Порядок в форме: базовые (name → phone → email) → кастомные (по дате создания)
- Работает для org (`ownerType: 'org'`) и personal (`ownerType: 'user'`)
- Правило "хотя бы один контакт": если оба phone и email помечены как optional — клиент всё равно должен заполнить хотя бы одно из них (как сейчас). Правило отключается, если хотя бы одно из полей required.

## Подход

**Подход 2 — Отдельная сущность BookingField** с нормализованными данными. Выбран за:
- Простой CRUD отдельных полей
- Расширяемость (drag & drop order позже)
- Нормализованная структура данных

---

## Модель данных

### BookingField (новая сущность)

| Поле          | Тип                                      | Описание                                   |
| ------------- | ---------------------------------------- | ------------------------------------------ |
| `id`          | `string`                                 | Уникальный ID                              |
| `ownerId`     | `string`                                 | ID организации или пользователя            |
| `ownerType`   | `'org' \| 'user'`                        | Тип владельца                              |
| `eventTypeId` | `string \| null`                         | `null` = базовое поле для всех услуг       |
| `type`        | `'email' \| 'phone' \| 'text' \| 'textarea'` | Тип поля                              |
| `label`       | `string`                                 | Лейбл поля ("Аллергии", "Telegram" и т.д.) |
| `required`    | `boolean`                                | Обязательность                             |
| `createdAt`   | `string`                                 | ISO дата создания (для сортировки)         |

### BookingFormConfig (на org/user)

| Поле            | Тип       | Описание                           |
| --------------- | --------- | ---------------------------------- |
| `phoneRequired` | `boolean` | Обязательность phone по умолчанию  |
| `emailRequired` | `boolean` | Обязательность email по умолчанию  |

### baseFieldOverrides (на EventType)

| Поле             | Тип                | Описание                                          |
| ---------------- | ------------------ | ------------------------------------------------- |
| `phoneRequired?` | `boolean \| null`  | `null` / отсутствует = наследовать от org/user     |
| `emailRequired?` | `boolean \| null`  | `null` / отсутствует = наследовать от org/user     |

### Логика merge

```
name        → всегда required (хардкод)
phone       → eventType.baseFieldOverrides?.phoneRequired ?? org.bookingFormConfig.phoneRequired
email       → eventType.baseFieldOverrides?.emailRequired ?? org.bookingFormConfig.emailRequired
customFields → поля с eventTypeId=null (org-level) + поля с eventTypeId=id (service-level), sorted by createdAt
```

---

## API эндпоинты

### BookingField CRUD

| Метод    | URL                              | Описание                          |
| -------- | -------------------------------- | --------------------------------- |
| `GET`    | `/api/booking-fields?ownerId=X&ownerType=org` | Все базовые поля орг    |
| `GET`    | `/api/booking-fields?ownerId=X&ownerType=org&eventTypeId=Y` | Поля конкретной услуги |
| `POST`   | `/api/booking-fields`            | Создать поле                      |
| `PATCH`  | `/api/booking-fields/:id`        | Обновить поле                     |
| `DELETE` | `/api/booking-fields/:id`        | Удалить поле                      |

### BookingFormConfig

| Метод    | URL                                            | Описание             |
| -------- | ---------------------------------------------- | -------------------- |
| `GET`    | `/api/booking-form-config?ownerId=X&ownerType=org` | Текущие настройки |
| `PATCH`  | `/api/booking-form-config`                     | Обновить настройки   |

### EventType baseFieldOverrides

Не нужен отдельный эндпоинт — добавляется в существующий `PATCH /api/event-types/:id`:

```json
{ "baseFieldOverrides": { "phoneRequired": true, "emailRequired": null } }
```

### Публичный эндпоинт — готовая форма для клиента

| Метод | URL                              | Описание                    |
| ----- | -------------------------------- | --------------------------- |
| `GET` | `/api/booking-form/:eventTypeId` | Merged конфиг для рендера   |

Ответ:

```json
{
  "baseFields": {
    "name": { "required": true },
    "phone": { "required": true },
    "email": { "required": false }
  },
  "customFields": [
    { "id": "abc", "type": "textarea", "label": "Комментарий", "required": false },
    { "id": "def", "type": "text", "label": "Аллергии", "required": true }
  ]
}
```

---

## Фронтенд — типы

### Новые типы

```typescript
// services/configs/booking-field.types.ts

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

interface BookingFormConfig {
  phoneRequired: boolean
  emailRequired: boolean
}

interface MergedBookingForm {
  baseFields: {
    name: { required: true }
    phone: { required: boolean }
    email: { required: boolean }
  }
  customFields: BookingField[]
}
```

### Изменения в CreateBookingBody

```typescript
interface CreateBookingBody {
  eventTypeId: string
  staffId: string
  startAt: string
  timezone: string
  invitee: Invitee
  customFieldValues: { fieldId: string; value: string }[]  // новое
}
```

---

## Фронтенд — компоненты

### ClientInfoForm (рефакторинг)

Становится динамическим:
- Получает `MergedBookingForm` как проп
- name/phone/email рендерятся с required/optional на основе конфига
- Кастомные поля рендерятся через маппинг type → компонент:
  - `email` → `<Input type="email" />`
  - `phone` → `<Input type="tel" />`
  - `text` → `<Input type="text" />`
  - `textarea` → `<Textarea />`
- Zod-схема строится динамически на основе `MergedBookingForm`

### BookingFieldEditor (новый)

Форма создания/редактирования кастомного поля:
- Поля: label (input), type (select), required (switch)
- Используется в настройках орг и в ServiceDialog

### BookingFormSettings (новый, для админки org/personal)

- Тогглы: phoneRequired, emailRequired
- Список базовых кастомных полей (eventTypeId = null) с CRUD
- Кнопка [+ Добавить поле] → BookingFieldEditor

### ServiceDialog (дополнение)

Новая секция "Форма бронирования":
- Override тогглы для phone/email (3 состояния: наследовать / required / optional)
- Список кастомных полей привязанных к этой услуге
- Кнопка [+ Добавить поле] → BookingFieldEditor

---

## Потоки данных

### Бронирование (клиент)

```
1. Клиент выбирает услугу + мастера + слот
2. Фронт → GET /api/booking-form/:eventTypeId
3. Получает MergedBookingForm
4. ClientInfoForm строит динамическую zod-схему
5. Рендерит: name → phone → email → [кастомные поля по createdAt]
6. Клиент заполняет → submit
7. POST /api/bookings с invitee + customFieldValues[]
```

### Настройка формы (админ орг)

```
Настройки орг → "Форма бронирования"
├── Тогглы: phone required ✅ / email required ❌
├── Кастомные поля (для всех услуг):
│   ├── "Комментарий" (textarea, optional) [✏️ 🗑️]
│   └── [+ Добавить поле]

Редактирование услуги → секция "Форма бронирования"
├── Override: phone [наследовать ▾] / email [required ▾]
├── Доп. поля этой услуги:
│   ├── "Аллергии" (text, required) [✏️ 🗑️]
│   └── [+ Добавить поле]
```

### Настройка формы (personal без орг)

Идентично org, только `ownerType: 'user'` и настройки в личном кабинете.

---

## Валидация на бэкенде

При `POST /api/bookings` бэкенд:
1. Резолвит форму (merge org config + service overrides + custom fields)
2. Проверяет: все required базовые поля заполнены
3. Проверяет: все required кастомные поля есть в `customFieldValues`
4. Проверяет типы: email валидный, phone непустой, text/textarea непустой
5. Проверяет: все `fieldId` реально принадлежат этому eventType / его owner

---

## Вне скоупа (на потом)

- Drag & drop порядок полей
- Условная логика (показать поле X, если поле Y заполнено)
- Типы: number, date, select, multi-select, file
- Шаблоны форм (переиспользование между услугами)
