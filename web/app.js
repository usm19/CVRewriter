'use strict';
import { decomposePdf, registerFonts } from './engine/pdf-extract.js';
import { buildTemplateHtml, lineFits, guessOwnerName } from './engine/render.js';
import { buildProposals, applyProposals } from './engine/tailor.js';
import { createProfileKeys, unlockDek, encryptJson, decryptJson, sessionValid, SESSION_DAYS } from './crypto.js';

const JD_MAX = 28000;
const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

/* ---------- tiny IndexedDB ---------- */
const db = (() => {
  let handle;
  const open = () => handle ||= new Promise((res, rej) => {
    const rq = indexedDB.open('cvrewriter', 2);
    rq.onupgradeneeded = () => {
      const d = rq.result;
      if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');
      if (!d.objectStoreNames.contains('history')) d.createObjectStore('history', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('profiles')) d.createObjectStore('profiles', { keyPath: 'id' });
    };
    rq.onsuccess = () => res(rq.result);
    rq.onerror = () => rej(rq.error);
  });
  const tx = async (store, mode, fn) => {
    const d = await open();
    return new Promise((res, rej) => {
      const t = d.transaction(store, mode);
      const rq = fn(t.objectStore(store));
      t.oncomplete = () => res(rq ? rq.result : undefined);
      t.onerror = () => rej(t.error);
    });
  };
  return {
    get: (k) => tx('kv', 'readonly', (s) => s.get(k)),
    set: (k, v) => tx('kv', 'readwrite', (s) => s.put(v, k)),
    del: (k) => tx('kv', 'readwrite', (s) => s.delete(k)),
    histAll: () => tx('history', 'readonly', (s) => s.getAll()),
    histPut: (r) => tx('history', 'readwrite', (s) => s.put(r)),
    histDel: (id) => tx('history', 'readwrite', (s) => s.delete(id)),
    kvKeys: () => tx('kv', 'readonly', (s) => s.getAllKeys()),
    profAll: () => tx('profiles', 'readonly', (s) => s.getAll()),
    profPut: (p) => tx('profiles', 'readwrite', (s) => s.put(p)),
    profDel: (id) => tx('profiles', 'readwrite', (s) => s.delete(id)),
    wipe: async () => { (await open()).close(); handle = null; return new Promise((res) => { const rq = indexedDB.deleteDatabase('cvrewriter'); rq.onsuccess = rq.onerror = rq.onblocked = () => res(); }); },
  };
})();

/* ---------- state ---------- */
const S = { cv: null, template: null, history: [], user: null };
let current = null;   /* the open tailoring session */
let authSel = null;   /* profile selected on the unlock screen */

const b64b = (bytes) => btoa(String.fromCharCode(...bytes));
const unb64b = (str) => Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
const pk = (k) => `${S.user.id}:${k}`;
const saveEnc = async (k, obj) => db.set(pk(k), await encryptJson(S.user.dek, obj));
const loadEnc = async (k) => { const b = await db.get(pk(k)); return b ? decryptJson(S.user.dek, b) : null; };

const $ = (id) => document.getElementById(id);
const show = (el, on = true) => { el.hidden = !on; };

/* ---------- icons ---------- */
const SVG_NS = 'http://www.w3.org/2000/svg';
function mkIcon(name, cls = 'ic') {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', cls);
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', `#i-${name}`);
  svg.append(use);
  return svg;
}
function swapIcon(svgEl, name, { spin = false } = {}) {
  if (!svgEl) return;
  svgEl.querySelector('use').setAttribute('href', `#i-${name}`);
  svgEl.classList.toggle('ic-spin', spin);
  svgEl.classList.remove('ic-swap');
  void svgEl.getBoundingClientRect();
  if (!spin) svgEl.classList.add('ic-swap');
}

