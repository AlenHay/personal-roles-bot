# Architecture

The bot is a Discord gateway process with scoped feature modules.

## Runtime Model

- Slash command registration is independent from module execution.
- The gateway checks guild access before dispatching any interaction.
- Each module declares a scope:
  - `global`: safe in any allowed guild and in DMs.
  - `managed-guilds`: only runs in explicitly configured guild IDs.
- Bot discovery lives in the `system` module with `/rolebot`.

## Modules

- `system` — `global`. `/rolebot about` and `/rolebot modules`.
- `roles` — `managed-guilds`. The personal-role editor, approval flow and
  reconciliation job. Role records live in Postgres (TypeORM); per-guild
  Discord settings live in the core SQLite guild-settings store and are managed
  with the ManageGuild-gated `/roles-setup`.

## Command Registration

Registration is scope-aware: commands from `global`-scope modules follow the
configured registration mode, while commands from `managed-guilds` modules are
only ever registered as guild commands in their configured guilds. Flipping to
global registration therefore never exposes managed-module commands (e.g.
`/role`) in unrelated servers' command lists.

Private/dev rollout:

```env
BOT_PUBLIC_MODE=false
DISCORD_COMMAND_REGISTRATION=guild
DISCORD_COMMAND_GUILD_IDS=123
```

Public rollout:

```env
BOT_PUBLIC_MODE=true
DISCORD_COMMAND_REGISTRATION=global
BOT_ALLOWED_GUILD_IDS=
BOT_BLOCKED_GUILD_IDS=
```

If `BOT_ALLOWED_GUILD_IDS` is non-empty, the bot only works in those guilds. If
`BOT_BLOCKED_GUILD_IDS` includes a guild, that guild is rejected first.

## Making a Module Public

`roles` is `managed-guilds` and supports one configured guild: its persisted
role records carry no guild dimension. Before a module can move to `global`
scope it needs:

- guild ID on every persisted record
- per-guild channel and role settings — `core/guild-settings.ts` provides a
  generic SQLite-backed, per-module key/value store
- per-guild external-service credentials or tenancy, if any
- setup/admin commands gated by Discord permissions
- data retention and uninstall cleanup on `GuildDelete`
