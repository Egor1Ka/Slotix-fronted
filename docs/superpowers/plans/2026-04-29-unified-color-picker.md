# Унифицированный ColorPicker — План реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Заменить 4 разных места выбора цвета (`ServiceDialog`, `PositionDialog`, `CreateOrgDialog`, `BookingStatusesManager`) на единый компонент `<ColorPicker>` с пресетами + нативным `<input type="color">` для произвольного цвета. Параллельно мигрировать booking-statuses с named-цветов (`'blue'`) на hex.

**Architecture:** Один shared компонент `components/ui/color-picker.tsx` (shadcn-конвенция, native `<input type="color">`, без зависимостей). Backend booking-statuses переводится на hex с backward-совместимым validator-ом. Существующие данные мигрируются скриптом против Atlas.

**Tech Stack:** Next.js 16, React 19, Tailwind 4, shadcn/ui, react-hook-form + Controller, lucide-react. Backend: Mongoose, ESM.

**Спека:** [`docs/superpowers/specs/2026-04-29-unified-color-picker-design.md`](../specs/2026-04-29-unified-color-picker-design.md)

**Контекст про тесты:** В проекте автотестов нет (см. `CLAUDE.md`). Верификация = `npm run lint`, `npm run build`, ручная проверка в браузере (`npm run dev`).

**Контекст про коммиты:** Сообщения коммитов на русском (по правилу пользователя). Тщательно указываем файлы в `git add` — в working tree уже есть незакомиченный `components/booking/ServiceInfoSheet.tsx`, его не трогаем.

---

## File Structure Map

**Frontend (Slotix-fronted):**
| Файл | Действие | Назначение |
|------|----------|------------|
| `components/ui/color-picker.tsx` | Create | Универсальный компонент: палитра + native picker |
| `components/services/ServiceDialog.tsx` | Modify | Заменить локальный palette → `<ColorPicker>` |
| `components/positions/PositionDialog.tsx` | Modify | Заменить локальный palette → `<ColorPicker>` |
| `components/organizations/CreateOrgDialog.tsx` | Modify | Заменить palette + удалить text input → `<ColorPicker>` |
| `components/booking-statuses/BookingStatusesManager.tsx` | Modify | Удалить named-color маппинг, использовать `<ColorPicker>` |

**Backend (BackendTemplate):**
| Файл | Действие | Назначение |
|------|----------|------------|
| `src/constants/bookingStatus.js` | Modify | hex-палитра + LEGACY_NAMED_COLORS + DEFAULT_STATUSES на hex |
| `src/models/BookingStatus.js` | Modify | Permissive validator (hex или legacy named) |
| `src/scripts/migrateStatusColorsToHex.js` | Create | Идемпотентный скрипт миграции existing записей |

---

## Task 1: Создать `<ColorPicker>` компонент

**Files:**
- Create: `components/ui/color-picker.tsx`

- [ ] **Step 1: Создать файл с полным содержимым**

