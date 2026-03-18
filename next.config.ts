import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const nextConfig: NextConfig = {
	output: 'standalone',
	serverExternalPackages: ['newrelic'],
}

export default withNextIntl(nextConfig)
