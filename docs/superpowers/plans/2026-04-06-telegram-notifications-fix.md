# Telegram Notifications Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix Telegram notification coverage (all booking mutations), message content (service name + staff name), and frontend UX (status check, confirm disconnect, i18n).

**Architecture:** Backend changes in BackendTemplate — add notification types, populate eventType for service name, pass staff name to formatter, call notifications from updateBookingStatus. Frontend changes in Slotix-fronted — improve TelegramConnect component UX and fix i18n.

**Tech Stack:** Node.js, MongoDB/Mongoose, grammy, Next.js 16, React 19, shadcn/ui, next-intl

---

### Task 1: Add new NOTIFICATION_TYPE constants (Backend)

**Files:**

- Modify: `src/constants/booking.js:34-41`

- [ ] **Step 1: Add new notification type constants**

In `src/constants/booking.js`, add three new types to `NOTIFICATION_TYPE`:

```js
const NOTIFICATION_TYPE = {
	BOOKING_CONFIRMED: 'booking_confirmed',
	BOOKING_CANCELLED: 'booking_cancelled',
	BOOKING_RESCHEDULED: 'booking_rescheduled',
	BOOKING_COMPLETED: 'booking_completed',
	BOOKING_NO_SHOW: 'booking_no_show',
	BOOKING_STATUS_CHANGED: 'booking_status_changed',
	REMINDER_24H: 'reminder_24h',
	REMINDER_1H: 'reminder_1h',
	FOLLOW_UP: 'follow_up',
}
```

- [ ] **Step 2: Commit**

```bash
git add src/constants/booking.js
git commit -m "feat: добавить NOTIFICATION_TYPE для completed, no_show, status_changed"
```

---

### Task 2: Add service name and staff name to Telegram messages (Backend)

**Files:**

- Modify: `src/services/telegramMessageFormatter.js`
- Modify: `src/services/notificationServices.js:79-113`
- Modify: `src/repository/bookingRepository.js:44-47`

- [ ] **Step 1: Add `.populate("eventTypeId")` to `findBookingById`**

In `src/repository/bookingRepository.js`, change `findBookingById`:

```js
const findBookingById = async (id) => {
	const doc = await Booking.findById(id).populate(
		'eventTypeId',
		'name durationMin',
	)
	return doc
}
```

- [ ] **Step 2: Update `sendStaffTelegramNotification` to pass staff name**

In `src/services/notificationServices.js`, change `sendStaffTelegramNotification` to pass the user (staff) name to the formatter:

```js
const sendStaffTelegramNotification = async (booking, type) => {
	const leadHost = findLeadHost(booking)
	if (!leadHost) return null

	const user = await User.findById(leadHost.userId)
	if (!user || !user.telegramChatId) return null

	const text = formatNotificationMessage(type, booking, user.name)
	if (!text) {
		console.warn(`No Telegram template for notification type: ${type}`)
		return null
	}

	const notificationData = {
		bookingId: booking._id,
		recipientId: user._id,
		recipientType: 'staff',
		channel: NOTIFICATION_CHANNEL.TELEGRAM,
		type,
		scheduledAt: new Date(),
	}

	try {
		const externalId = await sendMessage(user.telegramChatId, text)
		if (!externalId) {
			return createNotification({
				...notificationData,
				status: NOTIFICATION_STATUS.SKIPPED,
			})
		}
		return createNotification({
			...notificationData,
			status: NOTIFICATION_STATUS.SENT,
			externalId,
		})
	} catch (error) {
		console.error('Telegram notification failed:', error.message)
		return createNotification({
			...notificationData,
			status: NOTIFICATION_STATUS.FAILED,
			attempts: 1,
		})
	}
}
```

Key changes:

- Pass `user.name` as third arg to `formatNotificationMessage`
- Log warning when template is missing
- Save as `SKIPPED` when `sendMessage` returns null (bot not configured)

- [ ] **Step 3: Update `formatNotificationMessage` to include service name and staff name**

