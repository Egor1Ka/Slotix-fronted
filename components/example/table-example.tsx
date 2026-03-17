import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'

const invoices = [
	{ id: 'INV001', status: 'Оплачено', method: 'Карта', amount: '₽2 500' },
	{ id: 'INV002', status: 'В ожидании', method: 'Перевод', amount: '₽1 800' },
	{ id: 'INV003', status: 'Отклонено', method: 'Карта', amount: '₽3 200' },
]

export default function TableExample() {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>ID</TableHead>
					<TableHead>Статус</TableHead>
					<TableHead>Метод</TableHead>
					<TableHead className="text-right">Сумма</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{invoices.map((invoice) => (
					<TableRow key={invoice.id}>
						<TableCell className="font-medium">{invoice.id}</TableCell>
						<TableCell>{invoice.status}</TableCell>
						<TableCell>{invoice.method}</TableCell>
						<TableCell className="text-right">{invoice.amount}</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	)
}
