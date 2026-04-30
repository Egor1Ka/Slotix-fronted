# Унифицированный ColorPicker

**Дата:** 2026-04-29
**Статус:** Approved (design)

## Контекст и проблема

В приложении выбор цвета сейчас реализован в 4 разных местах с дублированием кода и разными подходами:

1. `components/services/ServiceDialog.tsx` — palette из 8 hex-цветов (services).
2. `components/positions/PositionDialog.tsx` — та же palette из 8 hex-цветов (positions).
3. `components/booking-statuses/BookingStatusesManager.tsx` — palette из 8 **именованных** цветов (`'blue'`, `'green'` …), маппинг в Tailwind-классы через `COLOR_CLASS`.
4. `components/organizations/CreateOrgDialog.tsx` — palette из 12 «брендовых» hex-цветов + текстовый `<Input>` для произвольного hex.

Проблемы:
- Логика и palette дублируются 4 раза.
- Booking-statuses используют другую модель данных (named string вместо hex).
- Произвольный цвет можно ввести только в `CreateOrgDialog` (через текстовое поле).
- Палитры отличаются в каждом контексте.

## Цель

Заменить все 4 места на единый компонент `<ColorPicker>`, где:
- Показывается единая palette из 8 пресетов.
- Произвольный цвет выбирается через нативный системный picker (`<input type="color">`).
- UI компактный: иконка-trigger в конце ряда swatches.
- Booking-statuses мигрируются на hex для единообразия.

## Принятые решения (через brainstorming)

| Вопрос | Решение |
|--------|---------|
| Booking-statuses: hex или named? | **Hex** — мигрируем БД и backend. |
| Picker: нативный или библиотека? | **Нативный `<input type="color">`** — ноль зависимостей. |
| Palette: единая или разные по контекстам? | **Единая** из 8 цветов. Org теряет brand-палитру; кастомный цвет берётся через picker. |
| Кастомный цвет в UI | **9-й swatch** появляется при выборе non-preset, плюс отдельный trigger. |
| Текстовое hex-поле в `CreateOrgDialog` | **Удалить** — picker покрывает кейс (в нём есть поле hex). |

## Архитектура компонента

### Расположение

`components/ui/color-picker.tsx` — конвенция shadcn (`'use client'`, `data-slot="color-picker"`, named export, `cn()`).

### Публичный API

```ts
interface ColorPickerProps {
  value: string                // выбранный hex (#RRGGBB)
  onChange: (color: string) => void
  presets?: string[]           // по умолчанию — DEFAULT_COLOR_PALETTE из 8 цветов
  size?: 'sm' | 'md'           // sm = size-6 (compact), md = size-7 (default)
  className?: string
  disabled?: boolean
  id?: string                  // для htmlFor у FieldLabel
}

export const DEFAULT_COLOR_PALETTE = [
  '#8B5CF6', '#06B6D4', '#F59E0B', '#EF4444',
  '#10B981', '#3B82F6', '#EC4899', '#F97316',
] as const
```

### Внутреннее устройство

Layout (горизонтальный flex с `gap-2`):

```
[●][●][●][●][●][●][●][●] [● custom?] [⊕trigger]
└──── 8 пресетов ─────┘  └─ если ─┘  └ всегда
```

- **Preset swatch** — `<button type="button">`, `size-7 rounded-full border-2`, `style={{ backgroundColor: color }}`. Selected = `border-foreground scale-110`. Hover = `border-gray-400`.
- **Custom swatch (9-й)** — рендерится только если `value` ∉ `presets`. Идентичен пресету, всегда selected.
- **Trigger** — `<label>` `size-7`, обёртка над `<input type="color" className="sr-only" />`. Внутри `<Pipette className="size-4" />` из `lucide-react`. Стиль: `border border-dashed border-border hover:border-foreground transition-colors cursor-pointer`. Клик → системный picker; `onInput` пишет в `onChange` (live-обновление при движении курсора).

Реализация по правилам `~/.claude/rules/`: `const`-only, named callbacks (никаких inline лямбд), guard clauses без `?.`.

