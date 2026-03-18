import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { LanguageSwitcher } from '@/components/language-switcher'

async function Header() {
	const t = await getTranslations('landing')

	return (
		<header
			data-slot="landing-header"
			className="border-border/40 bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur-xl"
		>
			<div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
				<Link
					href="/"
					className="font-display text-xl font-semibold tracking-tight italic"
				>
					{t('nav.logo')}
				</Link>

				<nav className="hidden items-center gap-8 md:flex">
					<Link
						href="#features"
						className="text-muted-foreground hover:text-foreground font-mono text-xs tracking-wider uppercase transition-colors"
					>
						{t('nav.features')}
					</Link>
					<Link
						href="#pricing"
						className="text-muted-foreground hover:text-foreground font-mono text-xs tracking-wider uppercase transition-colors"
					>
						{t('nav.pricing')}
					</Link>
				</nav>

				<div className="flex items-center gap-3">
					<LanguageSwitcher />
					<Link
						href="/login"
						className="text-muted-foreground hover:text-foreground inline-flex h-8 items-center justify-center rounded-lg px-3 text-sm font-medium transition-all"
					>
						{t('nav.login')}
					</Link>
					<Link
						href="/signup"
						className="bg-foreground text-background inline-flex h-8 items-center justify-center rounded-lg px-4 text-sm font-medium transition-all hover:opacity-90"
					>
						{t('nav.signup')}
					</Link>
				</div>
			</div>
		</header>
	)
}

export { Header }
