# Booking Flow Dialog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Унифицировать флоу бронирования (модалка-форма + success-стейт с конфетти и ссылками) во всех видах календаря и стратегиях.

**Architecture:** Один компонент `BookingFlowDialog` (Sheet справа) с двумя внутренними стейтами `'form' | 'success'`. Сайдбар календаря становится статичной инфо-карточкой услуги. `useBookingActions.handleConfirmWithClient` возвращает `ConfirmedBooking`; диалог локально хранит результат и переключается в success-стейт. Конфетти через динамически загружаемый `canvas-confetti`. Поделиться-ссылка собирается на page-уровне.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, shadcn-ui (`base-nova`), `@base-ui/react/dialog`, `react-hook-form`+`zod`, `next-intl`, `sonner`, `canvas-confetti`.

**Spec:** `docs/superpowers/specs/2026-04-25-booking-flow-dialog-design.md`

---

## File Structure

| Путь                                                | Действие  | Ответственность                                                                |
| --------------------------------------------------- | --------- | ------------------------------------------------------------------------------ |
| `lib/booking/copy-to-clipboard.ts`                  | Create    | Копирование строки в буфер с фолбэком                                           |
| `lib/booking/build-share-url.ts`                    | Create    | Сборка абсолютного публичного URL для «поделиться»                              |
| `components/booking/ConfettiBurst.tsx`              | Create    | Однократный салют конфетти из верхней грани диалога                              |
| `components/booking/BookingFlowDialog.tsx`          | Create    | Главный диалог — два стейта (`form`/`success`) + все подкомпоненты внутри файла |
| `components/booking/BookingConfirmSheet.tsx`        | Delete    | Заменён `BookingFlowDialog`                                                     |
| `components/booking/BookingPanel.tsx`               | Delete    | Логика переехала в стратегии (только `ServiceInfo` остаётся)                    |
| `components/booking/StaffBookingPanel.tsx`          | Delete    | То же                                                                           |
| `components/booking/BookingPanelParts.tsx`          | Modify    | Убрать `ConfirmedState` и `formatLocalTime` (если не нужны)                     |
| `components/booking/SlotListView.tsx`               | Modify    | `BookingConfirmSheet` → `BookingFlowDialog` + новые пропсы                      |
| `components/booking/OrgCalendarPage.tsx`            | Modify    | Рендерит `BookingFlowDialog` на page-уровне для календарных видов               |
| `app/[locale]/book/[staffSlug]/BookingPage.tsx`     | Modify    | То же для personal/staff публичных страниц                                      |
| `lib/calendar/hooks/useBookingActions.ts`           | Modify    | `handleConfirmWithClient` возвращает `ConfirmedBooking \| null`; удалить state  |
| `lib/calendar/strategies/createOrgStrategy.tsx`     | Modify    | `renderPanel` — только `ServiceInfo`+`StaffInfoCard`; убрать ненужные пропсы    |
| `lib/calendar/strategies/createStaffStrategy.tsx`   | Modify    | То же                                                                           |
| `lib/calendar/strategies/createClientStrategy.tsx`  | Modify    | То же                                                                           |
| `i18n/messages/en.json`, `i18n/messages/uk.json`    | Modify    | Добавить ключи `booking.success.*`                                              |
| `package.json`                                      | Modify    | Добавить `canvas-confetti` + `@types/canvas-confetti`                            |

---

## Task 1: Установить `canvas-confetti`

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Установить пакет и типы**

```bash
npm install canvas-confetti
npm install -D @types/canvas-confetti
```

- [ ] **Step 2: Проверить, что пакеты добавлены в package.json**

```bash
grep -E '"(canvas-confetti|@types/canvas-confetti)"' package.json
```

Expected: две строки с версиями.

- [ ] **Step 3: Проверить, что lint и build не сломались (без новых файлов)**

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(booking): add canvas-confetti dependency"
```

---

## Task 2: Добавить i18n-ключи `booking.success.*`

**Files:**
- Modify: `i18n/messages/en.json` (внутри блока `"booking": { ... }`)
- Modify: `i18n/messages/uk.json` (внутри блока `"booking": { ... }`)

- [ ] **Step 1: Добавить ключи в `en.json`**

Найти в `i18n/messages/en.json` строку `"booking": {` и добавить **внутрь блока** после существующих ключей (перед закрывающей `}`):

```json
"success": {
	"title": "Booking confirmed!",
	"subtitle": "We've sent the details to you",
	"bookAgain": "Book again",
	"shareLink": "Share booking page",
	"linkCopied": "Link copied",
	"copyFailed": "Couldn't copy link",
	"client": "Client",
	"staff": "Staff",
	"dateTime": "Date & time"
}
```

- [ ] **Step 2: Добавить ключи в `uk.json`** (тот же блок `"booking"`)

```json
"success": {
	"title": "Бронь створено!",
	"subtitle": "Деталі надіслано вам",
	"bookAgain": "Забронювати ще",
	"shareLink": "Поділитися сторінкою",
	"linkCopied": "Посилання скопійовано",
	"copyFailed": "Не вдалося скопіювати посилання",
	"client": "Клієнт",
	"staff": "Виконавець",
	"dateTime": "Дата і час"
}
```

- [ ] **Step 3: Проверить валидность JSON**

```bash
node -e "JSON.parse(require('fs').readFileSync('i18n/messages/en.json', 'utf8'))"
node -e "JSON.parse(require('fs').readFileSync('i18n/messages/uk.json', 'utf8'))"
```

Expected: оба без вывода (успех).

- [ ] **Step 4: Commit**

```bash
git add i18n/messages/en.json i18n/messages/uk.json
git commit -m "feat(i18n): додано ключі booking.success.*"
```

---

## Task 3: Создать `lib/booking/copy-to-clipboard.ts`

**Files:**
- Create: `lib/booking/copy-to-clipboard.ts`

- [ ] **Step 1: Создать файл**

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

- [ ] **Step 2: Lint**

```bash
npm run lint -- --max-warnings=0
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/booking/copy-to-clipboard.ts
git commit -m "feat(booking): додано copyToClipboard з fallback"
```

---

## Task 4: Создать `lib/booking/build-share-url.ts`

**Files:**
- Create: `lib/booking/build-share-url.ts`

- [ ] **Step 1: Создать файл**

```ts
type ShareUrlVariant = 'org' | 'staff' | 'personal'

interface BuildShareUrlInput {
	origin: string
	variant: ShareUrlVariant
	orgSlug?: string
	staffId?: string
}

const buildShareUrl = (input: BuildShareUrlInput): string => {
	const { origin, variant, orgSlug, staffId } = input
	if (variant === 'staff' && orgSlug && staffId) {
		return `${origin}/org/${orgSlug}/${staffId}`
	}
	if (variant === 'org' && orgSlug) {
		return `${origin}/org/${orgSlug}`
	}
	if (variant === 'personal' && staffId) {
		return `${origin}/profile/${staffId}`
	}
	return origin
}

export { buildShareUrl }
export type { ShareUrlVariant, BuildShareUrlInput }
```

- [ ] **Step 2: Lint**

```bash
npm run lint -- --max-warnings=0
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/booking/build-share-url.ts
git commit -m "feat(booking): додано buildShareUrl"
```

---

## Task 5: Создать `components/booking/ConfettiBurst.tsx`

**Files:**
- Create: `components/booking/ConfettiBurst.tsx`

- [ ] **Step 1: Создать файл**

```tsx
'use client'

