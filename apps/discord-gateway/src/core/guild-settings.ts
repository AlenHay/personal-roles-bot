import { Database } from 'bun:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

// Generic per-guild settings store for modules. Values are JSON-encoded so
// modules can persist strings, lists, or richer shapes without schema churn.
// Env-based config stays the bootstrap/default layer; this store holds
// per-guild overrides managed through setup commands.

const path = process.env.GATEWAY_SQLITE_PATH?.trim() || './data/gateway.sqlite'
mkdirSync(dirname(path), { recursive: true })

const db = new Database(path)
db.exec('PRAGMA journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS guild_settings (
    module_id  TEXT NOT NULL,
    guild_id   TEXT NOT NULL,
    key        TEXT NOT NULL,
    value      TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (module_id, guild_id, key)
  );
`)

const selectOne = db.prepare<{ value: string }, [string, string, string]>(
  'SELECT value FROM guild_settings WHERE module_id = ? AND guild_id = ? AND key = ?',
)
const selectAll = db.prepare<{ key: string; value: string }, [string, string]>(
  'SELECT key, value FROM guild_settings WHERE module_id = ? AND guild_id = ?',
)
const upsert = db.prepare<void, [string, string, string, string, number]>(
  `INSERT INTO guild_settings (module_id, guild_id, key, value, updated_at)
   VALUES (?, ?, ?, ?, ?)
   ON CONFLICT(module_id, guild_id, key) DO UPDATE SET
     value      = excluded.value,
     updated_at = excluded.updated_at`,
)
const remove = db.prepare<void, [string, string, string]>(
  'DELETE FROM guild_settings WHERE module_id = ? AND guild_id = ? AND key = ?',
)

export function getGuildSetting<T>(moduleId: string, guildId: string, key: string): T | null {
  const row = selectOne.get(moduleId, guildId, key)
  if (!row) return null
  try {
    return JSON.parse(row.value) as T
  } catch {
    return null
  }
}

export function setGuildSetting(
  moduleId: string,
  guildId: string,
  key: string,
  value: unknown,
): void {
  upsert.run(moduleId, guildId, key, JSON.stringify(value), Date.now())
}

export function deleteGuildSetting(moduleId: string, guildId: string, key: string): void {
  remove.run(moduleId, guildId, key)
}

export function listGuildSettings(moduleId: string, guildId: string): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const row of selectAll.all(moduleId, guildId)) {
    try {
      out[row.key] = JSON.parse(row.value)
    } catch {
      // skip unparseable rows
    }
  }
  return out
}
