import { GatewayIntentBits, MessageFlags, SlashCommandBuilder } from 'discord.js'
import { decideGuildAccess, moduleEnabledInGuild } from '../../core/guild-access.ts'
import type { BotContext, BotModule, SlashCommandSpec } from '../../core/module.ts'

export function createSystemModule(getModules: () => BotModule[]): BotModule {
  const command: SlashCommandSpec = {
    data: new SlashCommandBuilder()
      .setName('rolebot')
      .setDescription('Show bot and module status')
      .addSubcommand((subcommand) =>
        subcommand.setName('about').setDescription('Show bot runtime information'),
      )
      .addSubcommand((subcommand) =>
        subcommand.setName('modules').setDescription('Show modules available in this server'),
      ),

    async execute(interaction, ctx: BotContext): Promise<void> {
      const subcommand = interaction.options.getSubcommand()
      if (subcommand === 'modules') {
        await interaction.reply({
          content: moduleSummary(interaction.guildId, ctx, getModules()),
          flags: MessageFlags.Ephemeral,
        })
        return
      }

      await interaction.reply({
        content: aboutSummary(ctx),
        flags: MessageFlags.Ephemeral,
      })
    },
  }

  return {
    id: 'system',
    label: 'System',
    description: 'Public-safe bot information and module discovery commands.',
    scope: { type: 'global' },
    requiredIntents: [GatewayIntentBits.Guilds],
    slashCommands: [command],
  }
}

function aboutSummary(ctx: BotContext): string {
  const mode = ctx.config.publicBot.enabled ? 'public' : 'private'
  const registration = ctx.config.discord.commandRegistration.mode
  return [
    '**Personal Roles Bot**',
    `Mode: ${mode}`,
    `Slash commands: ${registration}`,
    'Use `/rolebot modules` in a server to see which modules are configured there.',
  ].join('\n')
}

function moduleSummary(guildId: string | null, ctx: BotContext, modules: BotModule[]): string {
  if (!guildId) return 'Server modules are only available inside a Discord server.'

  const access = decideGuildAccess(ctx.config, guildId)
  if (!access.allowed) return 'This bot is not enabled for this server.'

  const lines = modules
    .filter((module) => module.id !== 'system')
    .map((module) => {
      const enabled = moduleEnabledInGuild(module, guildId)
      const status = enabled ? 'enabled' : 'not configured'
      return `- ${module.label ?? module.id}: ${status}`
    })

  if (lines.length === 0) return 'No feature modules are enabled on this bot process.'
  return ['**Modules**', ...lines].join('\n')
}
