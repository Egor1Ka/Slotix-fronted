import { getTranslations } from 'next-intl/server'

async function Footer() {
	const t = await getTranslations('landing')

	return (
		<footer data-slot="landing-footer" className="border-border/40 border-t">
			<div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
				<div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
					<span className="flex items-center gap-2 text-lg font-bold tracking-tight">
						<span className="bg-primary text-primary-foreground inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-black">
							S
						</span>
						{t('nav.logo')}
					</span>
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