Rewrite `src/services/telegramMessageFormatter.js`:

```js
import { NOTIFICATION_TYPE } from '../constants/booking.js'

const formatDateTime = (date) => {
	const d = new Date(date)
	const day = String(d.getDate()).padStart(2, '0')
	const month = String(d.getMonth() + 1).padStart(2, '0')
	const year = d.getFullYear()
	const hours = String(d.getHours()).padStart(2, '0')
	const minutes = String(d.getMinutes()).padStart(2, '0')
	return `${day}.${month}.${year} ${hours}:${minutes}`
}

const formatInviteeName = (booking) => booking.inviteeSnapshot?.name || 'Клієнт'

const formatPhone = (booking) =>
	booking.inviteeSnapshot?.phone ? `\n📞 ${booking.inviteeSnapshot.phone}` : ''

const formatEmail = (booking) =>
	booking.inviteeSnapshot?.email ? `\n📧 ${booking.inviteeSnapshot.email}` : ''

const formatContactInfo = (booking) =>
	`${formatPhone(booking)}${formatEmail(booking)}`

const formatServiceName = (booking) => {
	const name = booking.eventTypeId?.name
	return name ? `\n💇 ${name}` : ''
}

const formatStaffName = (staffName) => (staffName ? `\n👨‍💼 ${staffName}` : '')

const formatBookingDetails = (booking, staffName) =>
	`👤 ${formatInviteeName(booking)}${formatContactInfo(booking)}${formatServiceName(booking)}${formatStaffName(staffName)}\n📅 ${formatDateTime(booking.startAt)}`

const MESSAGE_TEMPLATES = {
	[NOTIFICATION_TYPE.BOOKING_CONFIRMED]: (booking, staffName) =>
		`✅ <b>Новий запис</b>\n\n${formatBookingDetails(booking, staffName)}`,

	[NOTIFICATION_TYPE.BOOKING_CANCELLED]: (booking, staffName) =>
		`❌ <b>Запис скасовано</b>\n\n${formatBookingDetails(booking, staffName)}`,

	[NOTIFICATION_TYPE.BOOKING_RESCHEDULED]: (booking, staffName) =>
		`🔄 <b>Запис перенесено</b>\n\n${formatBookingDetails(booking, staffName)}`,

	[NOTIFICATION_TYPE.BOOKING_COMPLETED]: (booking, staffName) =>
		`✔️ <b>Запис завершено</b>\n\n${formatBookingDetails(booking, staffName)}`,

	[NOTIFICATION_TYPE.BOOKING_NO_SHOW]: (booking, staffName) =>
		`🚫 <b>Клієнт не з'явився</b>\n\n${formatBookingDetails(booking, staffName)}`,

	[NOTIFICATION_TYPE.BOOKING_STATUS_CHANGED]: (booking, staffName) =>
		`🔔 <b>Статус змінено</b>\n\n${formatBookingDetails(booking, staffName)}`,
}

const formatNotificationMessage = (type, booking, staffName) => {
	const template = MESSAGE_TEMPLATES[type]
	if (!template) return null
	return template(booking, staffName)
}

export { formatNotificationMessage }
```

- [ ] **Step 4: Commit**

```bash
git add src/repository/bookingRepository.js src/services/notificationServices.js src/services/telegramMessageFormatter.js
git commit -m "feat: добавить название услуги и имя мастера в Telegram-сообщения"
```

---

### Task 3: Add Telegram notification to `updateBookingStatus` (Backend)

**Files:**

- Modify: `src/services/bookingServices.js:115-119`

- [ ] **Step 1: Create status-to-notification-type mapping and update function**

In `src/services/bookingServices.js`, add a mapping and update `updateBookingStatus`:

```js
const STATUS_NOTIFICATION_MAP = {
	[BOOKING_STATUS.CONFIRMED]: NOTIFICATION_TYPE.BOOKING_STATUS_CHANGED,
	[BOOKING_STATUS.COMPLETED]: NOTIFICATION_TYPE.BOOKING_COMPLETED,
	[BOOKING_STATUS.NO_SHOW]: NOTIFICATION_TYPE.BOOKING_NO_SHOW,
	[BOOKING_STATUS.CANCELLED]: NOTIFICATION_TYPE.BOOKING_CANCELLED,
}

