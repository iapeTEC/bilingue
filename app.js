/* =========================
   LESSON PREP - APP.JS (FULL)
   - Backend: Google Apps Script (API_URL)
   - Front: GitHub Pages
   - Features:
     Term picker
      Week picker + arrows
      Class picker (turmas)
      Rich text formatting toolbar
      View mode (read-only)
      Local cache (instant load)
      Warmup (reduce cold start)
      Mobile-safe share (WhatsApp)
========================= */

/* =========================
   CONFIG
========================= */
const API_URL = "https://script.google.com/macros/s/AKfycbzlRaBpUF9281Srwz5ToaKxyrg281syqaVbkYm7pFtoMVApsqzS0tOffBlcinehas2C8g/exec";

const WEEKDAYS = [
  { key: "SEG", label: "SEG" },
  { key: "TER", label: "TER" },
  { key: "QUA", label: "QUA" },
  { key: "QUI", label: "QUI" },
  { key: "SEX", label: "SEX" },
];

const CLASSES = [
  "Infantil 3",
  "Infantil 4",
  "Infantil 5",
  "1 Ano",
  "2 Ano",
  "3 Ano",
  "4 Ano",
  "5 Ano",
  "6 Ano",
];

const MONTHS_PT = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
];

/* =========================
   STATE
========================= */
const state = {
  term: "1",
  className: CLASSES[0],
  teacher: "Bruno Agostinho",
  weekStart: null,  // Monday Date object
  weekLabel: "(26 a 30 de Janeiro)",
  dateText: "26 a 30 de Janeiro",
  rows: [],
  coordMessage: "",
  isViewMode: document.body.classList.contains("view-mode"),
};

/* =========================
   HELPERS
========================= */
function pad2(n){ return String(n).padStart(2,"0"); }

function toISODate(d){
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
}

function fromISODate(s){
  const [y,m,dd] = s.split("-").map(Number);
  return new Date(y, m-1, dd);
}

function mondayOf(date){
  const d = new Date(date);
  const day = d.getDay(); // 0 Sun, 1 Mon...
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  d.setHours(0,0,0,0);
  return d;
}

