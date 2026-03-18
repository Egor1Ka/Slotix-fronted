import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

async function Footer() {
	const t = await getTranslations('landing')

	return (
		<footer data-slot="landing-footer" className="border-border/40 border-t">
			<div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
				<div className="flex flex-col gap-12 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<span className="font-display text-3xl font-semibold tracking-tight italic">
							{t('nav.logo')}
						</span>
						<p className="text-muted-foreground mt-2 max-w-sm text-sm">
							{t('hero.subtitle')}
						</p>
					</div>
					<nav className="flex gap-6">
						<Link
							href="/demo"
							className="text-muted-foreground hover:text-foreground text-sm transition-colors"
						>
							{t('footer.demo')}
						</Link>
						<Link
							href="/shadcndemo"
							className="text-muted-foreground hover:text-foreground text-sm transition-colors"
						>
							{t('footer.components')}
						</Link>
					</nav>
				</div>
				<div className="border-border/40 mt-12 border-t pt-8">
					<p className="text-muted-foreground text-xs">
						{t('footer.copyright')}
					</p>
				</div>
			</div>
		</footer>
	)
}

export { Footer }
