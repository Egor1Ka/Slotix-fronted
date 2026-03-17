import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
	InputGroupText,
} from '@/components/ui/input-group'
import { Mail } from 'lucide-react'

export default function InputGroupExample() {
	return (
		<div className="grid w-full max-w-sm gap-4">
			<InputGroup>
				<InputGroupAddon>
					<Mail />
				</InputGroupAddon>
				<InputGroupInput placeholder="Электронная почта" />
			</InputGroup>
			<InputGroup>
				<InputGroupAddon>
					<InputGroupText>https://</InputGroupText>
				</InputGroupAddon>
				<InputGroupInput placeholder="example.com" />
			</InputGroup>
		</div>
	)
}