function addDays(date, n){
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function stripAccents(str){
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function slugifyKey(str){
  return stripAccents(String(str))
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getQueryParams(){
  const p = new URLSearchParams(window.location.search);
  return Object.fromEntries(p.entries());
}

function setQueryParams(obj){
  const url = new URL(window.location.href);
  Object.entries(obj).forEach(([k,v]) => {
    if(v === null || v === undefined) url.searchParams.delete(k);
    else url.searchParams.set(k, v);
  });
  window.history.replaceState({}, "", url.toString());
}

function defaultWeekIfNone(){
  return mondayOf(new Date());
}

/* =========================
   KEY (term + week + class)
========================= */
function makeKey(){
  const week = state.weekStart ? toISODate(state.weekStart) : "no_week";
  const cls = slugifyKey(state.className || "no_class");
  return `${state.term}_${week}_${cls}`;
}

/* =========================
   LOCAL CACHE (instant load)
========================= */
function cacheKey(){
  return `LP_CACHE_${makeKey()}`;
}

function loadFromLocalCache(){
  const raw = localStorage.getItem(cacheKey());
  if(!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function saveToLocalCache(payload){
  try{
    localStorage.setItem(cacheKey(), JSON.stringify(payload));
  }catch(e){
    // if storage is full, ignore silently
    console.warn("Cache local cheio/indisponível:", e);
  }
}

/* =========================
   UI: LOADING + TOAST
========================= */
function setLoading(isLoading){
  document.body.classList.toggle("is-loading", !!isLoading);
}

function showToast(text){
  const t = document.createElement("div");
  t.textContent = text;
  t.style.position = "fixed";
  t.style.left = "50%";
  t.style.bottom = "18px";
  t.style.transform = "translateX(-50%)";
  t.style.background = "rgba(15, 23, 42, 0.92)";
  t.style.color = "#fff";
  t.style.padding = "10px 14px";
  t.style.borderRadius = "14px";
  t.style.fontWeight = "800";
  t.style.boxShadow = "0 10px 24px rgba(0,0,0,.25)";
  t.style.zIndex = "99999";
  document.body.appendChild(t);
  setTimeout(()=>t.remove(), 1600);
}

/* =========================
   TABLE DATA
========================= */
function buildInitialRows(weekStart){
  return WEEKDAYS.map((w, idx) => {
    const d = addDays(weekStart, idx);
    return {
      date: toISODate(d),
      weekday: w.label,
      dayNum: d.getDate(),
      unitDay: "",
      conteudo: "",
      desenvolvimento: "",
      materiais: "",
    };
  });
}

/* =========================
   RENDER TABLE
========================= */
function renderRows(){
  const rowsEl = document.getElementById("rows");
  if(!rowsEl) return;

  rowsEl.innerHTML = "";

  state.rows.forEach((r, idx) => {
    const tr = document.createElement("tr");

    // COL 1: Unit, Day + badge (day number + weekday) OUTSIDE
    const tdUnit = document.createElement("td");
    tdUnit.className = "td-unit";

    const badge = document.createElement("div");
    badge.className = "day-badge";

    const dayNum = document.createElement("div");
    dayNum.className = "dayNum";
    dayNum.textContent = r.dayNum;

    const weekPill = document.createElement("div");
    weekPill.className = "weekPill";
    weekPill.textContent = r.weekday;

    badge.appendChild(dayNum);
    badge.appendChild(weekPill);

    const unitText = document.createElement("div");
    unitText.className = "rich";
    unitText.dataset.field = "unitDay";
    unitText.dataset.index = idx;
    unitText.innerHTML = r.unitDay || "";
    if(!state.isViewMode) unitText.contentEditable = "true";

    tdUnit.appendChild(badge);
    tdUnit.appendChild(unitText);

    // COL 2
    const td2 = document.createElement("td");
    const conteudo = document.createElement("div");
    conteudo.className = "rich";
    conteudo.dataset.field = "conteudo";
    conteudo.dataset.index = idx;
    conteudo.innerHTML = r.conteudo || "";
    if(!state.isViewMode) conteudo.contentEditable = "true";
    td2.appendChild(conteudo);

    // COL 3
    const td3 = document.createElement("td");
    const des = document.createElement("div");
    des.className = "rich";
    des.dataset.field = "desenvolvimento";
    des.dataset.index = idx;
    des.innerHTML = r.desenvolvimento || "";
    if(!state.isViewMode) des.contentEditable = "true";
    td3.appendChild(des);

    // COL 4
    const td4 = document.createElement("td");
    const mat = document.createElement("div");
    mat.className = "rich";
    mat.dataset.field = "materiais";
    mat.dataset.index = idx;
    mat.innerHTML = r.materiais || "";
    if(!state.isViewMode) mat.contentEditable = "true";
    td4.appendChild(mat);

    tr.appendChild(tdUnit);
    tr.appendChild(td2);
    tr.appendChild(td3);
    tr.appendChild(td4);

    rowsEl.appendChild(tr);
  });

  hookEditListeners();
}

/* =========================
   EDIT LISTENERS
========================= */
function hookEditListeners(){
  if(state.isViewMode) return;

  document.querySelectorAll(".rich[contenteditable='true']").forEach(el => {
    el.addEventListener("input", () => {
      const idx = Number(el.dataset.index);
      const field = el.dataset.field;
      if(Number.isFinite(idx) && field){
        state.rows[idx][field] = el.innerHTML;
        // keep local cache warm while typing
        saveToLocalCache(buildPayload());
      }
    });

    el.addEventListener("focus", () => showToolbar());
  });

  const coord = document.getElementById("coordMessage");
  if(coord && coord.getAttribute("contenteditable") === "true"){
    coord.addEventListener("focus", () => showToolbar());
    coord.addEventListener("input", () => {
      state.coordMessage = coord.innerHTML;
      saveToLocalCache(buildPayload());
    });
  }

  const teacher = document.getElementById("teacherName");
  if(teacher && teacher.getAttribute("contenteditable") === "true"){
    teacher.addEventListener("focus", () => showToolbar());
    teacher.addEventListener("input", () => {
      state.teacher = teacher.innerText.trim();
      saveToLocalCache(buildPayload());
    });
  }

  const dateField = document.getElementById("dateField");
  if(dateField && dateField.getAttribute("contenteditable") === "true"){
    dateField.addEventListener("focus", () => showToolbar());
    dateField.addEventListener("input", () => {
      state.dateText = dateField.innerText.trim();
      saveToLocalCache(buildPayload());
    });
  }
}

/* =========================
   TOOLBAR (formatting)
========================= */
function showToolbar(){
  const tb = document.getElementById("toolbar");
  if(!tb) return;
  tb.classList.add("show");
  tb.setAttribute("aria-hidden","false");
}

function hideToolbar(){
  const tb = document.getElementById("toolbar");
  if(!tb) return;
  tb.classList.remove("show");
  tb.setAttribute("aria-hidden","true");
}

function initToolbar(){
  const tb = document.getElementById("toolbar");
  if(!tb) return;

  tb.addEventListener("mousedown", (e) => {
    e.preventDefault(); // keep focus in editable
  });

  tb.querySelectorAll("[data-cmd]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.execCommand(btn.dataset.cmd, false, null);
    });
  });

  tb.querySelectorAll("[data-align]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.execCommand(btn.dataset.align, false, null);
    });
  });

  const cp = document.getElementById("colorPicker");
  if(cp){
    cp.addEventListener("input", () => {
      document.execCommand("foreColor", false, cp.value);
    });
  }
}

