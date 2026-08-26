import { Resvg } from '@resvg/resvg-js'
import type { ButtonInteraction } from 'discord.js'
import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  type Client,
  EmbedBuilder,
  type Guild,
  type GuildMember,
  type HexColorString,
  type InteractionEditReplyOptions,
  type MessageCreateOptions,
  type RoleColorsResolvable,
} from 'discord.js'
import satori from 'satori'
import { RoleEditPermission } from '../constants.ts'
import type { LiveRole, SnapshotRole } from '../entities/index.ts'
import { getProfileFonts } from '../image-templates/fonts.ts'
import { Profile, profileCardOptions } from '../image-templates/profile.tsx'
import { type EditGate, getGuildRoleSettings } from '../settings.ts'
import { makeCustomId } from '../utils/custom-id.ts'

export class EditorService {
  constructor(private readonly client: Client) {}

  buildRules(guildId: string): EmbedBuilder {
    const { requiredRoles } = getGuildRoleSettings(guildId)
    const tiers: [EditGate, string][] = [
      ['editName', 'название'],
      ['editColor', 'цвет'],
      ['editIcon', 'иконку'],
      ['editGradient', 'градиент из двух цветов'],
      ['editHoist', 'отдельное отображение в списке участников'],
    ]

    const lines = tiers
      .filter(([gate]) => requiredRoles[gate].length > 0)
      .map(
        ([gate, label]) => `${requiredRoles[gate].map((id) => `<@&${id}>`).join(', ')} — ${label}.`,
      )

    return new EmbedBuilder()
      .setColor('#2b2d31')
      .setDescription(
        [
          '### Доступ к личной роли',
          ...(lines.length > 0 ? lines : ['Права на редактирование пока не настроены.']),
          '### Правила',
          '- Все правила сервера также распространяются на личную роль.',
          '- Цвет личной роли должен быть читаемым на различных темах Discord․',
        ].join('\n'),
      )
  }

  async buildEditor(role: LiveRole, member: GuildMember): Promise<InteractionEditReplyOptions> {
    const username = member.displayName
    const avatar = member.displayAvatarURL({ size: 128, extension: 'png', forceStatic: true })

    const svg = await satori(
      Profile(username, avatar, role.color, role.colorSecondary, role.icon),
      {
        ...profileCardOptions,
        fonts: await getProfileFonts(),
      },
    )

    const png = new Resvg(svg).render().asPng()
    const preview = new AttachmentBuilder(png, { name: 'preview.png' })

    const perms = this.allowedPerms(member)
    const id = role.id

    const editNameButton = new ButtonBuilder()
      .setLabel('Название')
      .setStyle(ButtonStyle.Secondary)
      .setCustomId(makeCustomId('edit-role-name-button', id))
      .setDisabled(!perms.includes(RoleEditPermission.Name))

    const editColorButton = new ButtonBuilder()
      .setLabel(perms.includes(RoleEditPermission.Gradient) ? 'Цвета (HEX)' : 'Цвет (HEX)')
      .setStyle(ButtonStyle.Secondary)
      .setCustomId(makeCustomId('edit-color-button', id))
      .setDisabled(!perms.includes(RoleEditPermission.Color))

    const editIconButton = new ButtonBuilder()
      .setLabel('Иконка')
      .setStyle(ButtonStyle.Secondary)
      .setCustomId(makeCustomId('edit-icon-button', id))
      .setDisabled(!perms.includes(RoleEditPermission.Icon))

    const editHoistButton = new ButtonBuilder()
      .setLabel(`Отображение: ${role.hoist ? 'вкл' : 'выкл'}`)
      .setStyle(ButtonStyle.Secondary)
      .setCustomId(makeCustomId('edit-hoist-button', id))
      .setDisabled(!perms.includes(RoleEditPermission.Hoist))

    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      editNameButton,
      editColorButton,
      editIconButton,
      editHoistButton,
    )

