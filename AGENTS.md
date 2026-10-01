# Project technical decisions

- Telegram reply generation sends raw user text separately from system/context instructions, preventing transcript-style prompt echoing.
- Telegram responses pass through echo/degeneracy validation and a bounded retry before delivery, so provider failures never echo the incoming message.