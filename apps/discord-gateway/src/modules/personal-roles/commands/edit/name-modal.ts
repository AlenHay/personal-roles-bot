import { type GuildMember, MessageFlags, type ModalSubmitInteraction } from 'discord.js'
import { RoleEditPermission } from '../../constants.ts'
import type { Deps, ModalCommand } from '../types.ts'

const command: ModalCommand = {
  type: 'modal',
  name: 'edit-role-name-modal',

  async execute(interaction: ModalSubmitInteraction, args: string[], { db, editor }: Deps) {
    const member = interaction.member as GuildMember
    if (!editor.allowedTo(RoleEditPermission.Name, member)) {
      return interaction.reply({
        content: 'У вас нет прав на изменение этого параметра.',
        flags: MessageFlags.Ephemeral,
      })
    }

    const role = await db.liveRoles.findOne({ where: { id: args[1] } })

    if (!role) {
      return interaction.reply({
        content: 'Что-то пошло не так. Роль не найдена.',
        flags: MessageFlags.Ephemeral,
      })
    }

    await interaction.deferUpdate()

    role.name = interaction.fields.getTextInputValue('role-name')
    await db.liveRoles.save(role)

    await interaction.followUp({ flags: MessageFlags.Ephemeral, content: 'Название обновлено!' })

    return interaction.editReply(await editor.buildEditor(role, member))
  },
}

export default command