import { useEffect, useRef } from 'react'

interface ConfettiBurstProps {
	targetRef: React.RefObject<HTMLElement | null>
}

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

- [ ] **Step 2: Lint**

```bash
npm run lint -- --max-warnings=0
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/booking/ConfettiBurst.tsx
git commit -m "feat(booking): додано ConfettiBurst"
```

---

## Task 6: Создать `components/booking/BookingFlowDialog.tsx`

**Files:**
- Create: `components/booking/BookingFlowDialog.tsx`

> **Зависимости:** `Sheet`, `Avatar`, `Badge`, `Separator`, `Button` из `@/components/ui/*`. Иконки `CheckCircle2Icon`, `ShareIcon`, `RotateCcwIcon` из `lucide-react`. `ClientInfoForm` из `./ClientInfoForm`. `ConfettiBurst` из `./ConfettiBurst`. `wallClockInTz` из `@/lib/calendar/tz`. `copyToClipboard` из `@/lib/booking/copy-to-clipboard`. `toast` из `sonner`.

- [ ] **Step 1: Создать файл целиком**

```tsx
'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
	CheckCircle2Icon,
	ShareIcon,
	RotateCcwIcon,
} from 'lucide-react'

import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'

import { ClientInfoForm, type ClientInfoData } from './ClientInfoForm'
import { ConfettiBurst } from './ConfettiBurst'
import { copyToClipboard } from '@/lib/booking/copy-to-clipboard'
import { wallClockInTz } from '@/lib/calendar/tz'

import type { EventType } from '@/services/configs/booking.types'
import type { ConfirmedBooking } from '@/lib/calendar/types'
import type { MergedBookingForm } from '@/services/configs/booking-field.types'

interface BookingFlowDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	eventType: EventType | null
	staffName: string | null
	staffAvatar: string | null
	slotTime: string | null
	slotDate: string | null
	formConfig: MergedBookingForm | null
	onSubmit: (data: ClientInfoData) => Promise<ConfirmedBooking | null>
	isSubmitting: boolean
	shareUrl: string
	onBookAgain: () => void
}

const pad2 = (n: number): string => String(n).padStart(2, '0')

const formatLocalTime = (iso: string, timezone: string): string => {
	const wc = wallClockInTz(iso, timezone)
	return `${pad2(wc.hour)}:${pad2(wc.minute)}`
}

const getInitials = (name: string): string =>
	name
		.split(' ')
		.map((part) => part[0])
		.join('')
		.toUpperCase()
		.slice(0, 2)

interface HeaderProps {
	eventType: EventType | null
	staffName: string | null
	staffAvatar: string | null
	slotTime: string | null
	slotDate: string | null
}

function BookingFlowHeader({
	eventType,
	staffName,
	staffAvatar,
	slotTime,
	slotDate,
}: HeaderProps) {
	const t = useTranslations('booking')
	return (
		<div className="flex flex-col gap-3">
			{eventType && (
				<div className="flex items-center gap-3">
					<div
						className="size-3 shrink-0 rounded-full"
						style={{ backgroundColor: eventType.color }}
					/>
					<div className="flex flex-col">
						<span className="text-sm font-medium">{eventType.name}</span>
						<span className="text-muted-foreground text-xs">
							{eventType.durationMin} {t('min')} · {eventType.price}{' '}
							{eventType.currency}
						</span>
					</div>
				</div>
			)}

			{staffName && (
				<div className="flex items-center gap-3">
					<Avatar className="size-8">
						{staffAvatar && <AvatarImage src={staffAvatar} alt={staffName} />}
						<AvatarFallback className="text-xs">
							{getInitials(staffName)}
						</AvatarFallback>
					</Avatar>
					<span className="text-sm font-medium">{staffName}</span>
				</div>
			)}

			{slotTime && slotDate && (
				<Badge variant="outline" className="w-fit text-sm">
					{slotDate} · {slotTime}
				</Badge>
			)}
		</div>
	)
}

interface FormStateProps {
	formConfig: MergedBookingForm | null
	isSubmitting: boolean
	error: string | null
	onSubmit: (data: ClientInfoData) => void
}

function BookingFlowForm({
	formConfig,
	isSubmitting,
	error,
	onSubmit,
}: FormStateProps) {
	if (!formConfig) return null
	return (
		<div className="flex flex-col gap-3">
			{error && (
				<div className="text-destructive bg-destructive/10 rounded-md p-3 text-sm">
					{error}
				</div>
			)}
			<ClientInfoForm
				formConfig={formConfig}
				onSubmit={onSubmit}
				isSubmitting={isSubmitting}
			/>
		</div>
	)
}

interface SummaryCardProps {
	result: ConfirmedBooking
	clientName: string | null
	staffName: string | null
}

function BookingSummaryCard({ result, clientName, staffName }: SummaryCardProps) {
	const t = useTranslations('booking')
	const startTime = formatLocalTime(result.startAt, result.timezone)
	const endTime = formatLocalTime(result.endAt, result.timezone)

	return (
		<div className="flex flex-col gap-3 rounded-lg border p-4">
			<div className="flex items-center gap-2">
				<div
					className="size-3 rounded-full"
					style={{ backgroundColor: result.color }}
				/>
				<span className="text-sm font-medium">{result.eventTypeName}</span>
			</div>
			<Separator />
			<div className="grid grid-cols-2 gap-y-2 text-xs">
				{staffName && (
					<>
						<span className="text-muted-foreground">
							{t('success.staff')}
						</span>
						<span className="font-medium">{staffName}</span>
					</>
				)}
				{clientName && (
					<>
						<span className="text-muted-foreground">
							{t('success.client')}
						</span>
						<span className="font-medium">{clientName}</span>
					</>
				)}
				<span className="text-muted-foreground">{t('startTime')}</span>
				<span className="font-medium">{startTime}</span>
				<span className="text-muted-foreground">{t('endTime')}</span>
				<span className="font-medium">{endTime}</span>
				<span className="text-muted-foreground">{t('duration')}</span>
				<span className="font-medium">
					{result.durationMin} {t('min')}
				</span>
				<span className="text-muted-foreground">{t('price')}</span>
				<span className="font-medium">
					{result.price} {result.currency}
				</span>
				<span className="text-muted-foreground">{t('status')}</span>
				<span className="font-medium">
					{result.status.isDefault ? t(result.status.label) : result.status.label}
				</span>
			</div>
		</div>
	)
}

interface SuccessActionsProps {
	shareUrl: string
	onBookAgain: () => void
}

function SuccessActions({ shareUrl, onBookAgain }: SuccessActionsProps) {
	const t = useTranslations('booking')

	const handleShare = async () => {
		const ok = await copyToClipboard(shareUrl)
		if (ok) toast.success(t('success.linkCopied'))
		else toast.error(t('success.copyFailed'))
	}

	return (
		<div className="flex flex-col gap-2">
			<Button onClick={onBookAgain} className="w-full">
				<RotateCcwIcon className="mr-2 size-4" />
				{t('success.bookAgain')}
			</Button>
			<Button onClick={handleShare} variant="outline" className="w-full">
				<ShareIcon className="mr-2 size-4" />
				{t('success.shareLink')}
			</Button>
		</div>
	)
}

interface SuccessStateProps {
	result: ConfirmedBooking
	staffName: string | null
	shareUrl: string
	onBookAgain: () => void
	burstTargetRef: React.RefObject<HTMLElement | null>
}

function BookingFlowSuccess({
	result,
	staffName,
	shareUrl,
	onBookAgain,
	burstTargetRef,
}: SuccessStateProps) {
	const t = useTranslations('booking')
	return (
		<div className="flex flex-col gap-4">
			<ConfettiBurst targetRef={burstTargetRef} />
			<div className="flex items-center gap-2 text-green-600">
				<CheckCircle2Icon className="size-5" />
				<span className="text-sm font-semibold">{t('success.title')}</span>
			</div>
			<p className="text-muted-foreground text-xs">{t('success.subtitle')}</p>
			<BookingSummaryCard
				result={result}
				clientName={result.invitee?.name ?? null}
				staffName={staffName}
			/>
			<SuccessActions shareUrl={shareUrl} onBookAgain={onBookAgain} />
		</div>
	)
}

function BookingFlowDialog({
	open,
	onOpenChange,
	eventType,
	staffName,
	staffAvatar,
	slotTime,
	slotDate,
	formConfig,
	onSubmit,
	isSubmitting,
	shareUrl,
	onBookAgain,
}: BookingFlowDialogProps) {
	const t = useTranslations('booking')
	const [result, setResult] = useState<ConfirmedBooking | null>(null)
	const [submitError, setSubmitError] = useState<string | null>(null)
	const contentRef = useRef<HTMLDivElement | null>(null)

	const handleSubmit = async (data: ClientInfoData) => {
		setSubmitError(null)
		try {
			const confirmed = await onSubmit(data)
			if (confirmed) setResult(confirmed)
		} catch (err) {
			const message = err instanceof Error ? err.message : t('bookingFailed')
			setSubmitError(message)
		}
	}

	const handleOpenChange = (next: boolean) => {
		if (!next && isSubmitting) return
		if (!next) {
			setResult(null)
			setSubmitError(null)
		}
		onOpenChange(next)
	}

	const handleBookAgain = () => {
		setResult(null)
		setSubmitError(null)
		onBookAgain()
	}

	return (
		<Sheet open={open} onOpenChange={handleOpenChange}>
			<SheetContent ref={contentRef}>
				<SheetHeader>
					<SheetTitle>
						{result ? t('success.title') : t('confirmBookingTitle')}
					</SheetTitle>
				</SheetHeader>
				<div className="flex flex-col gap-4 p-4">
					<BookingFlowHeader
						eventType={eventType}
						staffName={staffName}
						staffAvatar={staffAvatar}
						slotTime={slotTime}
						slotDate={slotDate}
					/>
					<Separator />
					{result ? (
						<BookingFlowSuccess
							result={result}
							staffName={staffName}
							shareUrl={shareUrl}
							onBookAgain={handleBookAgain}
							burstTargetRef={contentRef}
						/>
					) : (
						<BookingFlowForm
							formConfig={formConfig}
							isSubmitting={isSubmitting}
							error={submitError}
							onSubmit={handleSubmit}
						/>
					)}
				</div>
			</SheetContent>
		</Sheet>
	)
}

export { BookingFlowDialog }
export type { BookingFlowDialogProps }
```