```tsx
'use client'

import { useId } from 'react'
import { Pipette } from 'lucide-react'
import { cn } from '@/lib/utils'

const DEFAULT_COLOR_PALETTE = [
	'#8B5CF6',
	'#06B6D4',
	'#F59E0B',
	'#EF4444',
	'#10B981',
	'#3B82F6',
	'#EC4899',
	'#F97316',
] as const

const SIZE_CLASS = {
	sm: 'size-6',
	md: 'size-7',
} as const

const ICON_SIZE_CLASS = {
	sm: 'size-3.5',
	md: 'size-4',
} as const

interface ColorPickerProps {
	value: string
	onChange: (color: string) => void
	presets?: readonly string[]
	size?: 'sm' | 'md'
	className?: string
	disabled?: boolean
	id?: string
}

function ColorPicker({
	value,
	onChange,
	presets = DEFAULT_COLOR_PALETTE,
	size = 'md',
	className,
	disabled,
	id,
}: ColorPickerProps) {
	const fallbackId = useId()
	const inputId = id ?? fallbackId
	const hasValue = !!value
	const isCustom = hasValue && !presets.includes(value)

	const selectPreset = (color: string) => () => onChange(color)
	const isSelected = (color: string) => color === value

	const handlePickerInput = (event: React.ChangeEvent<HTMLInputElement>) =>
		onChange(event.target.value.toUpperCase())

	const renderPreset = (color: string) => (
		<button
			key={color}
			type="button"
			aria-label={color}
			disabled={disabled}
			onClick={selectPreset(color)}
			className={cn(
				SIZE_CLASS[size],
				'rounded-full border-2 transition-transform',
				isSelected(color)
					? 'border-foreground scale-110'
					: 'border-transparent hover:border-gray-400',
				disabled && 'cursor-not-allowed opacity-50',
			)}
			style={{ backgroundColor: color }}
		/>
	)

	const renderCustomSwatch = () => (
		<span
			aria-label={value}
			className={cn(
				SIZE_CLASS[size],
				'rounded-full border-2 border-foreground scale-110',
			)}
			style={{ backgroundColor: value }}
		/>
	)

	return (
		<div
			data-slot="color-picker"
			className={cn('flex flex-wrap items-center gap-2', className)}
		>
			{presets.map(renderPreset)}

			{isCustom && renderCustomSwatch()}

			<label
				htmlFor={inputId}
				aria-label="Pick custom color"
				className={cn(
					SIZE_CLASS[size],
					'flex items-center justify-center rounded-full',
					'border border-dashed border-border',
					'hover:border-foreground transition-colors cursor-pointer',
					disabled && 'pointer-events-none cursor-not-allowed opacity-50',
				)}
			>
				<Pipette
					className={cn(ICON_SIZE_CLASS[size], 'text-muted-foreground')}
				/>
				<input
					id={inputId}
					type="color"
					value={isCustom ? value : presets[0]}
					onInput={handlePickerInput}
					disabled={disabled}
					className="sr-only"
				/>
			</label>
		</div>
	)
}

export { ColorPicker, DEFAULT_COLOR_PALETTE }
```

- [ ] **Step 2: Проверить lint**

```bash
npm run lint
```
Expected: PASS без warnings.

- [ ] **Step 3: Проверить, что Next собирается**

```bash
npm run build
```
Expected: SUCCESS. Если падает — фиксим типы и пересобираем.

- [ ] **Step 4: Коммит**

```bash
git add components/ui/color-picker.tsx
git commit -m "feat(ui): добавить унифицированный ColorPicker компонент"
```

---

## Task 2: Интеграция `<ColorPicker>` в `ServiceDialog`

**Files:**
- Modify: `components/services/ServiceDialog.tsx`

- [ ] **Step 1: Удалить локальный `PALETTE`**

В файле `components/services/ServiceDialog.tsx` найти и удалить блок:
```tsx
const PALETTE = [
	'#8B5CF6',
	'#06B6D4',
	'#F59E0B',
	'#EF4444',
	'#10B981',
	'#3B82F6',
	'#EC4899',
	'#F97316',
]
```

- [ ] **Step 2: Удалить `selectedColor` watch (если используется только для рендера палитры)**

Найти строку `const selectedColor = watch('color')` и удалить, если она больше нигде не используется (после удаления `isColorSelected`).

- [ ] **Step 3: Удалить хелперы выбора цвета**

Удалить блок:
```tsx
// ── Color helpers ──

const selectColor = (color: string) => () => {
	setValue('color', color, { shouldValidate: true })
}

const isColorSelected = (color: string) => color === selectedColor

const renderColorOption = (color: string) => (
	<button
		key={color}
		type="button"
		className={`size-7 rounded-full border-2 transition-transform ${
			isColorSelected(color)
				? 'border-foreground scale-110'
				: 'border-transparent hover:border-gray-400'
		}`}
		style={{ backgroundColor: color }}
		onClick={selectColor(color)}
	/>
)
```

- [ ] **Step 4: Добавить импорт `ColorPicker` и `Controller`**

В блоке импортов добавить:
```tsx
import { ColorPicker } from '@/components/ui/color-picker'
```
Убедиться, что `Controller` уже импортирован из `react-hook-form` (если нет — добавить).

- [ ] **Step 5: Заменить разметку Field блока цвета**

Найти блок:
```tsx
<Field data-invalid={!!errors.color || undefined}>
	<FieldLabel>{t('color')}</FieldLabel>
	<div className="flex flex-wrap gap-2">
		{PALETTE.map(renderColorOption)}
	</div>
	<FieldError errors={[errors.color]} />
</Field>
```

Заменить на:
```tsx
<Field data-invalid={!!errors.color || undefined}>
	<FieldLabel>{t('color')}</FieldLabel>
	<Controller
		control={control}
		name="color"
		render={({ field }) => (
			<ColorPicker value={field.value} onChange={field.onChange} />
		)}
	/>
	<FieldError errors={[errors.color]} />
</Field>
```

