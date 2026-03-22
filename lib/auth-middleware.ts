import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const protectedPaths = ['/dashboard', '/billing']
const authPaths = ['/login', '/signup']

function isProtectedPath(pathname: string): boolean {
	return protectedPaths.some(
		(path) => pathname === path || pathname.startsWith(`${path}/`),
	)
}

function isAuthPath(pathname: string): boolean {
	return authPaths.some(
		(path) => pathname === path || pathname.startsWith(`${path}/`),
	)
}

function isSafeRedirectPath(path: string): boolean {
	return path.startsWith('/') && !path.startsWith('//') && !path.includes('://')
}

function consumeCallbackUrl(request: NextRequest): NextResponse {
	const rawCallbackUrl = request.cookies.get('callbackUrl')?.value
	const callbackUrl =
		rawCallbackUrl && isSafeRedirectPath(decodeURIComponent(rawCallbackUrl))
			? decodeURIComponent(rawCallbackUrl)
			: '/dashboard'
	const redirectUrl = new URL(callbackUrl, request.url)
	const response = NextResponse.redirect(redirectUrl)
	response.cookies.delete('callbackUrl')
	return response
}

export function authMiddleware(request: NextRequest): NextResponse | null {
	const { pathname } = request.nextUrl
	const accessToken = request.cookies.get('accessToken')?.value

	if (isProtectedPath(pathname) && !accessToken) {
		const loginUrl = new URL('/login', request.url)
		const returnPath = pathname + request.nextUrl.search
		loginUrl.searchParams.set('callbackUrl', returnPath)
		return NextResponse.redirect(loginUrl)
	}

	if (isAuthPath(pathname) && accessToken) {
		return consumeCallbackUrl(request)
	}

	if (pathname === '/' && accessToken && request.cookies.has('callbackUrl')) {
		return consumeCallbackUrl(request)
	}

	return null
}