- [ ] **Step 2: Проверить типизацию (build TS только этого файла)**

```bash
npx tsc --noEmit
```

Expected: PASS (или PASS-with-warnings, но без ошибок в `BookingFlowDialog.tsx`).

> Если `wallClockInTz` или `ConfirmedBooking.invitee.name` имеют другой shape — поправить точечно. Тип `ConfirmedBooking.invitee` объявлен как `Invitee` (`services/configs/booking.types`); проверить наличие поля `name`. Если нет — заменить на `result.invitee.name ?? null`.

- [ ] **Step 3: Lint**

```bash
npm run lint -- --max-warnings=0
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/booking/BookingFlowDialog.tsx
git commit -m "feat(booking): новий BookingFlowDialog (form + success + конфеті)"
```

---

## Task 7: `useBookingActions.handleConfirmWithClient` повертає `ConfirmedBooking | null`

**Files:**
- Modify: `lib/calendar/hooks/useBookingActions.ts`

> **Цель:** аддитивное изменение — функция теперь возвращает результат. Существующие callers, которые используют `Promise<void>`, продолжают работать (TS-ковариантность). Сам state `confirmedBooking` пока остаётся (удалим в Task 14).

- [ ] **Step 1: Открыть `lib/calendar/hooks/useBookingActions.ts`**

- [ ] **Step 2: Изменить тип в interface `UseBookingActionsResult`**

Найти строку:
```ts
handleConfirmWithClient: (
    data: ClientInfoData,
    overrides?: { slotTime?: string; date?: string; staffId?: string },
) => Promise<void>
```

Заменить на:
```ts
handleConfirmWithClient: (
    data: ClientInfoData,
    overrides?: { slotTime?: string; date?: string; staffId?: string },
) => Promise<ConfirmedBooking | null>
```

- [ ] **Step 3: Изменить тело `handleConfirmWithClient`**

В блоке `try { ... }` после `setConfirmedBooking({ ... })` добавить `return confirmed` и переписать так, чтобы переменная была доступна:

```ts
const handleConfirmWithClient = async (
    data: ClientInfoData,
    overrides?: { slotTime?: string; date?: string; staffId?: string },
): Promise<ConfirmedBooking | null> => {
    const resolvedSlotTime = overrides?.slotTime ?? selectedSlotTime
    const resolvedDate = overrides?.date ?? dateStr
    const resolvedStaffId =
        overrides?.staffId ?? staffId ?? getFirstStaffId(staffList)

    if (!selectedEventTypeId || !resolvedSlotTime) return null
    if (!resolvedStaffId) return null

    const eventType = findEventTypeById(selectedEventTypeId)
    if (!eventType) return null

    const startAt = `${resolvedDate}T${resolvedSlotTime}:00`

    const dataRecord = data as Record<string, unknown>
    const inviteeFields = extractInviteeFromCustomFields(dataRecord)
    const customFieldValues = extractCustomFieldValues(dataRecord)

    try {
        setIsSubmitting(true)
        const body = {
            eventTypeId: selectedEventTypeId,
            staffId: resolvedStaffId,
            startAt,
            timezone,
            invitee: {
                name: data.name,
                email: inviteeFields.email,
                phone: inviteeFields.phone,
                phoneCountry: null,
            },
            ...(customFieldValues.length > 0 && { customFieldValues }),
        }
        const response = await bookingApi.create(body)
        reloadBookings()
        setFormReloadTick((n) => n + 1)

        const confirmed: ConfirmedBooking = {
            bookingId: response.id,
            eventTypeId: response.eventTypeId,
            eventTypeName: response.eventTypeName,
            startAt: response.startAt,
            endAt: response.endAt,
            timezone: response.timezone,
            locationId: response.locationId,
            cancelToken: response.cancelToken,
            statusId: response.statusId,
            status: response.status,
            color: eventType.color,
            durationMin: eventType.durationMin,
            price: eventType.price,
            currency: eventType.currency,
            invitee: response.invitee,
        }

        setConfirmedBooking(confirmed)
        return confirmed
    } catch (err) {
        const message = err instanceof Error ? err.message : t('bookingFailed')
        setBookingError(message)
        return null
    } finally {
        setIsSubmitting(false)
    }
}
```