- [ ] **Step 6: Проверить lint и build**

```bash
npm run lint && npm run build
```
Expected: оба проходят.

- [ ] **Step 7: Ручная проверка**

```bash
npm run dev
```
- Открыть форму создания/редактирования услуги.
- Кликнуть по разным пресетам — выделение должно меняться.
- Кликнуть по иконке Pipette → должен открыться системный picker.
- Выбрать произвольный цвет → должен появиться 9-й (custom) swatch с этим цветом.
- Сохранить услугу → цвет должен сохраниться корректно.

- [ ] **Step 8: Коммит**

```bash
git add components/services/ServiceDialog.tsx
git commit -m "refactor(services): использовать унифицированный ColorPicker"
```

---

## Task 3: Интеграция `<ColorPicker>` в `PositionDialog`

**Files:**
- Modify: `components/positions/PositionDialog.tsx`

- [ ] **Step 1: Удалить локальный `PALETTE`**

В файле `components/positions/PositionDialog.tsx` найти и удалить:
```tsx
const PALETTE = [
	'#8B5CF6',
	'#06B6D4',
	'#F59E0B',
	'#EF4444',
	'#10B981',
	'#3B82F6',
	'#EC4899',
	'#F97316',
]
```

- [ ] **Step 2: Удалить `selectedColor` watch**

Удалить `const selectedColor = watch('color')` (если используется только для палитры).

- [ ] **Step 3: Удалить хелперы выбора**

Удалить:
```tsx
const selectColor = (color: string) => () => {
	setValue('color', color, { shouldValidate: true })
}

const isSelected = (color: string) => color === selectedColor

const renderColorOption = (color: string) => (
	<button
		key={color}
		type="button"
		className={`size-7 rounded-full border-2 transition-transform ${
			isSelected(color)
				? 'border-foreground scale-110'
				: 'border-transparent hover:border-gray-400'
		}`}
		style={{ backgroundColor: color }}
		onClick={selectColor(color)}
	/>
)
```

- [ ] **Step 4: Заменить `defaultValues.color` и `reset` на `DEFAULT_COLOR_PALETTE`**

В импортах добавить:
```tsx
import { ColorPicker, DEFAULT_COLOR_PALETTE } from '@/components/ui/color-picker'
```

Если `Controller` ещё не импортирован — добавить из `react-hook-form`.

В `useForm`:
```tsx
defaultValues: {
	name: '',
	level: 0,
	color: DEFAULT_COLOR_PALETTE[0],
},
```

В `useEffect` блоке `reset`:
```tsx
reset({
	name: position?.name ?? '',
	level: position?.level ?? 0,
	color: position?.color ?? DEFAULT_COLOR_PALETTE[0],
})
```

- [ ] **Step 5: Заменить разметку Field блока цвета**

Найти:
```tsx
<Field data-invalid={!!errors.color || undefined}>
	<FieldLabel>{t('color')}</FieldLabel>
	<div className="flex flex-wrap gap-2">
		{PALETTE.map(renderColorOption)}
	</div>
	<FieldError errors={[errors.color]} />
</Field>
```

Заменить на:
```tsx
<Field data-invalid={!!errors.color || undefined}>
	<FieldLabel>{t('color')}</FieldLabel>
	<Controller
		control={control}
		name="color"
		render={({ field }) => (
			<ColorPicker value={field.value} onChange={field.onChange} />
		)}
	/>
	<FieldError errors={[errors.color]} />
</Field>
```

- [ ] **Step 6: Удалить неиспользуемые `setValue`/`watch` если больше не нужны**

После замены `setValue` и `watch` могут стать неиспользуемыми в этом компоненте (они применялись только для color). Проверить и удалить из деструктуризации `useForm()` если нужно.

- [ ] **Step 7: lint + build**

```bash
npm run lint && npm run build
```

- [ ] **Step 8: Ручная проверка**

`npm run dev` → форма создания/редактирования должности → проверить выбор пресета и кастомного цвета, сохранение.

- [ ] **Step 9: Коммит**

```bash
git add components/positions/PositionDialog.tsx
git commit -m "refactor(positions): использовать унифицированный ColorPicker"
```

---

## Task 4: Интеграция `<ColorPicker>` в `CreateOrgDialog`

