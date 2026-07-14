interface Env {
  DB: D1Database;
  WAITLIST_EXPORT_SECRET?: string;
  WAITLIST_IP_SALT?: string;
  CLERK_SECRET_KEY?: string;
  INVITE_ADMIN_SECRET?: string;
  /** When "true" or "1", only invited emails can sync / use the app */
  INVITE_REQUIRED?: string;
  /**
   * Local-only: allow POST /api/chat without Clerk when CLERK_SECRET_KEY is unset.
   * Must be explicitly "true" or "1". Never set in production.
   */
  CHAT_DEV_BYPASS?: string;
  /** When set, POST /api/chat calls Anthropic Messages API; otherwise canned stub */
  ANTHROPIC_API_KEY?: string;
}
