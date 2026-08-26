import { BeforeInsert, CreateDateColumn, PrimaryColumn } from 'typeorm'
import { snowflake } from '../utils/snowflake.ts'

export class SnowflakeIdEntity {
  @PrimaryColumn()
  id!: string

  @CreateDateColumn()
  createdAt!: Date

  @BeforeInsert()
  beforeInsert(): void {
    if (this.id) return
    this.id = snowflake()
  }
}