**Files:**
- Modify: `components/organizations/CreateOrgDialog.tsx`

- [ ] **Step 1: Удалить `PRESET_COLORS`**

Найти и удалить:
```tsx
const PRESET_COLORS = [
	'#1a1a2e',
	'#16213e',
	'#0f3460',
	'#533483',
	'#e94560',
	'#ff6b6b',
	'#feca57',
	'#48dbfb',
	'#0abde3',
	'#10ac84',
	'#01a3a4',
	'#2d3436',
]
```

- [ ] **Step 2: Удалить хелперы выбора**

Удалить:
```tsx
const selectPresetColor = (color: string) => () => {
	setValue('brandColor', color)
}

const renderColorOption = (color: string) => (
	<button
		key={color}
		type="button"
		className="size-6 rounded-full border-2 border-transparent hover:border-gray-400"
		style={{ backgroundColor: color }}
		onClick={selectPresetColor(color)}
	/>
)
```

- [ ] **Step 3: Добавить импорт `ColorPicker`**

```tsx
import { ColorPicker } from '@/components/ui/color-picker'
```

`Controller` уже импортирован в этом файле — ничего не делать.

- [ ] **Step 4: Заменить разметку Field блока brandColor**

Найти блок:
```tsx
<Field data-invalid={!!errors.brandColor || undefined}>
	<FieldLabel htmlFor="brandColor">
		{t('form.brandColor')}
	</FieldLabel>
	<div className="mb-2 flex flex-wrap gap-2">
		{PRESET_COLORS.map(renderColorOption)}
	</div>
	<Input
		id="brandColor"
		placeholder="#1a1a2e"
		{...register('brandColor')}
	/>
	<FieldError errors={[errors.brandColor]} />
</Field>
```

Заменить на:
```tsx
<Field data-invalid={!!errors.brandColor || undefined}>
	<FieldLabel htmlFor="brandColor">{t('form.brandColor')}</FieldLabel>
	<Controller
		control={control}
		name="brandColor"
		render={({ field }) => (
			<ColorPicker
				id="brandColor"
				value={field.value ?? ''}
				onChange={field.onChange}
			/>
		)}
	/>
	<FieldError errors={[errors.brandColor]} />
</Field>
```

- [ ] **Step 5: Удалить неиспользуемый `setValue`**

После замены `setValue` больше не используется в компоненте — убрать из деструктуризации `useForm()`.

- [ ] **Step 6: lint + build**

```bash
npm run lint && npm run build
```

- [ ] **Step 7: Ручная проверка**

`npm run dev` → диалог создания организации → проверить выбор пресета, кастомного цвета через picker, сохранение.

Внимание: brandColor — `optional`, по умолчанию `undefined`. ColorPicker получит пустую строку → ни один пресет не подсвечен. Это корректное поведение для "цвет не выбран".

- [ ] **Step 8: Коммит**

```bash
git add components/organizations/CreateOrgDialog.tsx
git commit -m "refactor(organizations): использовать унифицированный ColorPicker"
```

---

## Task 5: Backend — обновить `bookingStatus` константы

**Files:**
- Modify: `/Users/egorzozula/Desktop/BackendTemplate/src/constants/bookingStatus.js`

- [ ] **Step 1: Заменить файл целиком**

Текущее содержимое заменить на:
```js
const BOOKING_STATUS_ACTIONS = {
  HIDE_FROM_SCHEDULE: "hideFromSchedule",
};

const VALID_ACTIONS = Object.values(BOOKING_STATUS_ACTIONS);

const STATUS_COLORS = [
  "#8B5CF6",
  "#06B6D4",
  "#F59E0B",
  "#EF4444",
  "#10B981",
  "#3B82F6",
  "#EC4899",
  "#F97316",
];

// Старые именованные цвета — оставлены для backward-совместимости с
// клиентами, у которых ещё не обновился фронт. Удалить через 2-4 недели
// после раскатки нового фронта (см. spec).
const LEGACY_NAMED_COLORS = [
  "blue",
  "green",
  "red",
  "yellow",
  "purple",
  "orange",
  "gray",
  "teal",
];

const DEFAULT_STATUSES = [
  {
    label: "status_unconfirmed",
    color: "#F59E0B",
    actions: [],
    isDefault: true,
    order: 0,
  },
  {
    label: "status_confirmed",
    color: "#3B82F6",
    actions: [],
    isDefault: true,
    order: 1,
  },
  {
    label: "status_paid",
    color: "#10B981",
    actions: [],
    isDefault: true,
    order: 2,
  },
  {
    label: "status_cancelled",
    color: "#EF4444",
    actions: [BOOKING_STATUS_ACTIONS.HIDE_FROM_SCHEDULE],
    isDefault: true,
    order: 3,
  },
];

export {
  BOOKING_STATUS_ACTIONS,
  VALID_ACTIONS,
  STATUS_COLORS,
  LEGACY_NAMED_COLORS,
  DEFAULT_STATUSES,
};
```

