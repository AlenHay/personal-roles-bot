import { describe, expect, test } from 'bun:test'
import type { AppConfig } from '../config/env.ts'
import { decideGuildAccess, moduleEnabledInGuild } from './guild-access.ts'
import type { BotModule } from './module.ts'

function makeConfig(overrides: Partial<AppConfig['publicBot']>, commandGuildIds: string[] = []) {
  return {
    discord: {
      token: 'token',
      clientId: 'client',
      status: null,
      commandRegistration: { mode: 'guild', guildIds: commandGuildIds },
    },
    publicBot: {
      enabled: false,
      allowedGuildIds: [],
      blockedGuildIds: [],
      leaveUnauthorizedGuilds: true,
      ...overrides,
    },
    modules: { personalRoles: true },
  } satisfies AppConfig
}

describe('decideGuildAccess', () => {
  test('blocklist wins over allowlist', () => {
    const config = makeConfig({ enabled: true, allowedGuildIds: ['1'], blockedGuildIds: ['1'] })
    expect(decideGuildAccess(config, '1').allowed).toBe(false)
  })

  test('public bot allows any guild when no allowlist is set', () => {
    expect(decideGuildAccess(makeConfig({ enabled: true }), '1').allowed).toBe(true)
  })

  test('public bot rejects guilds outside a non-empty allowlist', () => {
    const config = makeConfig({ enabled: true, allowedGuildIds: ['1'] })
    expect(decideGuildAccess(config, '2').allowed).toBe(false)
  })

  test('private bot falls back to command registration guilds', () => {
    const config = makeConfig({}, ['1'])
    expect(decideGuildAccess(config, '1').allowed).toBe(true)
    expect(decideGuildAccess(config, '2').allowed).toBe(false)
  })

  test('private bot with no configured guilds allows nothing', () => {
    expect(decideGuildAccess(makeConfig({}), '1').allowed).toBe(false)
  })
})

describe('moduleEnabledInGuild', () => {
  const managed: BotModule = {
    id: 'managed',
    scope: { type: 'managed-guilds', guildIds: ['1'] },
    requiredIntents: [],
  }
  const global: BotModule = { id: 'global', scope: { type: 'global' }, requiredIntents: [] }

  test('managed modules only run in configured guilds', () => {
    expect(moduleEnabledInGuild(managed, '1')).toBe(true)
    expect(moduleEnabledInGuild(managed, '2')).toBe(false)
  })

  test('global modules run anywhere', () => {
    expect(moduleEnabledInGuild(global, '2')).toBe(true)
  })
})
