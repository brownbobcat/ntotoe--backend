export interface User {
  _id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  organizations: string[];
}

export type UserRole = "admin" | "member";

export interface JWTPayload {
  userId: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}
