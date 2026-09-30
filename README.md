# Club72 Gym website

Static website for Club72 Gym, Sector 72, Mohali. Plain HTML, CSS and JavaScript with no build step and no dependencies.

## Pages

| URL | File |
| --- | --- |
| `/` | `index.html` (responsive, with motion) |
| `/services` | `services.html` |
| `/pool` | `pool.html` |
| `/mmaacademy` | `mmaacademy.html` |
| `/membership` | `membership.html` (new enquiry page) |
| `/about` | `about.html` |
| `/contact` | `contact.html` |

`vercel.json` turns on clean URLs, so `/pool` serves `pool.html`. This keeps the existing club72gym.com routes working.

## Put it on GitHub

1. Create a new empty repository on github.com (for example `club72-website`).
2. Unzip this folder, then from inside it run:

```bash
git init
git add .
git commit -m "Club72 website"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/club72-website.git
git push -u origin main
```

(Or use GitHub's "uploading an existing file" link and drag in everything inside this folder.)

## Deploy on Vercel

1. Go to vercel.com, click **Add New… > Project** and import the GitHub repository.
2. Framework preset: **Other**. Leave the build command and output directory empty (root `./`).
3. Click **Deploy**. Every push to `main` redeploys automatically.
4. To use club72gym.com: Project > Settings > Domains > add the domain and follow the DNS steps.

## Before going live

- **Forms do not send anywhere yet.** The call-back, pool booking, MMA, membership and contact forms validate input and show a thank-you message, but they need to be connected to your CRM, email service or a form backend (for example Formspree, Web3Forms or a Vercel serverless function). Look for the `submit:` function in each page's script.
- Replace the photos in `/images` with the original high-resolution files (keep the same file names).
- Replace the typographic wordmark with the official Club72 logo files.
- Everything marked "To confirm" on the pages (prices, the biggest-gym claim, pool days, WhatsApp number, MMA coaches and timetable) needs owner sign-off.
- Only the homepage is fully responsive right now. The other pages use a fixed 1440px desktop layout and show zoomed out on phones.
- Blog, Gym policies and Privacy policy links are placeholders (`#`).

## How it works

Each page keeps its markup in a `<template id="tpl">`. The small runtime in `assets/dc-lite.js` fills in `{{values}}`, handles `<sc-if>` and `<sc-for>` blocks and wires up the form and button handlers from the page's `Component` class.