const getNotificationType = (status) => STATUS_NOTIFICATION_MAP[status] || null

const updateBookingStatus = async (id, status) => {
	const booking = await findBookingById(id)
	if (!booking) return null

	const result = await repoUpdateStatus(id, status)

	const notificationType = getNotificationType(status)
	if (notificationType) {
		sendStaffTelegramNotification(booking, notificationType).catch((error) =>
			console.error('Telegram notification error:', error.message),
		)
	}

	return result
}
```

Note: Using `.catch()` instead of `await` — fire-and-forget so HTTP response is not blocked by Telegram API latency.

- [ ] **Step 2: Commit**

```bash
git add src/services/bookingServices.js
git commit -m "feat: отправлять Telegram-уведомление при смене статуса букинга"
```

---

### Task 4: Make existing Telegram sends non-blocking (Backend)

**Files:**

- Modify: `src/services/bookingServices.js:80,95,105,140`

- [ ] **Step 1: Replace `await` with fire-and-forget for all existing `sendStaffTelegramNotification` calls**

In `src/services/bookingServices.js`, change all four existing `await sendStaffTelegramNotification(...)` calls to fire-and-forget:

Line 80 in `createBooking`:

```js
// Before:
await sendStaffTelegramNotification(
	rawBooking,
	NOTIFICATION_TYPE.BOOKING_CONFIRMED,
)
// After:
sendStaffTelegramNotification(
	rawBooking,
	NOTIFICATION_TYPE.BOOKING_CONFIRMED,
).catch((error) => console.error('Telegram notification error:', error.message))
```

Line 95 in `cancelBookingById`:

```js
// Before:
await sendStaffTelegramNotification(
	booking,
	NOTIFICATION_TYPE.BOOKING_CANCELLED,
)
// After:
sendStaffTelegramNotification(
	booking,
	NOTIFICATION_TYPE.BOOKING_CANCELLED,
).catch((error) => console.error('Telegram notification error:', error.message))
```

Line 105 in `cancelBookingByToken`:

```js
// Before:
await sendStaffTelegramNotification(
	booking,
	NOTIFICATION_TYPE.BOOKING_CANCELLED,
)
// After:
sendStaffTelegramNotification(
	booking,
	NOTIFICATION_TYPE.BOOKING_CANCELLED,
).catch((error) => console.error('Telegram notification error:', error.message))
```

Line 140 in `rescheduleBookingById`:

```js
// Before:
await sendStaffTelegramNotification(
	updatedBooking,
	NOTIFICATION_TYPE.BOOKING_RESCHEDULED,
)
// After:
sendStaffTelegramNotification(
	updatedBooking,
	NOTIFICATION_TYPE.BOOKING_RESCHEDULED,
).catch((error) => console.error('Telegram notification error:', error.message))
```

- [ ] **Step 2: Commit**

```bash
git add src/services/bookingServices.js
git commit -m "fix: сделать отправку Telegram-уведомлений неблокирующей"
```

---

### Task 5: Add i18n keys for TelegramConnect (Frontend)

**Files:**

- Modify: `i18n/messages/en.json`
- Modify: `i18n/messages/uk.json`

- [ ] **Step 1: Add new translation keys to en.json**

In `i18n/messages/en.json`, replace the `profile.telegram` block:

```json
"telegram": {
  "title": "Telegram Notifications",
  "description": "Receive instant notifications about new bookings and cancellations",
  "connected": "Connected",
  "notConnected": "Not connected",
  "connect": "Connect Telegram",
  "connecting": "Connecting...",
  "disconnect": "Disconnect",
  "disconnecting": "Disconnecting...",
  "disconnected": "Telegram disconnected",
  "checkStatus": "Check status",
  "checking": "Checking...",
  "confirmDisconnectTitle": "Disconnect Telegram?",
  "confirmDisconnectDescription": "You will stop receiving notifications about bookings. You can reconnect at any time.",
  "confirmDisconnectCancel": "Cancel",
  "confirmDisconnectAction": "Disconnect",
  "linkOpened": "Link opened in new tab. Complete the setup in Telegram, then click \"Check status\".",
  "popupBlocked": "Could not open the link. Copy and open it manually:",
  "nowConnected": "Telegram connected successfully!"
}
```

- [ ] **Step 2: Add new translation keys to uk.json**

In `i18n/messages/uk.json`, replace the `profile.telegram` block:

```json
"telegram": {
  "title": "Telegram-сповіщення",
  "description": "Отримуйте миттєві сповіщення про нові записи та скасування",
  "connected": "Підключено",
  "notConnected": "Не підключено",
  "connect": "Підключити Telegram",
  "connecting": "Підключення...",
  "disconnect": "Відключити",
  "disconnecting": "Відключення...",
  "disconnected": "Telegram відключено",
  "checkStatus": "Перевірити статус",
  "checking": "Перевірка...",
  "confirmDisconnectTitle": "Відключити Telegram?",
  "confirmDisconnectDescription": "Ви перестанете отримувати сповіщення про записи. Підключити знову можна в будь-який момент.",
  "confirmDisconnectCancel": "Скасувати",
  "confirmDisconnectAction": "Відключити",
  "linkOpened": "Посилання відкрито в новій вкладці. Завершіть налаштування в Telegram, потім натисніть \"Перевірити статус\".",
  "popupBlocked": "Не вдалося відкрити посилання. Скопіюйте та відкрийте вручну:",
  "nowConnected": "Telegram успішно підключено!"
}
```

- [ ] **Step 3: Commit**

```bash
git add i18n/messages/en.json i18n/messages/uk.json
git commit -m "feat: додати ключі перекладу для покращеного TelegramConnect"
```

---

### Task 6: Remove hardcoded `defaultErrorMessage` from user.config.ts (Frontend)

**Files:**

- Modify: `services/configs/user.config.ts:50-60`

- [ ] **Step 1: Remove English-only defaultErrorMessage from telegram endpoints**

In `services/configs/user.config.ts`, remove `defaultErrorMessage` from `connectTelegram` and `disconnectTelegram`:

```ts
connectTelegram: endpoint<void, ApiResponse<TelegramLinkResponse>>({
  url: () => `/api/user/telegram/connect`,
  method: postData,
}),