function initToolbarAutoHide(){
  document.addEventListener("pointerdown", (e) => {
    const tb = document.getElementById("toolbar");
    if(!tb) return;

    const clickedToolbar = tb.contains(e.target);
    const clickedRich = e.target.closest?.(".rich");

    if(clickedToolbar || clickedRich) return;
    hideToolbar();
  });
}

/* =========================
   MODALS
========================= */
function openModal(modalId){
  const m = document.getElementById(modalId);
  if(!m) return;
  m.classList.add("show");
  m.setAttribute("aria-hidden","false");
}

function closeModal(modalId){
  const m = document.getElementById(modalId);
  if(!m) return;
  m.classList.remove("show");
  m.setAttribute("aria-hidden","true");
}

/* =========================
   WEEK PICKER (modal) + ARROWS
========================= */
function businessWeeksOfMonth(year, monthIndex){
  const first = new Date(year, monthIndex, 1);
  const last = new Date(year, monthIndex + 1, 0);
  const weeks = [];
  let cursor = mondayOf(first);

  while(cursor <= last){
    const mon = new Date(cursor);
    const fri = addDays(cursor, 4);

    // keep if any day of Mon-Fri touches the month
    const anyInside = [0,1,2,3,4].some(i => addDays(mon,i).getMonth() === monthIndex);

    if(anyInside){
      const label = `(${mon.getDate()} a ${fri.getDate()} de ${MONTHS_PT[monthIndex]})`;
      weeks.push({ weekStart: mon, label });
    }

    cursor = addDays(cursor, 7);
  }
  return weeks;
}

function initWeekPicker(){
  const weekBtn = document.getElementById("weekBtn");
  const monthSelect = document.getElementById("monthSelect");
  const weekSelect = document.getElementById("weekSelect");

  if(!weekBtn || !monthSelect || !weekSelect) return;
  if(state.isViewMode) return;

  const now = new Date();
  monthSelect.innerHTML = "";
  for(let i=0; i<12; i++){
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = MONTHS_PT[i];
    monthSelect.appendChild(opt);
  }
  monthSelect.value = String(now.getMonth());

  function refreshWeeks(){
    const year = now.getFullYear();
    const m = Number(monthSelect.value);
    const weeks = businessWeeksOfMonth(year, m);
    weekSelect.innerHTML = "";
    weeks.forEach((w) => {
      const opt = document.createElement("option");
      opt.value = toISODate(w.weekStart);
      opt.textContent = w.label;
      weekSelect.appendChild(opt);
    });
  }

  monthSelect.addEventListener("change", refreshWeeks);
  refreshWeeks();

  weekBtn.addEventListener("click", () => openModal("weekModal"));

  document.getElementById("closeModal")?.addEventListener("click", () => closeModal("weekModal"));

  document.getElementById("applyWeek")?.addEventListener("click", async () => {
    const iso = weekSelect.value;
    const newMon = mondayOf(fromISODate(iso));
    await setWeek(newMon, { silent:false });
    closeModal("weekModal");
  });
}

function initWeekArrows(){
  const prev = document.getElementById("prevWeekBtn");
  const next = document.getElementById("nextWeekBtn");
  if(!prev || !next) return;
  if(state.isViewMode) return;

  prev.addEventListener("click", async () => {
    const newMon = addDays(state.weekStart, -7);
    await setWeek(newMon, { silent:true });
  });

  next.addEventListener("click", async () => {
    const newMon = addDays(state.weekStart, 7);
    await setWeek(newMon, { silent:true });
  });
}

