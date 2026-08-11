'use strict';
import { decomposePdf, registerFonts } from './engine/pdf-extract.js';
import { buildTemplateHtml, lineFits, guessOwnerName } from './engine/render.js';
import { tailorSentences, sentenceTexts, applyProposals } from './engine/tailor.js';
import { jobFromJsonLd, cleanJobText, looksLikeBlock } from './engine/jobtext.js';
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
/* Pull the listing out of fetched HTML: the JobPosting block first, then the
   readable body, then the page with its furniture stripped. */
function readListing(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  for (const s of doc.querySelectorAll('script[type="application/ld+json"]')) {
    const job = jobFromJsonLd(s.textContent);
    if (job && job.text.length > 200) return job.text;
  }
  doc.querySelectorAll('script,style,noscript,nav,footer,header,aside,form,svg,iframe,[aria-hidden="true"]').forEach((n) => n.remove());
  const main = doc.querySelector('main,[role="main"],article,#job-description,.job-description,#vacancy,.vacancy') || doc.body;
  return cleanJobText(main?.innerText || main?.textContent || '');
}

/* Read-only proxies, raced rather than queued: whichever answers first with
   something that reads like a listing wins. Job boards block them
   unpredictably, so more routes means fewer dead ends. */
const ROUTES = [
  { url: (u) => `https://r.jina.ai/${u}`, parse: (t) => cleanJobText(t) },
  { url: (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`, parse: readListing },
  { url: (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`, parse: readListing },
  { url: (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`, parse: readListing },
  { url: (u) => `https://api.allorigins.win/raw?charset=UTF-8&url=${encodeURIComponent(u)}`, parse: readListing },
];

async function fetchJobText(jobUrl) {
  const attempt = async ({ url, parse }) => {
    const r = await fetchWithTimeout(url(jobUrl), { headers: { Accept: 'text/html,text/plain' } }, 18000);
    if (!r.ok) throw new Error(`http ${r.status}`);
    const raw = await r.text();
    if (looksLikeBlock(raw)) throw new Error('bot-check');
    const text = parse(raw);
    if (!text || text.length < 200 || looksLikeBlock(text)) throw new Error('too little');
    return text.slice(0, JD_MAX);
  };
  /* Promise.any resolves on the first success and ignores the failures. */
  try { return await Promise.any(ROUTES.map(attempt)); }
  catch { return null; }
}

/* ---------- capture from the page you are already on ---------- */
/* Sites behind a log-in or a bot check will never answer a proxy, but the
   person's own browser is already past it. The bookmarklet reads the job
   text off the page they are looking at and hands it straight over. */
const BOOKMARKLET = `javascript:(function(){var d=document,j=null;d.querySelectorAll('script[type="application/ld+json"]').forEach(function(s){if(j)return;try{var o=JSON.parse(s.textContent);var f=function(n,k){if(!n||typeof n!=='object'||k>5)return null;if(Array.isArray(n)){for(var i=0;i<n.length;i++){var h=f(n[i],k+1);if(h)return h}return null}if([].concat(n['@type']||[]).indexOf('JobPosting')>=0)return n;return f(n['@graph'],k+1)||f(n.mainEntity,k+1)};var p=f(o,0);if(p)j=[p.title||'',(p.hiringOrganization&&p.hiringOrganization.name)||'',p.description||''].join('\\n')}catch(e){}});var t=j?j.replace(/<[^>]+>/g,' '):((d.querySelector('main,[role=main],article')||d.body).innerText||'');t=(d.title+'\\n\\n'+t).replace(/\\s*\\n\\s*/g,'\\n').slice(0,24000);location.href='${location.origin}${location.pathname}#jd='+encodeURIComponent(t)})()`;

function readSharedJd() {
  const m = /[#&]jd=([^&]+)/.exec(location.hash);
  if (!m) return null;
  history.replaceState(null, '', location.pathname + location.search);
  try { return cleanJobText(decodeURIComponent(m[1])).slice(0, JD_MAX); } catch { return null; }
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
$('btn-paste-toggle').onclick = () => {
  show($('paste-wrap'), $('paste-wrap').hidden);
  show($('capture-wrap'), !$('paste-wrap').hidden);
};
/* the bookmarklet is a link the person drags to their bookmarks bar */
$('bkmk').setAttribute('href', BOOKMARKLET);
$('bkmk').onclick = (e) => { e.preventDefault(); toast('Drag this to your bookmarks bar, then click it on a job page.'); };

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
        show($('capture-wrap'));
        throw new Error('That site blocks automated readers (Civil Service Jobs and NHS Jobs both do). Use the "Grab from this page" button below, or paste the listing text.');
      }
    }
    statusShow('tailor-status', 'Matching the listing against your CV...');
    await new Promise((r) => setTimeout(r, 30));
    const { edits, report, title, company } = tailorSentences(S.template.lines, jd, jobUrl);
    current = { id: `${Date.now()}`, ts: Date.now(), title, company, edits, report, state: new Map() };
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
  const { texts, changed } = sentenceTexts(S.template.lines, current.edits, current.state);
  return { html: buildTemplateHtml(S.template, texts, changed), texts, changed };
}

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
    stat(current.edits.length, 'sentences reworded for you to check', false),
    ...(r.gaps.length ? [stat(r.gaps.length, 'for you to weigh up', true)] : []),
  );
  [...$('result-stats').children].forEach((el, i) => {
    el.classList.add('rise');
    el.style.animationDelay = `${i * 70}ms`;
  });
  introPending = true;

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
  const n = changed.size;
  $('rewrite-hint').querySelector('span').textContent = n
    ? `${n === 1 ? 'One sentence was' : `${n} sentences were`} reworded to meet the listing. Tap a highlighted sentence to edit it, try another wording, or put it back.`
    : 'Every rewording has been put back; this is your original CV.';
  show($('rewrite-hint'), current.edits.length > 0);
  show($('no-proposals'), current.edits.length === 0);
  const frame = $('frame-result');
  renderPreview(frame, html);
  const inner = frame.onload;
  frame.onload = () => { inner(); decoratePreview(frame, texts, changed); };
  const tight = [...changed].map((id) => {
    const line = S.template.lines.find((l) => l.id === id);
    return { line, check: lineFits(S.template, line, texts.get(id)) };
  }).filter((x) => !x.check.fits);
  fieldError('tailor-error', tight.length
    ? `One change makes a line wider than the space it has ("${tight[0].line.text.slice(0, 40)}…"). Tap it in the preview to shorten it or put it back.`
    : '');
}

