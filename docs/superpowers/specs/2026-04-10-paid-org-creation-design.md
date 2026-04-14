# Платное создание организаций ($2/мес)

**Дата:** 2026-04-10
**Подход:** Фича-флаг `createOrg` в существующей billing-системе

## Цель

Сделать создание организаций платной функцией. Пользователь должен оформить подписку `org_creator` ($2/мес) чтобы создавать и управлять организациями. Максимум 3 организации. При отмене подписки — все организации деактивируются.

## Требования

- Новый план `org_creator` за $2/мес через Creem.io
- Лимит: максимум 3 организации на пользователя
- При отмене подписки — организации деактивируются (не видны публично, бронирование недоступно)
- При возобновлении подписки — организации активируются обратно
- Paywall при попытке создать организацию без подписки
- Страница биллинга показывает план `org_creator`
- Удаляем `pro` план и `export_pack` продукт полностью

## Секция 1: Бэкенд — Billing конфиг

### Файл: `src/modules/billing/constants/billing.js`

**Удаляем:**

- `pro` из `SUBSCRIPTION_PRODUCTS`, `PLANS`, `PLAN_CATALOG`, `PLAN_HIERARCHY`
- `export_pack` из `ONE_TIME_PRODUCTS`, `PRODUCTS`, `PRODUCT_CATALOG`
- `ONE_TIME_PRODUCTS`, `PRODUCTS`, `PRODUCT_CATALOG` — полностью (пустые объекты или удалить экспорты если не используются в других местах)

**Добавляем:**

```js
SUBSCRIPTION_PRODUCTS = fromEnvEntries([
	process.env.CREEM_PRODUCT_ORG_CREATOR,
	'org_creator',
])

PLAN_HIERARCHY = ['free', 'org_creator']

PLANS = {
	free: {
		features: { dashboard: true, createOrg: false },
		limits: { organizations: 0 },
	},
	org_creator: {
		features: { dashboard: true, createOrg: true },
		limits: { organizations: 3 },
	},
}

PLAN_CATALOG = {
	free: {
		price: 0,
		currency: 'USD',
		period: 'month',
		productId: null,
	},
	org_creator: {
		price: 200, // $2.00
		currency: 'USD',
		period: 'month',
		productId: process.env.CREEM_PRODUCT_ORG_CREATOR,
	},
}
```

**`ONE_TIME_PRODUCTS`** — пустой объект `fromEnvEntries()` (без аргументов).
**`PRODUCTS`** — пустой `{}`.
**`PRODUCT_CATALOG`** — пустой `{}`.
**`requiredProductEnvVars`** — только `["CREEM_PRODUCT_ORG_CREATOR"]`.

### Файл: `src/modules/billing/hooks/productHooks.js`

Удаляем `pro` хуки. Добавляем `org_creator`:

```js
const PRODUCT_HOOKS = {
	org_creator: {
		onActivate: async (user) => {
			// Активируем все организации где user — owner
			await Organization.updateMany(
				{ _id: { $in: await getOwnerOrgIds(user._id) } },
				{ active: true },
			)
		},
		onDeactivate: async (user) => {
			// Деактивируем все организации где user — owner
			await Organization.updateMany(
				{ _id: { $in: await getOwnerOrgIds(user._id) } },
				{ active: false },
			)
		},
		onRenew: async () => {},
	},
}
```

Вспомогательная функция `getOwnerOrgIds(userId)` — находит все membership с `role: "owner"` и `status: "active"`, возвращает массив `orgId`.

### Файл: `.env.example`

- Удаляем: `CREEM_PRODUCT_PRO`, `CREEM_PRODUCT_EXPORT_PACK`
- Добавляем: `CREEM_PRODUCT_ORG_CREATOR=`

## Секция 2: Бэкенд — Модель Organization

### Файл: `src/models/Organization.js`

Добавляем поле:

```js
active: { type: Boolean, default: true }
```

Организации создаются как `active: true`. Деактивация происходит только через `productHooks.onDeactivate`.

## Секция 3: Бэкенд — Защита создания организаций

### Файл: `src/routes/orgRoutes.js` (или где определён роут)

Добавляем middleware на `POST /api/org`:

```js
router.post('/', auth, requireFeature('createOrg'), handleCreateOrg)
```

### Файл: `src/services/orgServices.js`

В `createOrganization()` — добавляем проверку лимита перед созданием:

```js
const createOrganization = async (data, userId) => {
	// Проверка лимита организаций
	const ownedOrgsCount = await Membership.countDocuments({
		userId,
		role: 'owner',
		status: { $in: ['active', 'invited'] },
	})

	const plan = await getUserBillingProfile(userId)
	const orgLimit = plan.limits.organizations

	if (ownedOrgsCount >= orgLimit) {
		throw new HttpError({ statusCode: 402, status: 'limitReached' })
	}

	// ... остальная логика создания
}
```

