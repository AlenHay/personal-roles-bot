import { SNOWFLAKE_EPOCH } from '../constants.ts'

export function snowflake(timestamp: Date | number = Date.now()): string {
  if (timestamp instanceof Date) timestamp = timestamp.getTime()
  const b = BigInt
  return ((b(timestamp) - b(SNOWFLAKE_EPOCH)) << b(22)).toString()
}