- [ ] **Step 4: Build TS**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 5: Lint**

```bash
npm run lint -- --max-warnings=0
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/calendar/hooks/useBookingActions.ts
git commit -m "refactor(booking): handleConfirmWithClient повертає ConfirmedBooking"
```

---

## Task 8: Інтеграція BookingFlowDialog в `OrgCalendarPage`

**Files:**
- Modify: `components/booking/OrgCalendarPage.tsx`

> **Цель:** на странице добавляется page-level `BookingFlowDialog`. Открытие → derived from URL (`selectedSlotTime && selectedEventTypeId && bookingDialogOpen`). Закрытие → clear `slot` from URL. Book again → clear `eventType` + `slot`.

- [ ] **Step 1: Открыть `components/booking/OrgCalendarPage.tsx`**

- [ ] **Step 2: Добавить imports в верх файла (после существующих)**

```tsx
import { BookingFlowDialog } from '@/components/booking/BookingFlowDialog'
import { buildShareUrl } from '@/lib/booking/build-share-url'
```

- [ ] **Step 3: Добавить state и derived shareUrl** в начало компонента (после `useViewConfig()`):

```tsx
const [bookingDialogOpen, setBookingDialogOpen] = useState(false)
```

> `useState` уже импортирован из `react` — проверить и добавить, если отсутствует.

- [ ] **Step 4: Найти `onSlotSelect` callback в `createOrgStrategy(...)`** (около строки 295)

Заменить:
```tsx
onSelectSlot: (time: string, slotDate?: string) => {
    navigation.handleSlotSelect(time, slotDate)
    bookingActions.handleBookingClose()
},
```

На:
```tsx
onSelectSlot: (time: string, slotDate?: string) => {
    navigation.handleSlotSelect(time, slotDate)
    bookingActions.handleBookingClose()
    setBookingDialogOpen(true)
},
```

- [ ] **Step 5: Перед финальным `return` добавить shareUrl и dialog handlers**

```tsx
const dialogShareUrl =
    typeof window !== 'undefined'
        ? buildShareUrl({
                origin: window.location.origin,
                variant: selectedStaffId ? 'staff' : 'org',
                orgSlug: org.id,
                staffId: selectedStaffId ?? undefined,
            })
        : ''

const dialogEventType = eventTypes.find(
    (et) => et.id === selectedEventTypeId,
) ?? null

const dialogStaff = staffList.find((s) => s.id === selectedStaffId) ?? null

const handleDialogOpenChange = (next: boolean) => {
    setBookingDialogOpen(next)
    if (!next) {
        navigation.setParams({ slot: null })
    }
}

const handleDialogBookAgain = () => {
    setBookingDialogOpen(false)
    navigation.setParams({ eventType: null, slot: null })
}

const isDialogOpen =
    bookingDialogOpen && !!selectedEventTypeId && !!selectedSlotTime
```

- [ ] **Step 6: Добавить рендер диалога перед `</CalendarProvider>`**

В JSX-возвращаемом значении найти `<CalendarProvider strategy={strategy}>` и обернуть `<CalendarCore />` в фрагмент с диалогом:

```tsx
return (
    <CalendarProvider strategy={strategy}>
        <CalendarCore
            date={dateStr}
            view={view}
            onViewChange={navigation.handleViewChange}
            onDateChange={onDateChange}
            onDayClick={onDayClick}
            workStart={workStart}
            workEnd={workEnd}
            disabledDays={disabledDays}
            isDayOff={isOrgDayOff || isStaffDayOff}
            staffTabsSlot={staffTabsSlot}
            listViewSlot={listViewSlot}
            publicUrl={publicUrlProp}
            profileInfo={profileInfo}
            scheduleTimezone={scheduleSource.timezone}
        />
        <BookingFlowDialog
            open={isDialogOpen}
            onOpenChange={handleDialogOpenChange}
            eventType={dialogEventType}
            staffName={dialogStaff?.name ?? null}
            staffAvatar={dialogStaff?.avatar ?? null}
            slotTime={selectedSlotTime}
            slotDate={dateStr}
            formConfig={bookingActions.formConfig}
            onSubmit={bookingActions.handleConfirmWithClient}
            isSubmitting={bookingActions.isSubmitting}
            shareUrl={dialogShareUrl}
            onBookAgain={handleDialogBookAgain}
        />
    </CalendarProvider>
)
```

- [ ] **Step 7: Build TS**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 8: Lint**

```bash
npm run lint -- --max-warnings=0
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add components/booking/OrgCalendarPage.tsx
git commit -m "feat(booking): BookingFlowDialog на page-рівні OrgCalendarPage"
```

---

## Task 9: Інтеграція BookingFlowDialog в `BookingPage` (`/book/[staffSlug]`)

**Files:**
- Modify: `app/[locale]/book/[staffSlug]/BookingPage.tsx`

> **Цель:** аналогично Task 8 для personal/staff публичной страницы.

- [ ] **Step 1: Добавить imports**

```tsx
import { BookingFlowDialog } from '@/components/booking/BookingFlowDialog'
import { buildShareUrl } from '@/lib/booking/build-share-url'
```

- [ ] **Step 2: Добавить state**

```tsx
const [bookingDialogOpen, setBookingDialogOpen] = useState(false)
```

- [ ] **Step 3: Изменить `onSlotSelect`** (около строки 176)

```tsx
const onSlotSelect = (time: string, slotDate?: string) => {
    navigation.handleSlotSelect(time, slotDate)
    bookingActions.handleBookingClose()
    setBookingDialogOpen(true)
}
```

- [ ] **Step 4: Добавить вспомогательные значения и handlers перед `return`**

```tsx
const dialogShareUrl =
    typeof window !== 'undefined'
        ? buildShareUrl({
                origin: window.location.origin,
                variant: 'personal',
                staffId: staff.id,
            })
        : ''

const dialogEventType = eventTypes.find(
    (et) => et.id === selectedEventTypeId,
) ?? null

const handleDialogOpenChange = (next: boolean) => {
    setBookingDialogOpen(next)
    if (!next) navigation.setParams({ slot: null })
}

const handleDialogBookAgain = () => {
    setBookingDialogOpen(false)
    navigation.setParams({ eventType: null, slot: null })
}

const isDialogOpen =
    bookingDialogOpen && !!selectedEventTypeId && !!selectedSlotTime
```

- [ ] **Step 5: Добавить `<BookingFlowDialog />` рядом с `<CalendarCore />` внутри `<CalendarProvider>`**

```tsx
return (
    <CalendarProvider strategy={strategy}>
        <CalendarCore
            /* … existing props … */
        />
        <BookingFlowDialog
            open={isDialogOpen}
            onOpenChange={handleDialogOpenChange}
            eventType={dialogEventType}
            staffName={staff.name}
            staffAvatar={staff.avatar ?? null}
            slotTime={selectedSlotTime}
            slotDate={dateStr}
            formConfig={bookingActions.formConfig}
            onSubmit={bookingActions.handleConfirmWithClient}
            isSubmitting={bookingActions.isSubmitting}
            shareUrl={dialogShareUrl}
            onBookAgain={handleDialogBookAgain}
        />
    </CalendarProvider>
)
```

