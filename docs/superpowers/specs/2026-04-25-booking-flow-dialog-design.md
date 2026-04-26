# Унифицированная модалка бронирования + success-стейт с конфетти

**Дата:** 2026-04-25
**Контекст:** Слотикс-фронтенд (Next.js 16 / React 19 / shadcn-ui base-nova)

## Цель

Привести флоу бронирования к единому виду во всех режимах календаря (день/неделя/месяц/список) и во всех стратегиях (`org`, `staff`, `client`, публичные и админ-страницы). После успешной брони показывать праздничный финальный экран с деталями, конфетти, ссылкой на «забронировать ещё» и ссылкой на публичную страницу букинга.

## Текущая ситуация (что сломано)

| Вид                        | Поведение сейчас                                                                                                                                                                              |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Календарь (day/week/month) | Клик по слоту → `BookingPanel` в правом сайдбаре показывает `PendingSlot` (детали + кнопка Confirm). Форма ввода клиента — **в том же сайдбаре**. После успеха — `ConfirmedState` в сайдбаре. |
| Список (list)              | Клик по слоту → открывается **`BookingConfirmSheet`** (Sheet-модалка) с формой. После успеха — модалка закрывается, никакого финального экрана нет.                                           |

Проблема: разный UX, разные компоненты, дублирующая логика, и финальное подтверждение либо «прячется» в сайдбаре, либо отсутствует.

## Решение (что делаем)

1. **Сайдбар календаря** становится статичной **инфо-карточкой услуги** (`ServiceInfo` + `StaffInfoCard` где применимо). `PendingSlot` и `ConfirmedState` из сайдбара уходят.
2. Клик по слоту в **любом виде** открывает один и тот же диалог — **`BookingFlowDialog`** (заменяет `BookingConfirmSheet`).
3. `BookingFlowDialog` имеет два внутренних стейта: `'form'` и `'success'`. Переключается локально, наружу торчат только `open`/`onOpenChange` + submit.
4. На `success`-стейте: конфетти из верхней грани диалога, заголовок «Бронь создана!», карточка деталей, кнопки «Забронювати ще» и «Поділитися сторінкою».
5. Флоу применяется **везде** (3a выбор: 5A) — и админ-календарь, и публичные страницы.

### Сценарий «Забронировать ещё»

3b — **полный сброс**: `eventType=null` + `slot=null` в URL. `staffId` сохраняется, если страница привязана к конкретному сотруднику (например `/manage/<orgId>/<staffId>`). Диалог закрывается, пользователь возвращается к выбору услуги/слота на той же странице.

### Сценарий «Поделиться»

3d — кнопка **«Поделиться публичной страницей»** копирует абсолютный URL публички (`${origin}/org/<slug>[/<staffId>]` либо `${origin}/profile/<staffId>`) в буфер обмена + sonner-toast «Скопировано». Никаких ссылок на конкретную бронь (нет `cancelToken`-флоу — сейчас не нужен).

### Конфетти (3C)

`canvas-confetti` (~6 KB, динамический импорт). Эмиттер — точка по центру верхней грани диалога. Частицы вылетают за пределы модалки (нет clip), нет full-screen overlay. Уважает `prefers-reduced-motion: reduce`.

## Архитектура

### Карта изменений

