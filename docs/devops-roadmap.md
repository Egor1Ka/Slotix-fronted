# DevOps Roadmap для Slotix

Конспект того, что мы прошли при первом production-деплое + список тем для самостоятельного изучения.

> Дата: 2026-04-26
> Стек: Next.js + Node/Express + MongoDB Atlas, Contabo VPS, Caddy, Docker Compose, GitHub Actions

---

## 1. Что сделали (хронологически)

### 1.1. Купили инфраструктуру

- **VPS** — Contabo Cloud VPS 10 NVMe, Ubuntu 24.04, IP `213.136.67.77`
- **Домен** — `slotixs.uk` через Cloudflare Registrar
- **БД** — MongoDB Atlas Free (M0), кластер во Frankfurt

### 1.2. Server hardening

- Вошли по root + паролю
- Сгенерировали SSH-ключ на маке (`ssh-keygen -t ed25519`)
- Скопировали публичный ключ на сервер (`ssh-copy-id`)
- Создали отдельного юзера `deploy` для CI/CD
- Сгенерировали отдельный CI-ключ `slotix_deploy`, положили публичную часть на сервер
- Отключили пароли в `sshd_config` (через override `/etc/ssh/sshd_config.d/00-slotix.conf`)
- Настроили UFW: открыли только 22, 80, 443
- Поставили fail2ban — он уже забанил 5 ботов

### 1.3. Поставили Docker

- `docker-ce`, `docker-compose-plugin` через apt с официального репозитория Docker
- Юзер `deploy` добавлен в группу `docker`

### 1.4. Написали Docker-образы

- **Frontend Dockerfile** (мульти-стейдж: deps → builder → runner)
- **Backend Dockerfile** (мульти-стейдж: deps → runner)
- `.dockerignore` в обоих репо

### 1.5. Описали стек через Compose

- `docker-compose.prod.yml` с 3 сервисами:
  - **Caddy** — reverse proxy + автоматический HTTPS
  - **web** — Next.js фронт
  - **api** — Node.js бэк
- Networks (`slotix`), volumes (caddy_data, caddy_config)
- `Caddyfile` — конфиг роутинга `/api/*` → api:9000, `/*` → web:3000

### 1.6. Настроили автодеплой через GitHub Actions

- Workflow в Slotix-fronted: `build → push в GHCR → SSH → docker compose pull web && up -d web`
- Workflow в Slotx-backend: то же + **генерация `.env.api` из GitHub Secrets** на сервере перед запуском
- GitHub Secrets: `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`, плюс ~11 секретов с прод-ключами (DB_URL, JWT_SECRET, GOOGLE_*, CREEM_*, TELEGRAM_*)

### 1.7. Грабли, на которые наступили

- Билд падал на отсутствии `BACKEND_URL` → дефолт в `next.config.ts`
- `npm run build` падал на ESLint ошибках → `eslint.ignoreDuringBuilds: true`
- `next build` падал на «Failed to collect page data» → отложили проверку `CREEM_API_KEY` в runtime
- Prettier-чек падал → переформатировали 62 файла
- 3 настоящие ESLint ошибки → пофиксили
- На клиенте `${process.env.NEXT_PUBLIC_API_URL}` давал `undefined/api/...` → заменили на относительные пути
- `Caddy` не запускался первый раз → manual `docker compose up -d`

### 1.8. DNS + SSL

- A-записи в Cloudflare на `slotixs.uk` и `www` → IP сервера, **DNS only** (не proxied)
- Caddy сам выпустил Let's Encrypt сертификат через HTTP-01 challenge

### 1.9. OAuth

- Создали Google OAuth Client (или реюзнули `cardFront`)
- Добавили `https://slotixs.uk` как Authorized JS origin
- Добавили `https://slotixs.uk/api/auth/google/callback` как Authorized redirect URI
- Добавили себя в Test users (т.к. OAuth Client в Testing mode)

---

## 2. Темы DevOps, которые затронули

### A. Системное администрирование Linux

- Управление пакетами (`apt`)
- Systemd (`systemctl status/restart/enable`)
- Файловые права (`chmod 600`, `chown deploy:deploy`)
- Текстовые редакторы (`nano`)
- Иерархия `/etc`, `/opt`, `/home`, `/var`

### B. Сети

- TCP/IP, порты, A-записи, DNS
- HTTP vs HTTPS, SSL/TLS, X.509 сертификаты
- Reverse proxy: что это и зачем
- Let's Encrypt, ACME протокол, HTTP-01 challenge
- Что такое CDN (Cloudflare proxy mode)

### C. SSH и асимметричная криптография

- Public/private key pair
- `~/.ssh/authorized_keys`
- `sshd_config`: PermitRootLogin, PasswordAuthentication
- ssh-agent, `~/.ssh/config`
- `ssh-copy-id`, `scp`

