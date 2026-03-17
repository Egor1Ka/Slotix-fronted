'use client'

import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Toaster } from '@/components/ui/sonner'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

const registrationSchema = z.object({
	name: z.string().min(2, 'Имя должно содержать минимум 2 символа'),
	email: z.email('Некорректный email'),
	password: z
		.string()
		.min(8, 'Пароль должен содержать минимум 8 символов')
		.regex(/\d/, 'Пароль должен содержать хотя бы одну цифру')
		.regex(/[!@#$%^&*]/, 'Пароль должен содержать хотя бы один спецсимвол'),
})

type RegistrationData = z.infer<typeof registrationSchema>

const profileSchema = z.object({
	name: z.string().min(1, 'Имя обязательно'),
	bio: z.string().max(200, 'Максимум 200 символов').optional(),
	role: z.string().min(1, 'Выберите роль'),
	isPublic: z.boolean(),
})

type ProfileData = z.infer<typeof profileSchema>

const feedbackSchema = z.object({
	topic: z.string().min(1, 'Выберите тему'),
	rating: z.enum(['good', 'average', 'bad'], {
		message: 'Выберите оценку',
	}),
	comment: z
		.string()
		.min(10, 'Комментарий должен содержать минимум 10 символов'),
	consent: z.literal(true, 'Необходимо согласие на обработку данных'),
})

type FeedbackData = z.infer<typeof feedbackSchema>

function RegistrationForm() {
	const {
		register,
		handleSubmit,
		formState: { errors },
		reset,
	} = useForm<RegistrationData>({
		resolver: zodResolver(registrationSchema),
	})

	const onSubmit = (data: RegistrationData) => {
		toast.success('Регистрация успешна!', {
			description: `Добро пожаловать, ${data.name}!`,
		})
		reset()
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Форма регистрации</CardTitle>
				<CardDescription>
					Создайте новый аккаунт, заполнив поля ниже
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
					<Field data-invalid={!!errors.name || undefined}>
						<FieldLabel htmlFor="reg-name">Имя</FieldLabel>
						<FieldDescription>Укажите ваше полное имя</FieldDescription>
						<Input
							id="reg-name"
							placeholder="Иван Иванов"
							{...register('name')}
						/>
						<FieldError errors={[errors.name]} />
					</Field>

					<Field data-invalid={!!errors.email || undefined}>
						<FieldLabel htmlFor="reg-email">Email</FieldLabel>
						<FieldDescription>
							Мы никогда не передадим ваш email третьим лицам
						</FieldDescription>
						<Input
							id="reg-email"
							type="email"
							placeholder="ivan@example.com"
							{...register('email')}
						/>
						<FieldError errors={[errors.email]} />
					</Field>

					<Field data-invalid={!!errors.password || undefined}>
						<FieldLabel htmlFor="reg-password">Пароль</FieldLabel>
						<FieldDescription>
							Минимум 8 символов, включая цифры и спецсимволы
						</FieldDescription>
						<Input
							id="reg-password"
							type="password"
							placeholder="••••••••"
							{...register('password')}
						/>
						<FieldError errors={[errors.password]} />
					</Field>

					<Button type="submit">Зарегистрироваться</Button>
				</form>
			</CardContent>
		</Card>
	)
}

function ProfileForm() {
	const {
		register,
		handleSubmit,
		control,
		formState: { errors },
	} = useForm<ProfileData>({
		resolver: zodResolver(profileSchema),
		defaultValues: {
			isPublic: false,
			role: '',
		},
	})

	const onSubmit = (data: ProfileData) => {
		toast.success('Профиль обновлён!', {
			description: `Роль: ${data.role}`,
		})
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Настройки профиля</CardTitle>
				<CardDescription>Обновите информацию вашего профиля</CardDescription>
			</CardHeader>
			<CardContent>
				<form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
					<Field data-invalid={!!errors.name || undefined}>
						<FieldLabel htmlFor="profile-name">Имя</FieldLabel>
						<Input
							id="profile-name"
							placeholder="Иван Иванов"
							{...register('name')}
						/>
						<FieldError errors={[errors.name]} />
					</Field>

					<Field data-invalid={!!errors.bio || undefined}>
						<FieldLabel htmlFor="profile-bio">Био</FieldLabel>
						<FieldDescription>Расскажите немного о себе</FieldDescription>
						<Textarea
							id="profile-bio"
							placeholder="Разработчик из Москвы..."
							rows={4}
							{...register('bio')}
						/>
						<FieldError errors={[errors.bio]} />
					</Field>

					<Field data-invalid={!!errors.role || undefined}>
						<FieldLabel>Роль</FieldLabel>
						<Controller
							control={control}
							name="role"
							render={({ field }) => (
								<Select value={field.value} onValueChange={field.onChange}>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Выберите роль" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="developer">Разработчик</SelectItem>
										<SelectItem value="designer">Дизайнер</SelectItem>
										<SelectItem value="manager">Менеджер</SelectItem>
										<SelectItem value="analyst">Аналитик</SelectItem>
									</SelectContent>
								</Select>
							)}
						/>
						<FieldError errors={[errors.role]} />
					</Field>

					<Field orientation="horizontal">
						<Controller
							control={control}
							name="isPublic"
							render={({ field }) => (
								<Switch
									id="profile-public"
									checked={field.value}
									onCheckedChange={field.onChange}
								/>
							)}
						/>
						<FieldLabel htmlFor="profile-public">
							<FieldContent>
								Публичный профиль
								<FieldDescription>
									Сделать ваш профиль видимым для всех пользователей
								</FieldDescription>
							</FieldContent>
						</FieldLabel>
					</Field>

					<Button type="submit">Сохранить изменения</Button>
				</form>
			</CardContent>
		</Card>
	)
}

function FeedbackForm() {
	const {
		register,
		handleSubmit,
		control,
		formState: { errors },
		reset,
	} = useForm<FeedbackData>({
		resolver: zodResolver(feedbackSchema),
		defaultValues: {
			topic: '',
			comment: '',
			consent: undefined,
		},
	})

	const onSubmit = (data: FeedbackData) => {
		toast.success('Отзыв отправлен!', {
			description: `Тема: ${data.topic}, оценка: ${data.rating}`,
		})
		reset()
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Обратная связь</CardTitle>
				<CardDescription>
					Помогите нам стать лучше — оставьте ваш отзыв
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
					<Field data-invalid={!!errors.topic || undefined}>
						<FieldLabel htmlFor="feedback-topic">Тема</FieldLabel>
						<NativeSelect
							id="feedback-topic"
							className="w-full"
							{...register('topic')}
						>
							<NativeSelectOption value="">Выберите тему</NativeSelectOption>
							<NativeSelectOption value="bug">Ошибка</NativeSelectOption>
							<NativeSelectOption value="feature">
								Предложение
							</NativeSelectOption>
							<NativeSelectOption value="question">Вопрос</NativeSelectOption>
							<NativeSelectOption value="other">Другое</NativeSelectOption>
						</NativeSelect>
						<FieldError errors={[errors.topic]} />
					</Field>

					<Field data-invalid={!!errors.rating || undefined}>
						<FieldLabel>Оценка</FieldLabel>
						<FieldDescription>Как вы оцениваете наш сервис?</FieldDescription>
						<Controller
							control={control}
							name="rating"
							render={({ field }) => (
								<RadioGroup value={field.value} onValueChange={field.onChange}>
									<Field orientation="horizontal">
										<RadioGroupItem value="good" id="rating-good" />
										<Label htmlFor="rating-good">Отлично</Label>
									</Field>
									<Field orientation="horizontal">
										<RadioGroupItem value="average" id="rating-average" />
										<Label htmlFor="rating-average">Нормально</Label>
									</Field>
									<Field orientation="horizontal">
										<RadioGroupItem value="bad" id="rating-bad" />
										<Label htmlFor="rating-bad">Плохо</Label>
									</Field>
								</RadioGroup>
							)}
						/>
						<FieldError errors={[errors.rating]} />
					</Field>

					<Field data-invalid={!!errors.comment || undefined}>
						<FieldLabel htmlFor="feedback-comment">Комментарий</FieldLabel>
						<Textarea
							id="feedback-comment"
							placeholder="Опишите ваш опыт..."
							rows={4}
							{...register('comment')}
						/>
						<FieldError errors={[errors.comment]} />
					</Field>

					<Field
						orientation="horizontal"
						data-invalid={!!errors.consent || undefined}
					>
						<Controller
							control={control}
							name="consent"
							render={({ field }) => (
								<Checkbox
									id="feedback-consent"
									checked={field.value ?? false}
									onCheckedChange={field.onChange}
								/>
							)}
						/>
						<FieldLabel htmlFor="feedback-consent">
							<FieldContent>
								Согласие на обработку данных
								<FieldDescription>
									Я согласен на обработку моих персональных данных
								</FieldDescription>
								<FieldError errors={[errors.consent]} />
							</FieldContent>
						</FieldLabel>
					</Field>

					<Button type="submit">Отправить отзыв</Button>
				</form>
			</CardContent>
		</Card>
	)
}

export default function FormExamplesPage() {
	return (
		<div className="container mx-auto max-w-4xl space-y-8 py-10">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Примеры форм</h1>
				<p className="text-muted-foreground">
					Валидация через react-hook-form + zod
				</p>
			</div>

			<Separator />
			<Toaster />

			<RegistrationForm />
			<ProfileForm />
			<FeedbackForm />
		</div>
	)
}
