type Translator = (key: string) => string

const isDefaultStatusKey = (label: string): boolean =>
	typeof label === 'string' && label.startsWith('status_')

const translateStatusLabel = (label: string, t: Translator): string =>
	isDefaultStatusKey(label) ? t(label) : label

export { translateStatusLabel }
