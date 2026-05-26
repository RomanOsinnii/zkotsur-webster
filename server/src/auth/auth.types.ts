export type AuthTokenPayload = {
  sub: string;
  email: string;
  name: string;
};

export type ProjectActor =
  | { kind: 'user'; userId: string }
  | { kind: 'guest'; guestId: string };
