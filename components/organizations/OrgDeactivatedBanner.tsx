'use client'

import { AlertTriangle, ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ThemeToggle } from '@/components/theme-toggle'

interface OrgDeactivatedBannerProps {
	variant: 'owner' | 'member' | 'public'
}

function OrgDeactivatedBanner({ variant }: OrgDeactivatedBannerProps) {
	const t = useTranslations('billing.orgDeactivated')

	return (
		<div className="bg-background fixed inset-0 z-50 flex flex-col">
			<header className="flex items-center justify-end gap-1 p-4">
				<LanguageSwitcher />
				<ThemeToggle />
			</header>
			<div className="flex flex-1 items-center justify-center p-6">
				<div className="flex max-w-lg flex-col items-center gap-6 text-center">
					<div className="bg-destructive/10 flex size-20 items-center justify-center rounded-full">
						<AlertTriangle className="text-destructive size-10" />
					</div>
					<h1 className="text-2xl font-bold">{t(variant)}</h1>
					<p className="text-muted-foreground text-lg">
						{t('description')}
					</p>
					<Link
						href="/#pricing"
						className="group mt-2 inline-flex h-12 items-center gap-2 rounded-xl bg-emerald-600 px-8 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 transition-all hover:bg-emerald-700 hover:shadow-emerald-600/40"
					>
						{t('renewLink')}
						<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
					</Link>
				</div>
			</div>
		</div>
	)
}

export { OrgDeactivatedBanner }
