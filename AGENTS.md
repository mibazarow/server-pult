# AGENTS.md — контекст проекта ServerPult

Документ для будущих агентских сессий: чтобы быстро «въехать» без перечитывания истории.

## Что это

**ServerPult** — настольное приложение (macOS, Tauri 2) для управления домашним
ИИ-сервером по локальной сети: запуск/переключение LLM, чат, генерация картинок/музыки/звуков,
дашборд железа и логи. Репозиторий содержит **только клиент**; серверные скрипты живут на
сервере (в репо их нет — чтобы не тащить секреты и хостовые пути).

Публичное описание — в `README.md`. Исходное ТЗ — у автора в `~/Downloads/tz.md` (не в репо).

## Стек

- Tauri 2, Rust (edition 2021), фронтенд React 19 + TypeScript + Vite + **Tailwind v4** (только светлая тема).
- Сборка: `pnpm install`, `pnpm tauri dev`, `pnpm tauri build`.
- Ключевые Rust-крейты: `russh` 0.63 (SSH), `keyring` 4 (Keychain), `reqwest` (чат-стриминг), `base64`, `tokio`.

## Структура

```
src/                     фронтенд
  App.tsx                сайдбар + переключение экранов (без роутера)
  screens/               Dashboard, Llm, Chat, Images, Audio, Logs, Settings
  components/            Card, ComingSoon, JobPanel
  hooks/useJob.ts        опрос задания + автоскачивание результата
  lib/api.ts             все invoke()-обёртки и типы
  lib/format.ts          форматирование чисел/длительностей
src-tauri/src/
  lib.rs                 команды Tauri, connection() из профиля+Keychain
  ssh.rs                 russh: exec(host,port,user,password,command) -> SshOutput
  secrets.rs             Keychain: пароль (account=user) и ключ API (account="llm-api-key")
  profile.rs             профиль (host/port/user) в app_config_dir/profile.json
  control.rs             команды: system/llm/задания/logs, job_download
  chat.rs                chat_stream: SSE-стриминг, события в окно
```

## Контракт с сервером

Приложение вызывает по SSH `bash /opt/kilo-tools/control/<script>` и парсит JSON из stdout.
Скрипты на сервере (там же, где рабочий `llm.sh`):

- `system.sh` → `{gpu:{name,util,vram_used_mib,vram_total_mib,power_w,temp_c}, cpu:{load1,temp_c}, ram:{used_mib,total_mib}, disk:{free_gb,total_gb}, uptime_s, services:{llm}}`
- `llm.sh status` → `{running,pid,model,owner,foreign_owner,port,vram_mib,uptime_s,api_ok}`
- `llm.sh list` → `{models:[{id,reasoning,engine,vision,path}]}`
- `llm.sh start <id>|stop` → `{ok}` (тонкий слой над рабочим `llm.sh`)
- `image.sh <prompt_b64> <neg_b64> <w> <h> <steps> <cfg> <upscale>` → `{job_id}`
- `audio.sh music <caption_b64> <lyrics_b64> <dur> <steps> <guidance>` → `{job_id}`
- `audio.sh sfx <prompt_b64> <seconds> <steps> <cfg> <seed>` → `{job_id}`
- `job.sh status|list|cancel|cleanup` → JSON задания `{id,kind,state,stage,message,result,error}`
- `log.sh llm|temps|job <id> [lines]` → текст

Фоновые исполнители (`_image_run.sh`, `_audio_music_run.sh`, `_audio_sfx_run.sh`) берут `flock`
на GPU, **останавливают LLM, а по завершении возвращают её через `trap`** (возврат живёт на
сервере, а не в приложении). Аргументы — в base64, чтобы не ломаться на кавычках/кириллице.

## Важные решения (из ТЗ)

- Один узел, только локальная сеть, авторизация логин+пароль (без ключей).
- Интерфейс только на русском; экран «Файлы» и история — в v2.
- Результаты всегда в `~/Downloads/generated`; после скачивания файл и каталог задания на
  сервере удаляются.
- Одна GPU на всех: задания в очереди, LLM возвращается после очереди.
- «Чужой владелец» LLM (запуск от root) исключается на стороне сервера — `llm.sh` сам понижает
  права до пользователя.

## Грабли

- **russh 0.63:** `check_server_key(&PublicKeyOrCertificate)`; `AuthResult` лежит в `russh::client::AuthResult`;
  `authenticate_password` возвращает `AuthResult`, а не `bool`.
- **Tauri-команды:** из JS аргументы в camelCase (`maxTokens`), в Rust — snake_case (`max_tokens`).
- **Чат** не в webview: запрос делает Rust (`reqwest`), токены шлются событиями
  `chat://token|done|error`; фронт слушает через `@tauri-apps/api/event`.
- **Скачивание результата:** `base64 -w0 <файл>` по SSH, декод в Rust, запись в `~/Downloads/generated`.
- **Секреты:** в репозитории быть не должно ни ключей, ни IP. Ключ API задаётся в «Настройках»
  и хранится в Keychain (`ServerPult` / `llm-api-key`). Никаких дефолтных ключей в коде.
- **macOS «Локальная сеть»:** без ключа `NSLocalNetworkUsageDescription` в `src-tauri/Info.plist`
  приложение не получает доступ к LAN и падает с `No route to host (os error 65)` — при том что
  `ssh`/`ping` из Терминала работают. Ключ уже добавлен; разрешение выдаётся в «Системные
  настройки → Конфиденциальность → Локальная сеть».
- `job_download` требует `state == "done"`.

## Тесты

Живой smoke-тест SSH (по умолчанию `#[ignore]`):

```bash
cd src-tauri
SP_HOST=<ip> SP_USER=<user> SP_PASS=<pass> cargo test smoke_real_server -- --ignored --nocapture
```

## Состояние

M0–M5 сделаны: дашборд, LLM, чат, картинки (Z-Image + SUPIR ×2), аудио (ACE-Step + MOSS), логи,
очередь и авто-возврат LLM, иконка, релизная сборка. Открытый пункт: перевод MOSS-SoundEffect
на быстрый torch-путь (сейчас C++-рантайм openmoss декодирует ~5 мин на клип).
