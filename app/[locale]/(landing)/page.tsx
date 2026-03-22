import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import type { BillingCatalog } from '@/services/server'
import { billingServerApi } from '@/services/server'
import { formatPrice } from '@/lib/billing'
import {
	Zap,
	Shield,
	Smartphone,
	Globe,
	LayoutGrid,
	Wrench,
	Check,
	ArrowRight,
} from 'lucide-react'

const featureIcons = {
	performance: Zap,
	secure: Shield,
	responsive: Smartphone,
	i18n: Globe,
	components: LayoutGrid,
	dx: Wrench,
} as const

const featureLayout = [
	{ key: 'performance' as const, wide: true },
	{ key: 'secure' as const, wide: false },
	{ key: 'responsive' as const, wide: false },
	{ key: 'i18n' as const, wide: true },
	{ key: 'components' as const, wide: true },
	{ key: 'dx' as const, wide: false },
]

export default async function LandingPage() {
	const t = await getTranslations('landing')
	const tBilling = await getTranslations('billing')
	const fallbackCatalog: BillingCatalog = {
		plans: [],
		products: [],
		hierarchy: ['free', 'pro'],
	}
	const catalog = await billingServerApi
		.catalog()
		.then((res) => res.data)
		.catch(() => fallbackCatalog)
	const planKeys = catalog.hierarchy

	return (
		<div className="flex flex-col">
			{/* Hero */}
			<section className="relative flex min-h-[90vh] items-center overflow-hidden px-4 py-32 sm:px-6 lg:px-8">
				<div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
					<div className="absolute top-[20%] left-[10%] h-[600px] w-[600px] animate-[landing-mesh-1_20s_ease-in-out_infinite] rounded-full bg-[oklch(0.85_0.25_128_/_0.07)] blur-[120px]" />
					<div className="absolute top-[10%] right-[10%] h-[500px] w-[500px] animate-[landing-mesh-2_25s_ease-in-out_infinite] rounded-full bg-[oklch(0.75_0.15_210_/_0.05)] blur-[100px]" />
					<div className="absolute bottom-[10%] left-[30%] h-[400px] w-[400px] animate-[landing-mesh-3_22s_ease-in-out_infinite] rounded-full bg-[oklch(0.80_0.12_60_/_0.06)] blur-[100px]" />
				</div>

				<div className="pointer-events-none absolute top-1/2 right-[5%] hidden -translate-y-1/2 lg:block">
					<div className="border-foreground/[0.08] relative h-[480px] w-[480px] animate-[spin_80s_linear_infinite] rounded-full border border-dashed">
						<div className="absolute top-0 left-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[oklch(0.85_0.25_128)]" />
						<div className="bg-foreground/20 absolute bottom-0 left-1/2 h-1.5 w-1.5 -translate-x-1/2 translate-y-1/2 rounded-full" />
					</div>
				</div>

				<div className="relative mx-auto w-full max-w-7xl">
					<div className="max-w-3xl">
						<div className="border-border/60 mb-10 inline-flex animate-[landing-reveal_0.6s_ease_both] items-center gap-2.5 rounded-full border px-4 py-1.5">
							<span className="h-2 w-2 rounded-full bg-[oklch(0.85_0.25_128)]" />
							<span className="text-muted-foreground font-mono text-xs">
								{t('hero.badge')}
							</span>
						</div>

						<h1 className="font-display animate-[landing-reveal_0.7s_0.1s_ease_both] text-5xl leading-[0.95] font-semibold tracking-tight italic sm:text-6xl lg:text-7xl xl:text-8xl">
							{t('hero.title')}
						</h1>

						<p className="text-muted-foreground mt-8 max-w-xl animate-[landing-reveal_0.7s_0.2s_ease_both] text-lg leading-relaxed sm:text-xl">
							{t('hero.subtitle')}
						</p>

						<div className="mt-12 flex animate-[landing-reveal_0.7s_0.3s_ease_both] items-center gap-6">
							<Link
								href="/signup"
								className="group bg-foreground text-background inline-flex h-11 items-center gap-2 rounded-lg px-6 text-sm font-medium transition-all hover:opacity-90"
							>
								{t('hero.cta')}
								<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
							</Link>
							<Link
								href="#features"
								className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
							>
								{t('nav.features')} &rarr;
							</Link>
						</div>

						<div className="text-muted-foreground/60 mt-20 flex animate-[landing-reveal_0.7s_0.4s_ease_both] flex-wrap items-center gap-x-6 gap-y-2 font-mono text-xs">
							<span>Next.js 16</span>
							<span className="bg-border hidden h-3.5 w-px sm:block" />
							<span>React 19</span>
							<span className="bg-border hidden h-3.5 w-px sm:block" />
							<span>TypeScript 5</span>
							<span className="bg-border hidden h-3.5 w-px sm:block" />
							<span>Tailwind 4</span>
							<span className="bg-border hidden h-3.5 w-px sm:block" />
							<span>shadcn/ui</span>
						</div>
					</div>
				</div>
			</section>

			<div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="bg-border h-px" />
			</div>

			{/* Features — Bento Grid */}
			<section id="features" className="px-4 py-28 sm:px-6 lg:px-8">
				<div className="mx-auto max-w-7xl">
					<div className="mb-16 max-w-2xl">
						<span className="mb-4 block font-mono text-xs tracking-widest text-[oklch(0.85_0.25_128)] uppercase">
							{t('nav.features')}
						</span>
						<h2 className="font-display text-3xl font-semibold tracking-tight italic sm:text-4xl lg:text-5xl">
							{t('features.title')}
						</h2>
						<p className="text-muted-foreground mt-4 text-lg">
							{t('features.subtitle')}
						</p>
					</div>

					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{featureLayout.map(({ key, wide }, i) => {
							const Icon = featureIcons[key]
							return (
								<div
									key={key}
									className={`group border-border/60 hover:border-foreground/20 relative overflow-hidden rounded-2xl border p-8 transition-all duration-300 hover:shadow-lg ${wide ? 'lg:col-span-2' : ''}`}
								>
									<span className="text-foreground/[0.03] absolute top-6 right-6 font-mono text-[80px] leading-none font-bold">
										{String(i + 1).padStart(2, '0')}
									</span>
									<div className="relative">
										<div className="bg-foreground/[0.05] text-foreground mb-5 flex h-10 w-10 items-center justify-center rounded-lg transition-colors group-hover:bg-[oklch(0.85_0.25_128_/_0.15)] group-hover:text-[oklch(0.45_0.2_128)] dark:group-hover:text-[oklch(0.85_0.25_128)]">
											<Icon className="h-5 w-5" />
										</div>
										<h3 className="mb-2 text-lg font-semibold">
											{t(`features.items.${key}.title`)}
										</h3>
										<p className="text-muted-foreground text-sm leading-relaxed">
											{t(`features.items.${key}.description`)}
										</p>
									</div>
								</div>
							)
						})}
					</div>
				</div>
			</section>

			<div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="bg-border h-px" />
			</div>

			{/* Pricing */}
			<section id="pricing" className="px-4 py-28 sm:px-6 lg:px-8">
				<div className="mx-auto max-w-7xl">
					<div className="mb-16 max-w-2xl">
						<span className="mb-4 block font-mono text-xs tracking-widest text-[oklch(0.85_0.25_128)] uppercase">
							{t('nav.pricing')}
						</span>
						<h2 className="font-display text-3xl font-semibold tracking-tight italic sm:text-4xl lg:text-5xl">
							{t('pricing.title')}
						</h2>
						<p className="text-muted-foreground mt-4 text-lg">
							{t('pricing.subtitle')}
						</p>
					</div>

					<div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-2">
						{planKeys.map((key) => {
							const features: string[] = tBilling.raw(`plans.${key}.features`)
							const catalogPlan = catalog.plans.find((p) => p.key === key)
							const isPro = key === 'pro'
							return (
								<div
									key={key}
									className={`relative overflow-hidden rounded-2xl border p-8 transition-all duration-300 ${isPro ? 'border-foreground/20 shadow-xl' : 'border-border/60 hover:border-foreground/20'}`}
								>
									{isPro && (
										<div className="bg-foreground text-background absolute top-0 right-0 rounded-bl-xl px-4 py-1.5 font-mono text-xs">
											{t('pricing.popular')}
										</div>
									)}
									<div className="mb-6">
										<h3 className="text-lg font-semibold">
											{tBilling(`plans.${key}.name`)}
										</h3>
										<p className="text-muted-foreground mt-1 text-sm">
											{tBilling(`plans.${key}.description`)}
										</p>
									</div>
									<div className="mb-8 flex items-baseline gap-1">
										<span className="font-display text-5xl font-semibold tracking-tight italic">
											{catalogPlan
												? formatPrice(catalogPlan.price, catalogPlan.currency)
												: '$0'}
										</span>
										<span className="text-muted-foreground text-sm">
											{catalogPlan
												? tBilling(`period.${catalogPlan.period}`)
												: ''}
										</span>
									</div>
									<ul className="mb-8 flex flex-col gap-3">
										{features.map((feature) => (
											<li
												key={feature}
												className="flex items-center gap-2.5 text-sm"
											>
												<Check className="h-4 w-4 shrink-0 text-[oklch(0.85_0.25_128)]" />
												{feature}
											</li>
										))}
									</ul>
									<Link
										href="/signup"
										className={`inline-flex h-10 w-full items-center justify-center rounded-lg text-sm font-medium transition-all ${isPro ? 'bg-foreground text-background hover:opacity-90' : 'border-border bg-background hover:bg-muted border'}`}
									>
										{t('hero.cta')}
									</Link>
								</div>
							)
						})}
					</div>
				</div>
			</section>

			{/* CTA */}
			<section className="relative overflow-hidden px-4 py-32 sm:px-6 lg:px-8">
				<div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-[oklch(0.85_0.25_128_/_0.04)] to-transparent" />
				<div className="mx-auto flex max-w-3xl flex-col items-center gap-8 text-center">
					<h2 className="font-display text-4xl font-semibold tracking-tight italic sm:text-5xl lg:text-6xl">
						{t('cta.title')}
					</h2>
					<p className="text-muted-foreground max-w-xl text-lg">
						{t('cta.subtitle')}
					</p>
					<Link
						href="/signup"
						className="group bg-foreground text-background inline-flex h-11 items-center gap-2 rounded-lg px-6 text-sm font-medium transition-all hover:opacity-90"
					>
						{t('cta.button')}
						<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
					</Link>
				</div>
			</section>
		</div>
	)
}
