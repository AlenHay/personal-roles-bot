import { requireManagedGuildIds } from '../../config/env.ts'

function requireEnv(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required environment variable: ${key}`)
  return val
}

function parseCommaSeparated(key: string): string[] {
  return (process.env[key] ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function parseBool(key: string, fallback: boolean): boolean {
  const raw = process.env[key]
  if (raw === undefined || raw === '') return fallback
  try {
    return JSON.parse(raw) === true
  } catch {
    return fallback
  }
}

function parsePort(key: string, fallback: number): number {
  const raw = process.env[key]
  if (raw === undefined || raw === '') return fallback
  const n = Number(raw)
  if (!Number.isInteger(n) || n <= 0 || n > 65535) {
    throw new Error(`Environment variable ${key} must be a valid port, got: ${raw}`)
  }
  return n
}

export const config = {
  guildIds: requireManagedGuildIds('personal-roles', 'PERSONAL_ROLES_GUILD_IDS'),
  // Per-guild defaults. The guild-settings store (managed via /roles-setup)
  // overrides these per guild; env-only deployments keep working as before.
  roleFlow: {
    approvalChannelId: process.env.PERSONAL_ROLES_CONFIRMATION_CHANNEL_ID?.trim() || null,
    belowRoleId: process.env.PERSONAL_ROLES_CREATE_BELOW_ROLE_ID?.trim() || null,
    defaultRoleName: process.env.PERSONAL_ROLES_DEFAULT_NAME?.trim() || 'Custom Role',
  },
  /** Per-feature entitlements — Discord role IDs that grant edit access to each personal-role property. */
  requiredRoles: {
    editName: parseCommaSeparated('PERSONAL_ROLES_REQUIRED_EDIT_NAME_ROLE_IDS'),
    editColor: parseCommaSeparated('PERSONAL_ROLES_REQUIRED_EDIT_COLOR_ROLE_IDS'),
    editIcon: parseCommaSeparated('PERSONAL_ROLES_REQUIRED_EDIT_ICON_ROLE_IDS'),
    editHoist: parseCommaSeparated('PERSONAL_ROLES_REQUIRED_EDIT_HOIST_ROLE_IDS'),
    editGradient: parseCommaSeparated('PERSONAL_ROLES_REQUIRED_EDIT_GRADIENT_ROLE_IDS'),
  },
  postgres: {
    host: requireEnv('PERSONAL_ROLES_POSTGRES_HOST'),
    port: parsePort('PERSONAL_ROLES_POSTGRES_PORT', 5432),
    database: requireEnv('PERSONAL_ROLES_POSTGRES_DATABASE'),
    username: requireEnv('PERSONAL_ROLES_POSTGRES_USERNAME'),
    password: requireEnv('PERSONAL_ROLES_POSTGRES_PASSWORD'),
    logging: parseBool('PERSONAL_ROLES_TYPEORM_LOGGING', false),
  },
  roleCheckCron: process.env.PERSONAL_ROLES_ROLE_CHECK_CRON ?? '*/5 * * * *',
} as const