```
components/booking/
  BookingFlowDialog.tsx          ← НОВЫЙ (главный)
    BookingFlowHeader            ← подкомпонент (общий шапник)
    BookingFlowForm              ← подкомпонент (form-стейт, обёртка над ClientInfoForm)
    BookingFlowSuccess           ← подкомпонент (success-стейт)
      BookingSummaryCard         ← подкомпонент (карточка деталей)
      SuccessActions             ← подкомпонент (кнопки)
  ConfettiBurst.tsx              ← НОВЫЙ
  BookingConfirmSheet.tsx        ← УДАЛЯЕТСЯ
  BookingPanel.tsx               ← УДАЛЯЕТСЯ (логика переезжает в стратегии напрямую)
  StaffBookingPanel.tsx          ← УДАЛЯЕТСЯ (если только обёртка над BookingPanel)
  BookingPanelParts.tsx          ← упрощается: остаётся только ServiceInfo + EmptyState;
                                   ConfirmedState и formatLocalTime (если используется) — переезжают в BookingSummaryCard
  ClientInfoForm.tsx             ← без изменений
  SlotListView.tsx               ← BookingConfirmSheet → BookingFlowDialog

lib/calendar/hooks/
  useBookingActions.ts           ← handleConfirmWithClient теперь возвращает Promise<ConfirmedBooking | null>;
                                   confirmedBooking state, setConfirmedBooking, handleCancel — удаляются

lib/calendar/strategies/
  createOrgStrategy.tsx          ← renderPanel: только ServiceInfo + StaffInfoCard;
                                   props confirmedBooking/onCancel/onResetSlot/onConfirmWithClient/formConfig/isSubmitting/bookingError — удаляются
  createStaffStrategy.tsx        ← аналогично
  createClientStrategy.tsx       ← аналогично

lib/booking/
  build-share-url.ts             ← НОВЫЙ — собирает абсолютный публичный URL
  copy-to-clipboard.ts           ← НОВЫЙ — обёртка с фолбэком + toast

app/[locale]/(org)/org/[orgId]/page.tsx          ← рендерит BookingFlowDialog один раз на странице
app/[locale]/(org)/manage/[orgId]/.../page.tsx   ← аналогично
app/[locale]/(personal)/profile/page.tsx          ← аналогично
components/booking/OrgCalendarPage.tsx            ← добавляет state bookingDialogOpen + рендер BookingFlowDialog
(аналогично для PersonalCalendarPage / клиентских страниц)

i18n/messages/{en,uk}.json                       ← добавляются ключи booking.success.*
```

### `BookingFlowDialog` — публичный API

```ts
interface BookingFlowDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void

	// Контекст бронирования
	eventType: EventType | null
	staffName: string | null
	staffAvatar: string | null
	slotTime: string | null
	slotDate: string | null
	slotTimezone: string

	// Форма
	formConfig: MergedBookingForm | null
	isSubmitting: boolean

	// Submit + результат
	onSubmit: (data: ClientInfoData) => Promise<ConfirmedBooking | null>

	// Поведение success
	shareUrl: string // абсолютный публичный URL страницы букинга
	onBookAgain: () => void // полный сброс state выше (eventType + slot)
}
```

Внутри:

- `const [result, setResult] = useState<ConfirmedBooking | null>(null)`
- `result === null` → `<BookingFlowForm />`
- `result !== null` → `<BookingFlowSuccess result={result} ... />`
- `onOpenChange(false)` → `setResult(null)` + проброс наверх (только если `!isSubmitting`)
- `onBookAgain` → `setResult(null)` + `onBookAgain()` проп + закрыть.

### `useBookingActions` — изменения

**До:**

```ts
handleConfirmWithClient: (data, overrides?) => Promise<void>
// + сетит confirmedBooking в state, который рендерится в сайдбаре
```

**После:**

```ts
handleConfirmWithClient: (data, overrides?) => Promise<ConfirmedBooking | null>
// возвращает результат вызывающему (BookingFlowDialog), state confirmedBooking уходит
```

`confirmedBooking`, `setConfirmedBooking`, `handleCancel` (отмена «только что созданной» брони из сайдбара) — **удаляются** из API хука. Отмена подтверждённой брони продолжает работать через `BookingDetailsPanel` (по клику на бронь в календаре, через `handleBookingStatusChange`).

### Стратегии — изменения

`renderPanel()` сильно упрощается. Пример для `createOrgStrategy` — было ~30 строк ветвлений (eventType + staff + slot + confirmedBooking → разные компоненты), станет:

```tsx
renderPanel() {
  if (!selectedEventType) return <EmptyState message={...} />
  return (
    <>
      {selectedStaff && <StaffInfoCard {...selectedStaff} />}
      <ServiceInfo eventType={selectedEventType} />
    </>
  )
}
```

### `build-share-url.ts`

