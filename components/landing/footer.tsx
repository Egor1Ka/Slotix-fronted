import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

async function Footer() {
	const t = await getTranslations('landing')

	return (
		<footer data-slot="landing-footer" className="border-border/40 border-t">
			<div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6 lg:px-8">
				<p className="text-muted-foreground text-sm">{t('footer.copyright')}</p>
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
		</footer>
	)
}

export { Footer }