### D. Безопасность

- Принцип наименьших привилегий (separate user для CI)
- Firewall (UFW поверх iptables)
- Fail2ban (защита от brute force)
- Управление секретами (GitHub Secrets vs .env on server)
- HTTPS, secure cookies, CORS

### E. Контейнеры

- Docker: образы, контейнеры, Dockerfile, multi-stage builds
- Docker Compose: декларативное описание стека
- Volumes (persistent data) и Networks (изоляция)
- Container registries (GHCR, Docker Hub)
- Image tagging, layers, caching

### F. CI/CD

- Continuous Integration vs Continuous Deployment
- GitHub Actions: workflows, jobs, steps
- Trigger types (push, workflow_dispatch)
- Secrets и переменные в pipeline
- Build/test/deploy этапы
- Артефакты, кэш

### G. OAuth 2.0

- Authorization Code Flow
- Client ID vs Client Secret
- Authorized redirect URIs
- Consent screen, scopes
- Test users vs Production verification

### H. Reverse proxy / Web servers

- Caddy (declarative, auto-HTTPS) vs Nginx (manual config)
- Path-based routing
- Headers forwarding
- HTTPS termination

---

## 3. Где это всё учить

Прицельный список — сначала бесплатное и практичное.

### С чего начать (must-do)

#### 1. Linux основы — [Linux Journey](https://linuxjourney.com)

Бесплатно, интерактивно, по делу. Пройди разделы Grasshopper и Networking Nomad. **2-3 вечера.**

#### 2. Docker — [Docker Curriculum](https://docker-curriculum.com) + [Docker Official Tutorial](https://docs.docker.com/get-started/)

Затем посмотри ютуб-серию **TechWorld with Nana — Docker Tutorial for Beginners** (2 часа, золото). **Неделя.**

#### 3. GitHub Actions — [официальные доки](https://docs.github.com/en/actions/learn-github-actions)

Они отличные. Раздел «Learn GitHub Actions» → пройди от начала до конца, но без зубрёжки — повторишь практикуясь. **Выходные.**

#### 4. SSH глубоко — [SSH chapter в Linux Journey](https://linuxjourney.com/lesson/ssh-overview)

Понять разницу public/private key, agent forwarding, jumphosts. **2-3 часа.**

### Дальше (когда первый рейтинг забьёшь)

#### 5. Networking + DNS — [learning.cloudflare.com](https://www.cloudflare.com/learning/)

У Cloudflare лучшие популярные объяснения DNS, HTTPS, CDN, DDoS. Бесплатно. Читать как блог. **Неделя по 30 мин в день.**

#### 6. Reverse proxy и Caddy — [Caddy docs](https://caddyserver.com/docs/)

У них шикарный гайд для новичков. Прочти «Getting Started» и «Common patterns». Дальше при необходимости. **Час.**

#### 7. Безопасность серверов — [Lynis](https://github.com/CISOfy/lynis) + [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org)

Запусти Lynis на своём сервере, увидишь рекомендации.

#### 8. OAuth 2.0 — [oauth.com](https://www.oauth.com)

Aaron Parecki, автор спецификации. Лучший туториал. Раздел «OAuth 2.0 Simplified». **Вечер.**

#### 9. Next.js на проде — [официальные deployment docs Next.js](https://nextjs.org/docs/app/getting-started/deploying)

Особенно секции про **standalone output**, **environment variables**, **caching**.

### На вырост (когда будешь масштабироваться)

#### 10. Книга «The Phoenix Project» (М. Кима)

Про культуру DevOps в форме романа. Не учебник, а понимание зачем всё это.

#### 11. Книга «Site Reliability Engineering» (Google)

