import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthTokenPayload } from './auth.types';

export const CurrentUser = createParamDecorator((_: unknown, context: ExecutionContext): AuthTokenPayload => {
  const request = context.switchToHttp().getRequest<{ user: AuthTokenPayload }>();
  return request.user;
});
