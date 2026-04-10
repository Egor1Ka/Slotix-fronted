import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { getUser } from '@/lib/auth/get-user'
import {
	ArrowRight,
	Check,
	Clock,
	Users,
	Zap,
	CalendarCog,
} from 'lucide-react'

const GOOGLE_AUTH_URL = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/google`
const CREEM_PRODUCT_ORG_CREATOR = process.env.CREEM_PRODUCT_ORG_CREATOR || ''

async function getBusinessHref(): Promise<string> {
	const { cookies } = await import('next/headers')
	const cookieStore = await cookies()
	const accessToken = cookieStore.get('accessToken')?.value
	if (!accessToken) return `/api/checkout?product_id=${CREEM_PRODUCT_ORG_CREATOR}`

	const backendUrl = process.env.BACKEND_URL ?? ''
	try {
		const res = await fetch(`${backendUrl}/api/billing/subscription`, {
			headers: { Cookie: `accessToken=${accessToken}` },
			cache: 'no-store',
		})
		if (res.ok) {
			const body = await res.json()
			if (body.data) return '/organizations'
		}
	} catch { /* ignore */ }

	return `/api/checkout?product_id=${CREEM_PRODUCT_ORG_CREATOR}`
}

const featureKeys = ['slots', 'booking', 'team', 'schedule'] as const

const FEATURE_ICONS = {
	slots: Clock,
	booking: Zap,
	team: Users,
	schedule: CalendarCog,
} as const

type PreviewTranslations = {
	day: string
	week: string
	calendarDate: string
	availableSlot: string
	gapFinder: string
	studioName: string
	accepting: string
	selectService: string
	serviceHaircut: string
	serviceBeard: string
	bookTime: string
	optimalPacking: string
	scheduleMonFri: string
	scheduleHours: string
	scheduleSat: string
	scheduleSatHours: string
	scheduleSun: string
	dayOff: string
	unifiedCalendar: string
	bookNow: string
}

export default async function LandingPage() {
	const t = await getTranslations('landing')
	const user = await getUser()
	const authHref = user ? '/organizations' : GOOGLE_AUTH_URL
	const businessHref = user
		? await getBusinessHref()
		: GOOGLE_AUTH_URL

	const preview: PreviewTranslations = {
		day: t('preview.day'),
		week: t('preview.week'),
		calendarDate: t('preview.calendarDate'),
		availableSlot: t('preview.availableSlot'),
		gapFinder: t('preview.gapFinder'),
		studioName: t('preview.studioName'),
		accepting: t('preview.accepting'),
		selectService: t('preview.selectService'),
		serviceHaircut: t('preview.serviceHaircut'),
		serviceBeard: t('preview.serviceBeard'),
		bookTime: t('preview.bookTime'),
		optimalPacking: t('preview.optimalPacking'),
		scheduleMonFri: t('preview.scheduleMonFri'),
		scheduleHours: t('preview.scheduleHours'),
		scheduleSat: t('preview.scheduleSat'),
		scheduleSatHours: t('preview.scheduleSatHours'),
		scheduleSun: t('preview.scheduleSun'),
		dayOff: t('preview.dayOff'),
		unifiedCalendar: t('preview.unifiedCalendar'),
		bookNow: t('preview.bookNow'),
	}

	return (
		<div className="flex flex-col">
			{/* Hero */}
			<section className="relative flex min-h-[90vh] items-center overflow-hidden px-4 py-24 sm:px-6 lg:px-8">
				<div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
					<div className="absolute top-[15%] left-[5%] h-[600px] w-[600px] animate-[landing-mesh-1_20s_ease-in-out_infinite] rounded-full bg-[oklch(0.65_0.15_145_/_0.08)] blur-[120px]" />
					<div className="absolute top-[10%] right-[15%] h-[500px] w-[500px] animate-[landing-mesh-2_25s_ease-in-out_infinite] rounded-full bg-[oklch(0.75_0.15_210_/_0.05)] blur-[100px]" />
					<div className="absolute bottom-[10%] left-[30%] h-[400px] w-[400px] animate-[landing-mesh-3_22s_ease-in-out_infinite] rounded-full bg-[oklch(0.80_0.12_60_/_0.06)] blur-[100px]" />
				</div>

				<div className="relative mx-auto w-full max-w-7xl">
					<div className="grid items-center gap-16 lg:grid-cols-2">
						{/* Left — Text */}
						<div>
							<div className="mb-8 inline-flex animate-[landing-reveal_0.6s_ease_both] items-center gap-2.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5">
								<span className="h-2 w-2 animate-[landing-pulse-dot_2s_ease-in-out_infinite] rounded-full bg-orange-500" />
								<span className="font-mono text-xs font-semibold tracking-wider text-orange-600 dark:text-orange-400">
									{t('hero.badge')}
								</span>
							</div>

							<h1 className="animate-[landing-reveal_0.7s_0.1s_ease_both] text-5xl leading-[1.05] font-bold tracking-tight sm:text-6xl lg:text-7xl">
								{t('hero.title')}
								<br />
								<span className="text-emerald-500 dark:text-emerald-400">
									{t('hero.titleAccent')}
								</span>
							</h1>

							<p className="text-muted-foreground mt-6 max-w-xl animate-[landing-reveal_0.7s_0.2s_ease_both] text-lg leading-relaxed">
								{t('hero.subtitle')}
							</p>

							<div className="mt-10 flex animate-[landing-reveal_0.7s_0.3s_ease_both] flex-wrap items-center gap-4">
								<Link
									href={authHref}
									className="group inline-flex h-12 items-center gap-2 rounded-xl bg-emerald-600 px-7 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 transition-all hover:bg-emerald-700 hover:shadow-emerald-600/40"
								>
									{t('hero.cta')}
									<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
								</Link>
								<Link
									href={authHref}
									className="border-border hover:bg-muted inline-flex h-12 items-center gap-2 rounded-xl border px-7 text-sm font-semibold transition-all"
								>
									{t('hero.demo')}
								</Link>
							</div>

							<p className="text-muted-foreground/60 mt-6 animate-[landing-reveal_0.7s_0.4s_ease_both] font-mono text-[10px] tracking-wider">
								{t('hero.noCard')}
							</p>
						</div>

						{/* Right — Calendar + Booking widget */}
						<div className="hidden animate-[landing-reveal_0.8s_0.3s_ease_both] lg:block">
							<div className="relative">
								{/* Calendar card */}
								<div className="border-border/60 bg-card overflow-hidden rounded-2xl border shadow-2xl">
									<div className="border-border/40 flex items-center justify-between border-b px-6 py-4">
										<div className="text-muted-foreground flex items-center gap-1 text-sm">
											<span className="hover:bg-muted cursor-pointer rounded p-1">‹</span>
											<span className="text-foreground font-semibold">
												{preview.calendarDate}
											</span>
											<span className="hover:bg-muted cursor-pointer rounded p-1">›</span>
										</div>
										<div className="border-border flex overflow-hidden rounded-lg border text-xs font-medium">
											<span className="bg-primary text-primary-foreground px-3 py-1.5">
												{preview.day}
											</span>
											<span className="text-muted-foreground px-3 py-1.5">
												{preview.week}
											</span>
										</div>
									</div>

									<div className="relative bg-muted/30 px-2 py-2">
										<div className="bg-card rounded-lg">
											<div className="relative">
												<TimeRow time="09:00" />
												<CalendarBlock
													title="Balayage & Cut"
													staff="Sarah J."
													duration="120min"
													color="#f59e0b"
													height="h-20"
												/>
												<TimeRow time="10:00" />
												<CalendarBlock
													title="Consultation"
													staff="Mike T."
													duration="30min"
													color="#3b82f6"
													height="h-12"
												/>
												<TimeRow time="11:00" />
												<div className="ml-14 mr-2 mt-1 rounded-lg border border-dashed border-emerald-500/30 py-4 text-center">
													<span className="text-muted-foreground/40 text-xs">
														{preview.availableSlot}
													</span>
												</div>
												<TimeRow time="12:00" />
											</div>
										</div>
									</div>

									<div className="border-border/40 border-t px-6 py-3 text-center">
										<span className="font-mono text-[10px] tracking-wider text-emerald-600/60 dark:text-emerald-400/60">
											{preview.gapFinder}
										</span>
									</div>
								</div>

								{/* Floating booking widget */}
								<div className="border-border/60 bg-card absolute -bottom-12 -left-8 w-72 animate-[landing-float_6s_ease-in-out_infinite] rounded-2xl border p-5 shadow-2xl">
									<div className="mb-4 flex items-center gap-3">
										<div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold">
											AL
										</div>
										<div>
											<p className="text-sm font-semibold">
												{preview.studioName}
											</p>
											<p className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
												<span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
												{preview.accepting}
											</p>
										</div>
									</div>
									<p className="text-muted-foreground mb-3 text-xs font-medium">
										{preview.selectService}
									</p>
									<div className="border-border bg-primary/5 ring-primary/30 mb-2 flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm ring-2">
										<div className="flex items-center gap-2">
											<span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
											<span className="font-medium">
												{preview.serviceHaircut}
											</span>
										</div>
										<span className="text-muted-foreground text-xs">
											45m
										</span>
									</div>
									<div className="border-border mb-3 flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm">
										<div className="flex items-center gap-2">
											<span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
											<span>{preview.serviceBeard}</span>
										</div>
										<span className="text-muted-foreground text-xs">
											20m
										</span>
									</div>
									<div className="bg-foreground text-background w-full rounded-lg py-2.5 text-center text-sm font-semibold">
										{preview.bookTime}
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			<div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="bg-border h-px" />
			</div>

			{/* Features */}
			<section id="features" className="px-4 py-28 sm:px-6 lg:px-8">
				<div className="mx-auto max-w-7xl">
					<div className="mb-16 max-w-2xl">
						<span className="mb-4 block font-mono text-xs tracking-widest text-emerald-600 uppercase dark:text-emerald-400">
							{t('nav.features')}
						</span>
						<h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
							{t('features.title')}
						</h2>
						<p className="text-muted-foreground mt-4 text-lg">
							{t('features.subtitle')}
						</p>
					</div>

					<div className="grid gap-6 md:grid-cols-2">
						{featureKeys.map((key) => {
							const Icon = FEATURE_ICONS[key]
							return (
								<FeatureCard
									key={key}
									icon={<Icon className="h-5 w-5" />}
									title={t(`features.items.${key}.title`)}
									description={t(
										`features.items.${key}.description`
									)}
								>
									<FeatureVisual
										featureKey={key}
										preview={preview}
									/>
								</FeatureCard>
							)
						})}
					</div>
				</div>
			</section>

			{/* Pricing */}
			<section id="pricing" className="px-4 py-28 sm:px-6 lg:px-8">
				<div className="mx-auto max-w-5xl">
					<div className="mb-16 text-center">
						<span className="mb-4 block font-mono text-xs tracking-widest text-emerald-600 uppercase dark:text-emerald-400">
							{t('nav.pricing')}
						</span>
						<h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
							{t('pricing.title')}
						</h2>
						<p className="text-muted-foreground mt-4 text-lg">
							{t('pricing.subtitle')}
						</p>
					</div>

					<div className="grid gap-8 md:grid-cols-2">
						<PricingCard
							name={t('pricing.free.name')}
							price={t('pricing.free.price')}
							period={t('pricing.free.period')}
							description={t('pricing.free.description')}
							features={t.raw('pricing.free.features') as string[]}
							ctaText={t('pricing.free.cta')}
							ctaHref={authHref}
						/>
						<PricingCard
							name={t('pricing.org_creator.name')}
							price={t('pricing.org_creator.price')}
							period={t('pricing.org_creator.period')}
							description={t('pricing.org_creator.description')}
							features={t.raw('pricing.org_creator.features') as string[]}
							ctaText={t('pricing.org_creator.cta')}
							ctaHref={businessHref}
							highlighted
							badge={t('pricing.popular')}
						/>
					</div>
				</div>
			</section>

			<div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="bg-border h-px" />
			</div>

			{/* CTA */}
			<section className="relative overflow-hidden px-4 py-32 sm:px-6 lg:px-8">
				<div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-emerald-500/[0.04] to-transparent" />
				<div className="mx-auto flex max-w-3xl flex-col items-center gap-8 text-center">
					<h2 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
						{t('cta.title')}
					</h2>
					<p className="text-muted-foreground max-w-xl text-lg">
						{t('cta.subtitle')}
					</p>
					<Link
						href={authHref}
						className="group inline-flex h-12 items-center gap-2 rounded-xl bg-emerald-600 px-8 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 transition-all hover:bg-emerald-700 hover:shadow-emerald-600/40"
					>
						{t('cta.button')}
						<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
					</Link>
				</div>
			</section>
		</div>
	)
}

/* ── Sub-components ── */

function TimeRow({ time }: { time: string }) {
	return (
		<div className="flex items-center gap-2 px-2 py-2">
			<span className="text-muted-foreground w-10 text-right text-xs tabular-nums">
				{time}
			</span>
			<div className="bg-border/60 h-px flex-1" />
		</div>
	)
}

function CalendarBlock({
	title,
	staff,
	duration,
	color,
	height,
}: {
	title: string
	staff: string
	duration: string
	color: string
	height: string
}) {
	return (
		<div
			className={`ml-14 mr-2 rounded-lg border p-3 ${height}`}
			style={{
				backgroundColor: `${color}20`,
				borderColor: `${color}40`,
			}}
		>
			<div className="flex items-center gap-2">
				<span
					className="h-2.5 w-2.5 shrink-0 rounded-full"
					style={{ backgroundColor: color }}
				/>
				<p className="text-sm font-semibold">{title}</p>
			</div>
			<p className="text-muted-foreground ml-[18px] text-xs">
				{staff} · {duration}
			</p>
		</div>
	)
}

function FeatureCard({
	icon,
	title,
	description,
	children,
}: {
	icon: React.ReactNode
	title: string
	description: string
	children: React.ReactNode
}) {
	return (
		<div className="group border-border/60 hover:border-foreground/20 relative overflow-hidden rounded-2xl border p-8 transition-all duration-300 hover:shadow-lg">
			<div className="mb-6">
				<div className="bg-foreground/[0.05] text-foreground mb-4 flex h-10 w-10 items-center justify-center rounded-lg transition-colors group-hover:bg-emerald-500/15 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
					{icon}
				</div>
				<h3 className="mb-2 text-lg font-semibold">{title}</h3>
				<p className="text-muted-foreground text-sm leading-relaxed">
					{description}
				</p>
			</div>
			<div className="mt-2">{children}</div>
		</div>
	)
}

function FeatureVisual({
	featureKey,
	preview,
}: {
	featureKey: (typeof featureKeys)[number]
	preview: PreviewTranslations
}) {
	if (featureKey === 'slots') {
		return <SlotsVisual preview={preview} />
	}
	if (featureKey === 'booking') {
		return <BookingVisual preview={preview} />
	}
	if (featureKey === 'team') {
		return <TeamVisual preview={preview} />
	}
	return <ScheduleVisual preview={preview} />
}

function SlotsVisual({ preview }: { preview: PreviewTranslations }) {
	return (
		<div className="bg-muted/50 rounded-xl p-4">
			<div className="text-muted-foreground mb-3 flex items-center justify-between text-[10px]">
				<span>09:00</span>
				<span className="text-muted-foreground/40">
					{preview.optimalPacking}
				</span>
				<span>17:00</span>
			</div>
			<div className="space-y-1.5">
				<div className="flex gap-1">
					<div className="h-3.5 flex-[3] rounded bg-emerald-500/70" />
					<div className="h-3.5 flex-[2] rounded bg-emerald-500/30" />
					<div className="h-3.5 flex-[2] rounded bg-emerald-500/70" />
				</div>
				<div className="flex gap-1">
					<div className="h-3.5 flex-[4] rounded bg-amber-500/60" />
					<div className="h-3.5 flex-[3] rounded bg-amber-500/60" />
				</div>
				<div className="flex gap-1">
					<div className="h-3.5 flex-[3] rounded bg-sky-500/60" />
					<div className="h-3.5 flex-[1] rounded bg-sky-500/30" />
					<div className="h-3.5 flex-[3] rounded bg-sky-500/60" />
				</div>
			</div>
		</div>
	)
}

function BookingVisual({ preview }: { preview: PreviewTranslations }) {
	return (
		<div className="bg-muted/50 rounded-xl p-4">
			<div className="space-y-2">
				<div className="bg-background border-border/60 h-7 w-3/4 rounded border" />
				<div className="bg-background border-border/60 h-7 w-full rounded border" />
				<div className="bg-foreground text-background mt-3 flex h-9 items-center justify-center rounded-lg text-xs font-semibold">
					{preview.bookNow}
				</div>
			</div>
		</div>
	)
}

function TeamVisual({ preview }: { preview: PreviewTranslations }) {
	const MEMBERS = [
		{ initials: 'JD', color: 'bg-sky-500' },
		{ initials: 'AS', color: 'bg-emerald-500' },
		{ initials: 'MK', color: 'bg-violet-500' },
	]
	return (
		<div className="flex items-center gap-3">
			<div className="flex -space-x-2">
				{MEMBERS.map((member) => (
					<div
						key={member.initials}
						className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white dark:border-neutral-900 ${member.color}`}
					>
						{member.initials}
					</div>
				))}
			</div>
			<span className="text-muted-foreground text-xs">
				{preview.unifiedCalendar}
			</span>
		</div>
	)
}

