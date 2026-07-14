interface Env {
  DB: D1Database;
  WAITLIST_EXPORT_SECRET?: string;
  WAITLIST_IP_SALT?: string;
  CLERK_SECRET_KEY?: string;
  INVITE_ADMIN_SECRET?: string;
  /** When "true" or "1", only invited emails can sync / use the app */
  INVITE_REQUIRED?: string;
}
