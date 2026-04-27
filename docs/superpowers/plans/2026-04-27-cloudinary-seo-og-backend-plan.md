# Backend: SEO/Open Graph — Plan #2

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить `getOgImageUrl(assetType, ownerId)` helper в Cloudinary провайдер и расширить DTO (org, eventType, staff) полем `ogImage: string | null`. Без БД-миграций — URL вычисляется на лету.

**Architecture:** Существующий `cloudinary.url(publicId, transformation)` строит OG-URL из тех же public_id, что и аватарка/лого/фото услуги. DTO решает, есть ли ассет (по полю `logoUrl`/`image`/`avatar`), и проставляет `ogImage` либо строкой, либо `null`. Фронт подставит дефолт.

**Tech Stack:** Express 5, Mongoose 8, Cloudinary SDK, node:test (built-in).

**Spec:** [`docs/superpowers/specs/2026-04-27-cloudinary-seo-og-design.md`](../specs/2026-04-27-cloudinary-seo-og-design.md)

**Working directory:** `/Users/egorzozula/Desktop/BackendTemplate`

**Branch:** `feat/cloudinary-avatars` — не переключать.

**Без коммитов:** пользователь сказал «БЕЗ КОМИТОВ ПРОСТО ДОБАВЛЯЕМ КОД». Все шаги `git add`/`git commit` пропускать.

---

## File Structure

| Файл                                                     | Что делаем                                                                                    |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `src/modules/media/providers/cloudinary.js`              | Добавить `OG_TRANSFORMATION` + `getOgImageUrl(assetType, ownerId)` + экспорт в default object |
| `src/modules/media/services/mediaServices.js`            | Добавить wrapper `getOgImageUrl` через `getActiveProvider()`                                  |
| `src/modules/media/index.js`                             | Re-export `getOgImageUrl`                                                                     |
| `src/modules/media/__tests__/cloudinaryProvider.test.js` | 4 новых теста на `getOgImageUrl` (URL содержит `w_1200,h_630,c_fill,g_auto`)                  |
| `src/dto/orgDto.js`                                      | Добавить `ogImage` в `toOrgDto` (null если нет лого)                                          |
| `src/dto/eventTypeDto.js`                                | Добавить `ogImage` в `toEventTypeDto` (null если нет image)                                   |
| `src/dto/staffDto.js`                                    | Добавить `ogImage` в `toStaffDto` и `toOrgStaffDto` с каскадом per-org → personal → null      |

---

## Pre-flight

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
git status
PATH="/Users/egorzozula/.nvm/versions/node/v22.22.2/bin:$PATH" npm test
PATH="/Users/egorzozula/.nvm/versions/node/v22.22.2/bin:$PATH" npm run test:media
```

Все три должны пройти. Plan #1 ожидается уже применённым в working tree.

---

## Task 1: Расширить Cloudinary провайдер `getOgImageUrl`

**Files:**

- Modify: `src/modules/media/providers/cloudinary.js`
- Test: `src/modules/media/__tests__/cloudinaryProvider.test.js`

- [ ] **Step 1: Добавить failing-тесты на `getOgImageUrl`**

В конец `src/modules/media/__tests__/cloudinaryProvider.test.js` добавить:

```js
test('getOgImageUrl содержит трансформацию 1200x630 для user-avatar', () => {
	const url = provider.getOgImageUrl('user-avatar', 'u1')
	assert.match(url, /w_1200/)
	assert.match(url, /h_630/)
	assert.match(url, /c_fill/)
	assert.match(url, /g_auto/)
})

test('getOgImageUrl для staff-avatar', () => {
	const url = provider.getOgImageUrl('staff-avatar', 'org1/u2')
	assert.match(url, /w_1200/)
	assert.match(url, /h_630/)
	assert.match(url, /slotix\/avatars\/staff\/org1\/u2/)
})

test('getOgImageUrl для org-logo', () => {
	const url = provider.getOgImageUrl('org-logo', 'org1')
	assert.match(url, /w_1200/)
	assert.match(url, /h_630/)
	assert.match(url, /slotix\/orgs\/org1\/logo/)
})

test('getOgImageUrl для service-photo', () => {
	const url = provider.getOgImageUrl('service-photo', 'evt1')
	assert.match(url, /w_1200/)
	assert.match(url, /h_630/)
	assert.match(url, /slotix\/services\/evt1/)
})
```

**Замечание про мок:** существующий `mock.module("cloudinary", ...)` в этом файле имеет `url: (publicId) => \`https://test/${publicId}\``, который игнорирует трансформации. Чтобы тесты проходили, надо расширить мок — `url(publicId, options)` должен включать опции в строку.

В верху файла найти существующий `mock.module("cloudinary", { ... })` и заменить `url:` на:

