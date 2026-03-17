import { ApiError } from './api-error'
import type { Interceptors, RequestConfig } from './types'

const DEFAULT_TIMEOUT = 30_000

function buildUrl(
	url: RequestConfig['url'],
	pathParams: RequestConfig['pathParams'] = {},
	queryParams: RequestConfig['queryParams'] = {},
): string {
	const base = url(pathParams)

	const filtered = Object.entries(queryParams).reduce<Record<string, string>>(
		(acc, [key, value]) => {
			if (value !== undefined && value !== null) {
				acc[key] = String(value)
			}
			return acc
		},
		{},
	)

	const query = new URLSearchParams(filtered).toString()
	return query ? `${base}?${query}` : base
}

async function parseResponse(response: Response): Promise<unknown> {
	const contentLength = response.headers.get('content-length')
	if (response.status === 204 || contentLength === '0') {
		return null
	}

	const contentType = response.headers.get('content-type') ?? ''

	if (contentType.includes('application/json')) {
		return response.json()
	}

	return response.text()
}

function mergeInterceptors(
	global?: Interceptors,
	perCall?: Interceptors,
): Interceptors {
	return {
		beforeRequest: [
			...(global?.beforeRequest ?? []),
			...(perCall?.beforeRequest ?? []),
		],
		afterResponse: [
			...(global?.afterResponse ?? []),
			...(perCall?.afterResponse ?? []),
		],
		onError: [...(global?.onError ?? []), ...(perCall?.onError ?? [])],
	}
}

async function request<T>(
	config: RequestConfig,
	globalInterceptors?: Interceptors,
): Promise<T> {
	const interceptors = mergeInterceptors(
		globalInterceptors,
		config.interceptors,
	)

	let finalConfig = config
	for (const fn of interceptors.beforeRequest ?? []) {
		finalConfig = await fn(finalConfig)
	}

	const url = buildUrl(
		finalConfig.url,
		finalConfig.pathParams,
		finalConfig.queryParams,
	)

	const controller = new AbortController()
	const timeoutId = setTimeout(
		() => controller.abort(),
		finalConfig.timeout ?? DEFAULT_TIMEOUT,
	)

	try {
		const response = await fetch(url, {
			method: finalConfig.method ?? 'GET',
			headers: finalConfig.headers,
			body: finalConfig.body ? JSON.stringify(finalConfig.body) : undefined,
			signal: controller.signal,
		})

		const data = await parseResponse(response)

		if (!response.ok) {
			throw new ApiError(response.status, response.statusText, data)
		}

		let result: unknown = data
		for (const fn of interceptors.afterResponse ?? []) {
			result = await fn(result, finalConfig)
		}

		return result as T
	} catch (error) {
		if (error instanceof ApiError) {
			for (const fn of interceptors.onError ?? []) {
				await fn(error)
			}
			throw error
		}

		if (error instanceof Error && error.name === 'AbortError') {
			const timeoutError = new ApiError(408, 'Request timeout')
			for (const fn of interceptors.onError ?? []) {
				await fn(timeoutError)
			}
			throw timeoutError
		}

		const networkError = new ApiError(0, 'Network error', error)
		for (const fn of interceptors.onError ?? []) {
			await fn(networkError)
		}
		throw networkError
	} finally {
		clearTimeout(timeoutId)
	}
}

export { request, mergeInterceptors }
