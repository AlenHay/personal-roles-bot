import { type ButtonInteraction, MessageFlags } from 'discord.js'
import type { ButtonCommand, Deps } from '../types.ts'

const command: ButtonCommand = {
  type: 'button',
  name: 'admin-approve-role',

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

    let edited = false
    let shouldCreate = !role.discordId

    if (role.discordId) {
      try {
        await editor.editDiscordRole(interaction.guild, snapshot, role.discordId)
        edited = true
      } catch {
        shouldCreate = true
      }
    }

    if (shouldCreate) {
      try {
        role.discordId = await editor.createDiscordRole(interaction.guild, snapshot)
      } catch (e) {
        console.error('[admin-approve] Failed to create role:', e)
        return interaction.editReply({
          content: 'Не удалось создать роль на сервере. Попробуйте еще раз.',
        })
      }
    }

    snapshot.approved = true
    role.name = snapshot.name
    role.color = snapshot.color
    role.colorSecondary = snapshot.colorSecondary
    role.icon = snapshot.icon
    role.hoist = snapshot.hoist
    await db.snapshotRoles.save(snapshot)
    await db.liveRoles.save(role)

    let assignFailed = false
    try {
      const discordRoleId = role.discordId
      if (!discordRoleId) {
        return interaction.editReply({
          content: 'Не удалось определить созданную роль. Попробуйте еще раз.',
        })
      }
      await member.roles.add(discordRoleId)
    } catch (e) {
      assignFailed = true
      console.error('[admin-approve] Failed to assign Discord role to member:', e)
    }

    await editor.sendConfirmation(role, member, {
      editId: snapshot.approveMessageId,
      approved: true,
      by: interaction.user.id,
    })

    const adminContent =
      `Роль успешно одобрена и ${edited ? 'изменена' : 'создана'} на сервере.` +
      (assignFailed
        ? '\n⚠ Не удалось выдать роль пользователю — проверьте иерархию ролей бота.'
        : '')
    const userContent = `Ваша роль ${role.name ? `${role.name} ` : ''}была одобрена администрацией сервера.`

    return editor.dm(interaction, role.owner.id, { content: userContent }, adminContent)
  },
}

export default command