/* ---------- theme ---------- */
const THEMES = ['auto', 'light', 'dark'];
const THEME_ICON = { auto: 'monitor', light: 'sun', dark: 'moon' };
const THEME_LABEL = { auto: 'follow device', light: 'light', dark: 'dark' };
let theme = localStorage.getItem('cvr-theme') || 'auto';
function applyTheme(animate = false) {
  if (theme === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', theme);
  if (animate) swapIcon($('theme-ic'), THEME_ICON[theme]);
  else $('theme-ic').querySelector('use').setAttribute('href', `#i-${THEME_ICON[theme]}`);
  $('btn-theme').setAttribute('aria-label', `Theme: ${THEME_LABEL[theme]}`);
  const dark = theme === 'dark' || (theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', dark ? '#0d1414' : '#f4f6f6'));
}
$('btn-theme').onclick = () => {
  theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
  localStorage.setItem('cvr-theme', theme);
  applyTheme(true);
  toast(`Theme: ${THEME_LABEL[theme]}`);
};

/* ---------- toasts, status, errors ---------- */
let toastTimer;
function toast(msg) {
  const t = $('toast');
  t.replaceChildren(mkIcon('check', 'ic sm'), document.createTextNode(msg));
  show(t, false);
  void t.getBoundingClientRect();
  show(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => show(t, false), 3200);
}
function statusShow(id, msg) { const box = $(id); box.querySelector('.status-text').textContent = msg; show(box); }
function statusHide(id) { show($(id), false); }
function fieldError(id, msg) {
  const el = $(id);
  if (msg) {
    const span = document.createElement('span');
    span.textContent = msg;
    el.replaceChildren(mkIcon('alert', 'ic sm'), span);
  } else el.replaceChildren();
  show(el, !!msg);
}

/* ---------- previews ---------- */
const docFor = (html) => `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:#fff}*,*::before,*::after{box-sizing:border-box}</style></head><body>${html}</body></html>`;

function renderPreview(iframe, html) {
  iframe.classList.remove('ready');
  iframe.onload = () => {
    fitIframe(iframe);
    iframe.classList.add('ready');
    setTimeout(() => fitIframe(iframe), 250);
  };
  iframe.srcdoc = docFor(html);
}
function fitIframe(iframe) {
  const page = iframe.contentDocument?.querySelector('.page');
  if (!page || !iframe.clientWidth) return;
  const w = page.offsetWidth || 794, h = page.offsetHeight || 1123;
  const s = iframe.clientWidth / w;
  page.style.transformOrigin = 'top left';
  page.style.transform = `scale(${s})`;
  iframe.style.height = `${Math.ceil(h * s) + 2}px`;
}
addEventListener('resize', () => { fitIframe($('frame-template')); fitIframe($('frame-result')); });

/* ---------- printing ---------- */
const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function printCV(html, filename) {
  const f = document.createElement('iframe');
  f.style.cssText = 'position:absolute;left:-9999px;top:0;width:0;height:0;border:0';
  document.body.append(f);
  f.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(filename)}</title><style>@page{size:A4;margin:0}html,body{margin:0;padding:0}*,*::before,*::after{box-sizing:border-box}</style></head><body>${html}</body></html>`;
  f.onload = () => {
    const prev = document.title;
    document.title = filename;
    const done = () => { document.title = prev; setTimeout(() => f.remove(), 500); };
    f.contentWindow.addEventListener('afterprint', done, { once: true });
    setTimeout(done, 60000);
    f.contentWindow.focus();
    f.contentWindow.print();
  };
}

/* ---------- job listing fetch ---------- */
async function fetchWithTimeout(url, opts = {}, ms = 25000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ctl.signal }); }
  finally { clearTimeout(t); }
}
async function fetchJobText(jobUrl) {
  try {
    const r = await fetchWithTimeout(`https://r.jina.ai/${jobUrl}`, { headers: { Accept: 'text/plain' } });
    if (r.ok) {
      const text = (await r.text()).trim();
      if (text.length > 200) return text.slice(0, JD_MAX);
    }
  } catch { /* fall through */ }
  try {
    const r = await fetchWithTimeout(`https://api.allorigins.win/raw?url=${encodeURIComponent(jobUrl)}`);
    if (r.ok) {
      const doc = new DOMParser().parseFromString(await r.text(), 'text/html');
      doc.querySelectorAll('script,style,noscript,nav,footer,header').forEach((n) => n.remove());
      const text = (doc.body?.textContent || '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
      if (text.length > 200) return text.slice(0, JD_MAX);
    }
  } catch { /* fall through */ }
  return null;
}

/* ---------- step gating ---------- */
function setState(id, text, { done = false, chevron = false, collapsed = false } = {}) {
  const el = $(id);
  el.replaceChildren();
  if (done) el.append(mkIcon('check', 'ic sm'));
  if (text) el.append(document.createTextNode(text));
  if (chevron) {
    const c = mkIcon('chev', 'ic sm chev');
    c.style.cssText = `transition:transform .4s cubic-bezier(.16,1,.3,1);transform:rotate(${collapsed ? 0 : 180}deg)`;
    el.append(c);
  }
  el.classList.toggle('done', done);
}
function renderGates() {
  const tplDone = !!S.template?.approved;
  const glyph = $('cv-glyph');
  const want = tplDone ? 'check' : 'file';
  if (!glyph.querySelector('use').getAttribute('href').endsWith(want)) swapIcon(glyph, want);
  const cvCollapsed = tplDone && !$('step-cv').classList.contains('open');
  $('step-cv').classList.toggle('collapsed', cvCollapsed);
  $('step-cv').classList.toggle('done', tplDone);
  $('step-cv').classList.toggle('clickable-head', tplDone);
  setState('cv-state', tplDone ? 'Ready' : S.cv ? 'In progress' : 'To do',
    { done: tplDone, chevron: tplDone, collapsed: cvCollapsed });
  $('step-cv').querySelector('.step-head').onclick = () => {
    if (!S.template?.approved) return;
    $('step-cv').classList.toggle('open');
    renderGates();
  };
  $('step-tailor').classList.toggle('locked', !tplDone);
  setState('tailor-state', tplDone ? '' : 'Waiting');
  if (S.cv) {
    $('cv-chip').replaceChildren(mkIcon('file', 'ic sm'), document.createTextNode(S.cv.name));
    show($('cv-chip'));
  }
}

/* ---------- step 1: CV ---------- */
$('in-cv').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  e.target.value = '';
  if (file.size > 15 * 1024 * 1024) { fieldError('cv-error', 'That file is over 15 MB. Export a smaller PDF and try again.'); return; }
  fieldError('cv-error');
  show($('template-review'), false);
  statusShow('cv-status', 'Taking your CV apart: text, fonts, colours, background...');
  swapIcon($('upload-ic'), 'loader', { spin: true });
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const b64 = bufToB64(bytes);       /* before decompose: pdf.js takes the buffer */
    const model = await decomposePdf(bytes);
    model.approved = false;
    S.cv = { name: file.name, type: 'application/pdf', b64 };
    await saveEnc('cv', S.cv);
    await registerFonts(model.fonts);
    S.template = model;
    await saveEnc('template', model);
    show($('template-review'));
    renderPreview($('frame-template'), buildTemplateHtml(model));
    swapIcon($('upload-ic'), 'check');
    setTimeout(() => swapIcon($('upload-ic'), 'upload'), 1600);
    if (model.meta.pages > 1) toast('Only page one is used; CVRewriter makes one-page CVs.');
    $('template-review').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    swapIcon($('upload-ic'), 'upload');
    fieldError('cv-error', err.message === 'no-text'
      ? 'No selectable text was found in that PDF, so it is probably a scan or photo. Export the CV as a PDF from the program it was written in and try again.'
      : 'That PDF could not be read. Try re-exporting it and uploading again.');
    console.error(err);
  } finally {
    statusHide('cv-status');
    renderGates();
  }
});

