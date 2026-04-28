'use client'

import { use, useEffect, useState } from 'react'
import { ServicesList } from '@/components/services/ServicesList'
import { orgApi } from '@/lib/booking-api-client'

export default function ServicesPage({
	params,
}: {
	params: Promise<{ orgId: string }>
}) {
	const { orgId } = use(params)
	const [currency, setCurrency] = useState<'UAH' | 'USD'>('UAH')

	useEffect(() => {
		const loadCurrency = async () => {
			try {
				const org = await orgApi.getById(orgId)
				if (org.currency) setCurrency(org.currency)
			} catch {
				// toast interceptor handles errors
			}
		}
		loadCurrency()
	}, [orgId])

	return (
		<div className="container max-w-3xl py-6">
			<ServicesList ownerId={orgId} ownerType="org" currency={currency} />
		</div>
	)
}