- [ ] **Step 6: Build + Lint**

```bash
npx tsc --noEmit
npm run lint -- --max-warnings=0
```

Expected: оба PASS.

- [ ] **Step 7: Commit**

```bash
git add app/[locale]/book/[staffSlug]/BookingPage.tsx
git commit -m "feat(booking): BookingFlowDialog на page-рівні BookingPage"
```

---

## Task 10: `SlotListView` — `BookingConfirmSheet` → `BookingFlowDialog`

**Files:**
- Modify: `components/booking/SlotListView.tsx`

> **Цель:** заменить старый `BookingConfirmSheet` на `BookingFlowDialog`. Добавляются пропсы `shareUrl` и `onBookAgain`, которые приходят сверху.

- [ ] **Step 1: Заменить import**

Удалить:
```tsx
import { BookingConfirmSheet } from './BookingConfirmSheet'
```

Добавить:
```tsx
import { BookingFlowDialog } from './BookingFlowDialog'
```

- [ ] **Step 2: Расширить `SlotListViewProps`**

Найти interface `SlotListViewProps`. Добавить в конец:

```tsx
shareUrl: string
onBookAgain: () => void
scheduleTimezone: string
```

- [ ] **Step 3: Деструктурировать новые пропсы в сигнатуре**

В сигнатуре `function SlotListView({ ... })` добавить `shareUrl, onBookAgain, scheduleTimezone`.

- [ ] **Step 4: Адаптировать `handleConfirm` к новому API диалога**

Найти:
```tsx
const handleConfirm = async (data: ClientInfoData) => {
    await onConfirmWithClient(data, {
        slotTime: selectedSlot ?? undefined,
        date: startDate,
        staffId: selectedStaffId ?? staffId ?? undefined,
    })
    setSheetOpen(false)
    setSelectedSlot(null)
    setSelectedStaffId(null)
}
```

Заменить на:
```tsx
const handleDialogSubmit = async (data: ClientInfoData) => {
    return onConfirmWithClient(data, {
        slotTime: selectedSlot ?? undefined,
        date: startDate,
        staffId: selectedStaffId ?? staffId ?? undefined,
    })
}

const handleDialogBookAgain = () => {
    setSheetOpen(false)
    setSelectedSlot(null)
    setSelectedStaffId(null)
    onBookAgain()
}
```

> Заметь: `handleConfirm` больше не закрывает sheet — диалог сам переходит в success. Закрытие sheet происходит уже в `handleSheetOpenChange` (через X / backdrop) или в `handleDialogBookAgain`.

- [ ] **Step 5: Изменить тип `onConfirmWithClient` в SlotListViewProps**

Найти:
```tsx
onConfirmWithClient: (
    data: ClientInfoData,
    overrides?: { slotTime?: string; date?: string; staffId?: string },
) => Promise<void>
```

Заменить на:
```tsx
onConfirmWithClient: (
    data: ClientInfoData,
    overrides?: { slotTime?: string; date?: string; staffId?: string },
) => Promise<ConfirmedBooking | null>
```

И в верх файла добавить тип:
```tsx
import type { ConfirmedBooking } from '@/lib/calendar/types'
```

- [ ] **Step 6: Заменить рендер `BookingConfirmSheet` на `BookingFlowDialog`**

Найти блок:
```tsx
<BookingConfirmSheet
    open={sheetOpen}
    onOpenChange={handleSheetOpenChange}
    eventType={selectedEventType}
    staffName={sheetStaffName}
    staffAvatar={sheetStaffAvatar}
    slotTime={selectedSlot}
    slotDate={dateStr}
    formConfig={formConfig}
    onConfirm={handleConfirm}
    isSubmitting={isSubmitting}
/>
```

Заменить на:
```tsx
<BookingFlowDialog
    open={sheetOpen}
    onOpenChange={handleSheetOpenChange}
    eventType={selectedEventType}
    staffName={sheetStaffName}
    staffAvatar={sheetStaffAvatar}
    slotTime={selectedSlot}
    slotDate={dateStr}
    formConfig={formConfig}
    onSubmit={handleDialogSubmit}
    isSubmitting={isSubmitting}
    shareUrl={shareUrl}
    onBookAgain={handleDialogBookAgain}
/>
```

- [ ] **Step 7: Build + Lint**

```bash
npx tsc --noEmit
npm run lint -- --max-warnings=0
```

Expected: оба PASS.

> Если возникает ошибка типа "OrgCalendarPage / BookingPage передаёт SlotListView без новых пропсов" — добавить в обоих местах (`<SlotListView ... shareUrl={dialogShareUrl} onBookAgain={handleDialogBookAgain} scheduleTimezone={schedule?.timezone ?? ''} />`).

- [ ] **Step 8: Прокинуть новые пропсы из обеих страниц**

В `OrgCalendarPage.tsx` найти `<SlotListView ... />` (около строки 342) и добавить:
```tsx
shareUrl={dialogShareUrl}
onBookAgain={handleDialogBookAgain}
scheduleTimezone={scheduleSource.timezone}
```

В `BookingPage.tsx` найти `<SlotListView ... />` и добавить:
```tsx
shareUrl={dialogShareUrl}
onBookAgain={handleDialogBookAgain}
scheduleTimezone={schedule.timezone}
```

- [ ] **Step 9: Build + Lint**

```bash
npx tsc --noEmit
npm run lint -- --max-warnings=0
```

Expected: оба PASS.

- [ ] **Step 10: Commit**

```bash
git add components/booking/SlotListView.tsx components/booking/OrgCalendarPage.tsx app/[locale]/book/[staffSlug]/BookingPage.tsx
git commit -m "feat(booking): SlotListView використовує BookingFlowDialog"
```

---

## Task 11: Спрощення `createOrgStrategy.tsx`

**Files:**
- Modify: `lib/calendar/strategies/createOrgStrategy.tsx`

> **Цель:** убрать props, относящиеся к старому form-flow в сайдбаре. `renderPanel` теперь только рендерит `ServiceInfo` + `StaffInfoCard` (или booking details).

- [ ] **Step 1: Удалить импорты, связанные со старым flow**

Удалить (если есть):
```tsx
import { StaffBookingPanel } from '@/components/booking/StaffBookingPanel'
import type { ClientInfoData } from '@/components/booking/ClientInfoForm'
import type { MergedBookingForm } from '@/services/configs/booking-field.types'
```

Оставить:
```tsx
import { ServiceInfo } from '@/components/booking/BookingPanelParts'
import { StaffInfoCard } from '@/components/booking/StaffInfoCard'
```

- [ ] **Step 2: Убрать поля из `interface OrgStrategyParams`**

Удалить строки:
```tsx
selectedSlot?: string | null
confirmedBooking?: ConfirmedBooking | null
onConfirmWithClient?: (data: ClientInfoData) => void
onCancel?: () => void
onResetSlot?: () => void
isSubmitting?: boolean
formConfig?: MergedBookingForm | null
bookingError?: string | null
```

> **Сохранить** `selectedSlot` если он используется в `getBlocks` (он используется для рендера pending dropzone — оставить).

