import jwt from "jsonwebtoken";
import { InvalidAuthTokenError } from "../utils/errors";

export function createAuthToken<T extends object>(payload: T): string {
  return jwt.sign(payload, process.env.SECRET_KEY!);
}

export function validateAuthToken<T extends object>(token: string): T {
  try {
    return jwt.verify(token, process.env.SECRET_KEY!) as T;
  } catch (err) {
    throw new InvalidAuthTokenError();
  }
}
