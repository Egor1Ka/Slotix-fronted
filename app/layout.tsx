import { ThemeProvider } from 'next-themes'
import { GoogleAnalytics } from '@next/third-parties/google'
import { NewRelicBrowserScript } from '@/lib/monitoring/new-relic-browser-script'
import { Toaster } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'
import type { Metadata } from 'next'
import { Inter, Cormorant } from 'next/font/google'
import './globals.css'

const gaId = process.env.NEXT_PUBLIC_GA_ID

const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-sans' })
const cormorant = Cormorant({
	subsets: ['latin', 'cyrillic'],
	variable: '--font-display',
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://slotix.app'

export const metadata: Metadata = {
	metadataBase: new URL(siteUrl),
	title: {
		default: 'Slotix — Booking that grows with you',
		template: '%s · Slotix',
	},
	description:
		'One booking platform for every stage of your business — from a private tutor to a multi-location studio. Start solo, scale to teams.',
	applicationName: 'Slotix',
	manifest: '/site.webmanifest',
	icons: {
		icon: [
			{ url: '/favicons/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
			{ url: '/favicons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
			{ url: '/favicons/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
			{
				url: '/favicons/favicon-192x192.png',
				sizes: '192x192',
				type: 'image/png',
			},
			{
				url: '/favicons/favicon-512x512.png',
				sizes: '512x512',
				type: 'image/png',
			},
		],
	},
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html
			className={cn('font-sans', inter.variable, cormorant.variable)}
			suppressHydrationWarning
		>
			<body className="antialiased">
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					disableTransitionOnChange
				>
					{children}
				</ThemeProvider>
				<Toaster />
				<NewRelicBrowserScript />
				{gaId && <GoogleAnalytics gaId={gaId} />}
			</body>
		</html>
	)
}