```js
url: (publicId, options) => {
  const tr = options?.transformation;
  if (!tr) return `https://test/${publicId}`;
  const flat = (Array.isArray(tr) ? tr : [tr])
    .map((t) => Object.entries(t).map(([k, v]) => `${k[0]}_${v}`).join(","))
    .join("/");
  return `https://test/${flat}/${publicId}`;
},
```

(Это превратит `[{ width: 1200, height: 630, crop: "fill", gravity: "auto" }, ...]` в строку типа `w_1200,h_630,c_fill,g_auto/q_auto,f_auto/slotix/orgs/org1/logo`. Тесты на `assert.match(url, /w_1200/)` пройдут.)

- [ ] **Step 2: Запустить тесты — все 4 нос-кейса должны упасть**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
PATH="/Users/egorzozula/.nvm/versions/node/v22.22.2/bin:$PATH" npm run test:media
```

Ожидаем: 4 новых теста FAIL с `provider.getOgImageUrl is not a function`. Старые 5 buildProviderId-тестов всё ещё PASS.

- [ ] **Step 3: Реализовать `getOgImageUrl` в провайдере**

Открыть `src/modules/media/providers/cloudinary.js`. После определения `TRANSFORMATIONS` (после `Object.freeze({...})`-блока) добавить:

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
```

Заменить `export default` строку:

```js
export default { upload, delete: remove, buildProviderId, getOgImageUrl }
```

- [ ] **Step 4: Запустить тесты — все 9 должны пройти**

```bash
PATH="/Users/egorzozula/.nvm/versions/node/v22.22.2/bin:$PATH" npm run test:media
```

Ожидаем: 12 (mediaServices) + 9 (cloudinaryProvider) = 21 PASS.

- [ ] **Step 5: SKIP — DO NOT COMMIT.**

---

## Task 2: Добавить `getOgImageUrl` в mediaServices + index

**Files:**

- Modify: `src/modules/media/services/mediaServices.js`
- Modify: `src/modules/media/index.js`

- [ ] **Step 1: Открыть `mediaServices.js`**

В конец файла добавить:

```js
/**
 * Построить URL OG-картинки 1200×630 для ассета.
 * Provider-agnostic — работает поверх Cloudinary, S3 (когда добавим), и т.д.
 */
export const getOgImageUrl = (assetType, ownerId) =>
	getActiveProvider().getOgImageUrl(assetType, ownerId)
```

- [ ] **Step 2: Открыть `src/modules/media/index.js`**

Заменить содержимое на:

```js
// src/modules/media/index.js
export {
	uploadAvatar,
	deleteAvatar,
	getOgImageUrl,
} from './services/mediaServices.js'
export { uploadFor, handleUploadError } from './middleware/upload.js'
export { ASSET_TYPES } from './constants/media.js'
```

- [ ] **Step 3: Verify import**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
PATH="/Users/egorzozula/.nvm/versions/node/v22.22.2/bin:$PATH" node -e "import('./src/modules/media/index.js').then(m=>{console.log('exports:', Object.keys(m).join(','))})"
```

Ожидаем: `exports: uploadAvatar,deleteAvatar,getOgImageUrl,uploadFor,handleUploadError,ASSET_TYPES`.

- [ ] **Step 4: Запустить тесты**

```bash
PATH="/Users/egorzozula/.nvm/versions/node/v22.22.2/bin:$PATH" npm test
PATH="/Users/egorzozula/.nvm/versions/node/v22.22.2/bin:$PATH" npm run test:media
```

Ожидаем: оба PASS.

- [ ] **Step 5: SKIP — DO NOT COMMIT.**

---

## Task 3: Расширить `orgDto.toOrgDto()` полем `ogImage`

**Files:**

- Modify: `src/dto/orgDto.js`

- [ ] **Step 1: Заменить содержимое `src/dto/orgDto.js` на:**

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

const toOrgListItemDto = (org, membership) => ({
	id: org._id.toString(),
	name: org.name,
	logo: org.settings ? org.settings.logoUrl || null : null,
	role: membership.role,
	status: membership.status,
	active: org.active !== false,
})

export { toOrgDto, toOrgListItemDto }
```

(Только в `toOrgDto` добавлен `ogImage`. `toOrgListItemDto` не трогаем — это для списка организаций пользователя в дашборде, не для публичных страниц.)

- [ ] **Step 2: Запустить тесты**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
PATH="/Users/egorzozula/.nvm/versions/node/v22.22.2/bin:$PATH" npm test
```

Ожидаем: PASS.

- [ ] **Step 3: SKIP — DO NOT COMMIT.**

---

## Task 4: Расширить `eventTypeDto.toEventTypeDto()` полем `ogImage`

**Files:**

- Modify: `src/dto/eventTypeDto.js`

- [ ] **Step 1: Открыть `src/dto/eventTypeDto.js` и расширить импорты + DTO**

Заменить содержимое на:

