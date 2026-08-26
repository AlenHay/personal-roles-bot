import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm'
import { LiveRole } from './live-role.ts'

@Entity({ name: 'snapshot_role_model' })
export class SnapshotRole {
  @PrimaryColumn()
  id!: string

  @OneToOne(() => LiveRole)
  @JoinColumn({ name: 'id' })
  liveRole!: LiveRole

  @Column({ nullable: true, default: null, type: 'varchar' })
  name!: string | null

  @Column({ nullable: true, default: null, type: 'varchar' })
  color!: string | null

  @Column({ nullable: true, default: null, type: 'varchar' })
  colorSecondary!: string | null

  @Column({ nullable: true, default: null, type: 'varchar' })
  icon!: string | null

  @Column({ default: false })
  hoist!: boolean

  @Column({ default: false })
  approved!: boolean

  @Column()
  approveMessageId!: string
}