    const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel('Отправить на подтверждение')
        .setStyle(ButtonStyle.Success)
        .setCustomId(makeCustomId('confirmation-send-button', id)),
    )

    return { components: [row1, row2], files: [preview] }
  }

  allowedPerms(member: GuildMember): RoleEditPermission[] {
    const { requiredRoles } = getGuildRoleSettings(member.guild.id)
    const permissions: RoleEditPermission[] = []
    const has = (roleIds: readonly string[]): boolean =>
      roleIds.some((r) => member.roles.cache.has(r))

    if (has(requiredRoles.editName)) permissions.push(RoleEditPermission.Name)
    if (has(requiredRoles.editColor)) permissions.push(RoleEditPermission.Color)
    if (has(requiredRoles.editIcon)) permissions.push(RoleEditPermission.Icon)
    if (has(requiredRoles.editHoist)) permissions.push(RoleEditPermission.Hoist)
    if (has(requiredRoles.editGradient)) permissions.push(RoleEditPermission.Gradient)

    return permissions
  }

  allowedTo(edit: RoleEditPermission, who: GuildMember): boolean {
    return this.allowedPerms(who).includes(edit)
  }

  stripDisallowed(role: LiveRole, member: GuildMember): boolean {
    const allowed = this.allowedPerms(member)
    let changed = false
    if (role.name !== null && !allowed.includes(RoleEditPermission.Name)) {
      role.name = null
      changed = true
    }
    if (role.color !== null && !allowed.includes(RoleEditPermission.Color)) {
      role.color = null
      changed = true
    }
    if (role.colorSecondary !== null && !allowed.includes(RoleEditPermission.Gradient)) {
      role.colorSecondary = null
      changed = true
    }
    if (role.icon !== null && !allowed.includes(RoleEditPermission.Icon)) {
      role.icon = null
      changed = true
    }
    if (role.hoist && !allowed.includes(RoleEditPermission.Hoist)) {
      role.hoist = false
      changed = true
    }
    return changed
  }

  async sendConfirmation(
    role: LiveRole,
    member: GuildMember,
    { editId, by, approved }: { editId?: string; by?: string; approved?: boolean },
  ): Promise<string | false> {
    const preview = await this.buildEditor(role, member)
    const file = preview.files?.[0]
    if (!file) return false

    const acceptButton = new ButtonBuilder()
      .setStyle(ButtonStyle.Success)
      .setLabel('Принять')
      .setCustomId(makeCustomId('admin-approve-role', role.id))
      .setDisabled(approved !== undefined)

    const rejectButton = new ButtonBuilder()
      .setStyle(ButtonStyle.Danger)
      .setLabel('Отклонить')
      .setCustomId(makeCustomId('admin-deny-role', role.id))
      .setDisabled(approved !== undefined)

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(acceptButton, rejectButton)

    const { approvalChannelId } = getGuildRoleSettings(member.guild.id)
    if (!approvalChannelId) {
      console.error(`[editor] No approval channel configured for guild ${member.guild.id}.`)
      return false
    }
    const channel = await member.guild.channels.fetch(approvalChannelId).catch(() => null)

    if (!channel?.isSendable()) {
      console.error('[editor] Admin channel is not sendable.')
      return false
    }

    const colorLine = role.colorSecondary
      ? `${role.color ?? 'Нет'} → ${role.colorSecondary} (градиент)`
      : (role.color ?? 'Нет')

    const content =
      `## Роль от <@${member.id}>\n` +
      `**Название**: ${role.name ?? 'Нет'}\n` +
      `**Цвет**: ${colorLine}\n` +
      `**Иконка**: ${role.icon ? 'Да' : 'Нет'}\n` +
      `**Отображение**: ${role.hoist ? 'Да' : 'Нет'}` +
      (by ? `\n**${approved ? 'Принято' : 'Отклонено'}**: <@${by}>` : '')

    if (editId) {
      const message = await channel.messages.fetch(editId).catch(() => null)
      if (!message) return false
      await message.edit({ content, files: [file], components: [row] })
      return message.id
    }

    const msg = await channel.send({ content, files: [file], components: [row] })
    return msg.id
  }

  async dm(
    interaction: ButtonInteraction,
    to: string,
    userContent: MessageCreateOptions,
    adminContent: string,
  ): Promise<unknown> {
    const user = await this.client.users.fetch(to).catch(() => null)

    if (!user) {
      return interaction.editReply({ content: `${adminContent}\n\nПользователь не найден.` })
    }

    try {
      await user.send(userContent)
    } catch {
      return interaction.editReply({
        content: `${adminContent}\n\nНе удалось отправить сообщение. Возможно, пользователь отключил личные сообщения.`,
      })
    }

    return interaction.editReply({
      content: `${adminContent}\n\nСообщение отправлено пользователю ${user.username} (${user.id})`,
    })
  }

  async createDiscordRole(guild: Guild, role: SnapshotRole): Promise<string> {
    const settings = getGuildRoleSettings(guild.id)
    const belowRole = settings.belowRoleId
      ? await guild.roles.fetch(settings.belowRoleId).catch(() => null)
      : null

    const discordRole = await guild.roles.create({
      name: role.name ?? settings.defaultRoleName,
      colors: resolveRoleColors(role.color, role.colorSecondary),
      icon: role.icon,
      hoist: role.hoist,
      position: belowRole?.position ?? 0,
      mentionable: false,
      reason: 'Personal role approved by administration',
    })

    return discordRole.id
  }

  async editDiscordRole(guild: Guild, role: SnapshotRole, discordId: string): Promise<void> {
    const discordRole = await guild.roles.fetch(discordId).catch(() => null)
    if (!discordRole) throw new Error('Discord role not found.')

    await discordRole.edit({
      name: role.name ?? getGuildRoleSettings(guild.id).defaultRoleName,
      colors: resolveRoleColors(role.color, role.colorSecondary),
      icon: role.icon,
      hoist: role.hoist,
      reason: 'Personal role approved by administration',
    })
  }
}

// Discord accepts `null` for secondaryColor to clear an existing gradient on edit;
// discord.js types only declare ColorResolvable, so we cast through.
function resolveRoleColors(primary: string | null, secondary: string | null): RoleColorsResolvable {
  return {
    primaryColor: (primary ?? 0) as HexColorString | 0,
    secondaryColor: (secondary ?? null) as unknown as HexColorString,
  }
}