- [ ] **Step 2: Коммит (в репозитории BackendTemplate)**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
git add src/constants/bookingStatus.js
git commit -m "feat(bookingStatus): hex-палитра + LEGACY_NAMED_COLORS для совместимости"
```

---

## Task 6: Backend — заменить enum-validator на permissive

**Files:**
- Modify: `/Users/egorzozula/Desktop/BackendTemplate/src/models/BookingStatus.js`

- [ ] **Step 1: Обновить импорт и схему**

Найти текущее содержимое:
```js
import { VALID_ACTIONS, STATUS_COLORS } from "../constants/bookingStatus.js";
```

Заменить на:
```js
import { VALID_ACTIONS, LEGACY_NAMED_COLORS } from "../constants/bookingStatus.js";

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;
const isValidColor = (value) =>
  HEX_COLOR_REGEX.test(value) || LEGACY_NAMED_COLORS.includes(value);
```

Найти определение `color` в схеме:
```js
color: {
  type: String,
  enum: STATUS_COLORS,
  required: true,
},
```

Заменить на:
```js
color: {
  type: String,
  required: true,
  validate: {
    validator: isValidColor,
    message: "Color must be hex (#RRGGBB) or a legacy named color",
  },
},
```

- [ ] **Step 2: Коммит**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
git add src/models/BookingStatus.js
git commit -m "feat(bookingStatus): принимать hex и legacy именованные цвета"
```

---

## Task 7: Backend — миграционный скрипт

**Files:**
- Create: `/Users/egorzozula/Desktop/BackendTemplate/src/scripts/migrateStatusColorsToHex.js`

- [ ] **Step 1: Создать файл**

```js
// src/scripts/migrateStatusColorsToHex.js
//
// Идемпотентный скрипт миграции:
// - Конвертирует существующие BookingStatus.color из именованных
//   ('blue', 'green', ...) в hex.
// - Уже-hex значения автоматически пропускаются (не попадают в $in).
//
// Запуск:
//   DB_URL="mongodb+srv://..." node src/scripts/migrateStatusColorsToHex.js

import mongoose from "mongoose";
import BookingStatus from "../models/BookingStatus.js";

const NAMED_TO_HEX = {
  blue: "#3B82F6",
  green: "#10B981",
  red: "#EF4444",
  yellow: "#F59E0B",
  purple: "#8B5CF6",
  orange: "#F97316",
  gray: "#94A3B8",
  teal: "#06B6D4",
};

const DB_URL = process.env.DB_URL || "mongodb://localhost:27017/myDatabase";

const run = async () => {
  await mongoose.connect(DB_URL);
  console.log("Connected to MongoDB");

  const namedKeys = Object.keys(NAMED_TO_HEX);
  const docs = await BookingStatus.find({ color: { $in: namedKeys } }).select("_id color");

  console.log(`Found ${docs.length} statuses with named colors`);

  let updated = 0;
  for (const doc of docs) {
    const hex = NAMED_TO_HEX[doc.color];
    if (!hex) {
      console.log(`  Skip ${doc._id}: unknown color "${doc.color}"`);
      continue;
    }
    await BookingStatus.updateOne(
      { _id: doc._id },
      { $set: { color: hex } },
    );
    updated++;
  }

  const remainingNamed = await BookingStatus.countDocuments({
    color: { $in: namedKeys },
  });
  const totalHex = await BookingStatus.countDocuments({
    color: { $regex: /^#[0-9a-fA-F]{6}$/ },
  });
  const totalAll = await BookingStatus.countDocuments({});

  console.log(`Updated: ${updated}`);
  console.log(`Remaining named: ${remainingNamed}`);
  console.log(`Hex total: ${totalHex}`);
  console.log(`All statuses: ${totalAll}`);

  await mongoose.disconnect();
  console.log("Migration complete");
};

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
```

- [ ] **Step 2: Локальный smoke-тест на dev DB**

