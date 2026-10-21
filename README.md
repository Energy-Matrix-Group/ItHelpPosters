# IT help posters

A page for making IT help posters and QR codes for EMG's meeting rooms. It uses the EMG Portal's brand (the same tokens, logo and artwork style as the launch site in `emg-portal-landingpage`).

Open `index.html` in a browser. It works straight from disk, or from any static host.

## The rooms

As Outlook's room list has them:

| Office | Room | In Outlook | Mailbox |
| --- | --- | --- | --- |
| Victoria | Boardroom | EMG VIC Boardroom | emg_vic_boardroom@energymatrix.com.au |
| Victoria | Meeting Room | EMG VIC Meeting Room | emg_vic_meeting_room@energymatrix.com.au |
| Victoria | Port Apartment (Melbourne) | Port Apartment (VIC) | portaprtmentvic@energymatrix.com.au |
| Western Australia | Boardroom | EMG WA Boardroom | EMG_WA_Boardroom@energymatrix.com.au |
| Western Australia | Meeting Room | EMG WA Meeting Room | EMG_WA_Meeting_Room@energymatrix.com.au |

Posters call a room by its short name ("Teams in the Boardroom") with its office on the tag ("VIC · Boardroom"). Tickets use its Outlook name ("EMG VIC Boardroom: camera not working"), so IT can tell the offices apart. The mailbox is kept for reference and is not put in the QR codes, which keeps them small enough to scan from 4 cm.

## What it makes

| Poster | Paper | What it says |
| --- | --- | --- |
| Teams calls | A4, A3 | Six fixes for a Teams call in the room: joining, sound and mic, camera, sharing, echo, and Windows blocking the mic or camera. |
| Sharing your screen | A4, A3 | Windows + P (Duplicate, Extend, Second screen only, PC screen only), sharing a window or a screen in Teams with two screens, and virtual desktops. |
| Raise a ticket here | A5, A4, A3 | One big QR code that opens a ticket with the room filled in. |
| Table tent | A4, folded | A QR code for each common problem. The top half prints upside down so both sides read upright once folded. |

Every poster carries the room's QR code. Pick the colour (charcoal, navy, or white to save ink), then **Print or save as PDF**. **Print the … posters** prints the room's three wall posters in one go, and **Print every room's posters** prints them for all five rooms (15 pages).

The **QR codes** section makes a single code for any room and problem, as SVG or PNG, with the link it carries.

## The room QR codes

A code opens Ticketing's New Ticket form through the portal:

```
https://portal.apps.energymatrix.com.au/handoff?app=ticketing&return=/tickets/new?subject=…&description=…&category=…&subcategory=…[&priority=…]
```

The portal signs the person in if they need it, checks they can use Ticketing, and hands them to the form. Going through the portal means the codes keep working whatever Ticketing's own address is.

| Field | Example | Notes |
| --- | --- | --- |
| `subject` | EMG VIC Boardroom: camera not working | The room's Outlook name. |
| `description` | Raised from the QR code in Port Apartment (VIC), Melbourne, Victoria. | |
| `category` | Facilities / AV | A category's name, not its id, because ids differ between databases. |
| `subcategory` | Conference room AV issue | A name within the category. Picking it fills the default team, as it does by hand. |
| `priority` | High | Left out when it is Medium, Ticketing's default. |

**Ticketing does not read these fields yet.** Until its New Ticket form fills itself in from them, a code opens an empty New Ticket form. To get codes that arrive filled in today, choose **Email to the service desk** under QR codes: the code then opens an email to `servicedesk@energymatrix.com.au` with the same details, and Ticketing turns the email into a ticket. Posters printed with Ticketing codes don't need reprinting once Ticketing reads the fields.

## Change something

- **A room's details** (name, where it is, what laptops plug into, the screen's input, the speakerphone and camera names, whether it has a Teams Rooms panel): edit `ITP.ROOMS` in `assets/js/config.js`. Every room starts with the same equipment (`KIT`); set a room's own values in its line. A change made under **Room details** on the page is kept only in that browser.
- **A new room or office:** add a line to `ITP.ROOMS` (and an office to `ITP.SITES`). The page, the posters and the checks pick it up.
- **A problem, its category or its subcategory:** edit `ITP.ISSUES` in `assets/js/config.js`. Use the names exactly as Ticketing lists them under Administration > Categories.
- **The portal or service desk address:** `ITP.PORTAL_URL` and `ITP.SERVICE_DESK` in `assets/js/config.js`.
- **A poster's words or layout:** `assets/js/art.js` (the designs) and `assets/css/posters.css`. Sizes are in `cqw`, a hundredth of the sheet's width, so one design prints at every paper size.

## What is where

```
index.html               the page
assets/css/site.css      brand tokens and shared parts, a copy of the launch site's
assets/css/studio.css    the page's own layout
assets/css/posters.css   the posters
assets/js/config.js      rooms, problems and addresses: the settings to edit
assets/js/brand.js       the logo, the mark, icons and the theme switch
assets/js/art.js         the poster designs, the QR codes and the ticket links
assets/js/studio.js      the page: picking, preview, printing, the QR maker
assets/vendor/qrcode.js  QR Code Generator by Kazuhiko Arase (MIT), version 1.4.4
assets/img/              the logo and favicon, copies of the platform's
tools/check.mjs          the checks
```

The scripts are classic scripts, not modules, so the page works when opened from disk.

## Check it

```powershell
cd tools
npm install
npm test        # script errors, sideways scroll, every poster fits its paper, every QR code reads back as its link
npm run pdf     # the same, and every poster for both rooms as PDF in tools/out/
```

The checks use Playwright's Chromium. If Playwright has no browser installed, run `npx playwright install chromium` once, or point `CHROMIUM_PATH` at a Chromium you already have.

## Deploy on DigitalOcean

Like the launch site: add a **Static Site** component with this repo, branch `main`, source directory `/` and no build command. The page sets `noindex`.
