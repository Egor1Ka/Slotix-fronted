'use client'

import { BarChart3 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

interface EmptyStatsStateProps {
	onExpandRange: () => void
}

function EmptyStatsState({ onExpandRange }: EmptyStatsStateProps) {
	const t = useTranslations('stats.empty')

	return (
		<div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
			<BarChart3 className="text-muted-foreground size-12" />
			<div className="text-muted-foreground">{t('title')}</div>
			<Button variant="outline" onClick={onExpandRange}>
				{t('expandRange')}
			</Button>
		</div>
	)
}

export { EmptyStatsState }
