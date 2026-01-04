# Autenticacion y sesiones

## Resumen
- Access token: JWT corto, se devuelve en JSON.
- Refresh token: cookie HttpOnly para rotacion.
- Verificacion: acepta `code` corto o `token` (link).
- Resets y reenvios via eventos.
- `POST /auth/refresh` rota el refresh token si es valido.

## Cookies y CORS
- Si el frontend corre en otro dominio, usa:
  - `CORS_ORIGINS=http://tu-frontend`
  - `AUTH_COOKIE_SAMESITE=None`
  - `AUTH_COOKIE_SECURE=true`
- El refresh token es `HttpOnly`, no se lee desde JS.

## Variables de entorno
- `AUTH_JWT_SECRET`
- `AUTH_ACCESS_TOKEN_TTL_MS`
- `AUTH_REFRESH_TOKEN_TTL_MS`
- `AUTH_REFRESH_COOKIE_NAME`
- `AUTH_COOKIE_SECURE`
- `AUTH_COOKIE_SAMESITE`
- `AUTH_PASSWORD_RESET_TTL_MS`
- `APP_BASE_URL`
- `RESEND_API_KEY`
- `RESEND_FROM`

## Endpoints

### Registro
`POST /users`
```json
{ "name": "...", "email": "...", "password": "..." }
```
Respuesta: `{ "id": "<user_id>" }`

### Verificacion (codigo o token)
`POST /users/:id/verify`
```json
{ "code": "<verification_code>" }
```
o
```json
{ "token": "<verification_token>" }
```
Respuesta: `accessToken` + `accessTokenExpiresIn` y cookie refresh.

### Login
`POST /auth/login`
```json
{ "email": "...", "password": "..." }
```
Respuesta: `accessToken`, `accessTokenExpiresIn` + cookie refresh.

### Refresh
`POST /auth/refresh`
Requiere cookie refresh.
Respuesta: `accessToken`, `accessTokenExpiresIn` + cookie refresh nuevo.

### Logout
`POST /auth/logout`
Revoca refresh y limpia cookie.

### Logout all
`POST /auth/logout-all`
Revoca todos los refresh tokens del usuario autenticado.

### Reenviar verificacion
`POST /auth/resend-verification`
```json
{ "email": "..." }
```

### Reset de password (request)
`POST /auth/password-reset`
```json
{ "email": "..." }
```

### Reset de password (confirm)
`POST /auth/password-reset/confirm`
```json
{ "email": "...", "token": "...", "newPassword": "..." }
```

## Notas de seguridad
- Refresh se rota en cada `POST /auth/refresh`.
- Tokens de verificacion y reset expiran y se regeneran en resend.
- Fallos de envio de email van a reintentos/DLQ.
