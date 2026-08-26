import type {
  ButtonInteraction,
  ChatInputCommandInteraction,
  Client,
  GatewayIntentBits,
  Guild,
  Message,
  ModalSubmitInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js'
import type { AppConfig } from '../config/env.ts'

export type AnySlashBuilder =
  | SlashCommandBuilder
  | SlashCommandOptionsOnlyBuilder
  | SlashCommandSubcommandsOnlyBuilder

export interface BotContext {
  client: Client
  config: AppConfig
}

export interface SlashCommandSpec {
  data: AnySlashBuilder
  execute(interaction: ChatInputCommandInteraction, ctx: BotContext): Promise<void>
}

export type ButtonHandler = (
  interaction: ButtonInteraction,
  innerId: string,
  ctx: BotContext,
) => Promise<void>

export type ModalHandler = (
  interaction: ModalSubmitInteraction,
  innerId: string,
  ctx: BotContext,
) => Promise<void>

export interface BotModule {
  id: string
  label?: string
  description?: string
  scope: { type: 'global' } | { type: 'managed-guilds'; guildIds: readonly string[] }
  requiredIntents: GatewayIntentBits[]
  slashCommands?: SlashCommandSpec[]
  buttonHandlers?: Map<string, ButtonHandler>
  modalHandlers?: Map<string, ModalHandler>
  onButton?(interaction: ButtonInteraction, innerId: string, ctx: BotContext): Promise<void>
  onModalSubmit?(
    interaction: ModalSubmitInteraction,
    innerId: string,
    ctx: BotContext,
  ): Promise<void>
  onReady?(ctx: BotContext): Promise<void>
  onGuildCreate?(guild: Guild, ctx: BotContext): Promise<void>
  onGuildDelete?(guild: Guild, ctx: BotContext): Promise<void>
  onMessageCreate?(message: Message, ctx: BotContext): Promise<void>
  onShutdown?(ctx: BotContext): Promise<void>
}