Перепроверить: пользуется ли `getBlocks`/`onCellClick` этими полями?
- `selectedSlot` — да, используется в `buildPendingBlock` и `buildSlotBlocks` → оставить.
- `confirmedBooking` — используется в `buildSlotBlocks`/`buildPendingBlock` для условия «не показывать pending после подтверждения» → теперь `confirmedBooking` всегда `null`-эквивалент (state удалён); удалить условие `|| confirmedBooking` из этих функций.
- `onConfirmWithClient`, `onCancel`, `onResetSlot`, `isSubmitting`, `formConfig`, `bookingError` — НЕ используются в `getBlocks`/`onCellClick`, удалить.

- [ ] **Step 3: Удалить условия `|| confirmedBooking`** во всех трёх местах в `buildSlotBlocks` (~ строка 181), `buildPendingBlock` (~ строка 247).

Было:
```tsx
if (
    !canBookForClient ||
    !selectedEventType ||
    !selectedStaffId ||
    !schedule ||
    confirmedBooking
)
    return []
```

Стало:
```tsx
if (
    !canBookForClient ||
    !selectedEventType ||
    !selectedStaffId ||
    !schedule
)
    return []
```

И:
```tsx
if (
    !canBookForClient ||
    !selectedEventType ||
    !selectedSlot ||
    blockDate !== date
)
    return []
```

- [ ] **Step 4: Удалить деструктурирование удалённых полей**

В блоке `const { ... } = params` (строки ~106-141) удалить:
```tsx
confirmedBooking = null,
onConfirmWithClient,
onCancel,
onResetSlot,
isSubmitting = false,
formConfig = null,
bookingError = null,
```

- [ ] **Step 5: Упростить `renderPanel`**

Было (строки ~336-427):
```tsx
renderPanel() {
    if (isDayOff || isStaffDayOff) { /* ... */ }
    if (selectedBooking) { /* BookingDetailsPanel */ }
    if (!canBookForClient) { /* ... */ }
    if (selectedEventType && !selectedStaffId) { /* ServiceInfo + selectStaffToBookLabel */ }
    return (
        <>
            {selectedStaff && <StaffInfoCard {...} />}
            {bookingError && <div>{bookingError}</div>}
            <StaffBookingPanel ... />
        </>
    )
},
```

Стало:
```tsx
renderPanel() {
    if (isDayOff || isStaffDayOff) {
        return (
            <div className="text-muted-foreground p-4 text-sm">{dayOffLabel}</div>
        )
    }

    if (selectedBooking) {
        const bookingEventType = findEventType(
            eventTypes,
            selectedBooking.eventTypeId,
        )
        const staffUserId = selectedBooking.hosts[0]?.userId ?? null
        const findStaffByUserId = (s: OrgStaffMember): boolean =>
            s.id === staffUserId
        const bookingStaff = staffList.find(findStaffByUserId)

        return (
            <BookingDetailsPanel
                booking={selectedBooking}
                eventTypeName={bookingEventType?.name ?? ''}
                eventTypeColor={bookingEventType?.color ?? '#888'}
                staffName={bookingStaff?.name}
                staffAvatar={bookingStaff?.avatar}
                staffPosition={bookingStaff?.position ?? undefined}
                availableStatuses={availableStatuses}
                onChangeStatus={onBookingStatusChange ?? (async () => {})}
                onReschedule={onBookingReschedule ?? (async () => {})}
                onClose={onBookingClose ?? (() => {})}
            />
        )
    }

    if (!canBookForClient) {
        return (
            <div className="text-muted-foreground p-4 text-sm">
                {bookingDetailsLabel}
            </div>
        )
    }

    if (selectedEventType && !selectedStaffId) {
        return (
            <>
                <ServiceInfo eventType={selectedEventType} />
                <div className="text-muted-foreground mt-3 text-sm">
                    {selectStaffToBookLabel}
                </div>
            </>
        )
    }

    const findSelectedStaff = (s: OrgStaffMember): boolean =>
        s.id === selectedStaffId
    const selectedStaff = staffList?.find(findSelectedStaff) ?? null

    if (!selectedEventType) {
        return (
            <>
                {selectedStaff && (
                    <StaffInfoCard
                        name={selectedStaff.name}
                        avatar={selectedStaff.avatar}
                        position={selectedStaff.position}
                        bio={selectedStaff.bio}
                    />
                )}
                <div className="text-muted-foreground mt-3 text-sm">
                    {selectStaffLabel}
                </div>
            </>
        )
    }

    return (
        <>
            {selectedStaff && (
                <StaffInfoCard
                    name={selectedStaff.name}
                    avatar={selectedStaff.avatar}
                    position={selectedStaff.position}
                    bio={selectedStaff.bio}
                />
            )}
            <ServiceInfo eventType={selectedEventType} />
        </>
    )
},
```

- [ ] **Step 6: Удалить из `OrgCalendarPage.tsx` передачу удалённых пропсов в `createOrgStrategy`**

В блоке `createOrgStrategy({ ... })` удалить:
```tsx
confirmedBooking: bookingActions.confirmedBooking,
onConfirmWithClient: bookingActions.handleConfirmWithClient,
onCancel: bookingActions.handleCancel,
onResetSlot: bookingActions.handleResetSlot,
isSubmitting: bookingActions.isSubmitting,
formConfig: bookingActions.formConfig,
bookingError: bookingActions.bookingError,
```

- [ ] **Step 7: Build + Lint**

```bash
npx tsc --noEmit
npm run lint -- --max-warnings=0
```

Expected: оба PASS.

- [ ] **Step 8: Commit**

```bash
git add lib/calendar/strategies/createOrgStrategy.tsx components/booking/OrgCalendarPage.tsx
git commit -m "refactor(booking): спрощено createOrgStrategy renderPanel"
```

---

## Task 12: Спрощення `createStaffStrategy.tsx`

**Files:**
- Modify: `lib/calendar/strategies/createStaffStrategy.tsx`
- Modify: `app/[locale]/book/[staffSlug]/BookingPage.tsx`

- [ ] **Step 1: Удалить импорт `StaffBookingPanel`** и неиспользуемые типы

```tsx
import { StaffBookingPanel } from '@/components/booking/StaffBookingPanel'  // УДАЛИТЬ
import type { ClientInfoData } from '@/components/booking/ClientInfoForm'  // УДАЛИТЬ
import type { MergedBookingForm } from '@/services/configs/booking-field.types'  // УДАЛИТЬ
```

Добавить:
```tsx
import { ServiceInfo } from '@/components/booking/BookingPanelParts'
```

- [ ] **Step 2: Убрать поля из `interface StaffStrategyParams`**

Удалить:
```tsx
confirmedBooking: ConfirmedBooking | null
onConfirmWithClient: (data: ClientInfoData) => void
onCancel: () => void
onResetSlot: () => void
isSubmitting: boolean
formConfig?: MergedBookingForm | null
```

(`selectedSlot` оставить — используется в `getBlocks`).

- [ ] **Step 3: Убрать деструктурирование** этих полей из `const { ... } = params` (~ строки 92-118).

- [ ] **Step 4: Убрать условия `|| confirmedBooking`** в `getBlocks` (строки ~165, ~218):

Было:
```tsx
if (!selectedEventType || confirmedBooking) return [...bookingBlocks, ...breakBlocks]
```

Стало:
```tsx
if (!selectedEventType) return [...bookingBlocks, ...breakBlocks]
```