## Изменения в frontend

### Новый файл

- `components/ui/color-picker.tsx`

### Modified files

#### `components/services/ServiceDialog.tsx`
- Удалить локальный `PALETTE` (строки 48-57).
- Удалить `selectColor`, `isColorSelected`, `renderColorOption` (строки 418-438).
- Удалить `selectedColor` watch (если используется только для рендера).
- В Field блока цвета (строки 716-722) заменить на `<Controller>` с `<ColorPicker>`.

#### `components/positions/PositionDialog.tsx`
- Удалить локальный `PALETTE` (строки 22-31).
- Удалить `selectColor`, `isSelected`, `renderColorOption` (строки 112-130).
- `defaultValues.color: PALETTE[0]` → `DEFAULT_COLOR_PALETTE[0]`.
- Заменить разметку на `<Controller>` + `<ColorPicker>`.

#### `components/booking-statuses/BookingStatusesManager.tsx`
- Удалить `STATUS_COLORS` и `COLOR_CLASS` (строки 30-50).
- Переписать `ColorDot` на `style={{ backgroundColor: color }}` без Tailwind class lookup.
- `DEFAULT_FORM.color`: `'blue'` → `DEFAULT_COLOR_PALETTE[5]` (`'#3B82F6'`).
- В Dialog (строки 337-354) заменить кастомный ряд кнопок на `<ColorPicker>`.

#### `components/organizations/CreateOrgDialog.tsx`
- Удалить `PRESET_COLORS` (строки 32-45).
- Удалить `selectPresetColor`, `renderColorOption` (строки 122-134).
- Удалить текстовый `<Input id="brandColor">` (строки 191-195).
- Заменить блок Field (строки 184-197) на `<Controller>` + `<ColorPicker>`.

### Что **не** меняется

- Все места, где цвет **отображается** (не выбирается): `BookingListItem`, `BookingDetailPanel`, `ServiceList`, `SlotServicePopover`, `BookingStatusBadge`, `PositionList`, `ServicesList` и др. Они уже используют `style={{ backgroundColor: ... }}` с произвольным значением — переход booking-statuses на hex прозрачен.
- I18n-ключи: `t('color')`, `t('statusColor')`, `t('form.brandColor')` — переиспользуются.
- Типы `Service.color`, `Position.color`, `Organization.brandColor` уже `string` — без изменений.
- Тип `BookingStatusObject.color` в `services/configs/bookingStatus.types.ts` остаётся `string` — без изменений.

## Изменения в backend (BackendTemplate)

### Modified files

#### `src/constants/bookingStatus.js`
- `STATUS_COLORS` обновить на hex-палитру (8 цветов).
- Добавить `LEGACY_NAMED_COLORS` (массив старых named цветов) — для backward-совместимости.
- `DEFAULT_STATUSES` обновить с named на hex:
  ```js
  status_unconfirmed: '#F59E0B'  // amber (был yellow)
  status_confirmed:   '#3B82F6'  // blue
  status_paid:        '#10B981'  // emerald (был green)
  status_cancelled:   '#EF4444'  // red
  ```

#### `src/models/BookingStatus.js`
- Заменить `enum: STATUS_COLORS` на permissive validator:
  ```js
  validate: {
    validator: (v) => /^#[0-9a-fA-F]{6}$/.test(v) || LEGACY_NAMED_COLORS.includes(v),
    message: 'Color must be hex (#RRGGBB) or a legacy named color',
  }
  ```
- Это backward-совместимо: старый кэшированный фронт с named-цветами продолжает работать.

### Новый файл

#### `src/scripts/migrateStatusColorsToHex.js`
Одноразовый идемпотентный скрипт:

```js
const NAMED_TO_HEX = {
  blue:   '#3B82F6',
  green:  '#10B981',
  red:    '#EF4444',
  yellow: '#F59E0B',
  purple: '#8B5CF6',
  orange: '#F97316',
  gray:   '#94A3B8',  // нет в палитре, остаётся как кастомный
  teal:   '#06B6D4',
}
```

