import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ProjectActor } from './auth.types';

export const CurrentProjectActor = createParamDecorator((_: unknown, context: ExecutionContext): ProjectActor => {
  const request = context.switchToHttp().getRequest<{ projectActor: ProjectActor }>();
  return request.projectActor;
});
