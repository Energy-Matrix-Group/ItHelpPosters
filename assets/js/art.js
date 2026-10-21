// The posters, the QR codes and the ticket links they carry.
// Every design is HTML sized in cqw (a hundredth of the sheet's width), so one design previews at any width and prints
// at A5, A4 or A3. Posters keep their own colours in both page themes, because they are printed.
(function () {
  'use strict';
  const ITP = window.ITP;
  const { logoSVG, markSVG, icon } = ITP.brand;

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Paper sizes, in millimetres.
  const SIZES = {
    a5: { w: 148, h: 210, label: 'A5' },
    a4: { w: 210, h: 297, label: 'A4' },
    a3: { w: 297, h: 420, label: 'A3' },
    a4l: { w: 297, h: 210, label: 'A4, folded' },
  };
  const THEMES = { dark: 'Charcoal', navy: 'Navy', paper: 'White' };

  // ---------------------------------------------------------------- ticket links

  const issue = (id) => ITP.ISSUES.find((entry) => entry.id === id) || ITP.ISSUES[0];

  // What a room's QR code fills in on Ticketing's New Ticket form.
  function ticketFields(room, issueId, priority = 'Medium') {
    const problem = issue(issueId);
    return {
      subject: problem.subject.replace(/\{room\}/g, room.name),
      description: `Raised from the QR code in the ${room.where ? `${room.name} (${room.where})` : room.name}.`,
      category: problem.category,
      subcategory: problem.subcategory,
      priority,
    };
  }

  // target 'ticketing': the portal signs the person in and opens New Ticket with the fields in the address.
  // target 'email': a new email to the service desk, which Ticketing turns into a ticket.
  function ticketLink(room, issueId, { target = 'ticketing', priority = 'Medium' } = {}) {
    const fields = ticketFields(room, issueId, priority);
    if (target === 'email') {
      const body = `${fields.description}\nCategory: ${fields.category}\nSubcategory: ${fields.subcategory}\nPriority: ${fields.priority}\n\nWhat happened:\n`;
      return `mailto:${ITP.SERVICE_DESK}?subject=${encodeURIComponent(fields.subject)}&body=${encodeURIComponent(body)}`;
    }
    const query = new URLSearchParams({ subject: fields.subject, description: fields.description, category: fields.category, subcategory: fields.subcategory });
    if (fields.priority !== 'Medium') query.set('priority', fields.priority);
    return `${ITP.PORTAL_URL}/handoff?app=${encodeURIComponent(ITP.TICKETING_APP)}&return=${encodeURIComponent(`/tickets/new?${query}`)}`;
  }

  // ---------------------------------------------------------------- QR codes

  // Level M recovers from about 15% damage, enough for a scuffed poster. The quiet zone is the standard four modules.
  const QUIET = 4;
  function qrMatrix(text) {
    window.qrcode.stringToBytes = window.qrcode.stringToBytesFuncs['UTF-8'];
    const code = window.qrcode(0, 'M');
    code.addData(text);
    code.make();
    return code;
  }

  function qrSVG(text, label = 'QR code') {
    const code = qrMatrix(text);
    const n = code.getModuleCount();
    let d = '';
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (!code.isDark(y, x)) continue;
        let run = 1;
        while (x + run < n && code.isDark(y, x + run)) run++;
        d += `M${x + QUIET} ${y + QUIET}h${run}v1h-${run}z`;
        x += run - 1;
      }
    }
    const size = n + QUIET * 2;
    return `<svg xmlns="http://www.w3.org/2000/svg" class="qr" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" role="img" aria-label="${esc(label)}"><rect width="${size}" height="${size}" fill="#FFFFFF"/><path d="${d}" fill="#2B3340"/></svg>`;
  }

  // How dense a code is, and the smallest it prints well: about half a millimetre a module, quiet zone included.
  function qrInfo(text) {
    const code = qrMatrix(text);
    const n = code.getModuleCount();
    return { modules: n, version: (n - 17) / 4, minMm: Math.ceil(((n + QUIET * 2) * 0.5) / 5) * 5, code };
  }

  // ---------------------------------------------------------------- shared pieces

  const WIN = '<svg class="p-win" viewBox="0 0 10 10" aria-hidden="true"><path d="M0 0h4.6v4.6H0zM5.4 0H10v4.6H5.4zM0 5.4h4.6V10H0zM5.4 5.4H10V10H5.4z"/></svg>';
  const kbd = (key) => `<kbd class="p-kbd">${key}</kbd>`;
  const keys = (...list) => `<span class="p-combo">${list.map(kbd).join('<span class="p-plus">+</span>')}</span>`;

  const head = (room) => `<header class="p-head">${logoSVG('p-logo')}<p class="p-room"><i class="p-dia"></i>${esc(room.name)}</p></header>`;

  // The strip along the bottom: the room's QR code for this problem, and what to do with it.
  function helpBand(room, issueId, ctx, title, text) {
    const link = ticketLink(room, issueId, ctx);
    const how = ctx.target === 'email'
      ? 'Scan to email the service desk with this room filled in.'
      : 'Scan to raise a ticket with this room filled in.';
    const alt = ctx.target === 'email' ? `Or raise a ticket in the EMG Portal.` : `No phone? Email <b>${esc(ITP.SERVICE_DESK)}</b>`;
    return `<footer class="p-band">
      <div class="p-qr">${qrSVG(link, `QR code: raise a ticket for the ${room.name}`)}</div>
      <div class="p-band__text">
        <p class="p-band__h">${title}</p>
        ${text ? `<p>${text}</p>` : ''}
        <p>${how}</p>
        <p class="p-band__alt">${alt}</p>
      </div>
    </footer>`;
  }

  // ---------------------------------------------------------------- 1. Teams calls

  function teams(room, ctx) {
    const speaker = `<b>${esc(room.speaker)}</b>`;
    const camera = `<b>${esc(room.camera)}</b>`;
    const join = room.teamsRoom
      ? `Tap <b>Join</b> on the touch panel. Anyone also joining on a laptop picks <b>Don't use audio</b>.`
      : `Plug in ${esc(room.connect)}, then join the meeting in Teams. On the join screen, choose ${speaker} for audio.`;
    const tiles = [
      ['join', 'Join from the room', join],
      ['mic', "No sound, or they can't hear you", `Unmute in Teams and on the speakerphone. Select the arrow beside <b>Mic</b> and choose ${speaker}.`],
      ['camera', 'Camera off or black', `Select the arrow beside <b>Camera</b> and choose ${camera}. Open the privacy shutter, and close other apps using it.`],
      ['share', 'Share your screen', `Select <b>Share</b>, then a window or a screen. Turn on <b>Include sound</b> to play a video. <b>Stop sharing</b> when you're done.`],
      ['echo', 'Echo or a squeal', `Only one device in the room joins with audio. Everyone else picks <b>Don't use audio</b> on the join screen.`],
      ['shield', 'Windows blocking the mic or camera', `In <span class="p-path">Settings › Privacy &amp; security</span>, turn on access under <b>Microphone</b> and <b>Camera</b>, then rejoin.`],
    ];
    return `<div class="art art--teams">
      ${head(room)}
      <div class="p-title">
        <p class="p-kicker">Teams in the ${esc(room.name)}</p>
        <h2 class="p-say">Call not <span class="p-hl">working?</span></h2>
      </div>
      <ol class="p-tiles">${tiles.map(([ic, title, text]) => `<li class="p-tile">
        <div class="p-tile__top">${icon(ic)}<h3>${title}</h3></div>
        <p>${text}</p></li>`).join('')}</ol>
      ${helpBand(room, 'teams', ctx, 'Still stuck?', '')}
    </div>`;
  }

  // ---------------------------------------------------------------- 2. Sharing your screen

  // A screen's picture: 'a' is your laptop's own desktop, 'b' a second desktop, 'off' a dark screen.
  function picture(x, y, w, h, kind) {
    if (kind === 'off') return `<rect class="s-off" x="${x}" y="${y}" width="${w}" height="${h}"/>`;
    const lines = [0.24, 0.42, 0.6].map((f) => `M${x + w * 0.5} ${y + h * f}h${w * 0.38}`).join('');
    return `<rect class="s-bg" x="${x}" y="${y}" width="${w}" height="${h}"/>
      <rect class="s-${kind}" x="${x + w * 0.08}" y="${y + h * 0.16}" width="${w * 0.34}" height="${h * 0.52}"/>
      <path class="s-line" d="${lines}"/>`;
  }

  // The room screen on the left and a laptop on the right.
  function displays(tv, laptop, extra = '') {
    return `<svg class="p-diag" viewBox="0 0 124 60" aria-hidden="true">
      <rect class="fr" x="2" y="2" width="78" height="46"/>${picture(5, 5, 72, 40, tv)}
      <path class="fr" d="M41 48v6M31 54h20"/>
      <rect class="fr" x="90" y="28" width="32" height="20"/>${picture(92, 30, 28, 16, laptop)}
      <path class="fr" d="M86 52h40"/>${extra}</svg>`;
  }

  const MODES = [
    ['Duplicate', ['a', 'a'], 'The room screen shows exactly what your laptop shows.', true],
    ['Extend', ['b', 'a'], 'The room screen is a second desktop. Drag windows across.'],
    ['Second screen only', ['a', 'off'], 'Everything on the room screen. Your laptop goes dark.'],
    ['PC screen only', ['off', 'a'], 'Nothing on the room screen. Use it to stop showing.'],
  ];

  function sharing(room, ctx) {
    const modes = MODES.map(([name, [tv, laptop], text, pick]) => `<figure class="p-mode${pick ? ' is-pick' : ''}">
      ${displays(tv, laptop)}${pick ? '<span class="p-tag">Start here</span>' : ''}
      <figcaption><b>${name}</b><span>${text}</span></figcaption></figure>`).join('');
    // A window shared on the room screen, and a whole room screen shared. The coral outline is what people see.
    const oneWindow = displays('b', 'a', '<rect class="s-shared" x="9" y="9" width="44" height="30"/><rect class="s-win" x="10" y="10" width="42" height="28"/><path class="s-line" d="M15 18h30M15 24h30M15 30h20"/>');
    const wholeScreen = displays('b', 'a', '<rect class="s-shared" x="3.5" y="3.5" width="75" height="43"/>');
    return `<div class="art art--sharing">
      ${head(room)}
      <div class="p-title">
        <p class="p-kicker">Sharing in the ${esc(room.name)}</p>
        <h2 class="p-say p-say--keys">${keys(WIN, 'P')}<span class="p-say__rest">chooses what the <span class="p-hl">room screen</span> shows</span></h2>
      </div>
      <div class="p-modes">${modes}</div>
      <section class="p-sec">
        <h3 class="p-h3">Sharing in Teams with two screens</h3>
        <div class="p-share">
          <figure>${oneWindow}<figcaption><b>Share a window</b>People see only that window, on either screen. Best with Extend: keep Teams on your laptop.</figcaption></figure>
          <figure>${wholeScreen}<figcaption><b>Share a screen</b>People see all of it, pop-ups too. Teams asks which screen and puts a border around it.</figcaption></figure>
        </div>
      </section>
      <section class="p-sec p-desks">
        <div>
          <h3 class="p-h3">More than one desktop?</h3>
          <p>${keys(WIN, 'Tab')} shows them. ${keys(WIN, 'Ctrl', 'D')} makes a clean one to present from. Sharing a screen shows whichever desktop is on it, so switching desktops switches what people see.</p>
        </div>
        <ul class="p-keys">
          <li>${keys(WIN, 'Shift', '← →')}<span>Move a window to the other screen</span></li>
          <li>${keys(WIN, 'Ctrl', '← →')}<span>Switch to the next desktop</span></li>
        </ul>
      </section>
      ${helpBand(room, 'display', ctx, 'Nothing on the screen?', `Check the cable is in, press ${keys(WIN, 'P')} and choose <b>Duplicate</b>${room.input ? `. Set the screen's input to <b>${esc(room.input)}</b>` : ''}.`)}
    </div>`;
  }

  // ---------------------------------------------------------------- 3. Raise a ticket here

  function ticket(room, ctx) {
    const fields = ticketFields(room, 'general', ctx.priority);
    const link = ticketLink(room, 'general', ctx);
    const email = ctx.target === 'email';
    return `<div class="art art--ticket">
      <div class="p-deco">${markSVG({ lit: [2] })}</div>
      ${head(room)}
      <div class="p-title">
        <span class="p-badge">${icon('ticketing')}</span>
        <h2 class="p-say">Something not working in the <span class="p-hl">${esc(room.name)}</span>?</h2>
        <p class="p-lede">${email
          ? 'Scan with your phone\'s camera to email the service desk. The room is filled in: add what happened and send. Your email becomes a ticket.'
          : 'Scan with your phone\'s camera to raise a ticket. Ticketing opens with this room filled in: add what happened and select <b>Create Ticket</b>.'}</p>
      </div>
      <div class="p-scan">
        <div class="p-qr p-qr--big">${qrSVG(link, `QR code: raise a ticket for the ${room.name}`)}</div>
        <dl class="p-filled">
          <dt>Filled in for you</dt>
          <dd><span>Subject</span>${esc(fields.subject)}</dd>
          <dd><span>Category</span>${esc(fields.category)}</dd>
          <dd><span>Subcategory</span>${esc(fields.subcategory)}</dd>
        </dl>
      </div>
      <p class="p-foot">${email ? 'No phone? Raise a ticket in the EMG Portal, under Ticketing.' : `No phone? Email <b>${esc(ITP.SERVICE_DESK)}</b>, and your email becomes a ticket.`}</p>
    </div>`;
  }

  // ---------------------------------------------------------------- 4. Table tent

  const TENT_ISSUES = ['display', 'audio', 'camera', 'other'];

  function tent(room, ctx) {
    const codes = TENT_ISSUES.map((id) => `<li><div class="p-qr">${qrSVG(ticketLink(room, id, ctx), `QR code: ${issue(id).label}`)}</div><span>${esc(issue(id).short)}</span></li>`).join('');
    // Folded along the middle it stands like a tent, so the top half is printed upside down and both sides read upright.
    const face = (flipped) => `<div class="tent-face${flipped ? ' is-flipped' : ''}">
      <div class="tent-id">
        ${logoSVG('p-logo')}
        <p class="p-kicker">${esc(room.name)}</p>
        <h2 class="p-say">Something<br>not <span class="p-hl">working?</span></h2>
        <p class="p-lede">Scan the problem. ${ctx.target === 'email' ? 'An email to the service desk' : 'A ticket'} opens with it filled in.</p>
      </div>
      <ul class="tent-codes">${codes}</ul>
    </div>`;
    return `<div class="art art--tent">${face(true)}<div class="tent-fold"><span>Fold here</span></div>${face(false)}</div>`;
  }

  // ---------------------------------------------------------------- the list

  const POSTERS = [
    { id: 'teams', title: 'Teams calls', blurb: 'Six fixes: joining, sound and mic, camera, sharing, echo, Windows privacy.', sizes: ['a4', 'a3'], theme: 'dark', draw: teams, where: 'Beside the room screen, at eye level.' },
    { id: 'sharing', title: 'Sharing your screen', blurb: 'Windows + P: duplicate or extend, sharing with two screens, and desktops.', sizes: ['a4', 'a3'], theme: 'paper', draw: sharing, where: 'By the cable on the table, or next to the screen.' },
    { id: 'ticket', title: 'Raise a ticket here', blurb: 'One big QR code that opens a ticket with the room filled in.', sizes: ['a5', 'a4', 'a3'], theme: 'navy', draw: ticket, where: 'By the door, where people see it on the way in.' },
    { id: 'tent', title: 'Table tent', blurb: 'A QR code for each common problem. Print on A4 and fold.', sizes: ['a4l'], theme: 'paper', draw: tent, where: 'In the middle of the table.' },
  ];

  // One poster as a sheet. ctx: { size, theme ('auto' for the poster's own), target, priority }.
  function sheet(posterId, room, ctx) {
    const poster = POSTERS.find((entry) => entry.id === posterId) || POSTERS[0];
    const size = SIZES[poster.sizes.includes(ctx.size) ? ctx.size : poster.sizes[0]];
    const theme = THEMES[ctx.theme] ? ctx.theme : poster.theme;
    return `<article class="sheet t-${theme} sheet--${poster.id}" style="--ratio:${size.w} / ${size.h};--pw:${size.w}mm;--ph:${size.h}mm" aria-label="${esc(`${poster.title} poster for the ${room.name}`)}">${poster.draw(room, ctx)}</article>`;
  }

  ITP.art = { SIZES, THEMES, POSTERS, TENT_ISSUES, esc, issue, ticketFields, ticketLink, qrSVG, qrInfo, sheet };
})();