```js
import { getOgImageUrl, ASSET_TYPES } from '../modules/media/index.js'

const toPriceDto = (price) => ({
	amount: price.amount,
	currency: price.currency,
})

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
		durationMin: doc.durationMin,
		type: doc.type,
		color: doc.color,
		description: doc.description || null,
		price: doc.price ? toPriceDto(doc.price) : null,
		bufferAfter: doc.bufferAfter,
		minNotice: doc.minNotice,
		slotStepMin: doc.slotStepMin,
		active: doc.active,
		staffPolicy: doc.staffPolicy,
		assignedPositions: doc.assignedPositions
			? doc.assignedPositions.map((id) => id.toString())
			: [],
		assignedStaff: doc.assignedStaff
			? doc.assignedStaff.map((id) => id.toString())
			: [],
	}
}

export { toEventTypeDto }
```

- [ ] **Step 2: Запустить тесты**

```bash
PATH="/Users/egorzozula/.nvm/versions/node/v22.22.2/bin:$PATH" npm test
```

Ожидаем: PASS.

- [ ] **Step 3: SKIP — DO NOT COMMIT.**

---

## Task 5: Расширить `staffDto` каскадным `ogImage`

**Files:**

- Modify: `src/dto/staffDto.js`

- [ ] **Step 1: Заменить содержимое `src/dto/staffDto.js` на:**

```js
import { getOgImageUrl, ASSET_TYPES } from '../modules/media/index.js'

const toString = (id) => id.toString()

/**
 * Каскад OG-картинки для staff:
 * - membership.avatar (per-org) → staff-avatar OG
 * - user.avatar (personal)      → user-avatar OG
 * - ничего → null (фронт подставит дефолт)
 */
const buildStaffOgImage = (user, membership) => {
	if (membership && membership.avatar) {
		return getOgImageUrl(
			ASSET_TYPES.STAFF_AVATAR,
			`${membership.orgId}/${user.id}`,
		)
	}
	if (user.avatar) {
		return getOgImageUrl(ASSET_TYPES.USER_AVATAR, user.id)
	}
	return null
}

const toStaffDto = (user, position, membership) => ({
	id: user.id,
	name: (membership && membership.displayName) || user.name,
	displayName: membership ? membership.displayName || null : null,
	avatar: user.avatar,
	ogImage: buildStaffOgImage(user, membership),
	position: position ? position.name : null,
	bio: membership ? membership.bio || null : null,
	orgId: membership ? membership.orgId.toString() : null,
	locationIds: membership ? membership.locationIds.map(toString) : [],
})

const toOrgStaffDto = (user, position, bookingCount, status, membership) => ({
	id: user.id,
	name: (membership && membership.displayName) || user.name,
	displayName: membership ? membership.displayName || null : null,
	avatar: membership ? membership.avatar || '' : '',
	ogImage: buildStaffOgImage(user, membership),
	position: position ? position.name : null,
	positionId:
		membership && membership.positionId
			? membership.positionId.toString()
			: null,
	bio: membership ? membership.bio || null : null,
	bookingCount,
	status: status || 'active',
})

export { toStaffDto, toOrgStaffDto }
```

(Helper `buildStaffOgImage` инкапсулирует каскад. Оба DTO зовут его одинаково.)

- [ ] **Step 2: Запустить тесты**

```bash
PATH="/Users/egorzozula/.nvm/versions/node/v22.22.2/bin:$PATH" npm test
```

Ожидаем: PASS.

- [ ] **Step 3: SKIP — DO NOT COMMIT.**

---

## Task 6: Финальная проверка acceptance

- [ ] **Step 1: Полный прогон тестов**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
PATH="/Users/egorzozula/.nvm/versions/node/v22.22.2/bin:$PATH" npm test
PATH="/Users/egorzozula/.nvm/versions/node/v22.22.2/bin:$PATH" npm run test:media
```

Ожидаем: оба PASS. test:media теперь насчитывает 21 тест (12 mediaServices + 9 cloudinaryProvider).

- [ ] **Step 2: Поднять сервер и curl-проверка**

(Только если есть .env с боевыми Cloudinary-ключами и тестовый orgId/eventTypeId.)

```bash
PATH="/Users/egorzozula/.nvm/versions/node/v22.22.2/bin:$PATH" npm run dev &
SERVER_PID=$!
sleep 3

# org с лого
curl -s http://localhost:3000/api/org/<ORG_ID> | jq '.data.ogImage'
# Ожидаем: строку URL или null

# eventType с фото
curl -s http://localhost:3000/api/event-types/<EVT_ID> | jq '.data.ogImage'

# staff
curl -s http://localhost:3000/api/staff/<USER_ID> | jq '.ogImage'

kill $SERVER_PID
```

Если curl недоступен — пропустить, передать на frontend-план для интеграционной проверки.

- [ ] **Step 3: Готовность к фронту**

Если backend-тесты зелёные — backend готов. Передавать на `2026-04-27-cloudinary-seo-og-frontend-plan.md`.
