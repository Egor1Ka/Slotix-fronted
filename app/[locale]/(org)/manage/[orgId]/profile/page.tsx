'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { orgApi } from '@/services'
import type { OrgByIdResponse } from '@/services'
import { ProfileForm } from '@/components/profile/ProfileForm'
import type { ProfileFormData } from '@/components/profile/ProfileForm'

function OrgProfilePage() {
	const params = useParams<{ orgId: string }>()
	const t = useTranslations('profile')
	const [org, setOrg] = useState<OrgByIdResponse | null>(null)
	const [loading, setLoading] = useState(true)

	const orgId = params.orgId

	useEffect(() => {
		const fetchOrg = async () => {
			try {
				const response = await orgApi.getById({
					pathParams: { id: orgId },
				})
				setOrg(response.data)
			} catch {
				// toast interceptor handles errors
			} finally {
				setLoading(false)
			}
		}

		fetchOrg()
	}, [orgId])

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

	return (
		<div className="mx-auto max-w-2xl p-6">
			<h1 className="mb-6 text-2xl font-bold">{t('orgTitle')}</h1>
			<ProfileForm defaultValues={defaultValues} onSubmit={handleSubmit} />
		</div>
	)
}

export default OrgProfilePage
