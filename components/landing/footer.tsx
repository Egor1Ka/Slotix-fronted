import Link from 'next/link'
import { Mail } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { Logo } from '@/components/logo'

const SUPPORT_EMAIL = 'egorzozulia@gmail.com'

async function Footer() {
	const t = await getTranslations('landing')

	return (
		<footer data-slot="landing-footer" className="border-border/40 border-t">
			<div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
				<div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex flex-col gap-3">
						<Logo size="sm" label={t('nav.logo')} />
						<a
							href={`mailto:${SUPPORT_EMAIL}`}
							className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm transition-colors"
						>
							<Mail className="h-4 w-4" aria-hidden="true" />
							<span>
								{t('footer.support')}: {SUPPORT_EMAIL}
							</span>
						</a>
					</div>

					<nav className="flex flex-wrap gap-6">
						<Link
							href="/privacy"
							className="text-muted-foreground hover:text-foreground text-sm transition-colors"
						>
							{t('footer.privacy')}
						</Link>
						<Link
							href="/terms"
							className="text-muted-foreground hover:text-foreground text-sm transition-colors"
						>
							{t('footer.terms')}
						</Link>
						<a
							href={`mailto:${SUPPORT_EMAIL}`}
							className="text-muted-foreground hover:text-foreground text-sm transition-colors"
						>
							{t('footer.contact')}
						</a>
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
