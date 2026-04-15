'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { userApi } from '@/services'
import type { User } from '@/services'
import { ProfileForm } from '@/components/profile/ProfileForm'
import type { ProfileFormData } from '@/components/profile/ProfileForm'
import { TelegramConnect } from '@/components/profile/TelegramConnect'
import { TimezoneSelector } from '@/components/shared/TimezoneSelector'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { scheduleApi } from '@/lib/booking-api-client'
import type { ScheduleTemplate } from '@/services/configs/booking.types'

function PersonalProfilePage() {
	const t = useTranslations('profile')
	const [user, setUser] = useState<User | null>(null)
	const [loading, setLoading] = useState(true)
	const [schedule, setSchedule] = useState<ScheduleTemplate | null>(null)
	const [timezone, setTimezone] = useState('')
	const [savingTz, setSavingTz] = useState(false)

	const fetchUser = useCallback(async () => {
		try {
			const response = await userApi.me()
			setUser(response.data)
		} catch {
			// toast interceptor handles errors
		} finally {
			setLoading(false)
		}
	}, [])

	const fetchSchedule = useCallback(async (staffId: string) => {
		try {
			const data = await scheduleApi.getTemplate(staffId, undefined)
			setSchedule(data)
			setTimezone(data.timezone)
		} catch {
			// toast interceptor handles errors
		}
	}, [])

	useEffect(() => {
		fetchUser()
	}, [fetchUser])

	useEffect(() => {
		if (user) fetchSchedule(user.id)
	}, [user, fetchSchedule])

	if (loading) {
		return (
			<div className="flex items-center justify-center py-20">
				<Spinner />
			</div>
		)
	}

	if (!user) return null

	const defaultValues: ProfileFormData = {
		name: user.name,
		description: user.description ?? '',
		address: user.address ?? '',
		phone: user.phone ?? '',
		website: user.website ?? '',
	}

	const handleTelegramStatusChange = (connected: boolean) => {
		setUser((prev) => (prev ? { ...prev, telegramConnected: connected } : prev))
	}

	const handleSubmit = async (data: ProfileFormData) => {
		await userApi.update({
			pathParams: { id: user.id },
			body: {
				name: data.name,
				description: data.description || null,
				address: data.address || null,
				phone: data.phone || null,
				website: data.website || null,
			},
		})
		setUser((prev) =>
			prev
				? {
						...prev,
						name: data.name,
						description: data.description ?? null,
						address: data.address ?? null,
						phone: data.phone ?? null,
						website: data.website ?? null,
					}
				: prev,
		)
	}

	const handleTimezoneSave = async () => {
		if (!schedule) return
		setSavingTz(true)
		try {
			await scheduleApi.updateTemplate(
				user.id,
				null,
				schedule.weeklyHours,
				schedule.slotMode,
				schedule.slotStepMin,
				timezone,
			)
			await fetchSchedule(user.id)
			toast.success(t('timezoneSaved'))
		} catch {
			setTimezone(schedule.timezone)
		} finally {
			setSavingTz(false)
		}
	}

	return (
		<div className="mx-auto max-w-2xl space-y-6 p-6">
			<h1 className="text-2xl font-bold">{t('myTitle')}</h1>
			<ProfileForm defaultValues={defaultValues} onSubmit={handleSubmit} />
			{schedule && (
				<>
					<Separator />
					<div className="space-y-4">
						<h2 className="text-lg font-semibold">{t('timezone')}</h2>
						<TimezoneSelector
							value={timezone}
							onChange={setTimezone}
							hint={t('timezoneHint')}
							disabled={savingTz}
						/>
						<Button onClick={handleTimezoneSave} disabled={savingTz}>
							{t('timezoneSave')}
						</Button>
					</div>
				</>
			)}
			<Separator />
			<TelegramConnect
				connected={user.telegramConnected}
				onStatusChange={handleTelegramStatusChange}
			/>
		</div>
	)
}

export default PersonalProfilePage
