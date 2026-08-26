import { type ButtonInteraction, MessageFlags } from 'discord.js'
import type { ButtonCommand, Deps } from '../types.ts'

const command: ButtonCommand = {
  type: 'button',
  name: 'admin-deny-role',

  async execute(interaction: ButtonInteraction, args: string[], { db, editor }: Deps) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })

    const snapshot = await db.snapshotRoles.findOne({ where: { id: args[1] } })

    if (!snapshot) {
      return interaction.editReply({ content: 'Что-то пошло не так. Роль (снапшот) не найдена' })
    }

    const role = await db.liveRoles.findOne({
      where: { id: snapshot.id },
      relations: { owner: true },
    })

    if (!role) {
      return interaction.editReply({ content: 'Что-то пошло не так. Роль не найдена.' })
    }

    if (!interaction.guild) {
      return interaction.editReply({ content: 'Команда доступна только на сервере.' })
    }

    const member = await interaction.guild.members.fetch(role.owner.id).catch(() => null)

    if (!member) {
      return interaction.editReply({ content: 'Пользователь не найден. Попробуйте еще раз.' })
    }

    await db.snapshotRoles.delete({ id: snapshot.id })

    await editor.sendConfirmation(role, member, {
      editId: snapshot.approveMessageId,
      approved: false,
      by: interaction.user.id,
    })

    const adminContent = 'Роль успешно отклонена.'
    const userContent = `Ваша роль ${role.name ? `${role.name} ` : ''}была отклонена администрацией сервера.`

    return editor.dm(interaction, role.owner.id, { content: userContent }, adminContent)
  },
}

export default command
