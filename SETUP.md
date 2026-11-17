# Setup guide

Prefer a friendlier version with no commands? Use **Install-Guide.pdf** in this folder. It covers the same steps using only your web browser.

You will end up with your own private copy running at an address like
`https://digital-business-card.YOUR-NAME.workers.dev`. Plan on about 30 minutes. You do not need to write code.

## What you need

- A **GitHub** account (free): https://github.com
- A **Cloudflare** account (free): https://dash.cloudflare.com/sign-up
- **Git** installed on your computer (Windows: open PowerShell and run `winget install --id Git.Git -e`;
  Mac: install Xcode command line tools when prompted by `git --version`).
- Optional: **Python 3** if you want to use `scripts/push.py`.

## Step 1: Put this folder in your own private GitHub repository

1. On GitHub, click **New repository**. Name it (for example `my-digital-card`) and choose **Private**.
   Do not add a README or other files.
2. Open a terminal (PowerShell on Windows) in this folder and run the commands GitHub shows you, which look like:

   ```
   git init
   git add -A
   git commit -m "Initial setup"
   git branch -M main
   git remote add origin https://github.com/YOUR-USER/my-digital-card.git
   git push -u origin main
   ```

## Step 2: Connect Cloudflare to the repository

1. In Cloudflare, go to **Workers & Pages** > **Create** > **Import a repository** (Workers Builds) and choose
   your GitHub repository. Authorize Cloudflare to read it if asked.
2. Use these settings:
   - **Project / Worker name:** `digital-business-card`. It must match `"name"` in `wrangler.jsonc`.
     If you want a different name, change it in both places.
   - **Build command:** `npm run build`
   - **Deploy command:** `npx wrangler deploy`
   - Leave Path, Variable name and Variable value **blank**.
3. Click **Save and Deploy**. The first deploy also creates your private storage (a KV namespace called `CARDS`).

   If the build log says it could not create the storage, do it by hand: **Storage & Databases** > **KV** >
   **Create**, name it `CARDS`, copy its ID, add `"id": "THE-ID"` inside the `kv_namespaces` entry in `wrangler.jsonc`
   (so it reads `{ "binding": "CARDS", "id": "THE-ID" }`), then commit and push.

## Step 3: Set your two secrets

The editor needs a password and a signing key. Set them in Cloudflare, **never** in a file in the repository.

1. Create two random values. Windows PowerShell:

   ```
   -join ((48..57)+(65..90)+(97..122) | Get-Random -Count 40 | % {[char]$_})
   ```

   Mac or Linux: `openssl rand -base64 32`. Run it twice. Use one result as your passcode and one as the signing key.
2. In Cloudflare open your Worker > **Settings** > **Variables and Secrets** > **Add**:
   - `ADMIN_PASSCODE` = the first value
   - `SESSION_SECRET` = the second value
   - For both, choose Type **Secret** (not "Text"). Plain-text variables set in the dashboard can be wiped on every deploy.
3. Save the passcode in your password manager. Click **Deploy** (or push any change) so the Worker picks them up.

## Step 4: Sign in and make the cards yours

