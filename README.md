# anna

To install dependencies:

```bash
bun install
```

API apps (run separately):

```bash
bun run app:elysia
```

```bash
bun run app:hono
```

Infra (Dragonfly + Postgres):

```bash
docker compose up -d
```

This project was created using `bun init` in bun v1.3.3. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
