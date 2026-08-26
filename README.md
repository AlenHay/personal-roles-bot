# Personal Roles Bot

A Discord bot that lets members design their own personal role — name, colour
(including two-colour gradients), icon and hoisting — behind per-role
entitlements and an admin approval flow.

Built on Bun + `discord.js`, with a small module gateway so more features can be
added alongside the personal-roles module.

## Features

- `/role` — opens an ephemeral editor with a rendered preview card of how the
  role will look, then submits the changes for admin approval.
- Per-property entitlements: which Discord roles may edit name, colour, icon,
  gradient and hoist is configurable per guild.
- Approval flow: changes are posted to an approval channel with accept/deny
  buttons; approved roles are created or updated and positioned below a
  configured anchor role.
- `/roles-setup` — ManageGuild-gated in-Discord configuration, stored per guild.
- `/rolebot about|modules` — bot and module status.
- Periodic reconciliation job that keeps Discord roles in sync with the
  database.

The user-facing copy is currently in Russian.

## Run

```bash
bun install
cp stack.env.example stack.env   # fill in token, client ID, Postgres
bun run typecheck
bun run start
```

Docker:

```bash
docker compose up --build
```

## Configuration

All configuration is environment-based; see `stack.env.example` for the full
list. The essentials:

| Variable | Purpose |
| --- | --- |
| `DISCORD_TOKEN`, `DISCORD_CLIENT_ID` | Discord application credentials |
| `MODULE_PERSONAL_ROLES_ENABLED` | Enables the personal-roles module |
| `PERSONAL_ROLES_GUILD_IDS` | Guild the module runs in |
| `PERSONAL_ROLES_POSTGRES_*` | Postgres connection for role records |
| `GATEWAY_SQLITE_PATH` | SQLite file holding per-guild settings |

Per-guild settings (approval channel, anchor role, default role name, edit
gates) are best managed in Discord with `/roles-setup`; the `PERSONAL_ROLES_*`
env values act as defaults.

Required Discord permissions: Manage Roles, plus the Server Members intent.
The bot's own highest role must sit above the anchor role it creates roles under.

## Shape

```text
apps/discord-gateway
  src/core         gateway runtime, guild access checks, guild settings store
  src/config       env parsing
  src/modules      feature modules (system, personal-roles)
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Verify

```bash
bun run typecheck
bun run test
bun run lint
```

## License

MIT — see [LICENSE](LICENSE).
