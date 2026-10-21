// The page: the poster studio, the QR code maker and printing. What a person picks is kept in this browser.
(function () {
  'use strict';
  const ITP = window.ITP;
  const { logoSVG, icon, fillIcons, themeToggle, copyFrom } = ITP.brand;
  const A = ITP.art;
  const { esc } = A;
  const $ = (id) => document.getElementById(id);

  // ---------------------------------------------------------------- settings

  const KEY = 'emg-it-posters';
  // The room details a person can change on the page: [key, label, hint].
  const ROOM_FIELDS = [
    ['name', 'Name', 'As it reads on the posters and tickets.'],
    ['where', 'Where it is', 'Goes on the ticket, such as "Level 2". Optional.'],
    ['connect', 'Laptops plug into', 'Finishes the sentence "Plug in …".'],
    ['input', "Screen's input", 'Such as HDMI 1. Leave it empty to drop that step.'],
    ['speaker', 'Speakerphone', 'As Teams lists it under the arrow beside Mic.'],
    ['camera', 'Camera', 'As Teams lists it under the arrow beside Camera.'],
  ];
  const TARGETS = [['ticketing', 'Ticketing form'], ['email', 'Email to the service desk']];
  const DEFAULTS = { room: ITP.ROOMS[0].id, poster: 'teams', size: 'a4', theme: 'auto', target: 'ticketing', priority: 'Medium', qrRoom: ITP.ROOMS[0].id, qrIssue: 'general', rooms: {} };
  const state = load();

  function load() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { saved = {}; }
    const s = { ...DEFAULTS, ...saved, rooms: { ...(saved.rooms || {}) } };
    const rooms = ITP.ROOMS.map((r) => r.id);
    if (!rooms.includes(s.room)) s.room = DEFAULTS.room;
    if (!rooms.includes(s.qrRoom)) s.qrRoom = DEFAULTS.qrRoom;
    if (!A.POSTERS.some((p) => p.id === s.poster)) s.poster = DEFAULTS.poster;
    if (!A.SIZES[s.size]) s.size = DEFAULTS.size;
    if (s.theme !== 'auto' && !A.THEMES[s.theme]) s.theme = 'auto';
    if (!TARGETS.some(([id]) => id === s.target)) s.target = DEFAULTS.target;
    if (!ITP.PRIORITIES.includes(s.priority)) s.priority = DEFAULTS.priority;
    if (!ITP.ISSUES.some((i) => i.id === s.qrIssue)) s.qrIssue = DEFAULTS.qrIssue;
    return s;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private window: the choices last this page */ }
  }

  const baseRoom = (id) => ITP.ROOMS.find((r) => r.id === id) || ITP.ROOMS[0];
  // A room as config.js has it, with this browser's changes on top.
  function room(id) {
    const base = baseRoom(id);
    const merged = { ...base, ...(state.rooms[base.id] || {}) };
    if (!String(merged.name).trim()) merged.name = base.name;
    return merged;
  }
  const poster = () => A.POSTERS.find((p) => p.id === state.poster);
  // The chosen paper when the poster comes in it, otherwise A4, otherwise the poster's own.
  const sizeFor = (p, size = state.size) => (p.sizes.includes(size) ? size : p.sizes.includes('a4') ? 'a4' : p.sizes[0]);
  const ctx = (extra = {}) => ({ size: sizeFor(poster()), theme: state.theme, target: state.target, priority: state.priority, ...extra });
  const slug = (text) => String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'room';

  // ---------------------------------------------------------------- controls

  const seg = (name, options, current) => options.map(([value, label]) => `<label><input type="radio" name="${name}" value="${esc(value)}"${value === current ? ' checked' : ''}><span>${label}</span></label>`).join('');

  function renderRoomPicks() {
    document.querySelectorAll('[data-rooms]').forEach((el) => {
      const name = el.dataset.rooms;
      el.innerHTML = seg(name, ITP.ROOMS.map((r) => [r.id, esc(room(r.id).name)]), state[name]);
    });
  }

  function renderPosterPick() {
    const r = room(state.room);
    $('poster-pick').innerHTML = A.POSTERS.map((p) => `<label class="pickcard">
      <input type="radio" name="poster" value="${p.id}"${p.id === state.poster ? ' checked' : ''}>
      <span class="pickcard__body">
        <span class="pickcard__thumb" aria-hidden="true">${A.sheet(p.id, r, ctx({ size: sizeFor(p, 'a4') }))}</span>
        <b>${p.title}</b><small>${p.blurb}</small>
      </span></label>`).join('');
  }

  function renderSizes() {
    const p = poster();
    $('size-pick').innerHTML = seg('size', p.sizes.map((s) => [s, A.SIZES[s].label]), sizeFor(p));
  }

  function renderThemes() {
    $('theme-pick').innerHTML = seg('theme', [['auto', 'Its own'], ...Object.entries(A.THEMES)], state.theme);
  }

  function renderRoomFields() {
    const r = room(state.room);
    const base = baseRoom(state.room);
    $('room-fields').innerHTML = ROOM_FIELDS.map(([key, label, hint]) => `<label class="field">
        <span class="label">${label}</span>
        <input class="input" data-room-field="${key}" value="${esc(r[key])}" placeholder="${esc(base[key])}" autocomplete="off">
        <small class="hint">${hint}</small></label>`).join('')
      + `<label class="check"><input type="checkbox" data-room-field="teamsRoom"${r.teamsRoom ? ' checked' : ''}><span>The room has a Teams Rooms touch panel that joins meetings</span></label>
        <button class="linkbtn" type="button" id="room-reset">Undo my changes to this room</button>`;
    markEdited();
  }

  function markEdited() {
    const edited = Boolean(state.rooms[state.room]);
    $('room-edit-hint').textContent = edited ? 'Changed in this browser' : '';
    const reset = $('room-reset');
    if (reset) reset.hidden = !edited;
  }

  function setRoomField(key, value) {
    const base = baseRoom(state.room);
    const edits = { ...(state.rooms[state.room] || {}) };
    if (value === base[key]) delete edits[key];
    else edits[key] = value;
    if (Object.keys(edits).length) state.rooms[state.room] = edits;
    else delete state.rooms[state.room];
    save();
    markEdited();
    later();
  }

  // ---------------------------------------------------------------- the preview and printing

  function renderStage() {
    const p = poster();
    const size = A.SIZES[sizeFor(p)];
    const r = room(state.room);
    const stage = $('stage');
    stage.style.setProperty('--ar', String(size.w / size.h));
    stage.innerHTML = A.sheet(p.id, r, ctx());
    $('stage-label').textContent = `${p.title} · ${r.name}`;
    $('stage-size').textContent = `${size.label} · ${size.w} × ${size.h} mm`;
  }

  // Puts sheets in the print area and sets the page to their paper: [[posterId, roomId, size], ...], all one size.
  function setPrint(list) {
    const size = A.SIZES[list[0][2]];
    $('page-size').textContent = `@page { size: ${size.w}mm ${size.h}mm; margin: 0; }`;
    $('print-root').innerHTML = list.map(([id, roomId, sizeKey]) => A.sheet(id, room(roomId), ctx({ size: sizeKey }))).join('');
  }
  // The print area always holds the poster on screen, so Ctrl+P prints it too.
  const syncPrint = () => setPrint([[state.poster, state.room, sizeFor(poster())]]);

  function printNow() {
    const go = () => window.print();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go, go);
    else go();
  }

  // The three wall posters for the room, on one paper: A3 when A3 is picked, otherwise A4.
  const SET = ['teams', 'sharing', 'ticket'];
  function printSet() {
    const size = state.size === 'a3' ? 'a3' : 'a4';
    setPrint(SET.map((id) => [id, state.room, size]));
    printNow();
  }

  function renderSetLabel() {
    $('print-set-label').textContent = `Print the ${room(state.room).name}'s 3 posters (${state.size === 'a3' ? 'A3' : 'A4'})`;
  }

  // ---------------------------------------------------------------- QR codes

  function renderIssues() {
    $('issue-pick').innerHTML = ITP.ISSUES.map((i) => `<label><input type="radio" name="qrIssue" value="${i.id}"${i.id === state.qrIssue ? ' checked' : ''}><span>${esc(i.label)}</span></label>`).join('');
  }
  function renderTargets() {
    $('target-pick').innerHTML = seg('target', TARGETS, state.target);
  }
  function renderPriorities() {
    $('priority-pick').innerHTML = ITP.PRIORITIES.map((p) => `<option${p === state.priority ? ' selected' : ''}>${p}</option>`).join('');
  }

  function current() {
    const r = room(state.qrRoom);
    const link = A.ticketLink(r, state.qrIssue, { target: state.target, priority: state.priority });
    return { r, link, file: `qr-${slug(r.name)}-${state.qrIssue}${state.target === 'email' ? '-email' : ''}` };
  }

  function renderQR() {
    const { r, link } = current();
    const problem = A.issue(state.qrIssue);
    const fields = A.ticketFields(r, problem.id, state.priority);
    const info = A.qrInfo(link);
    const email = state.target === 'email';
    const rows = [['Subject', fields.subject], ['Description', fields.description], ['Category', fields.category], ['Subcategory', fields.subcategory], ['Priority', fields.priority]];
    $('qr-out').innerHTML = `<div class="qrcard">
      <div class="qrcard__code">${A.qrSVG(link, `QR code: ${fields.subject}`)}</div>
      <div class="qrcard__info">
        <div>
          <p class="label">${esc(r.name)} · ${email ? 'email' : 'Ticketing'}</p>
          <h3 class="h3">${esc(problem.label)}</h3>
          <p class="spec">Version ${info.version}, ${info.modules} × ${info.modules} modules. Prints well from ${info.minMm / 10} cm wide.</p>
        </div>
        <div class="dl">
          <button type="button" data-qr="svg">${icon('download')}SVG</button>
          <button type="button" data-qr="png">${icon('download')}PNG</button>
          <button type="button" data-qr="copy">${icon('copy')}<span data-label>Copy link</span></button>
          <a href="${esc(link)}" target="_blank" rel="noopener">${icon('open')}Try it</a>
        </div>
        <dl class="filled">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
      </div>
      <div class="qrcard__link">
        <p class="label">The link in the code</p>
        <p class="linkbox" id="qr-link">${esc(link)}</p>
      </div>
    </div>
    ${email ? '' : '<p class="note"><span class="tbc">Ticketing</span> The form fills itself in once Ticketing reads these fields from the address. Until then the code opens an empty New Ticket form. <a href="#how">How the QR codes work</a></p>'}`;
  }

  function download(name, blob) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  // A PNG at 16 pixels a module: about 1300 pixels across, sharp at any print size.
  function pngOf(text, px = 16) {
    const { code, modules } = A.qrInfo(text);
    const quiet = 4;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = (modules + quiet * 2) * px;
    const g = canvas.getContext('2d');
    g.fillStyle = '#FFFFFF';
    g.fillRect(0, 0, canvas.width, canvas.height);
    g.fillStyle = '#2B3340';
    for (let y = 0; y < modules; y++) for (let x = 0; x < modules; x++) if (code.isDark(y, x)) g.fillRect((x + quiet) * px, (y + quiet) * px, px, px);
    return new Promise((done) => canvas.toBlob(done, 'image/png'));
  }

  $('qr-out').addEventListener('click', async (event) => {
    const button = event.target.closest('[data-qr]');
    if (!button) return;
    const { link, file } = current();
    if (button.dataset.qr === 'svg') download(`${file}.svg`, new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${A.qrSVG(link)}`], { type: 'image/svg+xml' }));
    if (button.dataset.qr === 'png') download(`${file}.png`, await pngOf(link));
    if (button.dataset.qr === 'copy') copyFrom(button, link, $('qr-link'));
  });

  // ---------------------------------------------------------------- the rest of the page

  function renderGuide() {
    $('guide-rows').innerHTML = A.POSTERS.map((p) => `<tr><td>${p.title}</td><td class="mono">${p.sizes.map((s) => A.SIZES[s].label).join(', ')}</td><td>${p.where}</td><td>${A.THEMES[p.theme]}</td></tr>`).join('');
  }

  // Three posters fanned out at the top of the page, for the first room.
  function renderFan() {
    const r = room(ITP.ROOMS[0].id);
    $('fan').innerHTML = ['sharing', 'ticket', 'teams'].map((id, i) => `<div class="fan__card fan__card--${i}">${A.sheet(id, r, { size: 'a4', theme: 'auto', target: state.target, priority: state.priority })}</div>`).join('');
  }

  // Typing in a room's details redraws once a frame, not once a key.
  let pending = 0;
  function later() {
    if (pending) return;
    pending = requestAnimationFrame(() => {
      pending = 0;
      renderRoomPicks();
      renderPosterPick();
      renderStage();
      renderSetLabel();
      syncPrint();
      renderQR();
      renderFan();
    });
  }

  document.addEventListener('change', (event) => {
    const t = event.target;
    if (t.name === 'room') {
      state.room = t.value;
      renderRoomFields();
      later();
    } else if (t.name === 'poster') {
      state.poster = t.value;
      renderSizes();
      renderStage();
      syncPrint();
    } else if (t.name === 'size') {
      state.size = t.value;
      renderStage();
      renderSetLabel();
      syncPrint();
    } else if (t.name === 'theme') {
      state.theme = t.value;
      renderPosterPick();
      renderStage();
      syncPrint();
    } else if (t.name === 'qrRoom' || t.name === 'qrIssue') {
      state[t.name] = t.value;
      renderQR();
    } else if (t.name === 'target' || t.id === 'priority-pick') {
      state[t.name === 'target' ? 'target' : 'priority'] = t.value;
      later();
    } else if (t.dataset.roomField === 'teamsRoom') {
      setRoomField('teamsRoom', t.checked);
    } else {
      return;
    }
    save();
  });

  document.addEventListener('input', (event) => {
    const key = event.target.dataset && event.target.dataset.roomField;
    if (key && key !== 'teamsRoom') setRoomField(key, event.target.value);
  });

  document.addEventListener('click', (event) => {
    if (event.target.closest('#room-reset')) {
      delete state.rooms[state.room];
      save();
      renderRoomFields();
      later();
    }
  });

  // tools/check.mjs fills the print area through this to check and render every poster.
  ITP.studio = { setPrint, syncPrint };

  $('print-one').addEventListener('click', () => { syncPrint(); printNow(); });
  $('print-set').addEventListener('click', printSet);
  window.addEventListener('afterprint', syncPrint);

  document.querySelectorAll('[data-logo]').forEach((el) => { el.innerHTML = logoSVG(); });
  themeToggle($('theme'));
  renderRoomPicks();
  renderPosterPick();
  renderSizes();
  renderThemes();
  renderRoomFields();
  renderStage();
  renderSetLabel();
  syncPrint();
  renderIssues();
  renderTargets();
  renderPriorities();
  renderQR();
  renderGuide();
  renderFan();
  fillIcons();
})();
