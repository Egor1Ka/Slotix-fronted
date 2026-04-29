import { isSafeRedirectPath } from '@/lib/utils'

const LOGIN_PATH = '/login'

const buildLoginHref = (callbackUrl?: string | null): string => {
	if (!callbackUrl) return LOGIN_PATH
	if (!isSafeRedirectPath(callbackUrl)) return LOGIN_PATH
	return `${LOGIN_PATH}?callbackUrl=${encodeURIComponent(callbackUrl)}`
}

export { buildLoginHref }
