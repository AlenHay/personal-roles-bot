import type { Guild } from 'discord.js'
import type { AppConfig } from '../config/env.ts'
import type { BotModule } from './module.ts'

export interface GuildAccessDecision {
  allowed: boolean
  reason?: string
}

export function decideGuildAccess(config: AppConfig, guildId: string): GuildAccessDecision {
  if (config.publicBot.blockedGuildIds.includes(guildId)) {
    return { allowed: false, reason: 'guild is blocked' }
  }

  const allowedGuildIds = config.publicBot.allowedGuildIds
  if (allowedGuildIds.length > 0 && !allowedGuildIds.includes(guildId)) {
    return { allowed: false, reason: 'guild is not allowlisted' }
  }

  if (!config.publicBot.enabled) {
    const privateGuildIds =
      allowedGuildIds.length > 0 ? allowedGuildIds : config.discord.commandRegistration.guildIds

    if (privateGuildIds.length === 0) {
      return { allowed: false, reason: 'private bot has no allowed guilds configured' }
    }

    if (!privateGuildIds.includes(guildId)) {
      return { allowed: false, reason: 'bot is not in public mode' }
    }
  }

  return { allowed: true }
}

export function moduleEnabledInGuild(module: BotModule, guildId: string): boolean {
  if (module.scope.type === 'global') return true
  return module.scope.guildIds.includes(guildId)
}

export function moduleScopeLabel(module: BotModule): string {
  if (module.scope.type === 'global') return 'global'
  return `managed guilds: ${module.scope.guildIds.join(', ')}`
}

export async function leaveIfUnauthorized(config: AppConfig, guild: Guild): Promise<boolean> {
  const decision = decideGuildAccess(config, guild.id)
  if (decision.allowed) return false
  console.warn(`[guild] ${guild.id} (${guild.name}) rejected: ${decision.reason}`)
  if (config.publicBot.leaveUnauthorizedGuilds) {
    await guild.leave().catch((err) => {
      console.error(`[guild] failed to leave unauthorized guild ${guild.id}:`, err)
    })
  }
  return true
}