/* =========================
   TERM PICKER
========================= */
function initTermPicker(){
  const termBtn = document.getElementById("termBtn");
  const termSelect = document.getElementById("termSelect");
  if(!termBtn || !termSelect) return;
  if(state.isViewMode) return;

  termBtn.addEventListener("click", () => openModal("termModal"));
  document.getElementById("closeTermModal")?.addEventListener("click", () => closeModal("termModal"));

  document.getElementById("applyTerm")?.addEventListener("click", async () => {
    state.term = termSelect.value;
    setQueryParams({ term: state.term, week: toISODate(state.weekStart), class: state.className });
    hydrateUI();
    closeModal("termModal");
    // fast load: local cache instantly + backend async
    loadLessonFast();
  });
}

/* =========================
   CLASS PICKER
========================= */
function initClassPicker(){
  const classBtn = document.getElementById("classBtn");
  const classSelect = document.getElementById("classSelect");
  if(!classBtn || !classSelect) return;
  if(state.isViewMode) return;

  classSelect.innerHTML = "";
  CLASSES.forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    classSelect.appendChild(opt);
  });
  classSelect.value = state.className;

  classBtn.addEventListener("click", () => openModal("classModal"));
  document.getElementById("closeClassModal")?.addEventListener("click", () => closeModal("classModal"));

  document.getElementById("applyClass")?.addEventListener("click", async () => {
    state.className = classSelect.value;
    setQueryParams({ term: state.term, week: toISODate(state.weekStart), class: state.className });
    closeModal("classModal");
    hydrateUI();
    loadLessonFast();
  });
}

/* =========================
   PAYLOAD BUILDER
========================= */
function buildPayload(){
  return {
    key: makeKey(),
    term: state.term,
    className: state.className,
    weekStart: toISODate(state.weekStart),
    teacher: state.teacher,
    dateText: state.dateText,
    rows: state.rows,
    coordMessage: state.coordMessage,
  };
}

/* =========================
   BACKEND (load/save)
========================= */
async function loadFromBackend(){
  if(!API_URL || API_URL.includes("COLE_AQUI")) return;

  setLoading(true);

  const key = makeKey();
  const url = `${API_URL}?action=get&key=${encodeURIComponent(key)}`;

  try{
    const res = await fetch(url, { method:"GET", cache:"no-cache", mode:"cors" });
    const data = await res.json();

    if(data && data.ok && data.payload){
      const p = data.payload;

      // Apply backend payload
      state.teacher = p.teacher || state.teacher;
      state.dateText = p.dateText || state.dateText;
      state.coordMessage = p.coordMessage || "";

      if(Array.isArray(p.rows) && p.rows.length === 5){
        state.rows = p.rows;
      }

      // Save to local cache (instant next time)
      saveToLocalCache(buildPayload());

      hydrateUI();
    }
  }catch(err){
    // backend may be sleeping/cold or CORS may fail; we still keep local cache
    console.warn("Falha ao carregar do backend:", err);
  }finally{
    setLoading(false);
  }
}

async function saveToBackend(){
  if(!API_URL || API_URL.includes("COLE_AQUI")) {
    alert("Cole a URL do Web App do Apps Script em app.js (API_URL).");
    return false;
  }

  const payload = buildPayload();
  const url = `${API_URL}?action=save&data=${encodeURIComponent(JSON.stringify(payload))}`;

  // Save locally first (instant UX)
  saveToLocalCache(payload);

  try {
    // ✅ 1) normal
    try {
      const res = await fetch(url, {
        method: "GET",
        cache: "no-cache",
        keepalive: true,
        mode: "cors",
      });
      await res.text();
      showToast("✅ Salvo!");
      return true;

    } catch (err) {
      // ✅ 2) fallback: send anyway (mobile)
      await fetch(url, {
        method: "GET",
        cache: "no-cache",
        keepalive: true,
        mode: "no-cors",
      });
      showToast("✅ Salvo!");
      return true;
    }
  } catch (e) {
    console.warn("Falha ao salvar:", e);
    showToast("⚠️ Não salvou (verifique deploy)");
    return false;
  }
}

