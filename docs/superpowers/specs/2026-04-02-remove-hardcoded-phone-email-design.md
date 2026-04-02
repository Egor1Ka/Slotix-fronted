# Удаление захардкоженных базовых полей phone/email

## Проблема

Phone и email захардкожены как "базовые поля" формы бронирования. Их нельзя удалить — только переключить required/optional. Пользователь хочет, чтобы единственным обязательным базовым полем было `name`, а phone/email добавлялись как обычные кастомные поля через CRUD.

## Решение

Убрать концепцию базовых полей phone/email. Оставить только `name: { required: true }`. Phone и email доступны как типы кастомных полей (`BookingFieldType`).

## Затронутые файлы

### 1. `services/configs/booking-field.types.ts`

- **Удалить:** `BookingFormConfig`, `UpdateBookingFormConfigBody`, `BaseFieldOverrides`, `MergedBaseField`
- **Изменить:** `MergedBookingForm.baseFields` — оставить только `name: { required: true }`, убрать `phone` и `email`
- **Не трогать:** `BookingFieldType` (phone/email остаются как типы), `BookingField`, `CreateBookingFieldBody`, `UpdateBookingFieldBody`, `CustomFieldValue`

### 2. `components/booking/BookingFormSettings.tsx`

- Убрать секцию "Базовые поля" (Switch'и для phoneRequired/emailRequired)
- Убрать импорт `BookingFormConfig`
- Убрать `bookingFormConfigApi` импорт и использование
- Убрать стейт `config` и `handlePhoneToggle`/`handleEmailToggle`
- Оставить только секцию кастомных полей

### 3. `components/services/ServiceDialog.tsx`

- Убрать поля `phoneOverride`/`emailOverride` из zod-схемы
- Убрать селекты для phone/email override из формы
- Убрать `fromOverrideValue`/`toOverrideValue` для phone/email
- Убрать маппинг `phoneRequired`/`emailRequired` в `overrides`

### 4. `lib/mock-api.ts`

- Убрать `bookingFormConfigApi` (mock для get/update конфига phone/email)

### 5. `services/index.ts`

- Убрать реэкспорт `bookingFormConfigApi` если есть

### 6. `lib/booking-api-client.ts`

- Убрать методы связанные с `BookingFormConfig`

### 7. `services/configs/booking-field.config.ts`

- Убрать конфиг эндпоинтов для `BookingFormConfig` API

### 8. `services/configs/event-type.types.ts`

- Убрать `BaseFieldOverrides` из типа EventType если используется

### 9. `services/configs/booking.types.ts`

- Убрать ссылки на `phoneRequired`/`emailRequired` если есть

### 10. `lib/mock.ts`

- Убрать mock-данные для phone/email конфига

## Что НЕ меняется

- `BookingFieldType` — `'phone'` и `'email'` остаются как типы кастомных полей
- CRUD кастомных полей (`bookingFieldApi`) — без изменений
- `BookingFieldEditor` — без изменений
- При создании организации форма начинается пустой (только name)
