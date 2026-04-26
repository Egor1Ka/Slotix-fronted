import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const BACKEND_URL = process.env.BACKEND_URL || 'http://api:9000'

const nextConfig: NextConfig = {
	output: 'standalone',
	serverExternalPackages: ['newrelic'],
	eslint: {
		ignoreDuringBuilds: true,
	},
	typescript: {
		ignoreBuildErrors: true,
	},
	async rewrites() {
		return [
			{
				source: '/api/:path*',
				destination: `${BACKEND_URL}/api/:path*`,
			},
		]
	},
}

export default withNextIntl(nextConfig)
