const writeWithClipboardApi = async (text: string): Promise<boolean> => {
	if (!navigator.clipboard) return false
	try {
		await navigator.clipboard.writeText(text)
		return true
	} catch {
		return false
	}
}

const writeWithExecCommand = (text: string): boolean => {
	const ta = document.createElement('textarea')
	ta.value = text
	ta.setAttribute('readonly', '')
	ta.style.position = 'absolute'
	ta.style.left = '-9999px'
	document.body.appendChild(ta)
	ta.select()
	const ok = document.execCommand('copy')
	document.body.removeChild(ta)
	return ok
}

const copyToClipboard = async (text: string): Promise<boolean> => {
	const viaApi = await writeWithClipboardApi(text)
	if (viaApi) return true
	return writeWithExecCommand(text)
}

export { copyToClipboard }