/* =========================
   HYDRATE UI
========================= */
function hydrateUI(){
  const weekLabel = document.getElementById("weekLabel");
  const dateField = document.getElementById("dateField");
  const teacherName = document.getElementById("teacherName");
  const coordMessage = document.getElementById("coordMessage");
  const termLabel = document.getElementById("termLabel");
  const classLabel = document.getElementById("classLabel");

  if(termLabel) termLabel.textContent = `${state.term}º Bimestre - LIVRO/TURMA`;
  if(weekLabel) weekLabel.textContent = state.weekLabel;
  if(dateField) dateField.innerText = state.dateText;
  if(teacherName) teacherName.innerText = state.teacher;
  if(classLabel) classLabel.textContent = `Turma: ${state.className}`;

  if(coordMessage){
    if(!state.isViewMode) coordMessage.setAttribute("contenteditable","true");
    coordMessage.innerHTML = state.coordMessage || "";
  }

  renderRows();
}

/* =========================
   FAST LOAD (Local cache first)
========================= */
function applyWeekLabels(){
  const mon = new Date(state.weekStart);
  const fri = addDays(state.weekStart, 4);

  state.weekLabel = `(${mon.getDate()} a ${fri.getDate()} de ${MONTHS_PT[mon.getMonth()]})`;
  state.dateText = `${mon.getDate()} a ${fri.getDate()} de ${MONTHS_PT[mon.getMonth()]}`;
}

async function setWeek(mondayDate, opts = { silent:false }){
  state.weekStart = mondayOf(mondayDate);
  applyWeekLabels();

  // Always reset to blank rows first (if no cache)
  state.rows = buildInitialRows(state.weekStart);

  setQueryParams({
    term: state.term,
    week: toISODate(state.weekStart),
    class: state.className,
  });

  // Instant UI update
  hydrateUI();

  // Load fastest possible for this (term/week/class)
  loadLessonFast();
}

function loadLessonFast(){
  // 1) local cache instant
  const cached = loadFromLocalCache();
  if(cached && Array.isArray(cached.rows) && cached.rows.length === 5){
    state.teacher = cached.teacher || state.teacher;
    state.dateText = cached.dateText || state.dateText;
    state.coordMessage = cached.coordMessage || "";
    state.rows = cached.rows;
    hydrateUI();
  } else {
    // no cache -> keep blank state (already blank)
    hydrateUI();
  }

  // 2) backend async (update if exists)
  loadFromBackend();
}

/* =========================
   SHARE (WhatsApp)
========================= */
function initShare(){
  const shareBtn = document.getElementById("shareBtn");
  if(!shareBtn || state.isViewMode) return;

  shareBtn.addEventListener("click", () => {
    const base = window.location.origin + window.location.pathname
      .replace("index.html","")
      .replace(/\/$/,"/");

    const viewLink =
      `${base}view.html?term=${encodeURIComponent(state.term)}&week=${encodeURIComponent(toISODate(state.weekStart))}&class=${encodeURIComponent(state.className)}`;

    const msg = `Lesson Prep (somente leitura):\n${viewLink}`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;

    // ✅ open WhatsApp immediately (mobile safe)
    window.open(waUrl, "_blank");

    // ✅ save in background (no await)
    saveToBackend();
  });
}

/* =========================
   INIT STATE FROM URL
========================= */
function applyQueryState(){
  const q = getQueryParams();

  if(q.term) state.term = q.term;

  if(q.class){
    // accept exact label or slug
    const match = CLASSES.find(c => c.toLowerCase() === String(q.class).toLowerCase());
    state.className = match || q.class;
  }

  const w = q.week ? fromISODate(q.week) : defaultWeekIfNone();
  state.weekStart = mondayOf(w);

  applyWeekLabels();
  state.rows = buildInitialRows(state.weekStart);
}

/* =========================
   WARMUP (reduce cold start)
========================= */
function warmupBackend(){
  if(!API_URL) return;
  fetch(`${API_URL}?action=ping`, { method:"GET", cache:"no-cache", mode:"no-cors" })
    .catch(()=>{});
}

/* =========================
   INIT
========================= */
async function init(){
  applyQueryState();
  initToolbar();
  initToolbarAutoHide();

  // set editable fields for edit mode
  if(!state.isViewMode){
    document.getElementById("teacherName")?.setAttribute("contenteditable","true");
    document.getElementById("dateField")?.setAttribute("contenteditable","true");
  }

  hydrateUI();

  // fast: show local cache first, backend after
  loadLessonFast();

  initWeekPicker();
  initWeekArrows();
  initTermPicker();
  initClassPicker();
  initShare();

  // save button
  const saveBtn = document.getElementById("saveBtn");
  if(saveBtn && !state.isViewMode){
    saveBtn.addEventListener("click", saveToBackend);
  }

  // warm up backend on start
  warmupBackend();
}

init();