```ts
const isAbsoluteUrl = (s: string): boolean => /^https?:\/\//.test(s)

const buildShareUrl = (input: {
	origin: string
	orgSlug?: string
	staffId?: string
	variant: 'org' | 'staff' | 'personal'
}): string => {
	if (input.variant === 'personal' && input.staffId) {
		return `${input.origin}/profile/${input.staffId}`
	}
	if (input.variant === 'staff' && input.orgSlug && input.staffId) {
		return `${input.origin}/org/${input.orgSlug}/${input.staffId}`
	}
	if (input.variant === 'org' && input.orgSlug) {
		return `${input.origin}/org/${input.orgSlug}`
	}
	return input.origin
}

export { buildShareUrl, isAbsoluteUrl }
```

Вызывается на page-уровне (там есть `org.slug`/`staffId`/`window.location.origin`) и пробрасывается в диалог как готовая строка.

### `copy-to-clipboard.ts`

```ts
const writeWithClipboardApi = async (text: string): Promise<boolean> => {
	if (!navigator.clipboard) return false
	try {
		await navigator.clipboard.writeText(text)
		return true
	} catch {
		return false
	}
}

const writeWithExecCommand = (text: string): boolean => {
	const ta = document.createElement('textarea')
	ta.value = text
	ta.setAttribute('readonly', '')
	ta.style.position = 'absolute'
	ta.style.left = '-9999px'
	document.body.appendChild(ta)
	ta.select()
	const ok = document.execCommand('copy')
	document.body.removeChild(ta)
	return ok
}

const copyToClipboard = async (text: string): Promise<boolean> => {
	const viaApi = await writeWithClipboardApi(text)
	if (viaApi) return true
	return writeWithExecCommand(text)
}

export { copyToClipboard }
```

`BookingFlowSuccess.SuccessActions` зовёт `copyToClipboard(shareUrl)` и показывает toast `success.linkCopied` или `success.copyFailed`.

### `ConfettiBurst.tsx`

```tsx
'use client'

import { useEffect, useRef } from 'react'

const prefersReducedMotion = (): boolean =>
	window.matchMedia('(prefers-reduced-motion: reduce)').matches

const fireBurst = async (origin: { x: number; y: number }) => {
	const confetti = (await import('canvas-confetti')).default
	const fire = (particleRatio: number, opts: object) => {
		confetti({
			origin,
			particleCount: Math.floor(140 * particleRatio),
			...opts,
		})
	}
	fire(0.25, { spread: 26, startVelocity: 55 })
	fire(0.2, { spread: 60 })
	fire(0.35, { spread: 100, decay: 0.91, scalar: 0.9 })
	fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 })
	fire(0.1, { spread: 120, startVelocity: 45 })
}

interface ConfettiBurstProps {
	targetRef: React.RefObject<HTMLElement | null>
}

function ConfettiBurst({ targetRef }: ConfettiBurstProps) {
	const fired = useRef(false)
	useEffect(() => {
		if (fired.current) return
		fired.current = true
		if (prefersReducedMotion()) return
		const el = targetRef.current
		if (!el) return
		const rect = el.getBoundingClientRect()
		const origin = {
			x: (rect.left + rect.width / 2) / window.innerWidth,
			y: rect.top / window.innerHeight,
		}
		fireBurst(origin)
	}, [targetRef])
	return null
}

export { ConfettiBurst }
```

Файл подключается **только** внутри `BookingFlowSuccess`, чтобы пользователь не платил бандлом до успешной брони.

## Data flow

```
1. Клик по слоту     → setBookingDialogOpen(true) + URL: ?eventType=<id>&slot=14:30
2. BookingFlowDialog (form-state)
3. submit            → onSubmit(data) → useBookingActions.handleConfirmWithClient
                       → bookingApi.create(...) → reloadBookings() → return ConfirmedBooking
4. Диалог: setResult(confirmed) → перерисовка в success-state
5. ConfettiBurst один раз на маунте Success
6a. "Забронировать ещё": setResult(null) + onBookAgain() (page-level setParams) → close
6b. "Поделиться": copyToClipboard(shareUrl) → toast (диалог НЕ закрывается)
6c. X / backdrop:    onOpenChange(false) → setResult(null), close
```

## Edge cases

