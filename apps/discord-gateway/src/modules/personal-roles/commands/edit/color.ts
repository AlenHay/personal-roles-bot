import {
  ActionRowBuilder,
  type ButtonInteraction,
  type GuildMember,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js'
import { ResetKeyword, RoleEditPermission } from '../../constants.ts'
import { makeCustomId } from '../../utils/custom-id.ts'
import type { ButtonCommand, Deps } from '../types.ts'

const command: ButtonCommand = {
  type: 'button',
  name: 'edit-color-button',

  async execute(interaction: ButtonInteraction, args: string[], { editor }: Deps) {
    const member = interaction.member as GuildMember
    if (!editor.allowedTo(RoleEditPermission.Color, member)) {
      return interaction.reply({
        content: 'У вас нет прав на изменение этого параметра.',
        flags: MessageFlags.Ephemeral,
      })
    }

    const gradient = editor.allowedTo(RoleEditPermission.Gradient, member)

    const rows = [
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setRequired(true)
          .setMinLength(3)
          .setMaxLength(7)
          .setStyle(TextInputStyle.Short)
          .setLabel(gradient ? 'Основной цвет (HEX)' : 'Введите цвет в формате HEX')
          .setPlaceholder(`#2b2d31 или "${ResetKeyword.Display}"`)
          .setCustomId('color'),
      ),
    ]

    if (gradient) {
      rows.push(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setRequired(false)
            .setMinLength(0)
            .setMaxLength(7)
            .setStyle(TextInputStyle.Short)
            .setLabel('Вторичный цвет (для градиента)')
            .setPlaceholder(`#2b2d31, пусто или "${ResetKeyword.Display}"`)
            .setCustomId('colorSecondary'),
        ),
      )
    }

    const modal = new ModalBuilder()
      .setTitle(gradient ? 'Цвета' : 'Цвет')
      .setCustomId(makeCustomId('edit-color-modal', args[1]))
      .addComponents(...rows)

    return interaction.showModal(modal)
  },
}

export default command
