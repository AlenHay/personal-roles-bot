import { makeScopedCustomId } from '../../../core/custom-id.ts'
import { CUSTOM_ID_SEPARATOR } from '../constants.ts'

const MODULE_ID = 'roles'
const MODULE_PREFIX = `${MODULE_ID}:`

export function makeCustomId(...args: Array<string | number>): string {
  return makeScopedCustomId(MODULE_ID, args.join(CUSTOM_ID_SEPARATOR))
}

export function parseCustomId(customId: string): string[] {
  const innerId = customId.startsWith(MODULE_PREFIX)
    ? customId.slice(MODULE_PREFIX.length)
    : customId
  return innerId.split(CUSTOM_ID_SEPARATOR)
}