function PricingCard({
	name,
	price,
	period,
	description,
	features,
	ctaText,
	ctaHref,
	highlighted = false,
	badge,
}: {
	name: string
	price: string
	period: string
	description: string
	features: string[]
	ctaText: string
	ctaHref: string
	highlighted?: boolean
	badge?: string
}) {
	return (
		<div
			className={`relative overflow-hidden rounded-2xl border p-8 transition-all ${
				highlighted
					? 'border-emerald-500/50 shadow-xl shadow-emerald-500/10'
					: 'border-border/60'
			}`}
		>
			{badge && (
				<div className="absolute top-4 right-4">
					<span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
						{badge}
					</span>
				</div>
			)}
			<div className="mb-6">
				<h3 className="text-xl font-semibold">{name}</h3>
				<p className="text-muted-foreground mt-1 text-sm">{description}</p>
			</div>
			<div className="mb-6 flex items-baseline gap-1">
				<span className="text-4xl font-bold">{price}</span>
				<span className="text-muted-foreground text-sm">{period}</span>
			</div>
			<ul className="mb-8 space-y-3">
				{features.map((feature) => (
					<li key={feature} className="flex items-center gap-2.5 text-sm">
						<Check className="h-4 w-4 shrink-0 text-emerald-500" />
						{feature}
					</li>
				))}
			</ul>
			<Link
				href={ctaHref}
				className={`group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-7 text-sm font-semibold transition-all ${
					highlighted
						? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700 hover:shadow-emerald-600/40'
						: 'border-border hover:bg-muted border'
				}`}
			>
				{ctaText}
				<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
			</Link>
		</div>
	)
}

function ScheduleVisual({ preview }: { preview: PreviewTranslations }) {
	return (
		<div className="bg-muted/50 rounded-xl p-4">
			<div className="space-y-2.5">
				<div className="flex items-center justify-between text-sm">
					<div className="flex items-center gap-2">
						<span className="h-2 w-2 rounded-full bg-emerald-500" />
						{preview.scheduleMonFri}
					</div>
					<span className="text-muted-foreground font-mono text-xs">
						{preview.scheduleHours}
					</span>
				</div>
				<div className="bg-border h-px" />
				<div className="flex items-center justify-between text-sm">
					<div className="flex items-center gap-2">
						<span className="h-2 w-2 rounded-full bg-amber-500" />
						{preview.scheduleSat}
					</div>
					<span className="text-muted-foreground font-mono text-xs">
						{preview.scheduleSatHours}
					</span>
				</div>
				<div className="bg-border h-px" />
				<div className="flex items-center justify-between text-sm">
					<div className="flex items-center gap-2">
						<span className="h-2 w-2 rounded-full bg-red-400" />
						{preview.scheduleSun}
					</div>
					<span className="text-muted-foreground text-xs">
						{preview.dayOff}
					</span>
				</div>
			</div>
		</div>
	)
}