/* Highlight the reworded sentences inside the preview and make each one a
   button that opens the sentence editor. On the first render of a result the
   highlights ink themselves in one after another: the engine showing its
   work, and a lesson that these lines are tappable. */
const HL_CSS = `
[data-f].hl{cursor:pointer;border-radius:3px;background:rgba(70,200,207,.16);
  box-shadow:0 0 0 3.5px rgba(70,200,207,.16),inset 0 -1.5px 0 0 #22a7ae;
  transition:background-color .2s ease,box-shadow .2s ease}
[data-f].hl:hover{background:rgba(70,200,207,.32);box-shadow:0 0 0 3.5px rgba(70,200,207,.32),inset 0 -1.5px 0 0 #0d7e86}
[data-f].hl:focus-visible{outline:2px solid #0d7e86;outline-offset:3px}
@keyframes hl-in{from{background-color:transparent;box-shadow:0 0 0 3.5px transparent,inset 0 -1.5px 0 0 transparent}}
[data-f].hl-in{animation:hl-in .55s cubic-bezier(.16,1,.3,1) backwards}
@media (prefers-reduced-motion:reduce){[data-f].hl-in{animation:none}}`;

let introPending = false;   /* ink the highlights in on the next decoration */

function decoratePreview(frame, texts, changed) {
  const doc = frame.contentDocument;
  if (!doc || !doc.getElementById) return;
  if (!doc.getElementById('hl-css')) {
    const st = doc.createElement('style');
    st.id = 'hl-css';
    st.textContent = HL_CSS;
    doc.head.append(st);
  }
  const intro = introPending;
  introPending = false;
  let inkIdx = 0;
  for (const e of current.edits) {
    const el = doc.querySelector(`[data-f="${e.lineId}"]`);
    if (!el) continue;
    const on = changed.has(e.lineId);
    el.classList.toggle('hl', on);
    if (on && intro) {
      el.classList.add('hl-in');
      el.style.animationDelay = `${250 + Math.min(inkIdx++ * 90, 720)}ms`;
    }
    if (on) {
      el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', `Edit reworded sentence: ${texts.get(e.lineId)}`);
      el.onclick = () => openEditor(e.lineId);
      el.onkeydown = (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); openEditor(e.lineId); } };
    } else {
      el.removeAttribute('tabindex');
      el.removeAttribute('role');
      el.onclick = el.onkeydown = null;
    }
  }
}