И:
```tsx
const pendingBlock: CalendarBlock[] = (() => {
    if (!selectedSlot || blockDate !== date || confirmedBooking) return []
    /* ... */
})()
```

→
```tsx
const pendingBlock: CalendarBlock[] = (() => {
    if (!selectedSlot || blockDate !== date) return []
    /* ... */
})()
```

- [ ] **Step 5: Упростить `renderPanel`**

Заменить блок:
```tsx
renderPanel() {
    if (selectedBooking && onCloseBooking && onBookingStatusChange) {
        /* BookingDetailsPanel — оставить как есть */
    }

    return (
        <StaffBookingPanel ... />
    )
},
```

На:
```tsx
renderPanel() {
    if (selectedBooking && onCloseBooking && onBookingStatusChange) {
        const bookingEventType = findEventType(
            eventTypes,
            selectedBooking.eventTypeId,
        )
        return (
            <BookingDetailsPanel
                booking={selectedBooking}
                eventTypeName={bookingEventType?.name ?? ''}
                eventTypeColor={bookingEventType?.color ?? '#888'}
                availableStatuses={availableStatuses}
                onChangeStatus={onBookingStatusChange}
                onReschedule={onBookingReschedule ?? (async () => {})}
                onClose={onCloseBooking}
            />
        )
    }

    if (!selectedEventType) return null
    return <ServiceInfo eventType={selectedEventType} />
},
```

- [ ] **Step 6: Удалить из `BookingPage.tsx` передачу удалённых пропсов в `createStaffStrategy({ ... })`**

Удалить строки:
```tsx
confirmedBooking: bookingActions.confirmedBooking,
onConfirmWithClient: bookingActions.handleConfirmWithClient,
onCancel: bookingActions.handleCancel,
onResetSlot: bookingActions.handleResetSlot,
isSubmitting: bookingActions.isSubmitting,
formConfig: bookingActions.formConfig,
```

- [ ] **Step 7: Build + Lint**

```bash
npx tsc --noEmit
npm run lint -- --max-warnings=0
```

Expected: оба PASS.

- [ ] **Step 8: Commit**

```bash
git add lib/calendar/strategies/createStaffStrategy.tsx app/[locale]/book/[staffSlug]/BookingPage.tsx
git commit -m "refactor(booking): спрощено createStaffStrategy renderPanel"
```

---

## Task 13: Спрощення `createClientStrategy.tsx`

**Files:**
- Modify: `lib/calendar/strategies/createClientStrategy.tsx`
- Modify: `app/[locale]/book/[staffSlug]/BookingPage.tsx`

> `createClientStrategy` сейчас использует `BookingPanel` (без формы). После рефакторинга панель показывает только `ServiceInfo`.

- [ ] **Step 1: Заменить импорт**

Удалить:
```tsx
import { BookingPanel } from '@/components/booking/BookingPanel'
```

Добавить:
```tsx
import { ServiceInfo } from '@/components/booking/BookingPanelParts'
```

- [ ] **Step 2: Убрать поля из `interface ClientStrategyParams`**

Удалить:
```tsx
confirmedBooking: ConfirmedBooking | null
onConfirm: () => void
onCancel: () => void
onResetSlot: () => void
```

(`selectedSlot` оставить).

- [ ] **Step 3: Убрать деструктурирование** этих полей.

- [ ] **Step 4: Убрать условия `|| confirmedBooking`** в `getBlocks` (строки ~123, ~178).

- [ ] **Step 5: Упростить `renderPanel`**

```tsx
renderPanel() {
    if (!selectedEventType) return null
    return <ServiceInfo eventType={selectedEventType} />
},
```

- [ ] **Step 6: Удалить из `BookingPage.tsx` передачу пропсов в `createClientStrategy({ ... })`**

Удалить:
```tsx
confirmedBooking: bookingActions.confirmedBooking,
onConfirm: handleConfirm,
onCancel: bookingActions.handleCancel,
onResetSlot: bookingActions.handleResetSlot,
```

Также удалить локальную функцию `handleConfirm` целиком, она больше не используется (~ строки 183-189):
```tsx
const handleConfirm = async () => {
    await bookingActions.handleConfirmWithClient({
        name: t('defaultClient'),
        email: '',
        phone: '',
    })
}
```

- [ ] **Step 7: Build + Lint**

```bash
npx tsc --noEmit
npm run lint -- --max-warnings=0
```

Expected: оба PASS.

- [ ] **Step 8: Commit**

```bash
git add lib/calendar/strategies/createClientStrategy.tsx app/[locale]/book/[staffSlug]/BookingPage.tsx
git commit -m "refactor(booking): спрощено createClientStrategy renderPanel"
```

---

## Task 14: Прибрати `confirmedBooking` state з `useBookingActions`

**Files:**
- Modify: `lib/calendar/hooks/useBookingActions.ts`
- Modify: `components/booking/OrgCalendarPage.tsx`
- Modify: `app/[locale]/book/[staffSlug]/BookingPage.tsx`

> **Цель:** убрать неиспользуемое локальное state, setter, handleCancel из хука. После предыдущих задач никто не дёргает эти поля.

- [ ] **Step 1: Открыть `useBookingActions.ts`, удалить из `interface UseBookingActionsResult`:**

```tsx
confirmedBooking: ConfirmedBooking | null
setConfirmedBooking: (booking: ConfirmedBooking | null) => void
handleCancel: () => Promise<void>
handleResetSlot: () => void
```

- [ ] **Step 2: Удалить useState и handlers в теле хука**

Удалить:
```tsx
const [confirmedBooking, setConfirmedBooking] = useState<ConfirmedBooking | null>(null)
```

И:
```tsx
const handleCancel = async () => { /* ... */ }
const handleResetSlot = () => { /* ... */ }
```

- [ ] **Step 3: Удалить `setConfirmedBooking(confirmed)` из `handleConfirmWithClient`**

В теле функции остаётся `return confirmed`, без присваивания state.

- [ ] **Step 4: Очистить return объекта в конце хука** — удалить `confirmedBooking`, `setConfirmedBooking`, `handleCancel`, `handleResetSlot`.

- [ ] **Step 5: В `OrgCalendarPage.tsx` обновить `resetBookingState`**

Было:
```tsx
const resetBookingState = () => {
    if (bookingActions.confirmedBooking) reloadBookings()
    bookingActions.setConfirmedBooking(null)
    bookingActions.setBookingError(null)
    bookingActions.handleBookingClose()
}
```

Стало:
```tsx
const resetBookingState = () => {
    bookingActions.setBookingError(null)
    bookingActions.handleBookingClose()
}
```

- [ ] **Step 6: Аналогично в `BookingPage.tsx`** — удалить `bookingActions.setConfirmedBooking(null)`.

- [ ] **Step 7: Удалить неиспользуемый `import type { ConfirmedBooking }`** из `useBookingActions.ts` (если больше нигде не используется в файле; но он используется как тип возврата `handleConfirmWithClient` → оставить).

- [ ] **Step 8: Build + Lint**

```bash
npx tsc --noEmit
npm run lint -- --max-warnings=0
```

Expected: оба PASS.

- [ ] **Step 9: Commit**