Сначала запустить против локального dev MongoDB (если есть), убедиться что не падает:
```bash
cd /Users/egorzozula/Desktop/BackendTemplate
DB_URL="mongodb://localhost:27017/myDatabase" node src/scripts/migrateStatusColorsToHex.js
```
Expected: `Migration complete` и нули в `Remaining named`.

- [ ] **Step 3: Повторный прогон (проверка идемпотентности)**

```bash
DB_URL="mongodb://localhost:27017/myDatabase" node src/scripts/migrateStatusColorsToHex.js
```
Expected: `Found 0 statuses with named colors`. Если не 0 — есть баг.

- [ ] **Step 4: Коммит**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
git add src/scripts/migrateStatusColorsToHex.js
git commit -m "feat(scripts): миграция booking status цветов с named на hex"
```

⚠ **На production Atlas скрипт запускается отдельно после деплоя backend (Task 5+6) и до деплоя frontend (Task 8). См. секцию «Production rollout» ниже.**

---

## Task 8: Frontend — интеграция `<ColorPicker>` в `BookingStatusesManager`

**Files:**
- Modify: `components/booking-statuses/BookingStatusesManager.tsx`

- [ ] **Step 1: Удалить `STATUS_COLORS` и `COLOR_CLASS`**

Найти и удалить:
```tsx
const STATUS_COLORS = [
	'blue',
	'green',
	'red',
	'yellow',
	'purple',
	'orange',
	'gray',
	'teal',
]

const COLOR_CLASS: Record<string, string> = {
	blue: 'bg-blue-500',
	green: 'bg-green-500',
	red: 'bg-red-500',
	yellow: 'bg-yellow-400',
	purple: 'bg-purple-500',
	orange: 'bg-orange-500',
	gray: 'bg-gray-400',
	teal: 'bg-teal-500',
}
```

- [ ] **Step 2: Добавить импорт ColorPicker**

```tsx
import { ColorPicker, DEFAULT_COLOR_PALETTE } from '@/components/ui/color-picker'
```

- [ ] **Step 3: Обновить `DEFAULT_FORM`**

Найти:
```tsx
const DEFAULT_FORM: StatusFormState = {
	label: '',
	color: 'blue',
	actions: [],
}
```

Заменить на:
```tsx
const DEFAULT_FORM: StatusFormState = {
	label: '',
	color: DEFAULT_COLOR_PALETTE[5], // '#3B82F6' (blue equivalent)
	actions: [],
}
```

- [ ] **Step 4: Переписать `ColorDot`**

Найти:
```tsx
function ColorDot({
	color,
	size = 'md',
}: {
	color: string
	size?: 'sm' | 'md'
}) {
	return (
		<span
			className={cn(
				'shrink-0 rounded-full',
				COLOR_CLASS[color] ?? 'bg-gray-400',
				size === 'sm' ? 'size-2.5' : 'size-3.5',
			)}
		/>
	)
}
```

Заменить на:
```tsx
function ColorDot({
	color,
	size = 'md',
}: {
	color: string
	size?: 'sm' | 'md'
}) {
	return (
		<span
			className={cn(
				'shrink-0 rounded-full',
				size === 'sm' ? 'size-2.5' : 'size-3.5',
			)}
			style={{ backgroundColor: color }}
		/>
	)
}
```

- [ ] **Step 5: Заменить ряд кнопок цвета на `<ColorPicker>`**

Найти блок (строки ~337-354 в текущей версии файла):
```tsx
<div className="space-y-1.5">
	<label className="text-sm font-medium">{t('statusColor')}</label>
	<div className="flex flex-wrap gap-2">
		{STATUS_COLORS.map((color) => (
			<button
				key={color}
				type="button"
				onClick={handleColorSelect(color)}
				className={cn(
					'size-7 rounded-full transition-transform hover:scale-110',
					COLOR_CLASS[color] ?? 'bg-gray-400',
					form.color === color &&
						'ring-foreground ring-2 ring-offset-2',
				)}
			/>
		))}
	</div>
</div>
```

Заменить на:
```tsx
<div className="space-y-1.5">
	<label className="text-sm font-medium">{t('statusColor')}</label>
	<ColorPicker
		value={form.color}
		onChange={handleStatusColorChange}
	/>
