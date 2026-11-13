# Digital Business Cards

A free, self-hosted alternative to paid digital business card apps. You get, for each card (persona) you create:

- a web page people can open from a QR code or link,
- a **Save contact** button (works on Android and iPhone),
- a QR code that adds you straight to someone's contacts,
- a phone app (installable web app) that shows your QR code in one tap,
- an email snippet you can paste into a message or signature.

You edit everything yourself in a password-protected editor. No monthly fee: it runs on the free tiers of
Cloudflare and GitHub.

**Start here: [SETUP.md](SETUP.md)** (step-by-step, about 30 minutes, no coding).

## What is in this folder

| Path | What it is |
| --- | --- |
| `worker.js`, `functions/`, `lib/` | The server code |
| `public/` | The card page, the editor (`/admin/`) and the phone app (`/app/`) |
| `wrangler.jsonc` | Cloudflare settings (contains no personal information) |
| `scripts/push.py` | Optional helper that commits and pushes your changes |
| `SETUP.md` | Full setup and privacy guide |

## Your information stays yours

This folder contains only code and made-up sample cards ("Alex Example"). Your real name, phone, email, photos and
passcode are never stored in the code. They live in **your own** Cloudflare account. See "Keeping your information
private" in [SETUP.md](SETUP.md).

## License

MIT. See [LICENSE](LICENSE).
