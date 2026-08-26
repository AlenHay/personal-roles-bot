import {
  ActivityType,
  Client,
  Events,
  GatewayIntentBits,
  type Interaction,
  MessageFlags,
} from 'discord.js'
import { loadConfig } from './config/env.ts'
import { parseScopedCustomId } from './core/custom-id.ts'
import {
  decideGuildAccess,
  leaveIfUnauthorized,
  moduleEnabledInGuild,
  moduleScopeLabel,
} from './core/guild-access.ts'
import type { BotContext } from './core/module.ts'
import { createModules, moduleById, slashCommandEntries, uniqueIntents } from './core/registry.ts'
import { registerSlashCommands } from './core/slash-registration.ts'

const config = loadConfig()
const modules = await createModules(config)
const moduleMap = moduleById(modules)
const slashEntries = slashCommandEntries(modules)
const slashMap = new Map<string, (typeof slashEntries)[number]>(
  slashEntries.map((entry) => [entry.command.data.name, entry]),
)
const intents = uniqueIntents(modules)

if (!intents.includes(GatewayIntentBits.Guilds)) intents.push(GatewayIntentBits.Guilds)

const client = new Client({
  intents,
  presence: {
    status: 'online',
    activities: config.discord.status
      ? [{ type: ActivityType.Custom, name: config.discord.status }]
      : [],
  },
})

const ctx: BotContext = { client, config }

async function rejectInteraction(interaction: Interaction, content: string): Promise<void> {
  if (!interaction.isRepliable()) return
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply({ content }).catch(() => {})
    return
  }
  await interaction.reply({ content, flags: MessageFlags.Ephemeral }).catch(() => {})
}

async function canRunModuleInteraction(
  interaction: Interaction,
  moduleId: string,
): Promise<boolean> {
  const module = moduleMap.get(moduleId)
  if (!module) return false

  if (!interaction.guildId) {
    if (module.scope.type === 'global') return true
    await rejectInteraction(interaction, 'This command can only be used inside a Discord server.')
    return false
  }

  const guildDecision = decideGuildAccess(config, interaction.guildId)
  if (!guildDecision.allowed) {
    await rejectInteraction(interaction, 'This bot is not enabled for this server.')
    return false
  }

  if (!moduleEnabledInGuild(module, interaction.guildId)) {
    await rejectInteraction(interaction, 'This module is not configured for this server.')
    return false
  }

  return true
}

async function handleInteraction(interaction: Interaction): Promise<void> {
  try {
    if (interaction.isChatInputCommand()) {
      const entry = slashMap.get(interaction.commandName)
      if (!entry) return
      if (!(await canRunModuleInteraction(interaction, entry.module.id))) return
      await entry.command.execute(interaction, ctx)
      return
    }

    if (interaction.isButton()) {
      const parsed = parseScopedCustomId(interaction.customId)
      if (!parsed) return
      if (!(await canRunModuleInteraction(interaction, parsed.moduleId))) return
      const module = moduleMap.get(parsed.moduleId)
      const handler = module?.buttonHandlers?.get(parsed.innerId)
      if (!handler && module?.onButton) {
        await module.onButton(interaction, parsed.innerId, ctx)
        return
      }
      if (!handler) return
      await handler(interaction, parsed.innerId, ctx)
      return
    }

    if (interaction.isModalSubmit()) {
      const parsed = parseScopedCustomId(interaction.customId)
      if (!parsed) return
      if (!(await canRunModuleInteraction(interaction, parsed.moduleId))) return
      const module = moduleMap.get(parsed.moduleId)
      const handler = module?.modalHandlers?.get(parsed.innerId)
      if (!handler && module?.onModalSubmit) {
        await module.onModalSubmit(interaction, parsed.innerId, ctx)
        return
      }
      if (!handler) return
      await handler(interaction, parsed.innerId, ctx)
    }
  } catch (err) {
    console.error('[interaction] unhandled error:', err)
    if (!interaction.isRepliable()) return
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: 'Произошла непредвиденная ошибка.' }).catch(() => {})
    } else {
      await interaction
        .reply({ content: 'Произошла непредвиденная ошибка.', flags: MessageFlags.Ephemeral })
        .catch(() => {})
    }
  }
}

client.once(Events.ClientReady, async () => {
  console.log(`[ready] Logged in as ${client.user?.tag}`)
  console.log(
    `[ready] Public mode: ${config.publicBot.enabled ? 'enabled' : 'disabled'}; command registration: ${config.discord.commandRegistration.mode}`,
  )
  await registerSlashCommands(config, slashEntries).catch((err) => {
    console.error('[ready] failed to register slash commands:', err)
  })
  for (const module of modules) {
    await module.onReady?.(ctx).catch((err) => {
      console.error(`[ready] module ${module.id} failed:`, err)
    })
  }
  console.log(
    `[ready] Enabled modules: ${
      modules.map((module) => `${module.id} (${moduleScopeLabel(module)})`).join(', ') || 'none'
    }`,
  )
})

client.on(Events.InteractionCreate, (interaction) => {
  void handleInteraction(interaction)
})

client.on(Events.MessageCreate, (message) => {
  for (const module of modules) {
    if (!module.onMessageCreate) continue
    if (message.guildId) {
      const guildDecision = decideGuildAccess(config, message.guildId)
      if (!guildDecision.allowed || !moduleEnabledInGuild(module, message.guildId)) continue
    } else if (module.scope.type !== 'global') {
      continue
    }
    void module.onMessageCreate(message, ctx).catch((err) => {
      console.error(`[message] module ${module.id} failed:`, err)
    })
  }
})

client.on(Events.GuildCreate, (guild) => {
  void (async () => {
    if (await leaveIfUnauthorized(config, guild)) return
    console.log(`[guild] joined ${guild.id} (${guild.name})`)
    for (const module of modules) {
      if (!module.onGuildCreate || !moduleEnabledInGuild(module, guild.id)) continue
      await module.onGuildCreate(guild, ctx).catch((err) => {
        console.error(`[guild] module ${module.id} failed on join ${guild.id}:`, err)
      })
    }
  })()
})

client.on(Events.GuildDelete, (guild) => {
  void (async () => {
    console.log(`[guild] left ${guild.id} (${guild.name})`)
    for (const module of modules) {
      if (!module.onGuildDelete || !moduleEnabledInGuild(module, guild.id)) continue
      await module.onGuildDelete(guild, ctx).catch((err) => {
        console.error(`[guild] module ${module.id} failed on leave ${guild.id}:`, err)
      })
    }
  })()
})

let shuttingDown = false
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`[shutdown] received ${signal}`)
  for (const module of modules) {
    await module.onShutdown?.(ctx).catch((err) => {
      console.error(`[shutdown] module ${module.id} failed:`, err)
    })
  }
  client.destroy()
  process.exit(0)
}

process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))

await client.login(config.discord.token)
