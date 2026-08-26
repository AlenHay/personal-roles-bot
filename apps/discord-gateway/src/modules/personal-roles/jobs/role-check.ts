import type { Client, Guild, HexColorString, Role, RoleColorsResolvable } from 'discord.js'
import { IsNull, Not } from 'typeorm'
import { config } from '../config.ts'
import { Limits, RoleEditPermission } from '../constants.ts'
import type { LiveRole } from '../entities/index.ts'
import type { DbBundle } from '../services/db.ts'
import type { EditorService } from '../services/editor.ts'
import { getGuildRoleSettings } from '../settings.ts'

export function startRoleCheckCron(client: Client, db: DbBundle, editor: EditorService): void {
  Bun.cron(config.roleCheckCron, () => {
    void runRoleCheck(client, db, editor).catch((err) => {
      console.error('[role-check] cron iteration failed:', err)
    })
  })
  console.log(`[role-check] cron scheduled: ${config.roleCheckCron}`)
}

export async function runRoleCheck(
  client: Client,
  db: DbBundle,
  editor: EditorService,
): Promise<void> {
  for (const guildId of config.guildIds) {
    const guild = await client.guilds.fetch(guildId).catch(() => null)
    if (!guild) {
      console.error(`[role-check] guild ${guildId} not available`)
      continue
    }
    await runRoleCheckForGuild(guild, db, editor)
  }
}

async function runRoleCheckForGuild(
  guild: Guild,
  db: DbBundle,
  editor: EditorService,
): Promise<void> {
  const defaultRoleName = getGuildRoleSettings(guild.id).defaultRoleName
  const roles = await db.liveRoles.find({
    where: { discordId: Not(IsNull()) },
    relations: { owner: true },
  })

  console.log(`[role-check] checking ${roles.length} role(s) in ${guild.id}`)

  for (const role of roles) {
    if (!role.discordId) continue

    const discordRole = await guild.roles.fetch(role.discordId).catch(() => null)

    if (!discordRole) {
      if (role.fetchAttempts >= Limits.MaxRoleFetchRetryAttempts) {
        console.error(
          `[role-check] role ${role.discordId} missing after ${Limits.MaxRoleFetchRetryAttempts} attempts, clearing discordId`,
        )
        role.discordId = null
        role.fetchAttempts = 0
        await db.liveRoles.save(role)
        continue
      }
      console.error(
        `[role-check] role ${role.discordId} missing, ${Limits.MaxRoleFetchRetryAttempts - role.fetchAttempts} retries left`,
      )
      role.fetchAttempts++
      await db.liveRoles.save(role)
      continue
    }

    const member = await guild.members.fetch(role.owner.id).catch(() => null)

    if (!member) {
      console.error(`[role-check] member ${role.owner.id} not found`)
      if (role.fetchAttempts !== 0) {
        role.fetchAttempts = 0
        await db.liveRoles.save(role)
      }
      continue
    }

    const rolePermissions = getRolePermissions(discordRole, defaultRoleName)
    const memberPermissions = editor.allowedPerms(member)

    if (!memberPermissions.length) {
      console.error(
        `[role-check] member ${member.id} lacks permissions; removing role ${role.discordId}`,
      )
      role.discordId = null
      role.fetchAttempts = 0
      editor.stripDisallowed(role, member)
      await db.liveRoles.save(role)
      await guild.roles.delete(discordRole).catch(() => null)
      continue
    }

    const permissionsLack = rolePermissions.filter((p) => !memberPermissions.includes(p))

    role.fetchAttempts = 0

    if (permissionsLack.length) {
      await removeFeatures(discordRole, permissionsLack, role, defaultRoleName)
    }

    await db.liveRoles.save(role)
  }
}

async function removeFeatures(
  discordRole: Role,
  perms: RoleEditPermission[],
  liveRole: LiveRole,
  defaultRoleName: string,
): Promise<void> {
  if (perms.includes(RoleEditPermission.Icon)) {
    liveRole.icon = null
    await discordRole.edit({ icon: null })
  }
  if (perms.includes(RoleEditPermission.Hoist)) {
    liveRole.hoist = false
    await discordRole.edit({ hoist: false })
  }
  // Color and Gradient share the `colors` API call — losing Color wipes everything,
  // losing only Gradient keeps the primary and clears the secondary.
  if (perms.includes(RoleEditPermission.Color)) {
    liveRole.color = null
    liveRole.colorSecondary = null
    await discordRole.edit({ colors: resolveColors(null, null) })
  } else if (perms.includes(RoleEditPermission.Gradient)) {
    liveRole.colorSecondary = null
    await discordRole.edit({ colors: resolveColors(liveRole.color, null) })
  }
  if (perms.includes(RoleEditPermission.Name)) {
    liveRole.name = defaultRoleName
    await discordRole.edit({ name: defaultRoleName })
  }
}

function getRolePermissions(forRole: Role, defaultRoleName: string): RoleEditPermission[] {
  const result: RoleEditPermission[] = []
  if (forRole.icon) result.push(RoleEditPermission.Icon)
  if (forRole.hoist) result.push(RoleEditPermission.Hoist)
  if (forRole.colors.primaryColor) result.push(RoleEditPermission.Color)
  if (forRole.colors.secondaryColor !== null) result.push(RoleEditPermission.Gradient)
  if (forRole.name !== defaultRoleName) result.push(RoleEditPermission.Name)
  return result
}

function resolveColors(primary: string | null, secondary: string | null): RoleColorsResolvable {
  return {
    primaryColor: (primary ?? 0) as HexColorString | 0,
    secondaryColor: (secondary ?? null) as unknown as HexColorString,
  }
}
