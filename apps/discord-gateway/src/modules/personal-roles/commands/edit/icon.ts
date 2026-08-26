import {
  ActionRowBuilder,
  type ButtonInteraction,
  type GuildMember,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js'
import { Limits, ResetKeyword, RoleEditPermission } from '../../constants.ts'
import { makeCustomId } from '../../utils/custom-id.ts'
import type { ButtonCommand, Deps } from '../types.ts'

const command: ButtonCommand = {
  type: 'button',
  name: 'edit-icon-button',

  async execute(interaction: ButtonInteraction, args: string[], { editor }: Deps) {
    if (!editor.allowedTo(RoleEditPermission.Icon, interaction.member as GuildMember)) {
      return interaction.reply({
        content: 'У вас нет прав на изменение этого параметра.',
        flags: MessageFlags.Ephemeral,
      })
    }

    const modal = new ModalBuilder()
      .setTitle('Иконка')
      .setCustomId(makeCustomId('edit-icon-modal', args[1]))
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setRequired(true)
            .setMinLength(Limits.MinIconLinkLength)
            .setMaxLength(Limits.MaxIconLinkLength)
            .setStyle(TextInputStyle.Short)
            .setLabel('Введите ссылку на иконку')
            .setPlaceholder(`cdn.discordapp.com или "${ResetKeyword.Display}", только PNG`)
            .setCustomId('icon'),
        ),
      )

    return interaction.showModal(modal)
  },
}

export default command
