# Calendar Overlap Detection Design

**Date:** 2026-03-30
**Status:** Approved

## Problem

В админском календаре события, которые пересекаются по времени, рендерятся друг поверх друга (полная ширина, absolute positioning). Админ не видит все букинги — нужно, чтобы пересекающиеся события становились рядом (делили ширину поровну с зазором).

## Decision

Подход 1 — чистая утилита `resolveOverlaps()` в `utils.ts`. CalendarCore использует два дополнительных поля (`column`, `totalColumns`) для позиционирования.

## Scope

- **Затрагиваемые файлы:** `lib/calendar/types.ts`, `lib/calendar/utils.ts`, `lib/calendar/CalendarCore.tsx`
- **Не затрагиваем:** стратегии, хуки, view-config
- **Views:** day view + week view (month view — только точки, не нужно)
- **Block types:** только `booking` блоки участвуют в overlap detection

## Design

### 1. Новые поля в `CalendarBlock` (`types.ts`)

```ts
column?: number       // индекс колонки (0, 1, 2...)
totalColumns?: number // общее количество колонок в группе
```

Опциональные — если не заданы, блок рендерится на полную ширину (обратная совместимость).

### 2. Утилита `resolveOverlaps()` (`utils.ts`)

Чистая функция: `(blocks: CalendarBlock[]) => CalendarBlock[]`

**Алгоритм:**

1. Отделяем `booking` блоки от остальных
2. Сортируем booking блоки по `startMin`, затем по `duration` (длинные первыми)
3. Находим группы пересечений (connected components):
   - Два блока пересекаются если `blockA.startMin < blockB.startMin + blockB.duration && blockB.startMin < blockA.startMin + blockA.duration`
4. Внутри группы назначаем колонки жадным алгоритмом — каждому блоку первая свободная колонка
5. Проставляем `column` и `totalColumns` для каждого booking блока
6. Возвращаем полный массив (booking с разметкой + остальные без изменений)

### 3. Изменения в `CalendarCore.tsx`

#### Где вызывать

В `renderDayView()` и `renderWeekView()` — вызов `resolveOverlaps(blocks)` для блоков каждого дня, перед рендером.

#### Day view positioning

Сейчас: `absolute right-0 left-12` (48px отступ под таймлайн).

С overlap:

- `width`: `calc((100% - 48px - ${gap}) / ${totalColumns})` — где gap = `(totalColumns - 1) * 2px`
- `left`: `calc(48px + ${column} * ((100% - 48px) / ${totalColumns}))`
- Без overlap (totalColumns undefined): оставляем как было — `left-12 right-0`

#### Week view positioning

Сейчас: `absolute inset-x-0.5` (2px с каждой стороны = 4px).

С overlap:

- `width`: `calc((100% - 4px) / ${totalColumns} - 1px)` — 1px зазор
- `left`: `calc(2px + ${column} * (100% - 4px) / ${totalColumns})`
- Без overlap: оставляем `inset-x-0.5`

#### Зазор между колонками

1-2px между соседними событиями — достигается уменьшением width на 1-2px.

### 4. Пример

3 букинга в 09:00-10:00, 09:30-11:00, 10:00-11:30:

- Группа: все 3 пересекаются (connected component)
- Колонки: block1 → 0, block2 → 1, block3 → 2
- totalColumns: 3
- Каждый получает 1/3 ширины

2 букинга в 09:00-10:00 и 14:00-15:00:

- Разные группы (не пересекаются)
- Каждый → column: 0, totalColumns: 1 (полная ширина)