/* ---------- the sentence editor ---------- */
let editing = null;   /* lineId open in the editor */
const editFor = (id) => current.edits.find((e) => e.lineId === id);
const stateFor = (id) => current.state.get(id) || { mode: 'variant', v: 0 };

function openEditor(lineId) {
  editing = lineId;
  syncEditor();
  $('dlg-edit').showModal();
}

function syncEditor() {
  const e = editFor(editing);
  const st = stateFor(editing);
  const v = (st.v || 0) % e.variants.length;
  const text = st.mode === 'custom' ? st.text : st.mode === 'original' ? e.original : e.variants[v].text;
  $('edit-orig').textContent = e.original;
  $('edit-text').value = text;

  const box = $('edit-changes');
  box.replaceChildren();
  if (st.mode === 'variant') {
    e.variants[v].changes.forEach((c, i) => {
      const row = document.createElement('span');
      row.className = 'p-change rise';
      row.style.animationDelay = `${i * 45}ms`;
      const from = document.createElement('del'); from.textContent = c.from;
      const arr = document.createElement('span'); arr.className = 'arr'; arr.textContent = '→';
      const to = document.createElement('ins'); to.textContent = c.to;
      const why = document.createElement('span'); why.className = 'p-why'; why.textContent = c.why;
      row.append(from, ' ', arr, ' ', to, ' ', why);
      box.append(row);
    });
  } else {
    const note = document.createElement('span');
    note.className = 'p-why';
    note.textContent = st.mode === 'custom' ? 'Your own wording' : 'Your original sentence';
    box.append(note);
  }

  const many = e.variants.length > 1;
  $('btn-regen').disabled = !many;
  $('regen-label').textContent = many
    ? `Try another wording · ${st.mode === 'variant' ? v + 1 : '–'} of ${e.variants.length}`
    : 'This is the only honest rewording';
  editWarn(text);
}

function editWarn(text) {
  const line = S.template.lines.find((l) => l.id === editing);
  fieldError('edit-warn', lineFits(S.template, line, text).fits ? ''
    : 'This wording is wider than the room the line has, so it will run long on the page.');
}

$('edit-text').addEventListener('input', () => editWarn($('edit-text').value.trim()));

$('btn-regen').onclick = async () => {
  const e = editFor(editing);
  const st = stateFor(editing);
  const v = st.mode === 'variant' ? ((st.v || 0) + 1) % e.variants.length : 0;
  current.state.set(editing, { mode: 'variant', v });
  swapIcon($('regen-ic'), 'refresh');
  syncEditor();
  const ta = $('edit-text');
  ta.classList.remove('flash');
  void ta.getBoundingClientRect();
  ta.classList.add('flash');
  updatePreview();
  await persistCurrent();
};

$('btn-revert').onclick = async () => {
  current.state.set(editing, { mode: 'original', v: stateFor(editing).v || 0 });
  $('dlg-edit').close();
  updatePreview();
  await persistCurrent();
  toast('Back to your original sentence.');
};

