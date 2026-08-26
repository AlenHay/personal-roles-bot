const MODULE_SEPARATOR = ':'

export interface ScopedCustomId {
  moduleId: string
  innerId: string
}

export function makeScopedCustomId(moduleId: string, innerId: string): string {
  if (!moduleId || moduleId.includes(MODULE_SEPARATOR)) {
    throw new Error(`Invalid module id for custom id: ${moduleId}`)
  }
  if (!innerId) throw new Error('innerId must not be empty')
  return `${moduleId}${MODULE_SEPARATOR}${innerId}`
}

export function parseScopedCustomId(customId: string): ScopedCustomId | null {
  const index = customId.indexOf(MODULE_SEPARATOR)
  if (index <= 0 || index === customId.length - 1) return null
  return {
    moduleId: customId.slice(0, index),
    innerId: customId.slice(index + 1),
  }
}
