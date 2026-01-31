export type AuthUser = {
  id: string;
  email: string;
  region: string;
  isActive: boolean;
  createdAt: Date;
};

export type AuthResponse = {
  user: AuthUser;
  accessToken: string;
};
