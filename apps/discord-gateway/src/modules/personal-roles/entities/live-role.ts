import { Column, Entity, ManyToOne } from 'typeorm'
import { SnowflakeIdEntity } from './snowflake-base.ts'
import { User } from './user.ts'

@Entity({ name: 'live_role_model' })
export class LiveRole extends SnowflakeIdEntity {
  @ManyToOne(
    () => User,
    (user) => user.roles,
  )
  owner!: User

  @Column({ nullable: true, default: null, type: 'varchar' })
  discordId!: string | null

  @Column({ nullable: true, default: null, type: 'varchar' })
  icon!: string | null

  @Column({ nullable: true, default: null, type: 'varchar' })
  name!: string | null

  @Column({ nullable: true, default: null, type: 'varchar' })
  color!: string | null

  @Column({ nullable: true, default: null, type: 'varchar' })
  colorSecondary!: string | null

  @Column({ default: false })
  hoist!: boolean

  @Column({ default: 0 })
  fetchAttempts!: number
}
