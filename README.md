# Verify Callback (Vercel)

Parte web de verificación para usar **solo en Vercel**.  
El bot de Discord sigue en tu bot hosting.

## Flujo

1. Usuario pulsa "Verificar" en Discord (bot hosting)
2. El bot genera un `state` y lo guarda en **Upstash Redis**
3. Bot responde con: `https://tu-vercel.app/verify/start?state=...`
4. Vercel redirige a Discord OAuth
5. Discord vuelve a `/verify/callback`
6. Vercel intercambia el code, valida y da el rol vía API de Discord

## Requisitos

1. Cuenta en [Upstash](https://console.upstash.com) → crear Redis (gratis)
2. Proyecto en Vercel
3. Variables de entorno (ver `.env.example`)

## Despliegue

```bash
# 1. Sube esta carpeta a un repo o impórtala en Vercel
# 2. En Vercel → Settings → Environment Variables pega todas las del .env.example
# 3. Deploy
```

En **Discord Developer Portal** → OAuth2 → Redirects agrega:

```
https://TU-PROYECTO.vercel.app/verify/callback
```

## Cambios necesarios en el BOT (bot hosting)

En el bot, cuando el usuario pulse el botón de verificar, en vez de usar el store local, guarda el state en Redis (el mismo Upstash) y genera el link apuntando a Vercel.

Ejemplo mínimo:

```js
import { Redis } from '@upstash/redis';
import crypto from 'node:crypto';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

function sign(body) {
  return crypto.createHmac('sha256', process.env.SESSION_SECRET).update(body).digest('base64url');
}

function makeState(userId, guildId) {
  const body = Buffer.from(JSON.stringify({ userId, guildId, n: crypto.randomUUID() })).toString('base64url');
  return `${body}.${sign(body)}`;
}

// Dentro del handler del botón:
const state = makeState(interaction.user.id, interaction.guildId);
await redis.set(`pending:${state}`, { userId: interaction.user.id, guildId: interaction.guildId }, { ex: 600 });

const url = `${process.env.PUBLIC_URL}/verify/start?state=${state}`;
// responder con el embed + url
```

**Importante:** `PUBLIC_URL`, `SESSION_SECRET` y las keys de Upstash deben ser **las mismas** en el bot y en Vercel.

## Variables de entorno (Vercel)

Copia todas las de `.env.example` en el panel de Vercel.

## Notas

- El bot token se usa desde Vercel para dar el rol (API REST). Asegúrate de que el bot tenga permisos de **Manage Roles** y el rol de verificado esté por debajo del rol del bot.
- El intent de Server Members no es necesario en Vercel porque no usa discord.js.