Бесплатно онлайн на [sre.google/books](https://sre.google/books/). Когда сервис вырастет — там про мониторинг, SLO/SLA/SLI, постмортемы.

#### 12. Kubernetes — TechWorld with Nana — K8s for Beginners

YouTube курс на 4 часа. Но **до этого далеко**, тебе compose ещё долго хватит.

#### 13. Terraform / IaC — [HashiCorp Learn](https://developer.hashicorp.com/terraform/tutorials)

Когда будут несколько сервисов/сред.

#### 14. Мониторинг — Grafana + Prometheus или UptimeRobot/BetterStack

Уже нужно: тиковая проверка `https://slotixs.uk/api/health` извне.

---

## 4. Видео-курсы и YouTube-каналы

Если читать тексты лень — вот плейлист, который реально закроет 90% сегодняшних тем. Все ссылки бесплатные, английский (есть авто-субтитры).

### Tier 1 — посмотри в первую очередь (~10 часов суммарно)

#### Быстрые концепты для разогрева — [Fireship](https://www.youtube.com/@Fireship)

Канал с короткими 100-секундными видео по каждой теме. Не учит глубоко, но даёт **правильные ассоциации** к каждому термину. Посмотри подряд:

- [Docker in 100 Seconds](https://youtu.be/Gjnup-PuquQ)
- [Docker Compose in 100 Seconds](https://youtu.be/DM65_JyGxCo)
- [SSH in 100 Seconds](https://youtu.be/qWKK_PNHnnA)
- [Kubernetes in 100 Seconds](https://youtu.be/PziYflu8cB8)
- [DNS in 100 Seconds](https://youtu.be/UVR9lhUGAyU)
- [HTTPS in 100 Seconds](https://youtu.be/iYM2zFP3Zn0)
- [OAuth Explained in 5 Minutes](https://youtu.be/996OiexHze0)
- [GitHub Actions in 100 Seconds](https://youtu.be/cP0I9w2coGU)

**Время:** ~30 минут. **Польза:** правильно понимаешь что такое каждая штука.

#### Docker — [TechWorld with Nana — Docker Tutorial for Beginners](https://youtu.be/3c-iBn73dDE)

Один видос на 2 часа от лучшего DevOps-канала на YouTube. Покрывает: образы, контейнеры, Dockerfile, Compose, volumes, networks. **Обязательно к просмотру**, всё что мы делали — здесь объяснено.

**Время:** 2 часа. **Польза:** после этого видоса наш `docker-compose.prod.yml` будет читаться как родной язык.

#### GitHub Actions — [TechWorld with Nana — GitHub Actions Tutorial](https://youtu.be/R8_veQiYBjI)

Та же Nana, на 1 час. От первых workflow до полноценного CI/CD pipeline.

**Время:** 1 час. **Польза:** наш `.github/workflows/deploy.yml` станет понятным.

#### Linux основы — [NetworkChuck — Linux for Hackers](https://youtu.be/lZAoFs75_cs)

Не пугайся слова «hackers» — это просто маркетинг. По факту базовый Linux: bash, файлы, права, процессы. Энергичный стиль, не уснёшь.

Также у него классная серия [Linux 101](https://www.youtube.com/playlist?list=PLIhvC56v63IJVXv0GJcl9vO5Z6znCVb1P).

**Время:** ~3-4 часа на серию. **Польза:** не будешь теряться в ssh-сессии на сервере.

#### Reverse proxy + HTTPS — [TechWorld with Nana — Nginx Tutorial](https://youtu.be/7VAI73roXaY)

Это про Nginx, но **концепции те же что у Caddy**: reverse proxy, проксирование, HTTPS. У Caddy просто синтаксис проще.

**Время:** 1 час. **Польза:** поймёшь как работает наша связка `slotixs.uk → Caddy → web/api`.

### Tier 2 — когда захочется глубже (15+ часов, на пару месяцев)

#### Полный DevOps курс — [TechWorld with Nana — Complete DevOps Bootcamp](https://www.youtube.com/playlist?list=PLy7NrYWoggjzfAHlUusf2_2RO-DqRcRhu) или её платный курс на [techworld-with-nana.com](https://techworld-with-nana.com)

Серия из ~50 видео. Покрывает Linux → Docker → K8s → Terraform → Ansible → Prometheus → AWS. Если хочешь стать DevOps-инженером всерьёз — это та самая дорожная карта.

**Время:** ~25 часов. **Польза:** полная картина.

#### Linux глубже — [LearnLinuxTV](https://www.youtube.com/@LearnLinuxTV)

Канал Jay LaCroix — спокойный, академичный стиль. Много про администрирование Ubuntu Server, systemd, сети.

**Серия по Ubuntu Server:** [Ubuntu Server: From Beginner to Beast](https://www.youtube.com/playlist?list=PLT98CRl2KxKEUHie1m24-wkyHpEsa4Y70).

#### Сети глубже — [Practical Networking](https://www.youtube.com/@PracticalNetworking)

Если хочешь понимать **почему** интернет работает (TCP/IP, OSI, маршрутизация) — это лучший канал. Не для повседневной работы, но мозги встанут на место.

#### Безопасность — [LiveOverflow](https://www.youtube.com/@LiveOverflow) + [John Hammond](https://www.youtube.com/@_JohnHammond)

LiveOverflow про реверс-инжиниринг и web security (как ломают, как защищаться). John Hammond — практичные разборы CVE, malware, OSINT.

**Польза:** понимать что злоумышленники реально пытаются делать с твоим сервером.

#### Next.js на проде — [Lee Robinson](https://www.youtube.com/@leerob) (Vercel) + [Theo - t3.gg](https://www.youtube.com/@t3dotgg)

Lee Robinson — VP of Product в Vercel, объясняет Next.js best practices. Theo — горячие takes, иногда полезные иногда мусор, но интересно.

**Полезные видео:**
- Lee Robinson — [Next.js Caching Explained](https://youtu.be/VBlSe8tvg4U)
- Theo — [Self-hosting Next.js](https://youtu.be/sIVL4JMqRfc)

### Tier 3 — на вырост (если станешь делать big leagues)

#### Kubernetes — [TechWorld with Nana — Kubernetes Tutorial](https://youtu.be/X48VuDVv0do)

Один длинный видос на 4 часа. Когда compose начнёт болеть на нескольких серверах — это твой следующий шаг. **Но реально ещё далеко.**

#### Site Reliability — [Google SRE на YouTube](https://www.youtube.com/@googlecloudplatform)

Официальный плейлист «SRE prodcast» от Google. Когда сервис вырастет до десятков тысяч пользователей.

#### Performance comparisons — [Anton Putra](https://www.youtube.com/@AntonPutra)

Уникальный канал — сравнивает технологии под нагрузкой. Postgres vs MongoDB, Express vs Fastify, Caddy vs Nginx. Не нужен для старта, но для принятия решений на проде — золото.

### Для подписки (общий мониторинг индустрии)

- **TechWorld with Nana** — must-subscribe для DevOps
- **NetworkChuck** — Linux/networking, развлечение пополам с обучением
- **DevOps Toolkit (Viktor Farcic)** — для middle/senior уровня
- **Lee Robinson** — Next.js / Vercel
- **Theo - t3.gg** — TypeScript/full-stack холивары
- **Fireship** — общая ит-тренды, JS, web

### Если на платное (опционально)

- **Bret Fisher — Docker Mastery** на Udemy ($15 на распродаже) — лучший Docker курс который существует, 20 часов глубочайшей практики
- **Stephen Grider** — все его курсы на Udemy качественные (React, Next.js, Docker)
- **Frontend Masters** — подписка $39/мес, отличный курс «Build a Linux Server» от Brian Holt

### План просмотра «10 часов и ты в теме»

Если бы я был на твоём месте, я бы посмотрел в этой последовательности:

1. **Fireship 100-секундные видео** (30 мин) — разогрев
2. **TechWorld with Nana — Docker** (2 ч)
3. **NetworkChuck — Linux for Hackers** (3 ч) — параллельно практикуйся на сервере
4. **TechWorld with Nana — GitHub Actions** (1 ч)
5. **TechWorld with Nana — Nginx** (1 ч) — для reverse proxy
6. **Cloudflare Learning Center** (читать) — DNS, HTTPS, CDN
7. **oauth.com — Simplified** (читать) — OAuth flow

После этого — закрыта база на уровне «джуниор-DevOps». Дальше глубже по интересам.

---

## 5. Практические задачи для закрепления

После каждой темы — попробуй **на этом же сервере**:

1. Подними **Uptime Kuma** (self-hosted uptime monitor) в том же compose, маршрут через Caddy
2. Настрой **automatic backups** Mongo через `mongodump` + cron + Backblaze B2 (бесплатно до 10GB)
3. Добавь **rate limiting** в Caddy (`@api { not @api_internal }` + `rate_limit`)
4. Заведи **staging-среду** на subdomain `staging.slotixs.uk` (отдельный compose, отдельные образы с тегом `:staging`)
5. Настрой **error tracking** — Sentry self-hosted или sentry.io (free tier)
6. Поставь **Cloudflare proxy** перед сервером (включи оранжевое облако), настрой **WAF rules**

---

## 6. Главное правило

**Не зубри — практикуй**. Один реальный сервер, который ты сам поднял, ценнее 10 курсов. Этот сервер у тебя теперь есть. Каждую тему сверху можно отработать на нём. Ломай и чини, читай логи, смотри что происходит.

Сегодняшнее упражнение — **полный production-deploy с нуля** — это уже реально серьёзный навык. Большинство джунов этого не делает за всю карьеру в найме (за них всё делает devops-команда).

---

## 7. Контакты инфры (быстрая справка)

| Что | Где |
| --- | --- |
| VPS | Contabo, IP `213.136.67.77`, Ubuntu 24.04 |
| Домен | `slotixs.uk` через Cloudflare Registrar |
| DNS | Cloudflare, A-записи (DNS only) |
| Образы | `ghcr.io/egor1ka/slotix-fronted`, `ghcr.io/egor1ka/slotx-backend` |
| БД | MongoDB Atlas, кластер `slotix-prod` (Frankfurt) |
| OAuth | Google Cloud Console → проект CardFront |
| CI/CD | GitHub Actions в обоих репо |
| SSH-ключ для CI | `~/.ssh/slotix_deploy` (мак) → `/home/deploy/.ssh/authorized_keys` (сервер) |
| Compose файл на сервере | `/opt/slotix/docker-compose.prod.yml` |
| Caddyfile на сервере | `/opt/slotix/Caddyfile` |
| Env файл на сервере | `/opt/slotix/.env.api` (генерится workflow'ом из GH Secrets) |
