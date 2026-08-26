export const CUSTOM_ID_SEPARATOR = 'ɵ'

export enum RoleEditPermission {
  Name,
  Color,
  Icon,
  Hoist,
  Gradient,
}

export const ResetKeyword = {
  Display: 'Сброс',
  Key: 'сброс',
} as const

export const Limits = {
  MinIconLinkLength: 5,
  MaxIconLinkLength: 512,
  MaxRoleFetchRetryAttempts: 8,
} as const

export const SNOWFLAKE_EPOCH = 1719187200000
