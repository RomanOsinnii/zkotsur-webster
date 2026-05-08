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

  @Column({ type: 'jsonb' })
  data!: Record<string, unknown>;

  @ManyToOne(() => UserEntity, (user) => user.projects, { nullable: false, onDelete: 'CASCADE' })
  owner!: UserEntity;

  @RelationId((project: ProjectEntity) => project.owner)
  ownerId!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
