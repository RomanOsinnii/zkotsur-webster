import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ProjectEntity } from '../projects/project.entity';

@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 160 })
  email!: string;

  @Column({ type: 'text', nullable: true })
  avatarUrl!: string | null;

  @Column({ type: 'varchar', length: 255, select: false })
  passwordHash!: string;

  @Column({ type: 'timestamptz', nullable: true })
  emailVerifiedAt!: Date | null;

  @Column({ type: 'varchar', length: 128, nullable: true, select: false })
  emailVerificationTokenHash!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  emailVerificationSentAt!: Date | null;

  @Column({ type: 'varchar', length: 128, nullable: true, select: false })
  passwordResetTokenHash!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  passwordResetSentAt!: Date | null;

  @OneToMany(() => ProjectEntity, (project) => project.owner)
  projects!: ProjectEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