### Публичные роуты организации

В публичных эндпоинтах (просмотр org, бронирование) — проверяем `org.active`:

- `GET /api/org/:id` (публичный) — если `org.active === false`, возвращаем `{ active: false }` с HTTP 200 (фронт обработает)
- Эндпоинты бронирования — если org неактивна, возвращаем 403/`featureLocked`

## Секция 4: Фронтенд — Paywall при создании организации

### Файл: `components/organizations/CreateOrgDialog.tsx`

Перед показом формы — проверяем план пользователя. Для этого нужен хук или данные плана:

1. Получаем `plan` через `billingApi.plan()`
2. Если `plan.features.createOrg === false` — показываем paywall-диалог:
   - Заголовок: i18n `billing.orgCreator.paywallTitle`
   - Текст: i18n `billing.orgCreator.paywallDescription`
   - Кнопка `CreemCheckout` с `productId` из каталога `org_creator`
3. Если `createOrg === true`, но количество org >= `plan.limits.organizations` — показываем сообщение о лимите
4. Иначе — обычная форма создания

### Новый компонент: `components/organizations/OrgPaywall.tsx`

Paywall UI:

- Иконка/иллюстрация
- Заголовок и описание
- Цена: $2/мес
- `CreemCheckout` кнопка
- Текст про лимит 3 организации

## Секция 5: Фронтенд — Страница биллинга

### Файл: `components/billing-plan-tab.tsx`

- Убираем отображение `pro` плана и `export_pack` продукта
- Показываем `org_creator` план с ценой $2/мес
- Показываем лимит: "Организации: X / 3"
- Если подписка активна — кнопка "Отменить"
- Если подписки нет — кнопка `CreemCheckout`

### Файл: `services/configs/billing.config.ts`

Типы остаются совместимыми — `Plan`, `BillingCatalog` уже поддерживают произвольные фичи и лимиты.

## Секция 6: Фронтенд — Деактивированная организация

### Публичная страница организации (`/(public)/org/[orgId]`)

Если ответ API содержит `active: false`:

- Вместо контента — заглушка "Эта организация временно недоступна"
- Бронирование заблокировано
- Нет информации о персонале и услугах

### Управление организацией (`/(org)/manage/[orgId]`)

Если `org.active === false`:

- Полноэкранный баннер поверх контента:
  - "Ваша подписка истекла. Организация деактивирована."
  - Кнопка/ссылка "Возобновить подписку" → `/billing`
- Все функции управления заблокированы

### Личный кабинет сотрудника (`/(org)/org/[orgId]`)

Если `org.active === false`:

- Аналогичный баннер с информацией что организация деактивирована
- Контент скрыт

## Секция 7: i18n

### Файл: `i18n/messages/en.json`

Добавляем ключи:

```json
{
	"billing": {
		"plans": {
			"org_creator": {
				"name": "Org Creator",
				"description": "Create and manage up to 3 organizations"
			}
		},
		"orgCreator": {
			"paywallTitle": "Subscription Required",
			"paywallDescription": "Subscribe to Org Creator plan ($2/mo) to create and manage organizations",
			"limitReached": "Organization limit reached ({count}/{max})",
			"subscribe": "Subscribe — $2/mo"
		},
		"orgDeactivated": {
			"public": "This organization is temporarily unavailable",
			"owner": "Your subscription has expired. The organization is deactivated.",
			"member": "This organization is currently inactive.",
			"renewLink": "Renew subscription"
		}
	}
}
```

### Файл: `i18n/messages/uk.json`

Аналогичные ключи на украинском.

**Удаляем:** i18n ключи для `pro` плана и `export_pack` продукта из обоих файлов.

## Секция 8: Cleanup

- Удаляем `CREEM_PRODUCT_PRO` и `CREEM_PRODUCT_EXPORT_PACK` из `.env`, `.env.example`
- Добавляем `CREEM_PRODUCT_ORG_CREATOR` в `.env.example`
- В Creem дашборде нужно создать recurring product за $2/мес и получить product ID
- Обновляем тесты в `billing/__tests__/billing.test.js` — заменяем `pro` на `org_creator`, убираем `export_pack` тесты

## Зависимости между секциями

```
Секция 1 (billing конфиг) → Секция 2 (модель Organization)
    ↓
Секция 3 (защита роутов) — зависит от 1 и 2
    ↓
Секция 4 (paywall UI) — зависит от 1 (каталог)
Секция 5 (страница биллинга) — зависит от 1
Секция 6 (деактивация UI) — зависит от 2 и 3
Секция 7 (i18n) — параллельно с 4-6
Секция 8 (cleanup) — в конце
```
