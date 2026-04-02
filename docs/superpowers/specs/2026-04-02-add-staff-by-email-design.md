# Добавление сотрудника в организацию по email

**Дата:** 2026-04-02
**Статус:** Утверждено

## Обзор

На странице Staff Schedule (`/manage/[orgId]/staff-schedule`) рядом с Select выбора сотрудника добавляется кнопка "+". По клику открывается Popover с Combobox для поиска пользователей по email. При вводе 3+ символов выполняется поиск среди зарегистрированных пользователей системы. Клик по результату — пользователь добавляется в организацию со статусом `invited`.

## Бэкенд

### Эндпоинт 1: Поиск пользователей по email

```
GET /api/users/search?email=<query>&orgId=<orgId>
```

- **query-параметр `email`** — подстрока для поиска (минимум 3 символа, валидация на бэке)
- **query-параметр `orgId`** — ID организации, для исключения уже добавленных сотрудников
- **Ответ:** `ApiResponse<UserSearchResult[]>` — массив `{ id, email }`, максимум 10 результатов
- **Фильтрация:** бэкенд исключает пользователей, которые уже являются членами указанной организации (любой статус: active, invited, suspended)
- **Ошибки:** 400 (email короче 3 символов)

### Эндпоинт 2: Добавление сотрудника в организацию

```
POST /api/org/:orgId/staff
```

- **Body:** `{ userId: string }`
- **Действие:** добавляет пользователя в организацию со статусом `invited` и ролью `member`
- **Ответ:** `ApiResponse<OrgStaffMember>` — добавленный сотрудник
- **Ошибки:**
  - 404 — пользователь не найден
  - 409 — пользователь уже в организации

## Фронтенд — API слой

### Типы

```typescript
// services/configs/user.types.ts
interface UserSearchResult {
  id: string
  email: string
}
```

```typescript
// services/configs/org.types.ts (дополнение)
interface AddStaffBody {
  userId: string
}
```

### Конфиги эндпоинтов

**Новый файл `services/configs/user.config.ts`:**

```typescript
const userApiConfig = {
  searchByEmail: endpoint<void, ApiResponse<UserSearchResult[]>>({
    url: ({ email, orgId }) => `/api/users/search?email=${email}&orgId=${orgId}`,
    method: getData,
    defaultErrorMessage: 'Failed to search users',
  }),
}
```

**Дополнение `services/configs/org.config.ts`:**

```typescript
addStaff: endpoint<AddStaffBody, ApiResponse<OrgStaffMember>>({
  url: ({ id }) => `/api/org/${id}/staff`,
  method: postData,
  defaultErrorMessage: 'Failed to add staff member',
}),
```

### Экспорт

В `services/index.ts` добавить `userApi` из нового конфига.

## Фронтенд — UI

### Компонент `AddStaffButton`

**Расположение:** `components/staff-schedule/AddStaffButton.tsx`

**Структура:**

```
[Кнопка "+"] → Popover → Combobox (поле ввода + dropdown результатов)
```

**Поведение:**

1. Кнопка `+` с иконкой `Plus` из `lucide-react`, визуально в линию с `StaffFilter` Select, одинаковой высоты
2. По клику открывается `Popover` (align: end)
3. Внутри — `Combobox` с placeholder "Введите email сотрудника"
4. При вводе менее 3 символов — dropdown не показывается
5. При вводе 3+ символов — debounce 300ms — запрос `userApi.searchByEmail`
6. Dropdown показывает список email'ов
7. Клик по email:
   - Вызов `orgApi.addStaff({ pathParams: { id: orgId }, body: { userId } })`
   - При успехе: `toast.success("Сотрудник приглашён")`, Popover закрывается, список сотрудников рефетчится
   - При ошибке: toast с сообщением об ошибке
8. Поле ввода очищается при закрытии Popover

**Состояния dropdown:**

- **Loading** — `Spinner` пока идёт запрос
- **Пустой результат** — текст "Пользователь не найден"
- **Результаты** — список email'ов, клик по любому добавляет

### Изменения на странице Staff Schedule

**Файл:** `app/[locale]/(org)/manage/[orgId]/staff-schedule/page.tsx`

Лейаут секции выбора сотрудника:

```
<div className="flex items-center gap-2">
  <StaffFilter ... />
  <AddStaffButton orgId={orgId} onStaffAdded={refetchStaff} />
</div>
```

### Используемые UI-компоненты

- `Popover` — из `components/ui/popover.tsx`
- `Combobox` — из `components/ui/combobox.tsx` (уже поддерживает фильтрацию и список)
- `Button` — variant `outline`, size `icon`
- `Spinner` — из `components/ui/spinner.tsx`
- `toast` — из `sonner`

### i18n ключи

В `i18n/messages/{en,uk}.json` под ключом `staffSchedule`:

```json
{
  "addStaff": "Add staff member",
  "searchByEmail": "Enter staff email",
  "userNotFound": "User not found",
  "staffInvited": "Staff member invited",
  "minCharsHint": "Enter at least 3 characters"
}
```

## Обработка ошибок

| Сценарий | Обработка |
|----------|-----------|
| email < 3 символов | Dropdown не открывается, подсказка "Введите минимум 3 символа" |
| Сетевая ошибка поиска | toast.error через interceptor |
| Пользователь не найден (пустой массив) | Текст "Пользователь не найден" в dropdown |
| 409 (уже в организации) | toast.error "Сотрудник уже в организации" |
| 404 (пользователь не найден на бэке) | toast.error через interceptor |
| Успешное добавление | toast.success, закрытие popover, рефетч списка |

## Вне скоупа

- Выбор роли (admin/member) при добавлении — всегда `member`
- Выбор позиции при добавлении — назначается отдельно
- Инвайт по email несуществующего пользователя
- Управление статусами (accept/decline invitation)
- Удаление сотрудника из организации