```bash
git add lib/calendar/hooks/useBookingActions.ts components/booking/OrgCalendarPage.tsx app/[locale]/book/[staffSlug]/BookingPage.tsx
git commit -m "refactor(booking): прибрано confirmedBooking state з useBookingActions"
```

---

## Task 15: Видалити мертві файли

**Files:**
- Delete: `components/booking/BookingConfirmSheet.tsx`
- Delete: `components/booking/BookingPanel.tsx`
- Delete: `components/booking/StaffBookingPanel.tsx`

- [ ] **Step 1: Перевірити, що файли більше ніде не використовуються**

```bash
grep -rn "from.*BookingConfirmSheet\|from.*BookingPanel'\|from.*StaffBookingPanel" --include="*.ts" --include="*.tsx" .
```

Expected: пусто (только если этим скриптом найдём что-то — это означает что ссылка осталась и нужно её поправить).

- [ ] **Step 2: Видалити файли**

```bash
git rm components/booking/BookingConfirmSheet.tsx
git rm components/booking/BookingPanel.tsx
git rm components/booking/StaffBookingPanel.tsx
```

- [ ] **Step 3: Build + Lint**

```bash
npx tsc --noEmit
npm run lint -- --max-warnings=0
```

Expected: оба PASS.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(booking): видалено мертві компоненти (BookingPanel, BookingConfirmSheet, StaffBookingPanel)"
```

---

## Task 16: Прибрати `ConfirmedState` з `BookingPanelParts.tsx`

**Files:**
- Modify: `components/booking/BookingPanelParts.tsx`

- [ ] **Step 1: Перевірити, чи `ConfirmedState`/`formatLocalTime` ще десь використовуються**

```bash
grep -rn "ConfirmedState\|formatLocalTime" --include="*.ts" --include="*.tsx" .
```

Expected: совпадения только внутри `BookingPanelParts.tsx` и `BookingFlowDialog.tsx` (свой собственный `formatLocalTime` объявлен внутри `BookingFlowDialog`).

> Если `formatLocalTime` импортируется откуда-то ещё — оставить экспорт. Иначе удалить.

- [ ] **Step 2: Открыть `BookingPanelParts.tsx`** и удалить:

- функцию `ConfirmedState`
- функцию `formatLocalTime` (если grep чистый)
- импорт `wallClockInTz`, `CheckCircle2Icon`, `ChevronDown`, `ChevronUp` (`ChevronDown`/`ChevronUp` оставить если используется в `ServiceInfo`).
- импорт `ConfirmedBooking`, `Separator` (если не используется в `ServiceInfo`).

После — экспорт остаётся:
```tsx
export { EmptyState, ServiceInfo }
```

- [ ] **Step 3: Build + Lint**

```bash
npx tsc --noEmit
npm run lint -- --max-warnings=0
```

Expected: оба PASS.

- [ ] **Step 4: Commit**

```bash
git add components/booking/BookingPanelParts.tsx
git commit -m "refactor(booking): прибрано ConfirmedState з BookingPanelParts"
```

---

## Task 17: Перевірка та ручний smoke-тест

**Files:** —

- [ ] **Step 1: Повний lint + format check**

```bash
npm run lint -- --max-warnings=0
npm run format:check
npx tsc --noEmit
```

Expected: всі PASS.

- [ ] **Step 2: Production build**

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 3: Запуск dev-сервера**

```bash
npm run dev
```

Открыть в браузере (http://localhost:3000).

- [ ] **Step 4: Сценарій "Публічна org-сторінка"**

1. Перейти на `/uk/org/<test-slug>` (или `/en/org/<test-slug>`).
2. Выбрать услугу → клик по слоту в day view.
3. **Ожидание:** открывается `BookingFlowDialog` справа с формой.
4. Заполнить имя клиента, отправить.
5. **Ожидание:** диалог переключается на success-state, играют конфетти, видна карточка деталей (услуга, сотрудник, дата+время, длительность, цена, имя клиента, статус).
6. Кликнуть «Поделиться страницей» → toast «Посилання скопійовано». Вставить в адресную строку — открывается публичная страница орги.
7. Кликнуть «Забронювати ще» → диалог закрывается, услуга и слот сброшены, можно выбрать заново.

- [ ] **Step 5: Сценарій "List view"**

1. На той же странице переключиться в `Список`.
2. Кликнуть по слоту.
3. **Ожидание:** открывается тот же `BookingFlowDialog`.
4. Тот же success-флоу.

- [ ] **Step 6: Сценарій "Personal /profile/<staffId>"**

1. Перейти на `/uk/profile/<staffId>` (или `/en/...`).
2. Повторить тест.

- [ ] **Step 7: Сценарій "Admin /manage/..."** (canBookForClient=true)

1. Залогиниться, открыть свою организацию в management-режиме.
2. Выбрать сотрудника → услугу → клик по слоту.
3. **Ожидание:** диалог открывается, форма работает, success + конфетти, кнопка «Забронювати ще» делает полный сброс.

- [ ] **Step 8: Edge case — Reduced motion**

DevTools → Rendering → Emulate CSS media feature `prefers-reduced-motion: reduce` → выполнить успешное бронирование.
**Ожидание:** success-state есть, конфетти НЕ играют.

- [ ] **Step 9: Edge case — Закрыть диалог во время submit**

В DevTools throttle network → Slow 3G → подтвердить бронь → во время отправки нажать `Esc` или клик по бэкдропу.
**Ожидание:** диалог НЕ закрывается до завершения submit.

- [ ] **Step 10: Сайдбар календаря**

Убедиться: на десктопе при выбранной услуге сайдбар календаря показывает только `StaffInfoCard` (если применимо) + `ServiceInfo`. После клика по слоту в сайдбаре ничего не меняется (он остаётся как был) — диалог открывается отдельно.

- [ ] **Step 11: Final commit (only if any fixups)**

Если в ходе ручного тестирования нашлись и зафиксились баги:

```bash
git add -A
git commit -m "fix(booking): окремі фікси після smoke-тестування"
```

Если ничего фиксить не пришлось — этот шаг скип.

---

## Self-Review (filled by author)

**1. Spec coverage:**
- Унифицированная модалка во всех видах ✓ Tasks 6, 8, 9, 10
- Сайдбар → инфо-карточка ✓ Tasks 11, 12, 13
- Success-state с деталями ✓ Task 6
- Конфетти из верхней грани, respect prefers-reduced-motion ✓ Task 5
- «Забронювати ще» с полным сбросом (3b) ✓ Tasks 8, 9, 10
- «Поделиться» (3d) с copy-to-clipboard ✓ Tasks 3, 6
- buildShareUrl для всех трёх вариантов ✓ Task 4
- i18n ключи ✓ Task 2
- Уход confirmedBooking state из useBookingActions ✓ Tasks 7, 14
- Удаление мертвых файлов ✓ Tasks 15, 16

**2. Placeholder scan:** прошёл — конкретные diff-блоки везде, нет «add error handling», нет «similar to Task N» без кода.

**3. Type consistency:** `ConfirmedBooking` импортируется и в Task 6 (BookingFlowDialog), и в Task 7 (return type), и в Task 10 (SlotListView prop). `handleConfirmWithClient` сигнатура согласована между Task 7 (определение) и Tasks 8-10 (использование). `buildShareUrl({ origin, variant, orgSlug, staffId })` — сигнатура согласована между Task 4 и Tasks 8-9.
