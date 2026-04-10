'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'

interface OrgDeactivatedBannerProps {
	variant: 'owner' | 'member' | 'public'
}

function OrgDeactivatedBanner({ variant }: OrgDeactivatedBannerProps) {
	const t = useTranslations('billing.orgDeactivated')
	const router = useRouter()

	const handleRenew = () => {
		router.push('/billing')
	}

	return (
		<div className="flex min-h-[60vh] items-center justify-center p-6">
			<Card className="max-w-md">
				<CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
					<AlertTriangle className="text-destructive size-12" />
					<p className="text-lg font-medium">{t(variant)}</p>
					{variant === 'owner' && (
						<Button onClick={handleRenew}>{t('renewLink')}</Button>
					)}
				</CardContent>
			</Card>
		</div>
	)
}

export { OrgDeactivatedBanner }