disconnectTelegram: endpoint<void, ApiResponse<void>>({
  url: () => `/api/user/telegram/disconnect`,
  method: deleteData,
}),
```

The global toast interceptor with i18n `getErrorMessage` will handle error messages in the user's locale.

- [ ] **Step 2: Commit**

```bash
git add services/configs/user.config.ts
git commit -m "fix: убрать захардкоженные английские defaultErrorMessage для Telegram-эндпоинтов"
```

---

### Task 7: Rewrite TelegramConnect component (Frontend)

**Files:**

- Modify: `components/profile/TelegramConnect.tsx`

- [ ] **Step 1: Rewrite TelegramConnect with all UX improvements**

Replace `components/profile/TelegramConnect.tsx` with:

```tsx
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { userApi } from '@/services'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

interface TelegramConnectProps {
	connected: boolean
	onStatusChange: (connected: boolean) => void
}

function TelegramConnect({ connected, onStatusChange }: TelegramConnectProps) {
	const t = useTranslations('profile.telegram')
	const [loading, setLoading] = useState(false)
	const [showConfirmDisconnect, setShowConfirmDisconnect] = useState(false)
	const [showCheckStatus, setShowCheckStatus] = useState(false)

	const handleConnect = async () => {
		setLoading(true)
		try {
			const response = await userApi.connectTelegram()
			const url = response.data?.url
			if (!url) return

			const opened = window.open(url, '_blank')
			if (opened) {
				toast.info(t('linkOpened'))
			} else {
				toast.info(t('popupBlocked'), { description: url, duration: 15000 })
			}
			setShowCheckStatus(true)
		} catch {
			// toast interceptor handles errors
		} finally {
			setLoading(false)
		}
	}

	const handleCheckStatus = async () => {
		setLoading(true)
		try {
			const response = await userApi.me()
			const isConnected = response.data.telegramConnected
			onStatusChange(isConnected)
			if (isConnected) {
				toast.success(t('nowConnected'))
				setShowCheckStatus(false)
			}
		} catch {
			// toast interceptor handles errors
		} finally {
			setLoading(false)
		}
	}

	const handleDisconnect = async () => {
		setLoading(true)
		setShowConfirmDisconnect(false)
		try {
			await userApi.disconnectTelegram()
			onStatusChange(false)
			toast.success(t('disconnected'))
		} catch {
			// toast interceptor handles errors
		} finally {
			setLoading(false)
		}
	}

	return (
		<>
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="text-lg">{t('title')}</CardTitle>
							<CardDescription>{t('description')}</CardDescription>
						</div>
						<Badge variant={connected ? 'default' : 'secondary'}>
							{connected ? t('connected') : t('notConnected')}
						</Badge>
					</div>
				</CardHeader>
				<CardContent className="flex gap-2">
					{connected ? (
						<Button
							variant="outline"
							onClick={() => setShowConfirmDisconnect(true)}
							disabled={loading}
						>
							{loading ? t('disconnecting') : t('disconnect')}
						</Button>
					) : (
						<>
							<Button onClick={handleConnect} disabled={loading}>
								{loading && !showCheckStatus ? t('connecting') : t('connect')}
							</Button>
							{showCheckStatus && (
								<Button
									variant="outline"
									onClick={handleCheckStatus}
									disabled={loading}
								>
									{loading ? t('checking') : t('checkStatus')}
								</Button>
							)}
						</>
					)}
				</CardContent>
			</Card>

			<AlertDialog
				open={showConfirmDisconnect}
				onOpenChange={setShowConfirmDisconnect}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t('confirmDisconnectTitle')}</AlertDialogTitle>
						<AlertDialogDescription>
							{t('confirmDisconnectDescription')}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>
							{t('confirmDisconnectCancel')}
						</AlertDialogCancel>
						<AlertDialogAction variant="destructive" onClick={handleDisconnect}>
							{t('confirmDisconnectAction')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}

export { TelegramConnect }
```

Key improvements:

- Guard clause: check `response.data?.url` before `window.open`
- Popup blocked fallback: show URL in toast if `window.open` returns null
- "Check status" button: appears after connect, fetches `userApi.me()` to update status
- Confirmation dialog before disconnect (matches existing pattern from PositionList)
- Loading text on buttons ("Підключення...", "Відключення...", "Перевірка...")

- [ ] **Step 2: Commit**

```bash
git add components/profile/TelegramConnect.tsx
git commit -m "feat: покращити UX TelegramConnect — підтвердження, перевірка статусу, popup fallback"
```

---

### Task 8: Fix loading state on profile page (Frontend)

**Files:**

- Modify: `app/[locale]/(personal)/profile/page.tsx:31-36`

- [ ] **Step 1: Replace hardcoded "Loading..." with Spinner**

In `app/[locale]/(personal)/profile/page.tsx`, add Spinner import and replace the loading block:

```tsx
import { Spinner } from '@/components/ui/spinner'
```

Replace the loading return:

```tsx
if (loading) {
	return (
		<div className="flex items-center justify-center py-20">
			<Spinner />
		</div>
	)
}
```

- [ ] **Step 2: Commit**

```bash
git add app/[locale]/(personal)/profile/page.tsx
git commit -m "fix: заменить текст Loading на Spinner на странице профиля"
```
