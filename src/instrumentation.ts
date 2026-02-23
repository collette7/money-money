export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const requiredEnvVars = [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "ENCRYPTION_KEY",
    ];

    const missing = requiredEnvVars.filter((key) => !process.env[key]);

    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(", ")}. ` +
        `See .env.example for reference.`
      );
    }

    const key = Buffer.from(process.env.ENCRYPTION_KEY!, "base64");
    if (key.length !== 32) {
      throw new Error(
        "ENCRYPTION_KEY must be exactly 32 bytes when base64 decoded. " +
        "Generate one with: openssl rand -base64 32"
      );
    }
  }
}