</div>
```

- [ ] **Step 6: Заменить `handleColorSelect` на `handleStatusColorChange`**

Найти и удалить старый handler (он принимал `color` и возвращал замыкание):
```tsx
const handleColorSelect = (color: string) => () => {
	setForm((prev) => ({ ...prev, color }))
}
```

Добавить новый handler рядом с другими формами setForm-логики:
```tsx
const handleStatusColorChange = (color: string) =>
	setForm((prev) => ({ ...prev, color }))
```

(Если в файле уже есть `handleLabelChange` или подобные — добавить рядом, чтобы стиль совпадал.)

- [ ] **Step 7: lint + build**

```bash
npm run lint && npm run build
```

- [ ] **Step 8: Ручная проверка**

```bash
npm run dev
```
Открыть страницу статусов брони:
- Создать новый статус, выбрать пресет → сохранить → увидеть `ColorDot` правильного цвета в списке.
- Создать новый статус, выбрать кастомный цвет через picker → сохранить → увидеть кастомный цвет.
- Открыть существующий статус (если есть данные) → цвет должен корректно отображаться в picker (выделен соответствующий пресет или показан custom swatch).

⚠ **Без миграции backend этот шаг пока не работает на серверном уровне** — frontend начнёт слать hex, а старый backend с `enum: STATUS_COLORS` (named) отвергнет. Поэтому на dev/prod бекенд обновить ДО раскатки этого изменения. См. «Production rollout» ниже.

- [ ] **Step 9: Коммит**

```bash
git add components/booking-statuses/BookingStatusesManager.tsx
git commit -m "refactor(booking-statuses): использовать ColorPicker и hex-цвета"
```

---

## Task 9: Production rollout (operational, не code)

Это **operational checklist**, а не код. Выполняется после слияния в main.

- [ ] **Step 1: Атlas snapshot**

В Atlas UI:
- Кластер → Backup → Snapshot Now (если M10+).
- Если free tier — `mongodump --uri="$DB_URL" --archive=backup-$(date +%Y%m%d-%H%M%S).gz --gzip`.

- [ ] **Step 2: Деплой backend (Tasks 5, 6, 7) на staging**

Раскатить backend с обновлёнными константами + permissive validator + миграционным скриптом. Перезапустить сервис.

- [ ] **Step 3: Прогнать миграцию на staging**

```bash
DB_URL="<staging-atlas-uri>" node src/scripts/migrateStatusColorsToHex.js
```
Проверить логи: `Remaining named: 0`, `Hex total` ≈ `All statuses` (минус возможный мусор).

- [ ] **Step 4: Деплой frontend на staging**

Раскатить новый фронт. Проверить:
- Создание статуса со стандартным цветом → ok.
- Создание со кастомным → ok.
- Существующие статусы отображаются с правильными цветами (миграция сработала).

- [ ] **Step 5: Повторить шаги 1-4 на production**

В том же порядке, последовательно. Между шагами 2 и 4 проверить что старый кэшированный фронт у пользователей продолжает работать (он шлёт named — backend принимает).

- [ ] **Step 6: (Опционально, через 1-4 недели) — упрощение**

После убеждения что named-цвета не приходят:
1. В `src/models/BookingStatus.js` — убрать `LEGACY_NAMED_COLORS` из validator, оставить только `HEX_COLOR_REGEX.test(value)`.
2. В `src/constants/bookingStatus.js` — удалить `LEGACY_NAMED_COLORS` и его экспорт.

```bash
git commit -m "chore(bookingStatus): удалить legacy named colors после миграции"
```

---

## Self-Review Checklist

Заполнено перед завершением плана:

**Spec coverage:**
- [x] Унифицированный компонент → Task 1
- [x] Интеграция в services → Task 2
- [x] Интеграция в positions → Task 3
- [x] Интеграция в organizations + удаление text input → Task 4
- [x] Backend hex-палитра → Task 5
- [x] Backend backward-совместимый validator → Task 6
- [x] Миграционный скрипт → Task 7
- [x] Интеграция в booking-statuses → Task 8
- [x] Production rollout (Atlas, без даунтайма) → Task 9

**Placeholder scan:** проверено, отсутствуют TBD/TODO/«handle edge cases».

**Type consistency:** `value: string`, `onChange: (color: string) => void`, `presets: readonly string[]`, имя `DEFAULT_COLOR_PALETTE` — одинаково везде. Backend `BookingStatus.color` остаётся `String` без enum, `LEGACY_NAMED_COLORS` экспорт корректно импортируется в `BookingStatus.js`.
