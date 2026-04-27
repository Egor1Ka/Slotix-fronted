import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { LogoMark } from '@/components/logo'

const SUPPORT_EMAIL = 'egorzozulia@gmail.com'
const currentYear = new Date().getFullYear()

async function AppFooter() {
	const t = await getTranslations('landing.footer')

	return (
		<footer
			data-slot="app-footer"
			className="border-border/40 mt-auto border-t"
		>
			<div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-3 px-4 py-3 text-xs sm:h-10 sm:flex-row sm:gap-2 sm:px-6 sm:py-0 lg:px-8">
				<Link
					href="/"
					aria-label="Slotix"
					className="group inline-flex items-center gap-2 transition-opacity hover:opacity-80"
				>
					<LogoMark size={18} />
					<span className="text-foreground text-sm font-semibold tracking-tight">
						Slotix
					</span>
				</Link>
				<span className="text-muted-foreground/40 hidden select-none sm:inline">
					·
				</span>
				<span className="text-muted-foreground">© {currentYear}</span>
				<span className="text-muted-foreground/40 hidden select-none sm:inline">
					·
				</span>
				<Link
					href="/privacy"
					className="text-muted-foreground hover:text-foreground transition-colors"
				>
					{t('privacy')}
				</Link>
				<span className="text-muted-foreground/40 hidden select-none sm:inline">
					·
				</span>
				<Link
					href="/terms"
					className="text-muted-foreground hover:text-foreground transition-colors"
				>
					{t('terms')}
				</Link>
				<span className="text-muted-foreground/40 hidden select-none sm:inline">
					·
				</span>
				<a
					href={`mailto:${SUPPORT_EMAIL}`}
					className="text-muted-foreground hover:text-foreground transition-colors"
				>
					{SUPPORT_EMAIL}
				</a>
			</div>
		</footer>
	)
}

export { AppFooter }
