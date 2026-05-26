import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthTokenPayload, ProjectActor } from './auth.types';

@Injectable()
export class ProjectAccessGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: AuthTokenPayload;
      projectActor?: ProjectActor;
    }>();
    const token = extractBearerToken(request.headers.authorization);

    if (token) {
      try {
        const payload = await this.jwtService.verifyAsync<AuthTokenPayload>(token, {
          secret: this.configService.get<string>('JWT_SECRET', 'webster-secret')
        });
        request.user = payload;
        request.projectActor = { kind: 'user', userId: payload.sub };
        return true;
      } catch {
        throw new UnauthorizedException('Invalid or expired access token');
      }
    }

    const guestId = request.headers['x-guest-id']?.trim();
    if (guestId) {
      request.projectActor = { kind: 'guest', guestId };
      return true;
    }

    throw new UnauthorizedException('Missing access token or guest id');
  }
}

function extractBearerToken(header?: string) {
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}
