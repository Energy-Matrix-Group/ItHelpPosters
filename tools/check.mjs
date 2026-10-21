// Checks the page the way people use it, opened straight from disk: no script errors, no sideways scroll, every poster
// fits its paper with nothing cut off, and every QR code reads back as the link it should carry.
// `npm test`. `npm run pdf` also writes every poster, for both rooms, to tools/out/ as PDF.
// Uses Playwright's Chromium; set CHROMIUM_PATH to use another build.
import { chromium } from 'playwright';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join, resolve } from 'node:path';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PAGE = pathToFileURL(join(ROOT, 'index.html')).href;
const OUT = join(ROOT, 'tools/out');
const JSQR = createRequire(import.meta.url).resolve('jsqr/dist/jsQR.js');
const pdf = process.argv.includes('--pdf');

const problems = [];
const fail = (message) => { problems.push(message); console.log(`  FAIL ${message}`); };
const pass = (message) => console.log(`  ok   ${message}`);

const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  ...(proxy ? { proxy: { server: proxy } } : {}),
});

try {
  // ------------------------------------------------------------ the page at phone and desktop widths
  for (const width of [375, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text())) errors.push(m.text()); });
    await page.goto(PAGE);
    await page.waitForFunction(() => window.ITP && window.ITP.studio);
    if (errors.length) fail(`${width}px: script errors: ${errors.join('; ')}`);
    else pass(`${width}px: no script errors`);
    const sideways = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (sideways > 0) fail(`${width}px: the page scrolls sideways by ${sideways}px`);
    else pass(`${width}px: no sideways scroll`);
    await page.close();
  }

  // ------------------------------------------------------------ every poster, printed
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(PAGE);
  await page.waitForFunction(() => window.ITP && window.ITP.studio);
  await page.addScriptTag({ path: JSQR });
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ media: 'print' });

  const { posters, rooms } = await page.evaluate(() => ({
    posters: window.ITP.art.POSTERS.map((p) => ({ id: p.id, sizes: p.sizes })),
    rooms: window.ITP.ROOMS.map((r) => r.id),
  }));
  if (pdf) await mkdir(OUT, { recursive: true });

  for (const target of ['ticketing', 'email']) {
    for (const room of rooms) {
      for (const poster of posters) {
        for (const size of poster.sizes) {
          const name = `${poster.id}-${room}-${size}${target === 'email' ? '-email' : ''}`;
          const report = await page.evaluate(async ([id, roomId, sizeKey, tgt]) => {
            const ITP = window.ITP;
            const settings = JSON.parse(localStorage.getItem('emg-it-posters') || '{}');
            localStorage.setItem('emg-it-posters', JSON.stringify({ ...settings, target: tgt }));
            // The studio reads the target from its own state, so set it the way a person would.
            const radio = document.querySelector(`input[name="target"][value="${tgt}"]`);
            if (!radio.checked) { radio.checked = true; radio.dispatchEvent(new Event('change', { bubbles: true })); }
            await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
            ITP.studio.setPrint([[id, roomId, sizeKey]]);
            await document.fonts.ready;
            const sheet = document.querySelector('#print-root .sheet');
            const box = sheet.getBoundingClientRect();
            // Anything drawn outside the paper, except the mark that is meant to run off the edge.
            const outside = [...sheet.querySelectorAll('.art *')]
              .filter((el) => !el.closest('.p-deco') && !el.closest('svg') && el.getClientRects().length)
              .filter((el) => {
                const r = el.getBoundingClientRect();
                return r.bottom > box.bottom + 0.5 || r.right > box.right + 0.5 || r.left < box.left - 0.5 || r.top < box.top - 0.5;
              })
              .map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`);
            // Every QR code on the poster, read back.
            const room = { ...ITP.ROOMS.find((r) => r.id === roomId) };
            const expected = ITP.ISSUES.map((issue) => ITP.art.ticketLink(room, issue.id, { target: tgt, priority: 'Medium' }));
            const reads = [];
            for (const svg of sheet.querySelectorAll('svg.qr')) {
              const img = new Image();
              img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.outerHTML)}`;
              await img.decode();
              const canvas = document.createElement('canvas');
              canvas.width = canvas.height = 600;
              const g = canvas.getContext('2d');
              g.drawImage(img, 0, 0, 600, 600);
              const data = g.getImageData(0, 0, 600, 600);
              const code = window.jsQR(data.data, 600, 600);
              reads.push(code ? (expected.includes(code.data) ? 'ok' : `wrong: ${code.data.slice(0, 80)}`) : 'unreadable');
            }
            // The smallest code's printed width, in millimetres.
            const mm = box.width / parseFloat(getComputedStyle(sheet).getPropertyValue('--pw'));
            const qrWidths = [...sheet.querySelectorAll('svg.qr')].map((svg) => svg.getBoundingClientRect().width / mm);
            return { outside, reads, smallestQr: Math.min(...qrWidths) };
          }, [poster.id, room, size, target]);

          if (report.outside.length) fail(`${name}: drawn outside the paper: ${[...new Set(report.outside)].slice(0, 6).join(', ')}`);
          const bad = report.reads.filter((r) => r !== 'ok');
          if (!report.reads.length) fail(`${name}: no QR code`);
          else if (bad.length) fail(`${name}: QR codes ${bad.join('; ')}`);
          if (!report.outside.length && !bad.length && report.reads.length) pass(`${name}: fits, ${report.reads.length} QR code${report.reads.length > 1 ? 's' : ''} read back, smallest ${Math.round(report.smallestQr)} mm`);

          if (pdf && target === 'ticketing') {
            await page.pdf({ path: join(OUT, `${name}.pdf`), preferCSSPageSize: true, printBackground: true });
          }
        }
      }
    }
  }

  // ------------------------------------------------------------ the QR maker reads back as its link
  await page.emulateMedia({ media: 'screen' });
  const maker = await page.evaluate(async () => {
    const results = [];
    for (const issue of window.ITP.ISSUES) {
      const radio = document.querySelector(`input[name="qrIssue"][value="${issue.id}"]`);
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
      const svg = document.querySelector('#qr-out svg.qr');
      const link = document.getElementById('qr-link').textContent;
      const img = new Image();
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.outerHTML)}`;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 600;
      canvas.getContext('2d').drawImage(img, 0, 0, 600, 600);
      const code = window.jsQR(canvas.getContext('2d').getImageData(0, 0, 600, 600).data, 600, 600);
      results.push([issue.id, code && code.data === link, link.length]);
    }
    return results;
  });
  for (const [id, ok, length] of maker) (ok ? pass : fail)(`QR maker, ${id}: ${ok ? 'reads back as its link' : 'does not read back'} (${length} characters)`);

  // The link a room QR carries: the portal hand-off to New Ticket, with a return path the portal accepts.
  const link = await page.evaluate(() => {
    const ITP = window.ITP;
    const href = ITP.art.ticketLink(ITP.ROOMS[0], 'camera', { target: 'ticketing', priority: 'High' });
    const url = new URL(href);
    const back = url.searchParams.get('return');
    const form = new URL(back, 'https://ticketing.example');
    return {
      app: url.searchParams.get('app'),
      path: url.origin + url.pathname,
      back,
      safe: back.startsWith('/') && !back.startsWith('//') && !/[\u0000-\u001f\u007f\\]/.test(back) && back.length <= 2000,
      fields: Object.fromEntries(form.searchParams),
      form: form.pathname,
    };
  });
  const expect = (ok, message) => (ok ? pass : fail)(message);
  expect(link.path === 'https://portal.apps.energymatrix.com.au/handoff' && link.app === 'ticketing', 'Ticket links go through the portal hand-off to Ticketing');
  expect(link.safe, 'The return path passes the portal\'s safeReturn rules');
  expect(link.form === '/tickets/new', 'The return path opens New Ticket');
  expect(link.fields.subject === 'Board Room: camera not working' && link.fields.category === 'Facilities / AV' && link.fields.subcategory === 'Conference room AV issue' && link.fields.priority === 'High' && link.fields.description === 'Raised from the QR code in the Board Room.', 'New Ticket receives the subject, description, category, subcategory and priority');
  await page.close();
} finally {
  await browser.close();
}

console.log(problems.length ? `\n${problems.length} problem${problems.length > 1 ? 's' : ''}` : '\nAll checks passed');
if (pdf) console.log(`PDFs in ${OUT}`);
process.exit(problems.length ? 1 : 0);
