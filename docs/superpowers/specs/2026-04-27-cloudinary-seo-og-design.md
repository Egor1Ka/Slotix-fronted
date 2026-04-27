# SEO / Open Graph для публичных страниц (Plan #2)

**Дата:** 2026-04-27
**Скоуп:** `generateMetadata` с Open Graph + Twitter Cards для трёх публичных страниц. Использует ассеты из Plan #1.
**Репо:**

- Frontend: `Slotix-fronted` (Next.js 16)
- Backend: `BackendTemplate` (Express 5 + Mongoose)

**Зависит от:** [`2026-04-27-cloudinary-org-service-photos-design.md`](./2026-04-27-cloudinary-org-service-photos-design.md) (Plan #1 — лого организации, фото услуги, аватарки). Plan #2 переиспользует те же Cloudinary public_id и добавляет вторую трансформацию URL для OG-картинок 1200×630.

---

## 1. Цель

При шаринге публичной ссылки в мессенджерах (Telegram, WhatsApp, Slack, Facebook, Twitter) карточка предпросмотра должна содержать:

- картинку 1200×630 (горизонталь) — лого организации / аватар сотрудника / fallback-плейсхолдер
- название (название орг / имя сотрудника)
- описание (description орг / bio сотрудника)

Покрываем три публичные страницы:

| Страница                          | Что показывается                                                          |
| --------------------------------- | ------------------------------------------------------------------------- |
| `/(public)/org/[orgId]`           | лого + название + описание организации                                    |
| `/(public)/org/[orgId]/[staffId]` | аватар сотрудника + `${имя} · ${орг}` + bio (или fallback к описанию орг) |
| `/(public)/book/[staffSlug]`      | аватар solo-юзера + имя + bio/description                                 |

Не входит в этот план: per-service OG (когда URL содержит выбранную услугу), sitemap.xml, JSON-LD, локализация заголовков. Вынесено в §7.

---

## 2. Зафиксированные решения

| Решение                        | Выбор                                                                                                                                  |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Размер OG картинки             | 1200×630, `c_fill,g_auto` (контент-aware)                                                                                              |
| Где хранится OG-URL            | Не хранится в БД. Генерируется на лету через `cloudinary.url(publicId, transformation)` при сборке DTO                                 |
| Как фронт получает OG-URL      | Бэкенд кладёт поле `ogImage: string \| null` в существующие DTO (`OrgByIdResponse`, `StaffBySlugResponse`, `StaffMember`, `EventType`) |
| Fallback при отсутствии ассета | Дефолтная брендовая картинка `/og-default.png` 1200×630 (создаётся вручную в `public/`)                                                |
| Локализация OG-текстов         | Не локализуем content (название/описание берём из БД как есть). Но `og:locale` ставим из URL (`en_US` / `uk_UA`)                       |
| Twitter Cards                  | Явные `twitter:card=summary_large_image` + `twitter:title/description/image`                                                           |
| Шаблоны заголовков             | Без шаблонов — `og:title = org.name` (без суффикса «\| Slotix»). Для staff в орге исключение — `${staff.name} · ${org.name}`           |
| Каскад для staff `ogImage`     | per-org membership avatar → personal user avatar → `null` (фронт подставит дефолт)                                                     |
| Деду fetch'ей в Next           | `generateMetadata` использует `cache: 'force-cache'` для своих API-вызовов, чтобы не дублировать с самой страницей                     |

---

## 3. Backend — Express + Mongoose

### 3.1. Helper `getOgImageUrl` в Cloudinary провайдере

**`src/modules/media/providers/cloudinary.js`** — добавить:

```js
const OG_TRANSFORMATION = [
	{ width: 1200, height: 630, crop: 'fill', gravity: 'auto' },
	{ quality: 'auto', fetch_format: 'auto' },
]

const getOgImageUrl = (assetType, ownerId) => {
	const publicId = buildPublicId(assetType, ownerId)
	return cloudinary.url(publicId, {
		secure: true,
		transformation: OG_TRANSFORMATION,
	})
}

export default {
	upload,
	delete: remove,
	buildProviderId,
	getOgImageUrl,
}
```

**Замечание:** `cloudinary.url()` строит URL без проверки существования файла. Поэтому caller (DTO) должен сам проверять, есть ли ассет (наличие `org.settings.logoUrl`, `eventType.image`, `membership.avatar`/`user.avatar`). Если ассета нет — `ogImage` в DTO ставится `null`.

### 3.2. Provider-agnostic wrapper в media-сервисах

**`src/modules/media/services/mediaServices.js`** — добавить экспорт:

```js
export const getOgImageUrl = (assetType, ownerId) =>
	getActiveProvider().getOgImageUrl(assetType, ownerId)
```

**`src/modules/media/index.js`** — пере-экспорт:

```js
export {
	uploadAvatar,
	deleteAvatar,
	getOgImageUrl,
} from './services/mediaServices.js'
```

### 3.3. DTO: `orgDto`

**`src/dto/orgDto.js`** — заменить `toOrgDto`:

```js
import { getOgImageUrl, ASSET_TYPES } from '../modules/media/index.js'

const toOrgDto = (doc) => {
	const id = doc._id.toString()
	const hasLogo = Boolean(doc.settings && doc.settings.logoUrl)
	return {
		id,
		name: doc.name,
		timezone: doc.timezone || null,
		logo: doc.settings ? doc.settings.logoUrl || null : null,
		ogImage: hasLogo ? getOgImageUrl(ASSET_TYPES.ORG_LOGO, id) : null,
		description: doc.description || null,
		address: doc.address || null,
		phone: doc.phone || null,
		website: doc.website || null,
		active: doc.active !== false,
	}
}
```

### 3.4. DTO: `eventTypeDto`

**`src/dto/eventTypeDto.js`** — добавить поле:

```js
import { getOgImageUrl, ASSET_TYPES } from '../modules/media/index.js'

const toEventTypeDto = (doc) => {
	const id = doc._id.toString()
	return {
		id,
		userId: doc.userId ? doc.userId.toString() : null,
		orgId: doc.orgId ? doc.orgId.toString() : null,
		slug: doc.slug,
		name: doc.name,
		image: doc.image || '',
		ogImage: doc.image ? getOgImageUrl(ASSET_TYPES.SERVICE_PHOTO, id) : null,
		// ...остальные поля без изменений
	}
}
```

### 3.5. DTO: staff (для public org/staff и book/staffSlug страниц)

**`src/services/staffServices.js`** — там, где формируется staff DTO (текущее имя файла подтверждается при реализации), добавить каскад:

```js
const buildStaffOgImage = ({ membership, user, orgId }) => {
	if (membership && membership.avatar) {
		return getOgImageUrl(ASSET_TYPES.STAFF_AVATAR, `${orgId}/${user._id}`)
	}
	if (user.avatar) {
		return getOgImageUrl(ASSET_TYPES.USER_AVATAR, user._id.toString())
	}
	return null
}
```

И прокидывать в выдачу:

- `GET /api/org/:id/staff` (массив) — каждый item имеет `ogImage`
- `GET /api/staff/by-slug/:slug` или эквивалентный endpoint (имя уточняется при реализации) — добавить `ogImage`

### 3.6. Какие endpoint'ы трогаем

| Endpoint                                                                  | Изменение                            |
| ------------------------------------------------------------------------- | ------------------------------------ |
| `GET /api/org/:id`                                                        | DTO теперь включает `ogImage`        |
| `GET /api/org/:id/staff`                                                  | Каждый staff item включает `ogImage` |
| `GET /api/staff/by-slug/:slug` (или эквивалент — уточнить при реализации) | Включает `ogImage`                   |
| `GET /api/event-types/:id` и список                                       | Включают `ogImage`                   |

**Что не трогаем:** никаких новых endpoint'ов, никаких изменений в схеме БД, никаких новых routes.

### 3.7. Тесты

**`src/modules/media/__tests__/cloudinaryProvider.test.js`** — добавить 4 теста для `getOgImageUrl`:

```js
test('getOgImageUrl содержит трансформацию 1200x630 для user-avatar', () => {
	const url = provider.getOgImageUrl('user-avatar', 'u1')
	assert.match(url, /w_1200/)
	assert.match(url, /h_630/)
	assert.match(url, /c_fill/)
	assert.match(url, /g_auto/)
})
// аналогично для staff-avatar, org-logo, service-photo
```

(В существующем мок-провайдере `url` resolver возвращает `https://test/${publicId}` без трансформаций. Тесту нужен расширенный мок, либо `getOgImageUrl` делает реальный `cloudinary.url()` через мок, который умеет применять transformation. Деталь — на уровне плана.)

---

## 4. Frontend — Next.js 16

### 4.1. Расширение типов

**`services/configs/booking.types.ts`:**

```diff
 interface OrgByIdResponse {
   id: string
   name: string
   logo: string | null
+  ogImage: string | null
   description: string | null
   address: string | null
   phone: string | null
   website: string | null
   active: boolean
   timezone?: string
 }

 interface StaffMember {
   id: string
   name: string
   avatar: string
+  ogImage: string | null
   position: string | null
   bio: string | null
 }

 interface StaffBySlugResponse {
   id: string
   name: string
   avatar: string
+  ogImage: string | null
   position: string | null
   ...
 }

 interface EventType {
   ...
   image: string
+  ogImage: string | null
   ...
 }
```

### 4.2. Helper `buildOgMetadata`

**`lib/seo/og-metadata.ts`** (новый файл):

```ts
import type { Metadata } from 'next'

const DEFAULT_OG_IMAGE = '/og-default.png'

interface OgInput {
	title: string
	description: string
	image: string | null
	locale: string
	url?: string
}

const localeToOgLocale = (locale: string): string => {
	if (locale === 'uk') return 'uk_UA'
	return 'en_US'
}

export const buildOgMetadata = ({
	title,
	description,
	image,
	locale,
	url,
}: OgInput): Metadata => {
	const ogImage = image ?? DEFAULT_OG_IMAGE
	return {
		title,
		description,
		openGraph: {
			title,
			description,
			images: [{ url: ogImage, width: 1200, height: 630 }],
			locale: localeToOgLocale(locale),
			type: 'website',
			url,
		},
		twitter: {
			card: 'summary_large_image',
			title,
			description,
			images: [ogImage],
		},
	}
}
```

### 4.3. Дедупликация fetch'ей в `generateMetadata`

`generateMetadata` и `page` оба вызывают одинаковый API. Next.js дедуплицирует одинаковые `fetch` в рамках одного запроса автоматически — но только при совпадающих опциях.

**Решение:** в `generateMetadata` зовём API через ту же функцию, что и сама страница. Чтобы это сработало с нашим `services/api/methods.ts`, надо убедиться, что `request()` использует Next's встроенный `fetch` (не модифицирует `cache`/`revalidate`). Если базовый `fetch` модифицируется (например, `cache: 'no-store'` глобально) — добавить опциональный override через параметр в `methods.ts`.

При имплементации первого шага плана надо проверить:

1. Что `services/api/request.ts` не выставляет `cache: 'no-store'` принудительно.
2. Если выставляет — добавить опцию пере-определения, чтобы `generateMetadata` мог звать с дефолтным кешем.

(План это формализует.)

### 4.4. `generateMetadata` на трёх страницах

**`app/[locale]/(public)/org/[orgId]/page.tsx`:**

```tsx
import type { Metadata } from 'next'
import { orgApi } from '@/services'
import { buildOgMetadata } from '@/lib/seo/og-metadata'

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string; orgId: string }>
}): Promise<Metadata> {
	const { locale, orgId } = await params
	try {
		const response = await orgApi.getById({ pathParams: { id: orgId } })
		const org = response.data
		return buildOgMetadata({
			title: org.name,
			description: org.description ?? '',
			image: org.ogImage,
			locale,
		})
	} catch {
		return {}
	}
}
```

**`app/[locale]/(public)/org/[orgId]/[staffId]/page.tsx`:**

```tsx
export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string; orgId: string; staffId: string }>
}): Promise<Metadata> {
	const { locale, orgId, staffId } = await params
	try {
		const [orgResponse, staffResponse] = await Promise.all([
			orgApi.getById({ pathParams: { id: orgId } }),
			orgApi.getStaff({ pathParams: { id: orgId } }),
		])
		const org = orgResponse.data
		const staff = staffResponse.data.find((s) => s.id === staffId)
		if (!staff) return {}
		return buildOgMetadata({
			title: `${staff.name} · ${org.name}`,
			description: staff.bio ?? org.description ?? '',
			image: staff.ogImage,
			locale,
		})
	} catch {
		return {}
	}
}
```

**`app/[locale]/(public)/book/[staffSlug]/page.tsx`:**

Booking flow использует отдельный API-клиент `lib/booking-api-client.ts` (а не `services/`). В нём уже есть функция вида `get<StaffBySlugResponse>('/staff/${slug}')`. На сервере (внутри `generateMetadata`) можно либо:

- (a) **Дернуть напрямую `fetch`** к `${process.env.BACKEND_URL}/api/staff/${staffSlug}` (как уже делается в `/(public)/org/[orgId]/page.tsx` для проверки `orgActive` — см. `fetchOrgActive`). Простой вариант, минимум зависимостей.
- (b) **Импортировать функцию из `lib/booking-api-client.ts`** — но она использует `localStorage`/токены, что не работает на сервере.

**Решение:** вариант (a). На уровне `generateMetadata` пишем тонкий серверный fetch (с `cache: 'force-cache'`) — мы и так делаем то же для `org`-страницы.

```tsx
async function fetchStaffBySlug(slug: string) {
	const backendUrl = process.env.BACKEND_URL ?? ''
	try {
		const response = await fetch(`${backendUrl}/api/staff/${slug}`, {
			cache: 'force-cache',
			next: { revalidate: 60 },
		})
		if (!response.ok) return null
		const json = await response.json()
		return json.data as {
			name: string
			bio: string | null
			description: string | null
			ogImage: string | null
		}
	} catch {
		return null
	}
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string; staffSlug: string }>
}): Promise<Metadata> {
	const { locale, staffSlug } = await params
	const staff = await fetchStaffBySlug(staffSlug)
	if (!staff) return {}
	return buildOgMetadata({
		title: staff.name,
		description: staff.bio ?? staff.description ?? '',
		image: staff.ogImage,
		locale,
	})
}
```

**Точное имя бэкенд-эндпоинта** для staff-by-slug — `GET /api/staff/:slug` (по `lib/booking-api-client.ts:260` — путь `/staff/${id}${query}`). Бэкенд-маршрут существует (используется живой страницей `/book/[staffSlug]`), но нужно убедиться, что он отдаёт `bio` и `description`. Если не отдаёт — добавляем в существующий staff DTO.

### 4.5. Дефолтная картинка

**`public/og-default.png`** 1200×630 — создаётся вручную (брендовая картинка с лого Slotix). План указывает её наличие как pre-requisite. До появления файла — фронт всё равно отдаёт `og:image` URL, но при загрузке клиент получит 404. Не критично для функциональности, важно для UX.

### 4.6. Что НЕ делаем

- Не делаем sitemap.xml / robots.txt
- Не делаем `alternates.canonical`
- Не делаем `og:type='profile'` для staff (всё `website`)
- Не делаем JSON-LD structured data
- Не локализуем `og:title`/`og:description`
- Не делаем per-service OG

---

## 5. Порядок реализации

1. **Backend сначала** — добавить `getOgImageUrl` + расширить DTO. Без этого фронт получит `ogImage: undefined`.
2. **Frontend** — типы → `buildOgMetadata` → `generateMetadata` на трёх страницах → manual smoke в Telegram.

Конкретные шаги — в плане.

---

## 6. Acceptance Criteria

### Pre-requisites (вне плана)

- [ ] Создан `public/og-default.png` 1200×630

### Backend

- [ ] `cloudinary.js` экспортирует `getOgImageUrl(assetType, ownerId)` с трансформацией 1200×630 (`g_auto`)
- [ ] `mediaServices.js` экспортирует `getOgImageUrl` через `getActiveProvider()`
- [ ] `media/index.js` re-exports `getOgImageUrl`
- [ ] `orgDto.toOrgDto()` включает `ogImage: string | null` (null если `settings.logoUrl` пустое)
- [ ] `eventTypeDto.toEventTypeDto()` включает `ogImage: string | null` (null если `image` пустое)
- [ ] Staff DTO (в `staffServices.js` или эквивалент) включает `ogImage: string | null` с каскадом `membership.avatar` → `user.avatar` → `null`
- [ ] Тесты `cloudinaryProvider.test.js` имеют 4 кейса на `getOgImageUrl` для всех assetType (URL содержит `w_1200,h_630,c_fill,g_auto`)
- [ ] `npm test` + `npm run test:media` зелёные
- [ ] curl-проверка: `GET /api/org/:id` возвращает `ogImage` корректно

### Frontend

- [ ] `OrgByIdResponse`, `StaffMember`, `StaffBySlugResponse`, `EventType` имеют `ogImage: string | null`
- [ ] `lib/seo/og-metadata.ts` экспортирует `buildOgMetadata` с правильной структурой `Metadata`
- [ ] `generateMetadata` добавлен на 3 публичные страницы
- [ ] При невалидном id/slug — `generateMetadata` возвращает `{}`
- [ ] `og:locale` зависит от URL: `/en/...` → `en_US`, `/uk/...` → `uk_UA`
- [ ] При отсутствии `ogImage` фронт подставляет `/og-default.png`
- [ ] `npm run lint` — 0 errors
- [ ] `npm run build` — компиляция чистая

### Manual smoke

- [ ] Закидываем ссылку `/{locale}/org/{orgId}` в Telegram → видна карточка с `og:image`, `og:title`, `og:description`
- [ ] То же для `/(public)/book/{staffSlug}` и `/(public)/org/{orgId}/{staffId}`
- [ ] Проверка fallback: орг без лого → виден `/og-default.png`
- [ ] Проверка каскада: staff в орге без membership-аватара, но с user.avatar → видна персональная аватарка

---

## 7. Out of scope (следующие планы)

- `sitemap.xml`, `robots.txt`
- `alternates.canonical` для всех страниц
- JSON-LD structured data (Schema.org `Organization`, `LocalBusiness`, `Person`)
- Per-service OG (динамика по query/path)
- Локализация `og:title`/`og:description` через шаблоны i18n
- `og:type='profile'` для staff-страниц
- OG-картинки для лендинга (отдельная история)
- Динамические OG-картинки на лету (`@vercel/og` или Cloudinary с overlay)

Архитектура (`getOgImageUrl` в провайдере + поле `ogImage` в DTO + `buildOgMetadata` helper) позволяет добавить новые типы публичных страниц или сменить дизайн карточки без переработки.
