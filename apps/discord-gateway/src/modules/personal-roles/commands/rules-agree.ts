import { type ButtonInteraction, type GuildMember, MessageFlags } from 'discord.js'
import type { ButtonCommand, Deps } from './types.ts'

const command: ButtonCommand = {
  type: 'button',
  name: 'rules-agree',

  async execute(interaction: ButtonInteraction, _args: string[], { db, editor }: Deps) {
    const member = interaction.member as GuildMember
    const allowed = editor.allowedPerms(member)

    if (!allowed.length) {
      return interaction.reply({
        content: 'Вы не можете создавать личные роли!',
        flags: MessageFlags.Ephemeral,
      })
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral })

    const user = await db.users.findOne({
      where: { id: interaction.user.id },
      relations: { roles: true },
    })

    if (!user) {
      return interaction.editReply({
        content: 'Что-то пошло не так, пользователь не найден. Попробуйте еще раз.',
      })
    }

    user.readRules = true
    await db.users.save(user)

    const role = user.roles[0]
    if (editor.stripDisallowed(role, member)) {
      await db.liveRoles.save(role)
    }

    return interaction.editReply(await editor.buildEditor(role, member))
  },
}

export default command
