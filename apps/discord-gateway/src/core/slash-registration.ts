import { REST, Routes } from 'discord.js'
import type { AppConfig } from '../config/env.ts'
import type { SlashCommandEntry } from './registry.ts'

interface CommandShape {
  name: string
  description?: string
  default_member_permissions?: string | null
  options?: unknown[]
}

function commandSignature(command: CommandShape): string {
  return JSON.stringify({
    name: command.name,
    description: command.description ?? '',
    default_member_permissions: command.default_member_permissions ?? null,
    options: command.options ?? [],
  })
}

function commandsEqual(current: CommandShape[], desired: CommandShape[]): boolean {
  if (current.length !== desired.length) return false
  const currentSet = new Set(current.map(commandSignature))
  return desired.every((command) => currentSet.has(commandSignature(command)))
}

async function putIfChanged(
  rest: REST,
  route: `/${string}`,
  payload: unknown[],
  label: string,
): Promise<void> {
  const existing = (await rest.get(route)) as CommandShape[]
  if (commandsEqual(existing, payload as CommandShape[])) {
    console.log(`[ready] ${label} slash commands unchanged (${payload.length}); skipping`)
    return
  }
  await rest.put(route, { body: payload })
  console.log(`[ready] Registered ${payload.length} ${label} slash command(s)`)
}

/**
 * Registers slash commands split by module scope. Managed-guild module commands
 * (e.g. personal-roles) are only ever registered as guild commands in their
 * configured guilds — never globally — so a public rollout doesn't expose them
 * in the command list of unrelated servers.
 */
export async function registerSlashCommands(
  config: AppConfig,
  entries: SlashCommandEntry[],
): Promise<void> {
  const rest = new REST({ version: '10' }).setToken(config.discord.token)
  const registration = config.discord.commandRegistration

  const globalPayload = entries
    .filter((entry) => entry.module.scope.type === 'global')
    .map((entry) => entry.command.data.toJSON())

  if (registration.mode === 'global') {
    // Global-scope module commands go to the global route; managed-guild module
    // commands go to each guild the module is configured for.
    await putIfChanged(
      rest,
      Routes.applicationCommands(config.discord.clientId),
      globalPayload,
      'global',
    )

    const guildPayloads = new Map<string, unknown[]>()
    for (const entry of entries) {
      if (entry.module.scope.type !== 'managed-guilds') continue
      for (const guildId of entry.module.scope.guildIds) {
        const bucket = guildPayloads.get(guildId) ?? []
        bucket.push(entry.command.data.toJSON())
        guildPayloads.set(guildId, bucket)
      }
    }
    for (const [guildId, payload] of guildPayloads) {
      await putIfChanged(
        rest,
        Routes.applicationGuildCommands(config.discord.clientId, guildId),
        payload,
        `guild ${guildId} (managed)`,
      )
    }
    return
  }

  // Guild registration mode: each configured guild gets the global-scope
  // commands plus the commands of managed modules that cover that guild.
  for (const entry of entries) {
    if (entry.module.scope.type !== 'managed-guilds') continue
    for (const guildId of entry.module.scope.guildIds) {
      if (!registration.guildIds.includes(guildId)) {
        console.warn(
          `[ready] module ${entry.module.id} is scoped to guild ${guildId} which is not in DISCORD_COMMAND_GUILD_IDS — its commands will not be registered there`,
        )
      }
    }
  }

  for (const guildId of registration.guildIds) {
    const payload = entries
      .filter(
        (entry) =>
          entry.module.scope.type === 'global' || entry.module.scope.guildIds.includes(guildId),
      )
      .map((entry) => entry.command.data.toJSON())
    await putIfChanged(
      rest,
      Routes.applicationGuildCommands(config.discord.clientId, guildId),
      payload,
      `guild ${guildId}`,
    )
  }
}