function bufToB64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

$('btn-view-original').onclick = () => {
  const bytes = Uint8Array.from(atob(S.cv.b64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
};
$('btn-approve').onclick = async () => {
  S.template.approved = true;
  await saveEnc('template', S.template);
  show($('template-review'), false);
  renderGates();
  toast('Working copy saved. Paste a job link below.');
  $('step-tailor').scrollIntoView({ behavior: 'smooth', block: 'start' });
};
$('btn-recv').onclick = () => $('in-cv').click();

/* ---------- step 2: tailor ---------- */
$('btn-paste-toggle').onclick = () => show($('paste-wrap'), $('paste-wrap').hidden);

$('btn-tailor').onclick = async () => {
  const jobUrl = $('in-job').value.trim();
  const pasted = $('in-jobtext').value.trim();
  if (!jobUrl && pasted.length < 80) {
    fieldError('tailor-error', pasted ? 'That text looks too short to be a listing.' : 'Paste the listing link, or its text.');
    return;
  }
  fieldError('tailor-error');
  show($('result'), false);
  $('btn-tailor').disabled = true;
  swapIcon($('tailor-ic'), 'loader', { spin: true });
  try {
    let jd = pasted.length >= 80 ? pasted.slice(0, JD_MAX) : null;
    if (!jd) {
      statusShow('tailor-status', 'Fetching the listing...');
      jd = await fetchJobText(jobUrl);
      if (!jd) {
        show($('paste-wrap'));
        throw new Error('That page would not let CVRewriter read it (job boards often block robots). Copy the listing text and paste it instead.');
      }
    }
    statusShow('tailor-status', 'Matching the listing against your CV...');
    await new Promise((r) => setTimeout(r, 30));
    const { proposals, report, title, company } = buildProposals(S.template.lines, jd, jobUrl);
    current = {
      id: `${Date.now()}`, ts: Date.now(),
      title, company, proposals, report,
      ticked: new Set(proposals.filter((p) => !p.defaultOff).map((p) => p.id)),
    };
    renderResult();
    await persistCurrent();
    renderHistory();
  } catch (err) {
    fieldError('tailor-error', err.message);
  } finally {
    statusHide('tailor-status');
    swapIcon($('tailor-ic'), 'sparkles');
    $('btn-tailor').disabled = false;
  }
};

function currentHtml() {
  const texts = applyProposals(S.template.lines, current.proposals, current.ticked);
  const changed = new Set(S.template.lines.filter((l) => texts.get(l.id) !== l.text).map((l) => l.id));
  return { html: buildTemplateHtml(S.template, texts, changed), texts, changed };
}

const KIND_LABEL = { mirror: "Match the listing's wording", uk: 'UK English', plain: 'Plainer wording' };

function renderResult() {
  $('result-title').textContent = current.company ? `${current.title}, ${current.company}` : current.title;
  const r = current.report;
  const stat = (n, label, warn = false) => {
    const el = document.createElement('span');
    el.className = warn ? 'stat warn' : 'stat';
    const b = document.createElement('b'); b.textContent = n;
    const s = document.createElement('span'); s.textContent = label;
    el.append(b, s);
    return el;
  };
  $('result-stats').replaceChildren(
    stat(r.matched, 'asks your CV covers'),
    stat(r.mirrored, 'said in your words, aligned below'),
    ...(r.gaps.length ? [stat(r.gaps.length, 'for you to weigh up', true)] : []),
  );
  $('result-stats').classList.add('rise');

  const list = $('proposals');
  list.replaceChildren();
  const GROUP_ICON = { mirror: 'sparkles', uk: 'check', plain: 'file' };
  let lastKind = null, riseIdx = 0;
  const rise = (el) => {
    el.classList.add('rise');
    el.style.animationDelay = `${Math.min(riseIdx++ * 45, 500)}ms`;
  };
  for (const p of current.proposals) {
    if (p.kind !== lastKind) {
      const h = document.createElement('li');
      h.className = 'p-group';
      h.append(mkIcon(GROUP_ICON[p.kind], 'ic sm'), document.createTextNode(KIND_LABEL[p.kind]));
      rise(h);
      list.append(h);
      lastKind = p.kind;
    }
    const li = document.createElement('li');
    li.className = 'p-row';
    rise(li);
    const label = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = current.ticked.has(p.id);
    cb.onchange = async () => {
      cb.checked ? current.ticked.add(p.id) : current.ticked.delete(p.id);
      updatePreview();
      await persistCurrent();
    };
    const box = document.createElement('span');
    box.className = 'p-box';
    box.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10.5l4 4 8-8.5"/></svg>';
    const body = document.createElement('span');
    body.className = 'p-body';
    const change = document.createElement('span');
    change.className = 'p-change';
    const from = document.createElement('del');
    const m = new RegExp(p.findSrc, 'i').exec(p.before);
    from.textContent = m ? m[0] : p.findSrc;
    const arr = document.createElement('span');
    arr.className = 'arr';
    arr.textContent = '→';
    const to = document.createElement('ins');
    to.textContent = p.replace;
    change.append(from, ' ', arr, ' ', to);
    const why = document.createElement('span');
    why.className = 'p-why';
    why.textContent = p.why;
    const ctx = document.createElement('span');
    ctx.className = 'p-ctx';
    ctx.textContent = p.before.length > 90 ? p.before.slice(0, 90) + '…' : p.before;
    body.append(change, why, ctx);
    label.append(cb, box, body);
    li.append(label);
    list.append(li);
  }
  show($('no-proposals'), current.proposals.length === 0);

  const gaps = $('result-gaps');
  gaps.replaceChildren(...r.gaps.map((g) => { const li = document.createElement('li'); li.textContent = g; return li; }));
  show($('gaps-wrap'), r.gaps.length > 0);
  show($('ios-hint'), IS_IOS);
  updatePreview();
  show($('result'));
  $('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function updatePreview() {
  const { html, texts, changed } = currentHtml();
  renderPreview($('frame-result'), html);
  const tight = [...changed].map((id) => {
    const line = S.template.lines.find((l) => l.id === id);
    return { line, check: lineFits(S.template, line, texts.get(id)) };
  }).filter((x) => !x.check.fits);
  fieldError('tailor-error', tight.length
    ? `One change makes a line wider than the space it has ("${tight[0].line.text.slice(0, 40)}…"). Check the preview, or untick it.`
    : '');
}

async function persistCurrent() {
  const { html } = currentHtml();
  const rec = {
    id: current.id, ts: current.ts, title: current.title, company: current.company,
    html, report: current.report,
    proposals: current.proposals, ticked: [...current.ticked],
  };
  await db.histPut({ id: pk(rec.id), pid: S.user.id, blob: await encryptJson(S.user.dek, rec) });
  S.history = [rec, ...S.history.filter((h) => h.id !== current.id)];
}

const pdfName = () => {
  const who = guessOwnerName(S.template).trim().replace(/\s+/g, '-');
  const co = current?.company ? `-${current.company.trim().replace(/\s+/g, '-')}` : '';
  return `${who}${co}-CV`.replace(/[^\w-]/g, '');
};
$('btn-pdf').onclick = () => { if (current) printCV(currentHtml().html, pdfName()); };
$('btn-discard').onclick = async () => {
  if (current) { await db.histDel(pk(current.id)); S.history = S.history.filter((h) => h.id !== current.id); }
  current = null;
  show($('result'), false);
  renderHistory();
};

/* ---------- history ---------- */
function renderHistory() {
  const list = $('history-list');
  show($('step-history'), S.history.length > 0);
  list.replaceChildren(...S.history.map((r) => {
    const li = document.createElement('li');
    const job = document.createElement('div'); job.className = 'job';
    const meta = document.createElement('div');
    const b = document.createElement('b'); b.textContent = r.company ? `${r.title}, ${r.company}` : r.title;
    const s = document.createElement('span');
    s.textContent = new Date(r.ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    meta.append(b, s);
    job.append(mkIcon('file'), meta);
    const acts = document.createElement('div'); acts.className = 'acts';
    const open = document.createElement('button'); open.className = 'btn secondary small';
    open.append(mkIcon('eye', 'ic sm'), document.createTextNode('Open'));
    open.onclick = () => {
      current = { id: r.id, ts: r.ts, title: r.title, company: r.company, report: r.report, proposals: r.proposals, ticked: new Set(r.ticked) };
      renderResult();
    };
    const del = document.createElement('button'); del.className = 'btn ghost small iconbtn';
    del.setAttribute('aria-label', 'Delete this version');
    del.append(mkIcon('trash', 'ic sm'));
    del.onclick = async () => {
      await db.histDel(pk(r.id));
      S.history = S.history.filter((h) => h.id !== r.id);
      if (current?.id === r.id) { current = null; show($('result'), false); }
      renderHistory();
    };
    acts.append(open, del);
    li.append(job, acts);
    return li;
  }));
}

/* ---------- settings ---------- */
$('btn-settings').onclick = () => $('dlg-settings').showModal();
$('btn-settings-close').onclick = () => $('dlg-settings').close();
$('btn-user').onclick = () => $('dlg-settings').showModal();
$('btn-lock').onclick = async () => {
  $('dlg-settings').close();
  await lock();
};
$('btn-wipe').onclick = async () => {
  if (!confirm(`Delete ${S.user.name}'s space and every CV in it? This cannot be undone.`)) return;
  $('dlg-settings').close();
  await deleteSpace(S.user.id);
  await lock();
};

async function deleteSpace(pid) {
  for (const key of await db.kvKeys()) if (String(key).startsWith(`${pid}:`)) await db.del(key);
  for (const r of await db.histAll()) if (r.pid === pid) await db.histDel(r.id);
  await db.profDel(pid);
  const session = await db.get('session');
  if (session?.pid === pid) await db.del('session');
}

/* ---------- spaces: lock, unlock, enter ---------- */
function lockUI(locked) {
  show($('auth'), locked);
  for (const id of ['step-cv', 'step-tailor', 'result', 'step-history']) show($(id), false);
  if (!locked) { show($('step-cv')); show($('step-tailor')); }
  show($('btn-user'), !locked);
  show($('btn-settings'), !locked);
}

async function renderAuth() {
  lockUI(true);
  const profiles = (await db.profAll()).sort((x, y) => x.createdAt - y.createdAt);
  const creating = profiles.length === 0 || authSel === 'new';
  $('auth-title').textContent = creating ? (profiles.length ? 'A new space' : 'Create your space') : 'Who is this?';
  $('btn-auth-label').textContent = creating ? 'Create my space' : 'Unlock my space';
  show($('name-row'), creating);
  show($('btn-new-space'), !creating);
  const list = $('space-list');
  list.replaceChildren();
  if (!creating) {
    for (const p of profiles) {
      const li = document.createElement('li');
      li.classList.toggle('selected', authSel === p.id);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'space';
      btn.append(mkIcon('user', 'ic sm'), document.createTextNode(p.name));
      btn.onclick = () => { authSel = p.id; renderAuth(); $('in-pass').focus(); };
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'btn ghost small iconbtn del';
      del.setAttribute('aria-label', `Delete ${p.name}'s space`);
      del.append(mkIcon('trash', 'ic sm'));
      del.onclick = async () => {
        if (!confirm(`Delete ${p.name}'s space and every CV in it? This cannot be undone.`)) return;
        await deleteSpace(p.id);
        if (authSel === p.id) authSel = null;
        renderAuth();
      };
      btn.append(del);
      li.append(btn);
      list.append(li);
    }
    if (!authSel && profiles.length === 1) authSel = profiles[0].id;
  }
  fieldError('auth-error');
}

async function lock() {
  await db.del('session');
  S.user = null; S.cv = null; S.template = null; S.history = []; current = null;
  authSel = null;
  $('in-pass').value = ''; $('in-name').value = '';
  show($('template-review'), false);
  show($('cv-chip'), false);
  await renderAuth();
  scrollTo({ top: 0, behavior: 'smooth' });
}

async function startSession(prof, dek) {
  await db.set('session', { pid: prof.id, dek: b64b(dek), expiresAt: Date.now() + SESSION_DAYS * 86400000 });
  S.user = { id: prof.id, name: prof.name, dek };
}

/* Fold any data saved before spaces existed into the first space created. */
async function migrateLegacy() {
  const cv = await db.get('cv'), tpl = await db.get('template');
  if (cv && !cv.iv) { await saveEnc('cv', cv); await db.del('cv'); }
  if (tpl && !tpl.iv) { await saveEnc('template', tpl); await db.del('template'); }
  for (const r of await db.histAll()) {
    if (!r.pid && r.title) { await db.histPut({ id: pk(r.id), pid: S.user.id, blob: await encryptJson(S.user.dek, r) }); await db.histDel(r.id); }
  }
}

async function enterApp() {
  lockUI(false);
  $('user-name').textContent = S.user.name;
  S.cv = await loadEnc('cv');
  S.template = await loadEnc('template');
  const mine = (await db.histAll()).filter((r) => r.pid === S.user.id);
  S.history = (await Promise.all(mine.map(async (r) => {
    try { return await decryptJson(S.user.dek, r.blob); } catch { return null; }
  }))).filter(Boolean).sort((x, y) => y.ts - x.ts);
  if (S.template) await registerFonts(S.template.fonts);
  if (S.template && !S.template.approved) {
    show($('template-review'));
    renderPreview($('frame-template'), buildTemplateHtml(S.template));
  }
  if (S.cv) { $('cv-chip').replaceChildren(mkIcon('file', 'ic sm'), document.createTextNode(S.cv.name)); show($('cv-chip')); }
  renderGates();
  renderHistory();
}

$('btn-new-space').onclick = () => { authSel = 'new'; renderAuth(); $('in-name').focus(); };
$('in-pass').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('btn-auth').click(); });

$('btn-auth').onclick = async () => {
  const pass = $('in-pass').value;
  const profiles = await db.profAll();
  const creating = profiles.length === 0 || authSel === 'new';
  if (pass.length < 8) { fieldError('auth-error', 'The passphrase needs at least 8 characters.'); return; }
  $('btn-auth').disabled = true;
  swapIcon($('auth-ic'), 'loader', { spin: true });
  try {
    if (creating) {
      const name = $('in-name').value.trim();
      if (!name) { fieldError('auth-error', 'Add your name so this space has an owner.'); return; }
      if (profiles.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
        fieldError('auth-error', 'A space with that name already exists on this device.'); return;
      }
      const keys = await createProfileKeys(pass);
      const prof = { id: crypto.randomUUID(), name, createdAt: Date.now(), ...keys };
      await db.profPut(prof);
      const dek = await unlockDek(pass, prof);
      await startSession(prof, dek);
      if (profiles.length === 0) await migrateLegacy();
      toast(`Welcome, ${name}. This space is yours.`);
    } else {
      const prof = profiles.find((p) => p.id === authSel);
      if (!prof) { fieldError('auth-error', 'Choose whose space to unlock.'); return; }
      let dek;
      try { dek = await unlockDek(pass, prof); }
      catch { fieldError('auth-error', 'That passphrase does not open this space.'); return; }
      await startSession(prof, dek);
      toast(`Welcome back, ${prof.name}.`);
    }
    $('in-pass').value = ''; $('in-name').value = '';
    authSel = null;
    await enterApp();
  } finally {
    swapIcon($('auth-ic'), 'lock');
    $('btn-auth').disabled = false;
  }
};

/* ---------- boot ---------- */
applyTheme();
new IntersectionObserver(([e]) => {
  $('masthead').classList.toggle('scrolled', !e.isIntersecting);
}).observe($('top-sentinel'));

(async function init() {
  const session = await db.get('session');
  const profiles = await db.profAll();
  const prof = sessionValid(session, Date.now()) && profiles.find((p) => p.id === session.pid);
  if (prof) {
    S.user = { id: prof.id, name: prof.name, dek: unb64b(session.dek) };
    await enterApp();
  } else {
    if (session) await db.del('session');
    await renderAuth();
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
