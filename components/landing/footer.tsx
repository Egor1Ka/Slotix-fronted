import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

async function Footer() {
	const t = await getTranslations('landing')

	return (
		<footer data-slot="landing-footer" className="border-t border-border/40">
			<div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
				<div className="flex flex-col gap-12 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<span className="font-display text-3xl font-semibold italic tracking-tight">
							{t('nav.logo')}
						</span>
						<p className="mt-2 max-w-sm text-sm text-muted-foreground">
							{t('hero.subtitle')}
						</p>
					</div>
					<nav className="flex gap-6">
						<Link
							href="/demo"
							className="text-sm text-muted-foreground transition-colors hover:text-foreground"
						>
							{t('footer.demo')}
						</Link>
						<Link
							href="/shadcndemo"
							className="text-sm text-muted-foreground transition-colors hover:text-foreground"
						>
							{t('footer.components')}
						</Link>
					</nav>
				</div>
				<div className="mt-12 border-t border-border/40 pt-8">
					<p className="text-xs text-muted-foreground">
						{t('footer.copyright')}
					</p>
				</div>
			</div>
		</footer>
	)
}

export { Footer }
