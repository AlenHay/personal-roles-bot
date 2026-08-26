import type { GatewayIntentBits } from 'discord.js'
import type { AppConfig } from '../config/env.ts'
import type { BotModule, SlashCommandSpec } from './module.ts'

export interface SlashCommandEntry {
  module: BotModule
  command: SlashCommandSpec
}

export async function createModules(config: AppConfig): Promise<BotModule[]> {
  const modules: BotModule[] = []
  const { createSystemModule } = await import('../modules/system/index.ts')
  if (config.modules.personalRoles) {
    const { createPersonalRolesModule } = await import('../modules/personal-roles/index.ts')
    modules.push(createPersonalRolesModule())
  }
  modules.unshift(createSystemModule(() => modules))
  return modules
}

export function uniqueIntents(modules: BotModule[]): GatewayIntentBits[] {
  return [...new Set(modules.flatMap((m) => m.requiredIntents))]
}

export function slashCommandEntries(modules: BotModule[]): SlashCommandEntry[] {
  const entries = modules.flatMap((module) =>
    (module.slashCommands ?? []).map((command) => ({ module, command })),
  )
  const seen = new Set<string>()
  for (const { command } of entries) {
    const name = command.data.name
    if (seen.has(name)) throw new Error(`Duplicate slash command registered: /${name}`)
    seen.add(name)
  }
  return entries
}

export function slashCommands(modules: BotModule[]): SlashCommandSpec[] {
  return slashCommandEntries(modules).map((entry) => entry.command)
}

export function moduleById(modules: BotModule[]): Map<string, BotModule> {
  const out = new Map<string, BotModule>()
  for (const module of modules) {
    if (out.has(module.id)) throw new Error(`Duplicate module id registered: ${module.id}`)
    out.set(module.id, module)
  }
  return out
}
