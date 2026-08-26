import { type ButtonInteraction, type GuildMember, MessageFlags } from 'discord.js'
import { RoleEditPermission } from '../../constants.ts'
import type { ButtonCommand, Deps } from '../types.ts'

const command: ButtonCommand = {
  type: 'button',
  name: 'edit-hoist-button',

  async execute(interaction: ButtonInteraction, args: string[], { db, editor }: Deps) {
    const member = interaction.member as GuildMember
    if (!editor.allowedTo(RoleEditPermission.Hoist, member)) {
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

    role.hoist = !role.hoist
    await db.liveRoles.save(role)

    return interaction.editReply(await editor.buildEditor(role, member))
  },
}

export default command
