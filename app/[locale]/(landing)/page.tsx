import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import {
	Zap,
	Shield,
	Smartphone,
	Globe,
	LayoutGrid,
	Wrench,
	Check,
} from 'lucide-react'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'

const featureIcons = {
	performance: Zap,
	secure: Shield,
	responsive: Smartphone,
	i18n: Globe,
	components: LayoutGrid,
	dx: Wrench,
} as const

export default async function LandingPage() {
	const t = await getTranslations('landing')

	const featureKeys = [
		'performance',
		'secure',
		'responsive',
		'i18n',
		'components',
		'dx',
	] as const
	const planKeys = ['free', 'pro', 'enterprise'] as const

	return (
		<div className="flex flex-col">
			{/* Hero */}
			<section className="flex flex-col items-center gap-8 px-4 py-24 text-center sm:px-6 sm:py-32 lg:px-8">
				<h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
					{t('hero.title')}
				</h1>
				<p className="text-muted-foreground max-w-2xl text-lg sm:text-xl">
					{t('hero.subtitle')}
				</p>
				<Link
					href="/signup"
					className="bg-primary text-primary-foreground inline-flex h-9 items-center justify-center rounded-lg px-4 text-sm font-medium transition-all hover:opacity-90"
				>
					{t('hero.cta')}
				</Link>
			</section>

			{/* Features */}
			<section id="features" className="bg-muted/50 px-4 py-24 sm:px-6 lg:px-8">
				<div className="mx-auto max-w-7xl">
					<div className="mb-16 flex flex-col items-center gap-4 text-center">
						<h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
							{t('features.title')}
						</h2>
						<p className="text-muted-foreground max-w-2xl text-lg">
							{t('features.subtitle')}
						</p>
					</div>
					<div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
						{featureKeys.map((key) => {
							const Icon = featureIcons[key]
							return (
								<Card key={key} className="border-0 bg-transparent shadow-none">
									<CardHeader>
										<div className="bg-primary/10 text-primary mb-2 flex h-10 w-10 items-center justify-center rounded-lg">
											<Icon className="h-5 w-5" />
										</div>
										<CardTitle className="text-lg">
											{t(`features.items.${key}.title`)}
										</CardTitle>
									</CardHeader>
									<CardContent>
										<p className="text-muted-foreground text-sm">
											{t(`features.items.${key}.description`)}
										</p>
									</CardContent>
								</Card>
							)
						})}
					</div>
				</div>
			</section>

			{/* Pricing */}
			<section id="pricing" className="px-4 py-24 sm:px-6 lg:px-8">
				<div className="mx-auto max-w-7xl">
					<div className="mb-16 flex flex-col items-center gap-4 text-center">
						<h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
							{t('pricing.title')}
						</h2>
						<p className="text-muted-foreground max-w-2xl text-lg">
							{t('pricing.subtitle')}
						</p>
					</div>
					<div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-3">
						{planKeys.map((key) => {
							const features: string[] = t.raw(`pricing.plans.${key}.features`)
							return (
								<Card
									key={key}
									className={key === 'pro' ? 'border-primary shadow-lg' : ''}
								>
									<CardHeader>
										<CardTitle>{t(`pricing.plans.${key}.name`)}</CardTitle>
										<CardDescription>
											{t(`pricing.plans.${key}.description`)}
										</CardDescription>
										<div className="mt-4 flex items-baseline gap-1">
											<span className="text-4xl font-bold">
												{t(`pricing.plans.${key}.price`)}
											</span>
											<span className="text-muted-foreground text-sm">
												{t(`pricing.plans.${key}.period`)}
											</span>
										</div>
									</CardHeader>
									<CardContent>
										<ul className="flex flex-col gap-3">
											{features.map((feature) => (
												<li
													key={feature}
													className="flex items-center gap-2 text-sm"
												>
													<Check className="text-primary h-4 w-4 shrink-0" />
													{feature}
												</li>
											))}
										</ul>
									</CardContent>
									<CardFooter>
										<Link
											href="/signup"
											className={
												key === 'pro'
													? 'bg-primary text-primary-foreground inline-flex h-8 w-full items-center justify-center rounded-lg px-2.5 text-sm font-medium transition-all hover:opacity-90'
													: 'border-border bg-background hover:bg-muted hover:text-foreground inline-flex h-8 w-full items-center justify-center rounded-lg border px-2.5 text-sm font-medium transition-all'
											}
										>
											{t('hero.cta')}
										</Link>
									</CardFooter>
								</Card>
							)
						})}
					</div>
				</div>
			</section>

			{/* CTA */}
			<section className="bg-muted/50 px-4 py-24 sm:px-6 lg:px-8">
				<div className="mx-auto flex max-w-3xl flex-col items-center gap-8 text-center">
					<h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
						{t('cta.title')}
					</h2>
					<p className="text-muted-foreground max-w-2xl text-lg">
						{t('cta.subtitle')}
					</p>
					<Link
						href="/signup"
						className="bg-primary text-primary-foreground inline-flex h-9 items-center justify-center rounded-lg px-4 text-sm font-medium transition-all hover:opacity-90"
					>
						{t('cta.button')}
					</Link>
				</div>
			</section>
		</div>
	)
}
