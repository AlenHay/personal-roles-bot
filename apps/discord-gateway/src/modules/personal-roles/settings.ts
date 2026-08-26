import { deleteGuildSetting, getGuildSetting, setGuildSetting } from '../../core/guild-settings.ts'
import { config } from './config.ts'

const MODULE_ID = 'roles'

export type EditGate = 'editName' | 'editColor' | 'editIcon' | 'editHoist' | 'editGradient'
export const EDIT_GATES: readonly EditGate[] = [
  'editName',
  'editColor',
  'editIcon',
  'editHoist',
  'editGradient',
]

export interface RoleGuildSettings {
  approvalChannelId: string | null
  belowRoleId: string | null
  defaultRoleName: string
  requiredRoles: Record<EditGate, string[]>
}

/**
 * Per-guild settings with env fallback. The guild-settings store (managed via
 * /roles-setup) wins; PERSONAL_ROLES_* env vars act as the default for every
 * configured guild so single-guild deployments keep working unchanged.
 */
export function getGuildRoleSettings(guildId: string): RoleGuildSettings {
  const requiredRoles = {} as Record<EditGate, string[]>
  for (const gate of EDIT_GATES) {
    requiredRoles[gate] =
      getGuildSetting<string[]>(MODULE_ID, guildId, gate) ?? config.requiredRoles[gate]
  }
  return {
    approvalChannelId:
      getGuildSetting<string>(MODULE_ID, guildId, 'approvalChannelId') ??
      config.roleFlow.approvalChannelId,
    belowRoleId:
      getGuildSetting<string>(MODULE_ID, guildId, 'belowRoleId') ?? config.roleFlow.belowRoleId,
    defaultRoleName:
      getGuildSetting<string>(MODULE_ID, guildId, 'defaultRoleName') ??
      config.roleFlow.defaultRoleName,
    requiredRoles,
  }
}

/** True when the guild has everything the role flow needs to operate. */
export function isGuildConfigured(settings: RoleGuildSettings): boolean {
  return settings.approvalChannelId !== null && settings.belowRoleId !== null
}

export function setGuildRoleSetting(
  guildId: string,
  key: 'approvalChannelId' | 'belowRoleId' | 'defaultRoleName',
  value: string,
): void {
  setGuildSetting(MODULE_ID, guildId, key, value)
}

/** Stores the gate override; an empty list means "nobody can edit this property". */
export function setGuildEditGate(guildId: string, gate: EditGate, roleIds: string[]): void {
  setGuildSetting(MODULE_ID, guildId, gate, roleIds)
}

/** Removes the per-guild override so the env default applies again. */
export function clearGuildEditGate(guildId: string, gate: EditGate): void {
  deleteGuildSetting(MODULE_ID, guildId, gate)
}
