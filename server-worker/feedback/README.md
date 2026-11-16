# Feedback Worker

The Cloudflare Worker in `server-worker/feedback/` receives feedback from the site and forwards it to a Telegram channel. Before deploying it, add a Telegram bot to the channel with only the permissions it needs to post messages.

Run the following commands from the project root:

1. Sign in to Cloudflare with `npx wrangler login`, then deploy with `npx wrangler deploy --config server-worker/feedback/wrangler.toml`.
2. Set the Worker secrets:

   ```sh
   npx wrangler secret put TELEGRAM_BOT_TOKEN --config server-worker/feedback/wrangler.toml
   npx wrangler secret put TELEGRAM_CHAT_ID --config server-worker/feedback/wrangler.toml
   ```

   After the first command, paste the bot token from BotFather into the prompt and press Enter. After the second, enter the Telegram channel's numeric chat ID (including the leading `-`, if present) and press Enter. The prompts hide the values; do not put them directly in commands or commit them to the repository.
3. Set the GitHub Actions repository variable `NEXT_PUBLIC_FEEDBACK_URL` to the deployed Worker URL and rebuild the site. For local builds, set it in `.env.local`.
4. Update `ALLOWED_ORIGINS` in the Worker configuration when using other site origins; use comma-separated origins without trailing slashes. For local development on port 3333, use `ALLOWED_ORIGINS = "https://kirtan.site,http://localhost:3333"`; the port must match the local site's port. The rate-limit namespace must be unique within the Cloudflare account. After changing the configuration, redeploy:

   ```sh
   npx wrangler deploy --config server-worker/feedback/wrangler.toml
   ```

The Worker applies an approximate per-IP rate limit per Cloudflare location; CORS is not authentication and does not prevent non-browser clients from submitting requests. If photo delivery fails after the text is sent, retrying may send the text again.