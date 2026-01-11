# Meridius Nova

Meridius Nova — музыкальное приложение для социальной сети VK.

## Особенности

### Аудио

- **Плавный переход с двойным контроллером**: Плавный переход между треками с использованием двух независимых аудио-контроллеров для бесшовного микширования. Настраиваемая длительность перехода и эффект затухания.
- **Нормалайзер в реальном времени**: Автоматическая нормализация громкости на уровне HLS-сегментов в реальном времени. Анализ и коррекция громкости каждого сегмента до воспроизведения с настраиваемым целевым уровнем.
- **18-полосный эквалайзер**: Профессиональный эквалайзер с готовыми пресетами и возможностью сохранения собственных настроек. Интеграция с Web Audio API для точной обработки сигнала.
- **Кэширование**: Автоматическое кэширование прослушанных треков в локальное хранилище для последующего воспроизведения, с поддержкой очистки кэша и настройками объёма.

## Технологии

- **Frontend**: Nuxt.js 4, Vue 3, Pinia, TypeScript
- **Desktop**: Tauri 2
- **Backend**: Node.js, Nuxt Server API
- **Стилизация**: Sass
- **Интернационализация**: @nuxtjs/i18n
- **PWA**: @vite-pwa/nuxt (только для веб-версии)

## Установка

### 1. Клонирование репозитория

```bash
git clone https://github.com/PurpleHorrorRus/MeridiusNova.git
cd MeridiusNova
```

### 2. Установка зависимостей

```bash
npm install
```

### 3. Настройка переменных окружения

Скопируйте файл `env-example` в `.env` и заполните необходимые переменные:

```bash
cp env-example .env
```

#### Обязательные переменные

- `NUXT_SESSION_PASSWORD` — пароль для шифрования сессий (минимум 32 символа)
- `NUXT_COOKIE_KEY` — приватный ключ для шифрования cookies в формате PEM

#### Опциональные переменные

- `TAURI_SIGNING_PRIVATE_KEY` — приватный ключ для подписи Tauri приложения
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — пароль для приватного ключа
- `DISCORD_CLIENT_ID` — ID клиента Discord для Rich Presence
- `DISCORD_CLIENT_SECRET` — секретный ключ Discord приложения
- `FFMPEG_BINARY` — путь к бинарному файлу FFmpeg (если не в PATH)
- `REPOSITORY` — GitHub репозиторий для проверки обновлений (формат: `owner/repo`, например: `username/MeridiusNova`)

#### Генерация ключей

**NUXT_SESSION_PASSWORD**:
```bash
# Генерация случайного пароля (32+ символов)
openssl rand -base64 32
```

**NUXT_COOKIE_KEY**:
```bash
# Генерация приватного ключа
openssl genpkey -algorithm RSA -out private-key.pem -pkeyopt rsa_keygen_bits:2048
# Затем скопируйте содержимое файла в .env, заменив переносы строк на \n
```

**TAURI_SIGNING_PRIVATE_KEY**:
```bash
# Генерация ключа для подписи Tauri приложения
tauri signer generate -w ./src-tauri/keys
```

## Разработка

### Локальная разработка (веб-версия)

Запуск сервера разработки:

```bash
npm run dev
```

Приложение будет доступно по адресу `http://localhost:3000`.

### Разработка с Docker

#### Запуск контейнера разработки

```bash
docker compose up -d meridius-dev
```

Приложение будет доступно по адресу `http://localhost:3001`.

### Разработка Tauri приложения

Для разработки десктопной версии необходимо сначала запустить веб-сервер разработки, а затем запустить Tauri:

```bash
# В первом терминале - запуск Nuxt dev сервера
npm run dev

# Во втором терминале - запуск Tauri
npm run tauri dev
```

Tauri автоматически подключится к `http://localhost:3000` согласно конфигурации в `src-tauri/tauri.conf.json`.

## Сборка

### Сборка веб-версии

```bash
npm run build
```

Собранное приложение будет в директории `.output`.

### Запуск production веб-версии

```bash
npm run start
```

### Сборка Tauri приложения

#### Windows

```bash
npm run build:windows
```

Или напрямую:

```bash
.\build\win64.bat
```

#### Linux

```bash
npm run build:linux
```

Или напрямую:

```bash
./build/linux.sh
```

Скрипты сборки выполняют следующие шаги:

1. Сборка Nuxt приложения (`nuxt build`)
2. Создание Node.js SEA (Single Executable Application) для встроенного сервера
3. Копирование ресурсов в `src-tauri/resources`
4. Запуск сборки Tauri (`tauri build`)

**Важно**: Перед сборкой убедитесь, что все переменные окружения настроены, особенно `NUXT_SESSION_PASSWORD` и `NUXT_COOKIE_KEY`.

### Сборка Docker образа

#### Production образ

Для сборки production образа необходимо заполнить переменные окружения в файле `.env` (см. раздел [Настройка переменных окружения](#3-настройка-переменных-окружения)). Docker Compose автоматически использует переменные из файла `.env` при сборке:

```bash
docker compose build meridius
```

#### Запуск production контейнера

```bash
docker compose up -d meridius
```

Приложение будет доступно по адресу `http://localhost:3000`.

#### Запуск готового образа

Для запуска готового образа `infinitehorror/meridius-nova` используйте команду:

```bash
docker run -d \
	--name meridius-nova \
	--restart unless-stopped \
	-p 3000:3000 \
	-e NUXT_SESSION_PASSWORD="ваш_пароль_минимум_32_символа" \
	-e NUXT_COOKIE_KEY="ваш_приватный_ключ_в_формате_PEM" \
	-v meridius-data:/home/node/.meridius \
	-v meridius-cache:/home/node/.meridius/.cache \
	infinitehorror/meridius-nova
```

После запуска контейнера приложение будет доступно по адресу `http://localhost:3000`.

**Важно**: Обязательно замените значения `NUXT_SESSION_PASSWORD` и `NUXT_COOKIE_KEY` на свои (см. раздел [Генерация ключей](#генерация-ключей)).

## Переменные окружения

### NODE_ENV

- `development` — режим разработки
- `production` — production режим

### EXTERNAL_SERVER

- `true` / `1` — использование внешнего сервера (для Docker)
- `false` / не установлено — встроенный сервер (для Tauri)

### FFMPEG_BINARY

Путь к бинарному файлу FFmpeg. Если не указан, используется FFmpeg из PATH.

## Лицензия

Это программное обеспечение распространяется под некоммерческой лицензией. Вы можете свободно использовать, изучать, модифицировать и распространять исходный код, но **запрещается использовать проект в коммерческих целях**.

Проект предназначен исключительно для личного использования и некоммерческих целей.