import { type ButtonInteraction, GatewayIntentBits, type ModalSubmitInteraction } from 'discord.js'
import type { BotContext, BotModule, SlashCommandSpec } from '../../core/module.ts'
import { buttonCommands, modalCommands, slashCommands } from './commands/index.ts'
import type { Deps } from './commands/types.ts'
import { config } from './config.ts'
import { startRoleCheckCron } from './jobs/role-check.ts'
import { initDb } from './services/db.ts'
import { EditorService } from './services/editor.ts'
import { getGuildRoleSettings, isGuildConfigured } from './settings.ts'
import { parseCustomId } from './utils/custom-id.ts'

function notReady(): Error {
  return new Error('personal-roles module is not ready')
}

export function createPersonalRolesModule(): BotModule {
  let deps: Deps | null = null

  const getDeps = (): Deps => {
    if (!deps) throw notReady()
    return deps
  }

  const gatewaySlashCommands: SlashCommandSpec[] = slashCommands.map((command) => ({
    data: command.data,
    async execute(interaction): Promise<void> {
      await command.execute(interaction, getDeps())
    },
  }))

  return {
    id: 'roles',
    label: 'Personal roles',
    description: 'Personal role editor for configured guilds.',
    scope: { type: 'managed-guilds', guildIds: config.guildIds },
    requiredIntents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
    slashCommands: gatewaySlashCommands,

    async onReady(ctx: BotContext): Promise<void> {
      const db = await initDb()
      const editor = new EditorService(ctx.client)
      deps = { db, editor }
      for (const guildId of config.guildIds) {
        if (!isGuildConfigured(getGuildRoleSettings(guildId))) {
          console.warn(
            `[roles] guild ${guildId} is not configured (no approval channel / anchor role) — run /roles-setup there`,
          )
        }
      }
      startRoleCheckCron(ctx.client, db, editor)
      console.log(
        `[roles] ready with ${slashCommands.length} slash command(s), guilds: ${config.guildIds.join(', ')}`,
      )
    },

    async onButton(interaction: ButtonInteraction, innerId: string): Promise<void> {
      const args = parseCustomId(innerId)
      const command = buttonCommands.get(args[0])
      if (!command) return
      await command.execute(interaction, args, getDeps())
    },

    async onModalSubmit(interaction: ModalSubmitInteraction, innerId: string): Promise<void> {
      const args = parseCustomId(innerId)
      const command = modalCommands.get(args[0])
      if (!command) return
      await command.execute(interaction, args, getDeps())
    },

    async onShutdown(): Promise<void> {
      if (deps) await deps.db.ds.destroy()
    },
  }
}
