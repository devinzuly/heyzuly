# Cloudflare setup — direct upload → local dev → Git

Your screenshot confirms **Direct Upload**: Cloudflare is serving 7 built files, not an Astro source repo.

```
404.html
favicon.svg
index.html
robots.txt
sitemap-0.xml
sitemap-index.xml
_astro/
```

That matches what we pulled into `dist/` locally.

---

## What this means

| You have on Cloudflare | You do **not** have on Cloudflare |
|---|---|
| Compiled HTML/CSS (the live site) | Original `.astro` source files |
| A Pages project + custom domain | A Git repository with history |

**Git "connected" with no repo yet** = Cloudflare is ready to link a repo, but nothing has been pushed. You need to create the repo first, then connect it.

---

## Path forward (recommended)

### 1. Work locally from `dist/` (today)

The deployed site is in:

```
C:\Users\1devi\Projects\heyzuly\dist\
```

Preview it:

```powershell
cd C:\Users\1devi\Projects\heyzuly\dist
npx --yes serve .
```

Open http://localhost:3000

For quick edits, change `dist/index.html` and `dist/_astro/*.css` directly. For real development, we'll rebuild an Astro project from this (next step).

### 2. Create a GitHub repo

1. Go to [https://github.com/new](https://github.com/new)
2. Name: `heyzuly`
3. Private or public — your choice
4. **Do not** add README/license (we already have files)
5. Create repo

Push local project:

```powershell
cd C:\Users\1devi\Projects\heyzuly
git add .
git commit -m "Import production site from Cloudflare direct upload"
git branch -M main
git remote add origin https://github.com/YOUR-USER/heyzuly.git
git push -u origin main
```

### 3. Connect Cloudflare Pages to GitHub

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → your heyzuly project
2. **Settings** → **Builds & deployments**
3. **Connect to Git** → choose the new `heyzuly` repo
4. Build settings (for now, static — no build step):

   | Setting | Value |
   |---|---|
   | Framework preset | None |
   | Build command | *(leave empty)* |
   | Build output directory | `dist` |

5. Save — future pushes to `main` auto-deploy

### 4. Deploy updates (two options)

**Option A — Git push (after step 3)**  
Edit files → commit → push → Cloudflare deploys automatically.

**Option B — Wrangler direct upload (keep using direct upload)**

```powershell
cd C:\Users\1devi\Projects\heyzuly
npm install -D wrangler
npx wrangler login
npx wrangler pages deploy dist --project-name=YOUR-PAGES-PROJECT-NAME
```

Replace `YOUR-PAGES-PROJECT-NAME` with the name shown in your Cloudflare dashboard.

---

## Wrangler login (one-time)

```powershell
npx wrangler login
npx wrangler whoami
npx wrangler pages project list
```

Paste the project name from `pages project list` into deploy commands.

---

## Why there's no "Download" in the dashboard

Direct Upload deployments show **Assets uploaded** but Cloudflare doesn't always expose a download button. The equivalent is fetching the live URLs — which is what `dist/` contains.

---

## Next development step

`dist/` is the **built** site. To edit comfortably (components, layouts, waitlist API), we should scaffold an **Astro project** and move this content into `src/`. Say when you want that and we'll do it in this repo.
