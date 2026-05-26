import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, RelationId, UpdateDateColumn } from 'typeorm';
import { UserEntity } from '../users/user.entity';

@Entity({ name: 'projects' })
export class ProjectEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  dataPath!: string | null;

  @Column({ type: 'boolean', default: false })
  isPublic!: boolean;

  @Column({ type: 'varchar', length: 64, nullable: true, unique: true })
  shareSlug!: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  shareVisitors!: { username: string; visitedAt: string }[];

  @Column({ type: 'timestamptz', nullable: true })
  lastOpenedAt!: Date | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  guestId!: string | null;

  @ManyToOne(() => UserEntity, (user) => user.projects, { nullable: true, onDelete: 'CASCADE' })
  owner!: UserEntity | null;

  @RelationId((project: ProjectEntity) => project.owner)
  ownerId!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
