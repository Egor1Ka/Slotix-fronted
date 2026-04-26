'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { orgApi } from '@/services'
import type { OrgByIdResponse } from '@/services'
import { ProfileForm } from '@/components/profile/ProfileForm'
import type { ProfileFormData } from '@/components/profile/ProfileForm'
import { TimezoneSelector } from '@/components/shared/TimezoneSelector'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
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

function OrgProfilePage() {
	const params = useParams<{ orgId: string }>()
	const t = useTranslations('profile')
	const tOrg = useTranslations('organizations')
	const [org, setOrg] = useState<OrgByIdResponse | null>(null)
	const [loading, setLoading] = useState(true)
	const [timezone, setTimezone] = useState('')
	const [pendingTimezone, setPendingTimezone] = useState<string | null>(null)
	const [savingTz, setSavingTz] = useState(false)

	const orgId = params.orgId

	const fetchOrg = useCallback(async () => {
		try {
			const response = await orgApi.getById({
				pathParams: { id: orgId },
			})
			setOrg(response.data)
			setTimezone(response.data.timezone ?? '')
		} catch {
			// toast interceptor handles errors
		} finally {
			setLoading(false)
		}
	}, [orgId])

	useEffect(() => {
		fetchOrg()
	}, [fetchOrg])

	if (loading) {
		return (
			<div className="flex items-center justify-center py-20">
				<p className="text-muted-foreground text-sm">Loading...</p>
			</div>
		)
	}

	if (!org) return null

	const defaultValues: ProfileFormData = {
		name: org.name,
		description: org.description ?? '',
		address: org.address ?? '',
		phone: org.phone ?? '',
		website: org.website ?? '',
	}

	const handleSubmit = async (data: ProfileFormData) => {
		await orgApi.update({
			pathParams: { id: orgId },
			body: {
				name: data.name,
				description: data.description || null,
				address: data.address || null,
				phone: data.phone || null,
				website: data.website || null,
			},
		})
		setOrg((prev) =>
			prev
				? {
						...prev,
						name: data.name,
						description: data.description || null,
						address: data.address || null,
						phone: data.phone || null,
						website: data.website || null,
					}
				: prev,
		)
	}

	const handleTimezoneSaveClick = () => {
		setPendingTimezone(timezone)
	}

	const handleTimezoneConfirm = async () => {
		if (!pendingTimezone) return
		setSavingTz(true)
		try {
			await orgApi.update({
				pathParams: { id: orgId },
				body: { timezone: pendingTimezone },
			})
			setOrg((prev) => (prev ? { ...prev, timezone: pendingTimezone } : prev))
			toast.success(tOrg('timezoneSaved'))
		} catch {
			setTimezone(org.timezone ?? '')
		} finally {
			setPendingTimezone(null)
			setSavingTz(false)
		}
	}

	const handleTimezoneCancel = () => {
		setPendingTimezone(null)
	}

	return (
		<div className="mx-auto max-w-2xl space-y-6 p-6">
			<h1 className="mb-6 text-2xl font-bold">{t('orgTitle')}</h1>
			<ProfileForm defaultValues={defaultValues} onSubmit={handleSubmit} />

			<Separator />

			<div className="space-y-4">
				<h2 className="text-lg font-semibold">{tOrg('timezoneSection')}</h2>
				<TimezoneSelector
					value={timezone}
					onChange={setTimezone}
					hint={tOrg('timezoneHint')}
					disabled={savingTz}
				/>
				<Button onClick={handleTimezoneSaveClick} disabled={savingTz}>
					{tOrg('timezoneSave')}
				</Button>
			</div>

			<AlertDialog
				open={pendingTimezone !== null}
				onOpenChange={handleTimezoneCancel}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{tOrg('timezoneWarningTitle')}</AlertDialogTitle>
						<AlertDialogDescription>
							{tOrg('timezoneWarningDesc')}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={handleTimezoneCancel}>
							{tOrg('timezoneWarningCancel')}
						</AlertDialogCancel>
						<AlertDialogAction onClick={handleTimezoneConfirm}>
							{tOrg('timezoneWarningConfirm')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}

export default OrgProfilePage