$('btn-edit-done').onclick = async () => {
  const e = editFor(editing);
  const st = stateFor(editing);
  const text = $('edit-text').value.replace(/\s+/g, ' ').trim();
  const vi = e.variants.findIndex((x) => x.text === text);
  if (!text || text === e.original) current.state.set(editing, { mode: 'original', v: st.v || 0 });
  else if (vi >= 0) current.state.set(editing, { mode: 'variant', v: vi });
  else current.state.set(editing, { mode: 'custom', text, v: st.v || 0 });
  $('dlg-edit').close();
  updatePreview();
  await persistCurrent();
};

$('dlg-edit').addEventListener('click', (ev) => { if (ev.target === $('dlg-edit')) $('dlg-edit').close(); });

async function persistCurrent() {
  const { html } = currentHtml();
  const rec = {
    id: current.id, ts: current.ts, title: current.title, company: current.company,
    html, report: current.report,
    edits: current.edits, state: [...current.state],
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
      const base = { id: r.id, ts: r.ts, title: r.title, company: r.company, report: r.report };
      if (r.edits) current = { ...base, edits: r.edits, state: new Map(r.state || []) };
      else {
        /* record from before sentence editing: reconstruct it as fixed edits */
        const texts = applyProposals(S.template.lines, r.proposals, new Set(r.ticked));
        const edits = S.template.lines.filter((l) => texts.get(l.id) !== l.text)
          .map((l) => ({ lineId: l.id, original: l.text, variants: [{ text: texts.get(l.id), changes: [] }] }));
        current = { ...base, edits, state: new Map() };
      }
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
  /* a reload tears down every decrypted remnant: DOM, iframes, fonts, heap */
  location.reload();
}

async function startSession(prof, dek) {
  await db.set('session', { pid: prof.id, dek: b64b(dek), expiresAt: Date.now() + SESSION_DAYS * 86400000 });
  S.user = { id: prof.id, name: prof.name, dek };
}

/* Data saved before spaces existed stays unclaimed until someone says it is
   theirs; it is never silently absorbed into whichever space came first. */
async function migrateLegacy() {
  const cv = await db.get('cv'), tpl = await db.get('template');
  const legacyHist = (await db.histAll()).filter((r) => !r.pid && r.title);
  if (!(cv && !cv.iv) && !(tpl && !tpl.iv) && !legacyHist.length) return;
  const label = cv?.name ? `"${cv.name}"` : 'a CV';
  if (!confirm(`${label} was saved on this device before spaces existed. Is it yours? Cancel leaves it for whoever it belongs to.`)) return;
  if (cv && !cv.iv) { await saveEnc('cv', cv); await db.del('cv'); }
  if (tpl && !tpl.iv) { await saveEnc('template', tpl); await db.del('template'); }
  for (const r of legacyHist) { await db.histPut({ id: pk(r.id), pid: S.user.id, blob: await encryptJson(S.user.dek, r) }); await db.histDel(r.id); }
}

async function enterApp() {
  lockUI(false);
  /* the space unlocking: steps arrive in order, once */
  ['step-cv', 'step-tailor'].forEach((id, i) => {
    const el = $(id);
    el.classList.add('rise');
    el.style.animationDelay = `${i * 90}ms`;
  });
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
      await migrateLegacy();
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

/* Accept a captured listing on first load and while the tab is open: the
   bookmarklet may fire at a tab that already has CVRewriter in it, which
   changes only the fragment and never reloads the page. */
function useSharedJd(jd) {
  if (!jd || !S.user) return;
  show($('paste-wrap'));
  show($('capture-wrap'));
  $('in-jobtext').value = jd;
  toast('Listing captured. Tailor when you are ready.');
  $('step-tailor').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
addEventListener('hashchange', () => useSharedJd(readSharedJd()));

const sharedJd = readSharedJd();

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
  useSharedJd(sharedJd);
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
