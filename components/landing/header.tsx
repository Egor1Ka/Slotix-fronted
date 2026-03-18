import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { LanguageSwitcher } from '@/components/language-switcher'

async function Header() {
	const t = await getTranslations('landing')

	return (
		<header
			data-slot="landing-header"
			className="border-border/40 bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur"
		>
			<div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
				<Link href="/" className="text-xl font-bold tracking-tight">
					{t('nav.logo')}
				</Link>

				<nav className="hidden items-center gap-6 md:flex">
					<Link
						href="#features"
						className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
					>
						{t('nav.features')}
					</Link>
					<Link
						href="#pricing"
						className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
					>
						{t('nav.pricing')}
					</Link>
				</nav>

				<div className="flex items-center gap-3">
					<LanguageSwitcher />
					<Link
						href="/login"
						className="hover:bg-muted hover:text-foreground inline-flex h-7 items-center justify-center rounded-lg px-2.5 text-sm font-medium transition-all"
					>
						{t('nav.login')}
					</Link>
					<Link
						href="/signup"
						className="bg-primary text-primary-foreground inline-flex h-7 items-center justify-center rounded-lg px-2.5 text-sm font-medium transition-all hover:opacity-90"
					>
						{t('nav.signup')}
					</Link>
				</div>
			</div>
		</header>
	)
}

export { Header }