Структура (по образцу существующего `src/scripts/migrateBookingStatuses.js`):
- ESM (`import` синтаксис).
- `mongoose.connect(process.env.DB_URL)`.
- `BookingStatus.find({ color: { $in: Object.keys(NAMED_TO_HEX) } })` → для каждого `updateOne({ _id }, { $set: { color: NAMED_TO_HEX[doc.color] } })`.
- Уже-hex документы автоматически пропускаются (не попадают в `$in`).
- `runValidators` не передаём — после шага 1 модель принимает оба формата, разницы нет.
- Лог: количество найденных, количество обновлённых, количество пропущенных.

Скрипт **идемпотентен**: повторный запуск ничего не сломает (no-op после первого успешного прогона).

## Production rollout (MongoDB Atlas, без даунтайма)

### Шаг 1. Backend deploy (backward-совместимый)

Раскатываем backend с обновлёнными константами и permissive validator. После этого:
- Старый кэшированный фронт шлёт `'blue'` → backend принимает.
- Новый фронт (после шага 3) шлёт `'#3B82F6'` → backend принимает.
- Существующие записи с named-цветами продолжают читаться.

### Шаг 2. Migration script на Atlas

```bash
DB_URL="mongodb+srv://<user>:<pwd>@<cluster>.mongodb.net/<dbname>" \
  node src/scripts/migrateStatusColorsToHex.js
```

Перед запуском:
- Сделать **snapshot Atlas** (M10+ — continuous backup; на free tier — `mongodump`).
- Сначала запустить на **staging** кластере (если есть), убедиться что статусы выглядят правильно.

После запуска — sanity check:
```js
db.bookingstatuses.countDocuments({ color: { $not: /^#[0-9a-fA-F]{6}$/ } })
// должно быть 0
```

Скрипт **идемпотентен**: повторный запуск ничего не сломает.

### Шаг 3. Frontend deploy

Катим новый фронт с `<ColorPicker>`. Шлёт только hex.

### Шаг 4. (Опционально, через 1-4 недели) — упрощение валидатора

Когда логи покажут что named не приходят больше:
- Упростить validator в `BookingStatus.js` до `match: /^#[0-9a-fA-F]{6}$/`.
- Удалить `LEGACY_NAMED_COLORS` из `constants/bookingStatus.js`.

### Откат на любом шаге

| Шаг | Откат | Риск |
|-----|-------|------|
| 1 | revert backend deploy | старая backend-версия с `enum: STATUS_COLORS` работает с непомигрированными данными |
| 2 | restore Atlas snapshot | потеря записей сделанных после snapshot |
| 3 | revert frontend deploy | если данные уже мигрированы — старый фронт покажет hex как unknown → fallback `bg-gray-400` (UI деградация, не падение) |

⚠ **Если откатываем фронт после миграции данных** — желательно откатить и данные тоже (restore snapshot), иначе UI booking-statuses будет показывать серые кружки вместо цветов.

## Тестирование

### Манyальные проверки (в браузере, `npm run dev`)

1. **services** — открыть `ServiceDialog`, выбрать пресет, выбрать кастомный через picker, сохранить, перезайти, увидеть выбранный цвет.
2. **positions** — то же для `PositionDialog`.
3. **booking-statuses** — создать новый статус, выбрать кастомный hex через picker, сохранить, увидеть в списке `ColorDot` с правильным цветом.
4. **organizations** — создать новую организацию, выбрать brandColor через picker.
5. **booking-statuses (после миграции)** — старые статусы (с был named-color) должны отображаться правильно после миграции на hex.

### Автотестов в проекте нет — `npm run lint` и `npm run build` должны проходить.

## Out of scope

- Drag-and-drop / сортировка цветов в палитре.
- Сохранение recently-used цветов.
- Палитра-пер-роль (например, разные пресеты для admin/user).
- Миграция org `brandColor` (хранится как `string` без enum, ничего не меняем).
