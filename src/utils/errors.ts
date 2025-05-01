export class InvalidAuthTokenError extends Error {
  constructor() {
    super("Invalid auth token (unauthorized)");
    this.name = "InvalidAuthTokenError";
  }
}
