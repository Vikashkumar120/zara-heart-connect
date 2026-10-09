# Project technical decisions

- Telegram reply generation sends raw user text separately from system/context instructions, preventing transcript-style prompt echoing.
- Telegram responses pass through echo/degeneracy validation and a bounded retry before delivery, so provider failures never echo the incoming message.
- Gemini speech generation and Telegram audio delivery are shared in one helper so main and user-created bots use the same model selection.
- Gemini text failover is shared by both Telegram webhook types so both use the same verified model list and per-user quota rotation.