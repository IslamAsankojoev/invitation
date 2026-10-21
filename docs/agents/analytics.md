# Аналитика (без внешних сервисов)

> Раздел контекста проекта для ИИ-ассистента. Корень и правила — [`AGENTS.md`](../../AGENTS.md); код — источник истины.

- Таблица `Event` (миграция `analytics_events`): `invitation_created` (сервер, props: template, eventType, lang, setup),
  `share_clicked` (props.channel: copy/whatsapp/telegram/native/qr — кнопки «Ссылки»), `guest_view` и `envelope_opened`
  (страница гостя, `sendBeacon`; превью ссылок мессенджерами JS не выполняют — их нет в счёте). Ответ гостя — из `Rsvp`.
  Хранится анонимный `visitorId` (localStorage `inv-visitor`), ни IP, ни браузера, ни имён. Показ шаблонов (demo) и
  превью редактора не считаются.
- `/stats/<STATS_KEY>` — воронка по приглашениям, созданным за 7/30/90 дней (когорта), разбивки, среднее число гостей.
  Только чтение — работает и на Vercel. Ключ ≥ 16 символов, как у показа.
