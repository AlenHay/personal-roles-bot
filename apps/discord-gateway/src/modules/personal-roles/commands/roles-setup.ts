import {
  ChannelType,
  type ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js'
import {
  clearGuildEditGate,
  EDIT_GATES,
  type EditGate,
  getGuildRoleSettings,
  isGuildConfigured,
  setGuildEditGate,
  setGuildRoleSetting,
} from '../settings.ts'
import type { SlashCommand } from './types.ts'

const GATE_CHOICES = EDIT_GATES.map((gate) => ({
  name: gate.replace('edit', '').toLowerCase(),
  value: gate,
}))

const command: SlashCommand = {
  type: 'slash',
  data: new SlashCommandBuilder()
    .setName('roles-setup')
    .setDescription('Настройка модуля личных ролей для этого сервера')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addSubcommand((sub) => sub.setName('show').setDescription('Показать текущие настройки'))
    .addSubcommand((sub) =>
      sub
        .setName('channel')
        .setDescription('Канал подтверждения ролей администрацией')
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Текстовый канал')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('anchor')
        .setDescription('Роль, под которой создаются личные роли')
        .addRoleOption((opt) =>
          opt.setName('role').setDescription('Якорная роль').setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('default-name')
        .setDescription('Название роли по умолчанию')
        .addStringOption((opt) =>
          opt.setName('name').setDescription('Название').setMaxLength(100).setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('gate-add')
        .setDescription('Разрешить роли редактирование свойства')
        .addStringOption((opt) =>
          opt
            .setName('feature')
            .setDescription('Свойство')
            .addChoices(...GATE_CHOICES)
            .setRequired(true),
        )
        .addRoleOption((opt) =>
          opt.setName('role').setDescription('Роль с доступом').setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('gate-remove')
        .setDescription('Убрать роль из доступа к свойству')
        .addStringOption((opt) =>
          opt
            .setName('feature')
            .setDescription('Свойство')
            .addChoices(...GATE_CHOICES)
            .setRequired(true),
        )
        .addRoleOption((opt) => opt.setName('role').setDescription('Роль').setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('gate-reset')
        .setDescription('Сбросить доступ к свойству на значение из конфигурации')
        .addStringOption((opt) =>
          opt
            .setName('feature')
            .setDescription('Свойство')
            .addChoices(...GATE_CHOICES)
            .setRequired(true),
        ),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId
    if (!guildId) {
      return interaction.reply({
        content: 'Команда доступна только на сервере.',
        flags: MessageFlags.Ephemeral,
      })
    }

    const sub = interaction.options.getSubcommand()

    if (sub === 'channel') {
      const channel = interaction.options.getChannel('channel', true)
      setGuildRoleSetting(guildId, 'approvalChannelId', channel.id)
      return reply(interaction, `Канал подтверждения: <#${channel.id}>`)
    }

    if (sub === 'anchor') {
      const role = interaction.options.getRole('role', true)
      setGuildRoleSetting(guildId, 'belowRoleId', role.id)
      return reply(interaction, `Якорная роль: <@&${role.id}>`)
    }

    if (sub === 'default-name') {
      const name = interaction.options.getString('name', true).trim()
      setGuildRoleSetting(guildId, 'defaultRoleName', name)
      return reply(interaction, `Название по умолчанию: ${name}`)
    }

    if (sub === 'gate-add' || sub === 'gate-remove') {
      const gate = interaction.options.getString('feature', true) as EditGate
      const role = interaction.options.getRole('role', true)
      const current = getGuildRoleSettings(guildId).requiredRoles[gate]
      const next =
        sub === 'gate-add'
          ? [...new Set([...current, role.id])]
          : current.filter((id) => id !== role.id)
      setGuildEditGate(guildId, gate, next)
      return reply(
        interaction,
        `Доступ «${gate.replace('edit', '').toLowerCase()}»: ${formatRoles(next)}`,
      )
    }

    if (sub === 'gate-reset') {
      const gate = interaction.options.getString('feature', true) as EditGate
      clearGuildEditGate(guildId, gate)
      const fallback = getGuildRoleSettings(guildId).requiredRoles[gate]
      return reply(
        interaction,
        `Доступ «${gate.replace('edit', '').toLowerCase()}» сброшен: ${formatRoles(fallback)}`,
      )
    }

    // show
    const s = getGuildRoleSettings(guildId)
    const lines = [
      `**Статус**: ${isGuildConfigured(s) ? 'настроен' : '⚠️ не настроен'}`,
      `**Канал подтверждения**: ${s.approvalChannelId ? `<#${s.approvalChannelId}>` : 'не задан'}`,
      `**Якорная роль**: ${s.belowRoleId ? `<@&${s.belowRoleId}>` : 'не задана'}`,
      `**Название по умолчанию**: ${s.defaultRoleName}`,
      ...EDIT_GATES.map(
        (gate) =>
          `**${gate.replace('edit', '').toLowerCase()}**: ${formatRoles(s.requiredRoles[gate])}`,
      ),
    ]
    return reply(interaction, lines.join('\n'))
  },
}

function formatRoles(roleIds: string[]): string {
  return roleIds.length ? roleIds.map((id) => `<@&${id}>`).join(' ') : 'никто'
}

function reply(interaction: ChatInputCommandInteraction, content: string): Promise<unknown> {
  return interaction.reply({ content, flags: MessageFlags.Ephemeral, allowedMentions: {} })
}

export default command
export const name = 'roles-setup'