1. Open `https://digital-business-card.YOUR-SUBDOMAIN.workers.dev/admin/` and sign in with your passcode.
   (Your address is shown on the Worker's overview page.)
2. Two sample cards, **Work** and **Personal**, are there. Edit them, make more with **+ New**, or delete the samples.
3. For each card: name, title, phones, emails, links, photo, logo, banner and colors. Each phone, email and link has
   **On card** and **In contact file** switches, so you can show something on the page but keep it out of the saved contact.
4. Add sections (credentials, projects, skills and so on) with **+ Add section**. Drag the grip handle to reorder anything.
5. In **Basics**, tick **Make this my default card** to choose the card the phone app opens on.
6. Click **Save**. Your card is at `/c/<card name>`, for example `/c/work`.

## Step 5: Put your QR code on your phone

- **Android (Chrome):** open `https://YOUR-ADDRESS/app/`, tap the menu, then **Install app** (or **Add to Home screen**).
  Pick a card from the dropdown to show its QR code.
- **iPhone (Safari):** open the same address, tap Share, then **Add to Home Screen**.
- Anyone can scan the main QR with a normal camera. The **Contact-only QR** adds your contact directly, with no web page.

## Sharing options

- **Phone app:** Share link, Copy link, Share QR image and Save QR image buttons.
- **Editor, Share tab:** QR download as SVG or PNG, the contact-only QR, an email snippet, and **tracked links**.
  Type a label such as `resume` or `linkedin` to get a link and QR code for that place. A QR code made this way
  opens `/c/<card>?src=<label>`, and the Activity tab counts each label separately.
- **Editor, Edit tab, Privacy & access:** untick *Show this card in the phone app's list* for private cards,
  turn on a **secret link** (a long random code added to the link), or set an **expiry date**.
- **Editor, Edit tab, Contact exchange:** an optional form on the card where visitors send you their name and email.
  Entries are kept in your Cloudflare storage for 180 days and appear on the Activity tab (delete or export as CSV).
- **Editor, Activity tab:** views, saved contacts and sources for the last 30 days. Your own visits and
  link-preview bots are not counted, and no IP addresses are stored. Counts are approximate.
- **NFC sticker:** write a tracked link (label `nfc`) to a blank NTAG213 sticker with a free app such as NFC Tools.

Note: the list the phone app reads (`/api/public`) can be opened by anyone who knows your address. Cards that are
unlisted, have a secret link or have expired are left out of it.

## Updating later

Edit your cards any time in `/admin/`. Those changes are instant and need no deploy. To change the code or this
folder, edit the files, then commit and push (or run `python scripts/push.py`). Cloudflare redeploys automatically.

## Keeping your information private

Where your information lives:

| What | Where it lives |
| --- | --- |
| Name, phone, email, links, bio, photos, logos, attachments | **Your** Cloudflare storage (KV). Never in GitHub. |
| Editor passcode and signing key | Cloudflare **Secrets** in your account only |
| The code and the made-up sample cards | Your GitHub repository (no personal data) |

Rules that keep it that way:

1. **Never** type your passcode or signing key into `wrangler.jsonc`, any file, or a commit. A secret that reaches git
   history must be replaced with a new one.
2. Keep `.dev.vars` (a local testing file) out of git. It is already in `.gitignore`.
3. Keep your GitHub repository **Private** unless you want the code public. Even if the code is public, your cards are not in it.
4. Anything you publish on a card is public to anyone with the link. Cards are marked "do not index" for search engines,
   but anyone you give the link or QR to can view it. Use the **On card** switches and **Hidden** visibility for anything
   you do not want shown. Fields switched off are never sent to the browser.
5. The `/admin/` page is protected by your passcode and blocks repeated wrong guesses, but use a long random passcode.

Sharing this project with someone else:

- Give them **this folder** (or a template repository made from it) and nothing else.
- Never give them your Cloudflare login, your Worker, your KV storage, your secrets, or your own repository.
- Each person follows this guide in **their own** accounts, so each person's cards and passcode stay separate.

## Troubleshooting

- **Build fails mentioning a binding or variable:** make sure `ADMIN_PASSCODE` and `SESSION_SECRET` are not listed
  in `wrangler.jsonc` and are set as type **Secret** in the dashboard.
- **"Unauthorized" or you cannot sign in:** re-enter the secrets in Step 3 and redeploy.
- **The page shows old content:** wait for the Cloudflare build to finish (Worker > **Deployments**), then refresh.
- **Phone app shows the old icon or layout:** remove the app and install it again.
- **Free limits:** Cloudflare's free plan allows 100,000 requests a day and 1,000 storage writes a day, far more than a
  business card needs.

## Feedback

The editor has a **Feedback** button that opens a GitHub issue on the template page. Issues are public, so do not
include your passcode, phone number or email.
