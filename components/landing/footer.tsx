import { getTranslations } from 'next-intl/server'
import { Logo } from '@/components/logo'

async function Footer() {
	const t = await getTranslations('landing')

	return (
		<footer data-slot="landing-footer" className="border-border/40 border-t">
			<div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
				<div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
					<Logo size="sm" label={t('nav.logo')} />
					<nav className="flex flex-wrap gap-6">
						<span className="text-muted-foreground text-sm">
							{t('footer.docs')}
						</span>
						<span className="text-muted-foreground text-sm">
							{t('footer.api')}
						</span>
						<span className="text-muted-foreground text-sm">
							{t('footer.privacy')}
						</span>
						<span className="text-muted-foreground text-sm">
							{t('footer.terms')}
						</span>
					</nav>
				</div>
				<div className="border-border/40 mt-8 border-t pt-8">
					<p className="text-muted-foreground text-xs">
						{t('footer.copyright')}
					</p>
				</div>
			</div>
		</footer>
	)
}

export { Footer }
