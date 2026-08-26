import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ChatInputCommandInteraction,
  type GuildMember,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js'
import { LiveRole, User } from '../entities/index.ts'
import { getGuildRoleSettings, isGuildConfigured } from '../settings.ts'
import type { Deps, SlashCommand } from './types.ts'

const command: SlashCommand = {
  type: 'slash',
  data: new SlashCommandBuilder()
    .setName('role')
    .setDescription('Личная роль!')
    .setDMPermission(false),

  async execute(interaction: ChatInputCommandInteraction, { db, editor }: Deps) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })

    const member = interaction.member as GuildMember

    if (!isGuildConfigured(getGuildRoleSettings(member.guild.id))) {
      return interaction.editReply({
        content: 'Модуль личных ролей ещё не настроен на этом сервере (/roles-setup).',
      })
    }

    const allowed = editor.allowedPerms(member)

    if (!allowed.length) {
      return interaction.editReply({ content: 'Вы не можете создавать личные роли!' })
    }

    let user = await db.users.findOne({
      where: { id: interaction.user.id },
      relations: { roles: true },
    })

    if (!user) {
      user = await createUser(db, interaction.user.id)
    }

    let role = user.roles?.[0]
    if (!role) {
      role = await createRole(db, user)
    }

    if (editor.stripDisallowed(role, member)) {
      await db.liveRoles.save(role)
    }

    if (!user.readRules) {
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Success)
          .setCustomId('rules-agree')
          .setLabel('Согласится'),
      )

      return interaction.editReply({
        embeds: [editor.buildRules(member.guild.id)],
        components: [row],
      })
    }

    return interaction.editReply(await editor.buildEditor(role, member))
  },
}

async function createUser(db: Deps['db'], discordId: string): Promise<User> {
  const user = new User()
  user.id = discordId
  user.roles = []
  return db.users.save(user)
}

async function createRole(db: Deps['db'], user: User): Promise<LiveRole> {
  const role = new LiveRole()
  role.owner = user
  return db.liveRoles.save(role)
}

export default command
export const name = 'role'
