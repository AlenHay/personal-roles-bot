import { type GuildMember, MessageFlags, type ModalSubmitInteraction } from 'discord.js'
import { ResetKeyword, RoleEditPermission } from '../../constants.ts'
import type { Deps, ModalCommand } from '../types.ts'

type ParsedColor =
  | { kind: 'unchanged' }
  | { kind: 'reset' }
  | { kind: 'set'; value: string }
  | { kind: 'invalid' }

function parseColorInput(raw: string | undefined): ParsedColor {
  if (raw === undefined) return { kind: 'unchanged' }
  const trimmed = raw.trim()
  if (trimmed === '') return { kind: 'reset' }
  if (trimmed.toLowerCase() === ResetKeyword.Key) return { kind: 'reset' }
  if (!/^#?([0-9a-f]{3}){1,2}$/i.test(trimmed)) return { kind: 'invalid' }
  const cleaned = (trimmed.startsWith('#') ? trimmed.slice(1) : trimmed).toLowerCase()
  const value =
    '#' +
    (cleaned.length === 3
      ? cleaned
          .split('')
          .map((c) => c + c)
          .join('')
      : cleaned)
  return { kind: 'set', value }
}

const command: ModalCommand = {
  type: 'modal',
  name: 'edit-color-modal',

  async execute(interaction: ModalSubmitInteraction, args: string[], { db, editor }: Deps) {
    const member = interaction.member as GuildMember
    if (!editor.allowedTo(RoleEditPermission.Color, member)) {
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

    const primary = parseColorInput(interaction.fields.getTextInputValue('color'))

    if (primary.kind === 'invalid') {
      return interaction.reply({
        content: 'Неправильный формат основного цвета. Используйте HEX формат (#000000)',
        flags: MessageFlags.Ephemeral,
      })
    }

    // Secondary input is only present if the user had the Gradient perm when the modal opened;
    // re-check server-side so a stale/forged submission can't sneak a gradient through.
    const hasGradientPerm = editor.allowedTo(RoleEditPermission.Gradient, member)
    const secondaryRaw =
      hasGradientPerm && interaction.fields.fields.has('colorSecondary')
        ? interaction.fields.getTextInputValue('colorSecondary')
        : undefined
    const secondary = parseColorInput(secondaryRaw)

    if (secondary.kind === 'invalid') {
      return interaction.reply({
        content: 'Неправильный формат вторичного цвета. Используйте HEX формат (#000000)',
        flags: MessageFlags.Ephemeral,
      })
    }

    await interaction.deferUpdate()

    if (primary.kind === 'reset') role.color = null
    else if (primary.kind === 'set') role.color = primary.value

    if (!hasGradientPerm) {
      role.colorSecondary = null
    } else if (secondary.kind === 'reset') {
      role.colorSecondary = null
    } else if (secondary.kind === 'set') {
      role.colorSecondary = secondary.value
    }

    await db.liveRoles.save(role)

    await interaction.followUp({
      flags: MessageFlags.Ephemeral,
      content: 'Цвет обновлён! Подождите обновления превью.',
    })

    return interaction.editReply(await editor.buildEditor(role, member))
  },
}

export default command
