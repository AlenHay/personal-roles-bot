import {
  ActionRowBuilder,
  type ButtonInteraction,
  type GuildMember,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js'
import { RoleEditPermission } from '../../constants.ts'
import { makeCustomId } from '../../utils/custom-id.ts'
import type { ButtonCommand, Deps } from '../types.ts'

const command: ButtonCommand = {
  type: 'button',
  name: 'edit-role-name-button',

  async execute(interaction: ButtonInteraction, args: string[], { editor }: Deps) {
    if (!editor.allowedTo(RoleEditPermission.Name, interaction.member as GuildMember)) {
      return interaction.reply({
        content: 'У вас нет прав на изменение этого параметра.',
        flags: MessageFlags.Ephemeral,
      })
    }

    const modal = new ModalBuilder()
      .setTitle('Название роли')
      .setCustomId(makeCustomId('edit-role-name-modal', args[1]))
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(32)
            .setStyle(TextInputStyle.Short)
            .setLabel('Введите название роли')
            .setCustomId('role-name'),
        ),
      )

    return interaction.showModal(modal)
  },
}

export default command
