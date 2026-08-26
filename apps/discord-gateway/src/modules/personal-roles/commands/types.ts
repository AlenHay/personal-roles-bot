import type {
  ButtonInteraction,
  ChatInputCommandInteraction,
  ModalSubmitInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js'
import type { DbBundle } from '../services/db.ts'
import type { EditorService } from '../services/editor.ts'

export interface Deps {
  db: DbBundle
  editor: EditorService
}

export type AnySlashBuilder =
  | SlashCommandBuilder
  | SlashCommandOptionsOnlyBuilder
  | SlashCommandSubcommandsOnlyBuilder

export interface SlashCommand {
  type: 'slash'
  data: AnySlashBuilder
  execute(interaction: ChatInputCommandInteraction, deps: Deps): Promise<unknown>
}

export interface ButtonCommand {
  type: 'button'
  name: string
  execute(interaction: ButtonInteraction, args: string[], deps: Deps): Promise<unknown>
}

export interface ModalCommand {
  type: 'modal'
  name: string
  execute(interaction: ModalSubmitInteraction, args: string[], deps: Deps): Promise<unknown>
}

export type Command = SlashCommand | ButtonCommand | ModalCommand
