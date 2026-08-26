import { type GuildMember, MessageFlags, type ModalSubmitInteraction } from 'discord.js'
import { ResetKeyword, RoleEditPermission } from '../../constants.ts'
import type { Deps, ModalCommand } from '../types.ts'

const ICON_URL_RE = /^https:\/\/cdn\.discordapp\.com\/.+\.png(?:\?.*)?$/i

const command: ModalCommand = {
  type: 'modal',
  name: 'edit-icon-modal',

  async execute(interaction: ModalSubmitInteraction, args: string[], { db, editor }: Deps) {
    const member = interaction.member as GuildMember
    if (!editor.allowedTo(RoleEditPermission.Icon, member)) {
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

    const icon = interaction.fields.getTextInputValue('icon')

    if (icon.toLowerCase() === ResetKeyword.Key) {
      await interaction.deferUpdate()
      role.icon = null
      await db.liveRoles.save(role)
      await interaction.followUp({
        flags: MessageFlags.Ephemeral,
        content: 'Иконка сброшена! Подождите обновления превью.',
      })
      return interaction.editReply(await editor.buildEditor(role, member))
    }

    if (!ICON_URL_RE.test(icon)) {
      return interaction.reply({
        content:
          'Неправильный формат ссылки. Загрузите изображение в Discord и используйте ссылку с cdn.discordapp.com (только PNG).',
        flags: MessageFlags.Ephemeral,
      })
    }

    await interaction.deferUpdate()

    let iconBase64: string
    try {
      const res = await fetch(icon)
      const contentType = res.headers.get('content-type')
      if (!contentType?.includes('image')) {
        console.warn(
          `[edit-icon-modal] Icon fetch rejected (non-image response): url=${icon} status=${res.status} content-type=${contentType ?? 'null'}`,
        )
        return interaction.followUp({
          content:
            'Неправильный формат изображения или ссылка устарела. Проверьте ссылку и попробуйте снова',
          flags: MessageFlags.Ephemeral,
        })
      }

      const buffer = await res.arrayBuffer()
      iconBase64 = Buffer.from(buffer).toString('base64')
    } catch (e) {
      console.error(`[edit-icon-modal] Icon fetch threw: url=${icon}`, e)
      return interaction.followUp({
        content: 'Ошибка при загрузке изображения. Проверьте ссылку и попробуйте снова',
        flags: MessageFlags.Ephemeral,
      })
    }

    role.icon = `data:image/png;base64,${iconBase64}`
    await db.liveRoles.save(role)

    await interaction.followUp({
      flags: MessageFlags.Ephemeral,
      content: 'Иконка обновлена! Подождите обновления превью.',
    })

    return interaction.editReply(await editor.buildEditor(role, member))
  },
}

export default command
