# Scripts

Utility scripts for database maintenance and migrations.

## Available Scripts

| Script | Purpose |
|--------|---------|
| `migrate-settings.js` | Add new AI provider enum values (gemini, minimax, moonshot, etc.) to the `app_ai_provider` Postgres type |
| `update-enums.js` | General-purpose enum migration utility |
| `encrypt-existing-tokens.js` | Encrypt any plaintext API tokens stored in the database |

## Usage

```bash
node scripts/migrate-settings.js
node scripts/update-enums.js
node scripts/encrypt-existing-tokens.js
```

All scripts require the Supabase environment variables configured in `.env.local`.