| Кейс                                              | Поведение                                                                                                                                                                      |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Двойной submit                                    | Кнопка `Confirm` отключается через `isSubmitting` (как сейчас в `ClientInfoForm`)                                                                                              |
| Закрытие диалога во время submit                  | `onOpenChange(false)` игнорится пока `isSubmitting === true`; Esc/X disabled                                                                                                   |
| API вернул ошибку                                 | `handleConfirmWithClient` возвращает `null`, `result` остаётся `null`, форма продолжает рендериться, ошибка показывается banner-ом над формой (вместо текущего sidebar-banner) |
| Reduced motion                                    | `ConfettiBurst` не запускает анимацию, success рендерится без эффектов                                                                                                         |
| `canBookForClient === false`                      | `onSelectSlot` уже отсекает кейс — диалог не открывается                                                                                                                       |
| Buffer copy fail (HTTP origin / no clipboard API) | Фолбэк через `document.execCommand('copy')`; если и он fail — toast `success.copyFailed`                                                                                       |
| Загрузка `formConfig` упала                       | Диалог не открывается, ошибка через глобальный `createToastInterceptor` (как сейчас)                                                                                           |
| `bookingError` существует, форма ещё не открыта   | toast (через интерсептор) — banner внутри диалога только для ошибок submit                                                                                                     |

## i18n

Новые ключи под `booking`:

| Ключ                 | EN                            | UK                              |
| -------------------- | ----------------------------- | ------------------------------- |
| `success.title`      | Booking confirmed!            | Бронь створено!                 |
| `success.subtitle`   | We've sent the details to you | Деталі надіслано вам            |
| `success.bookAgain`  | Book again                    | Забронювати ще                  |
| `success.shareLink`  | Share booking page            | Поділитися сторінкою            |
| `success.linkCopied` | Link copied                   | Посилання скопійовано           |
| `success.copyFailed` | Couldn't copy link            | Не вдалося скопіювати посилання |
| `success.client`     | Client                        | Клієнт                          |
| `success.staff`      | Staff                         | Виконавець                      |
| `success.dateTime`   | Date & time                   | Дата і час                      |

Ключи `bookingConfirmed`, `chooseAnotherTime`, `cancel` (контекст «только что созданной брони») удаляются после рефакторинга, если grep не находит их в других местах.

Существующие переиспользуются: `confirmBookingTitle`, `clientInfo`, `clientName`, `enterName`, `confirmBooking`, `creating`, `startTime`, `endTime`, `duration`, `price`, `status`, `min`.

## Зависимости

- `canvas-confetti` (рантайм)
- `@types/canvas-confetti` (dev)

Установка: `npm i canvas-confetti && npm i -D @types/canvas-confetti`.

## Out of scope

- Email/SMS-нотификации клиенту (back-end).
- Ссылка на «свою» бронь по `cancelToken` (3e/3f не выбрали).
- Аналитика-события (`booking_created` и т.п.) — отдельная задача.
- Анимация перехода между form ↔ success стейтами (если нужно — простой `transition-opacity`, но не обязательно).

## Тестирование (ручное)

- [ ] Публичная org-страница: выбрать услугу → клик по слоту → диалог-форма → submit → success + конфетти → «Забронювати ще» → URL чистый, диалог закрылся, услуга сброшена.
- [ ] То же на `/profile/<staffId>` (personal public).
- [ ] Админ `/manage/<orgId>` (canBookForClient=true): тот же флоу, конфетти отыгрывает (вы выбрали 5A).
- [ ] List view: клик по слоту → тот же диалог открывается → success.
- [ ] Day/week/month view: сайдбар показывает только ServiceInfo + StaffInfoCard, никаких pending/confirmed-стейтов.
- [ ] Кнопка «Поделиться»: ссылка копируется, toast.
- [ ] HTTP-only context (если можно воспроизвести): фолбэк execCommand работает.
- [ ] Reduced motion: success без конфетти.
- [ ] Esc / клик по backdrop во время `isSubmitting` — игнорится.
- [ ] Ошибка submit: banner внутри диалога, `result` остаётся null, можно повторить.
