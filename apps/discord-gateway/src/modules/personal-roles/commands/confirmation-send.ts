import { type ButtonInteraction, type GuildMember, MessageFlags } from 'discord.js'
import type { LiveRole, SnapshotRole } from '../entities/index.ts'
import type { ButtonCommand, Deps } from './types.ts'

const command: ButtonCommand = {
  type: 'button',
  name: 'confirmation-send-button',

  async execute(interaction: ButtonInteraction, args: string[], { db, editor }: Deps) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })

    const roleId = args[1]

    if (!roleId) {
      return interaction.editReply({
        content: 'Что-то пошло не так. Не найден ID роли. Попробуйте вызвать команду снова.',
      })
    }

    const role = await db.liveRoles.findOne({
      where: { id: roleId },
      relations: { owner: true },
    })

    if (!role) {
      return interaction.editReply({ content: 'Что-то пошло не так. Роль не найдена.' })
    }

    if (editor.stripDisallowed(role, interaction.member as GuildMember)) {
      await db.liveRoles.save(role)
    }

    const snapshotRole = await db.snapshotRoles.findOne({ where: { id: role.id } })

    return finish(interaction, role, snapshotRole?.approved ? undefined : snapshotRole, {
      db,
      editor,
    })
  },
}

async function finish(
  interaction: ButtonInteraction,
  role: LiveRole,
  snapshotRole: SnapshotRole | undefined | null,
  { db, editor }: Deps,
): Promise<unknown> {
  const success = await editor.sendConfirmation(role, interaction.member as GuildMember, {
    editId: snapshotRole?.approveMessageId,
  })

  if (!success) {
    return interaction.editReply({
      content: 'Не удалось отправить сообщение администрации. Сообщите об этом разработчикам.',
    })
  }

  if (snapshotRole) {
    await db.snapshotRoles.save({
      ...snapshotRole,
      name: role.name ?? null,
      color: role.color ?? null,
      colorSecondary: role.colorSecondary ?? null,
      icon: role.icon ?? null,
      hoist: role.hoist ?? false,
    })
  } else {
    await db.snapshotRoles.save({
      id: role.id,
      liveRole: role,
      name: role.name ?? null,
      color: role.color ?? null,
      colorSecondary: role.colorSecondary ?? null,
      icon: role.icon ?? null,
      hoist: role.hoist ?? false,
      approveMessageId: success,
      approved: false,
    })
  }

  return interaction.editReply({
    content:
      'Текущие настройки отправлены администрации на проверку. ' +
      'Если вы хотите изменить настройки, сделайте это ' +
      'в редакторе, а затем отправьте их на проверку снова, иначе роль будет со старыми настройками.',
  })
}

export default command
