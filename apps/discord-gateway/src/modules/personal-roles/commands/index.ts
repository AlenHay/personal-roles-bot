import adminApprove from './admin/approve.ts'
import adminDeny from './admin/deny.ts'
import confirmationSend from './confirmation-send.ts'
import editColor from './edit/color.ts'
import editColorModal from './edit/color-modal.ts'
import editHoist from './edit/hoist.ts'
import editIcon from './edit/icon.ts'
import editIconModal from './edit/icon-modal.ts'
import editName from './edit/name.ts'
import editNameModal from './edit/name-modal.ts'
import role from './role.ts'
import rolesSetup from './roles-setup.ts'
import rulesAgree from './rules-agree.ts'
import type { ButtonCommand, Command, ModalCommand, SlashCommand } from './types.ts'

export const allCommands: Command[] = [
  role,
  rolesSetup,
  rulesAgree,
  confirmationSend,
  adminApprove,
  adminDeny,
  editName,
  editNameModal,
  editColor,
  editColorModal,
  editIcon,
  editIconModal,
  editHoist,
]

export const slashCommands: SlashCommand[] = allCommands.filter(
  (c): c is SlashCommand => c.type === 'slash',
)

export const buttonCommands: Map<string, ButtonCommand> = new Map(
  allCommands.filter((c): c is ButtonCommand => c.type === 'button').map((c) => [c.name, c]),
)

export const modalCommands: Map<string, ModalCommand> = new Map(
  allCommands.filter((c): c is ModalCommand => c.type === 'modal').map((c) => [c.name, c]),
)
