export interface AppConfig {
  discord: {
    token: string
    clientId: string
    status: string | null
    commandRegistration: {
      mode: 'global' | 'guild'
      guildIds: string[]
    }
  }
  publicBot: {
    enabled: boolean
    allowedGuildIds: string[]
    blockedGuildIds: string[]
    leaveUnauthorizedGuilds: boolean
  }
  modules: {
    personalRoles: boolean
  }
}

function requireEnv(key: string): string {
  const value = process.env[key]?.trim()
  if (!value) throw new Error(`Missing required environment variable: ${key}`)
  return value
}

function parseBool(key: string, fallback: boolean): boolean {
  const raw = process.env[key]?.trim().toLowerCase()
  if (!raw) return fallback
  if (['1', 'true', 'yes', 'on'].includes(raw)) return true
  if (['0', 'false', 'no', 'off'].includes(raw)) return false
  throw new Error(`Environment variable ${key} must be boolean, got: ${raw}`)
}

export function parseEnvList(key: string): string[] {
  return (process.env[key] ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

function parseCommandRegistrationMode(
  key: string,
  fallback: 'global' | 'guild',
): 'global' | 'guild' {
  const raw = process.env[key]?.trim().toLowerCase()
  if (!raw) return fallback
  if (raw === 'global' || raw === 'guild') return raw
  throw new Error(`Environment variable ${key} must be "global" or "guild", got: ${raw}`)
}

export function parseGuildIdsFromEnv(primaryKey: string): string[] {
  const explicit = parseEnvList(primaryKey)
  if (explicit.length > 0) return explicit

  const shared = parseEnvList('DISCORD_GUILD_IDS')
  if (shared.length > 0) return shared

  const legacy = process.env.DISCORD_GUILD_ID?.trim()
  return legacy ? [legacy] : []
}

export function requireManagedGuildIds(moduleName: string, primaryKey: string): string[] {
  const guildIds = parseGuildIdsFromEnv(primaryKey)
  if (guildIds.length === 0) {
    throw new Error(
      `${moduleName} requires ${primaryKey}, DISCORD_GUILD_IDS, or legacy DISCORD_GUILD_ID`,
    )
  }
  if (guildIds.length > 1) {
    throw new Error(
      `${moduleName} currently supports one managed guild; set ${primaryKey} to a single guild ID`,
    )
  }
  return guildIds
}

export function loadConfig(): AppConfig {
  const publicBotEnabled = parseBool('BOT_PUBLIC_MODE', false)
  const registrationGuildIds = parseGuildIdsFromEnv('DISCORD_COMMAND_GUILD_IDS')
  const commandRegistrationMode = parseCommandRegistrationMode(
    'DISCORD_COMMAND_REGISTRATION',
    publicBotEnabled ? 'global' : 'guild',
  )

  if (commandRegistrationMode === 'guild' && registrationGuildIds.length === 0) {
    throw new Error(
      'Guild command registration requires DISCORD_COMMAND_GUILD_IDS, DISCORD_GUILD_IDS, or DISCORD_GUILD_ID',
    )
  }

  return {
    discord: {
      token: requireEnv('DISCORD_TOKEN'),
      clientId: requireEnv('DISCORD_CLIENT_ID'),
      // Empty/unset means no custom status.
      status: process.env.BOT_STATUS?.trim() || null,
      commandRegistration: {
        mode: commandRegistrationMode,
        guildIds: registrationGuildIds,
      },
    },
    publicBot: {
      enabled: publicBotEnabled,
      allowedGuildIds: parseEnvList('BOT_ALLOWED_GUILD_IDS'),
      blockedGuildIds: parseEnvList('BOT_BLOCKED_GUILD_IDS'),
      leaveUnauthorizedGuilds: parseBool('BOT_LEAVE_UNAUTHORIZED_GUILDS', !publicBotEnabled),
    },
    modules: {
      personalRoles: parseBool('MODULE_PERSONAL_ROLES_ENABLED', false),
    },
  }
}
