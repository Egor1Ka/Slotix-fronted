import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { LanguageSwitcher } from '@/components/language-switcher'

export default async function Home() {
	const t = await getTranslations('home')

	const routes = [
		{
			href: '/demo',
			label: t('demo'),
			description: t('demoDescription'),
		},
		{
			href: '/login',
			label: t('login'),
			description: t('loginDescription'),
		},
		{
			href: '/signup',
			label: t('signup'),
			description: t('signupDescription'),
		},
		{
			href: '/shadcndemo',
			label: t('shadcnDemo'),
			description: t('shadcnDemoDescription'),
		},
	]

	return (
		<div className="bg-background flex min-h-screen items-center justify-center">
			<main className="flex w-full max-w-lg flex-col gap-8 px-6 py-16">
				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between">
						<h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
						<LanguageSwitcher />
					</div>
					<p className="text-muted-foreground">{t('description')}</p>
				</div>
				<nav className="flex flex-col gap-3">
					{routes.map((route) => (
						<Link
							key={route.href}
							href={route.href}
							className="group border-border hover:bg-muted flex flex-col gap-1 rounded-lg border p-4 transition-colors"
						>
							<span className="font-medium group-hover:underline">
								{route.label}
							</span>
							<span className="text-muted-foreground text-sm">
								{route.description}
							</span>
						</Link>
					))}
				</nav>
			</main>
		</div>
	)
}
