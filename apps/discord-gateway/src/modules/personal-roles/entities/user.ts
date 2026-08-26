import { Column, Entity, OneToMany } from 'typeorm'
import { LiveRole } from './live-role.ts'
import { SnowflakeIdEntity } from './snowflake-base.ts'

@Entity({ name: 'user_model' })
export class User extends SnowflakeIdEntity {
  @OneToMany(
    () => LiveRole,
    (role) => role.owner,
  )
  roles!: LiveRole[]

  @Column({ default: false })
  readRules!: boolean
}
