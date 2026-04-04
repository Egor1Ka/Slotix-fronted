'use client'

import { useTranslations } from 'next-intl'
import { useUserOrgs } from '@/lib/hooks/useUserOrgs'
import { OrgCard } from '@/components/organizations/OrgCard'
import { CreateOrgDialog } from '@/components/organizations/CreateOrgDialog'
import { Spinner } from '@/components/ui/spinner'
import type { OrgListItem } from '@/services'

function OrganizationsPage() {
	const t = useTranslations('organizations')
	const { orgs, isLoading, refetch } = useUserOrgs()

	const renderOrgCard = (org: OrgListItem) => (
		<OrgCard key={org.id} org={org} onInvitationHandled={refetch} />
	)

	return (
		<div className="container mx-auto p-6">
			<div className="mb-6 flex items-center justify-between">
				<h1 className="text-2xl font-bold">{t('title')}</h1>
				<CreateOrgDialog onCreated={refetch} />
			</div>

			{isLoading ? (
				<div className="flex min-h-[200px] items-center justify-center">
					<Spinner />
				</div>
			) : orgs.length === 0 ? (
				<div className="text-muted-foreground flex min-h-[200px] items-center justify-center">
					<p>{t('empty')}</p>
				</div>
			) : (
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
					{orgs.map(renderOrgCard)}
				</div>
			)}
		</div>
	)
}

export default OrganizationsPage
