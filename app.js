
/* =========================
   CONFIG
========================= */

// Tenho que lembrar de mudar, caso necessario.
const API_URL = "https://script.google.com/macros/s/AKfycbzlRaBpUF9281Srwz5ToaKxyrg281syqaVbkYm7pFtoMVApsqzS0tOffBlcinehas2C8g/exec"; 


const WEEKDAYS = [
  { key: "SEG", label: "SEG" },
  { key: "TER", label: "TER" },
  { key: "QUA", label: "QUA" },
  { key: "QUI", label: "QUI" },
  { key: "SEX", label: "SEX" },
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
  teacher: "Bruno Agostinho",
  weekStart: null, // Date object (Mon)
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

function businessWeeksOfMonth(year, monthIndex){
  // returns list of { weekStart: Date, label: "(26 a 30 de Janeiro)" }
  // consider only Mon-Fri weeks (starting Monday)
  const first = new Date(year, monthIndex, 1);
  const last = new Date(year, monthIndex + 1, 0);
  const weeks = [];

  // start from the first monday on/before first day
  let cursor = mondayOf(first);

  while(cursor <= last){
    const mon = new Date(cursor);
    const fri = new Date(cursor);
    fri.setDate(fri.getDate() + 4);

    // keep if at least one business day falls inside month
    const anyInside =
      (mon.getMonth() === monthIndex) ||
      (new Date(mon.getFullYear(), mon.getMonth(), mon.getDate()+1).getMonth() === monthIndex) ||
      (new Date(mon.getFullYear(), mon.getMonth(), mon.getDate()+2).getMonth() === monthIndex) ||
      (new Date(mon.getFullYear(), mon.getMonth(), mon.getDate()+3).getMonth() === monthIndex) ||
      (fri.getMonth() === monthIndex);

    if(anyInside){
      const label = `(${mon.getDate()} a ${fri.getDate()} de ${MONTHS_PT[monthIndex]})`;
      weeks.push({ weekStart: mon, label });
    }

    cursor.setDate(cursor.getDate() + 7);
  }
  return weeks;
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
  const today = new Date();
  const mon = mondayOf(today);
  return mon;
}

/* =========================
   RENDER TABLE
========================= */
function buildInitialRows(weekStart){
  const rows = WEEKDAYS.map((w, idx) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + idx);
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
  return rows;
}

function renderRows(){
  const rowsEl = document.getElementById("rows");
  if(!rowsEl) return;

  rowsEl.innerHTML = "";

  state.rows.forEach((r, idx) => {
    const tr = document.createElement("tr");

    // ✅ COL 1: Unit, Day (número + pill + área editável)
    const tdUnit = document.createElement("td");

    const wrap = document.createElement("div");
    wrap.className = "unitCell";

    const dayNum = document.createElement("div");
    dayNum.className = "dayNum";
    dayNum.textContent = r.dayNum;

    const weekPill = document.createElement("div");
    weekPill.className = "weekPill";
    weekPill.textContent = r.weekday;

    wrap.appendChild(dayNum);
    wrap.appendChild(weekPill);

    // ✅ área editável do Unit/Day (fica ao lado do pill)
    const unitText = document.createElement("div");
    unitText.className = "rich";
    unitText.style.minHeight = "78px";
    unitText.style.flex = "1";
    unitText.dataset.field = "unitDay";
    unitText.dataset.index = idx;
    unitText.innerHTML = r.unitDay || "";
    if(!state.isViewMode) unitText.contentEditable = "true";

    // junta tudo dentro da primeira coluna
    wrap.appendChild(unitText);
    tdUnit.appendChild(wrap);

    // ✅ COL 2: Conteúdo
    const td2 = document.createElement("td");
    const conteudo = document.createElement("div");
    conteudo.className = "rich";
    conteudo.dataset.field = "conteudo";
    conteudo.dataset.index = idx;
    conteudo.innerHTML = r.conteudo || "";
    if(!state.isViewMode) conteudo.contentEditable = "true";
    td2.appendChild(conteudo);

    // ✅ COL 3: Desenvolvimento (agora MAIOR)
    const td3 = document.createElement("td");
    const des = document.createElement("div");
    des.className = "rich";
    des.dataset.field = "desenvolvimento";
    des.dataset.index = idx;
    des.innerHTML = r.desenvolvimento || "";
    if(!state.isViewMode) des.contentEditable = "true";
    td3.appendChild(des);

    // ✅ COL 4: Materiais
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
      state.rows[idx][field] = el.innerHTML;
    });

    el.addEventListener("focus", () => showToolbar());
    el.addEventListener("blur", () => {
      // delay: allow toolbar click
      setTimeout(() => {
        if(!document.activeElement.closest?.(".toolbar")) hideToolbar();
      }, 120);
    });
  });

  const coord = document.getElementById("coordMessage");
  if(coord && coord.getAttribute("contenteditable") === "true"){
    coord.addEventListener("input", () => {
      state.coordMessage = coord.innerHTML;
    });
  }

  const teacher = document.getElementById("teacherName");
  if(teacher && teacher.getAttribute("contenteditable") === "true"){
    teacher.addEventListener("input", () => {
      state.teacher = teacher.innerText.trim();
    });
  }

  const dateField = document.getElementById("dateField");
  if(dateField && dateField.getAttribute("contenteditable") === "true"){
    dateField.addEventListener("input", () => {
      state.dateText = dateField.innerText.trim();
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
    // prevent losing focus of editable while clicking toolbar
    e.preventDefault();
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

/* =========================
   WEEK + TERM PICKERS
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

function initWeekPicker(){
  const weekBtn = document.getElementById("weekBtn");
  const weekModal = document.getElementById("weekModal");
  const monthSelect = document.getElementById("monthSelect");
  const weekSelect = document.getElementById("weekSelect");

  if(!weekBtn || !weekModal || !monthSelect || !weekSelect) return;
  if(state.isViewMode) return;

  // months
  const now = new Date();
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
    weeks.forEach((w, i) => {
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
    const newMon = fromISODate(iso);
    await setWeek(newMon);
    closeModal("weekModal");
  });
}

function initTermPicker(){
  const termBtn = document.getElementById("termBtn");
  const termModal = document.getElementById("termModal");
  const termSelect = document.getElementById("termSelect");

  if(!termBtn || !termModal || !termSelect) return;
  if(state.isViewMode) return;

  termBtn.addEventListener("click", () => openModal("termModal"));
  document.getElementById("closeTermModal")?.addEventListener("click", () => closeModal("termModal"));

  document.getElementById("applyTerm")?.addEventListener("click", async () => {
    state.term = termSelect.value;
    document.getElementById("termLabel").textContent = `${state.term}º Bimestre - LIVRO/TURMA`;
    setQueryParams({ term: state.term });
    await loadFromBackend();
    closeModal("termModal");
  });
}

/* =========================
   BACKEND (load/save)
========================= */

function makeKey(){
  // key = term + weekStart iso
  return `${state.term}_${toISODate(state.weekStart)}`;
}

async function loadFromBackend(){
  if(!API_URL || API_URL.includes("COLE_AQUI")) return;

  const key = makeKey();
  const url = `${API_URL}?action=get&key=${encodeURIComponent(key)}`;

  try{
    const res = await fetch(url, { method:"GET" });
    const data = await res.json();

    if(data && data.ok && data.payload){
      const p = data.payload;

      state.teacher = p.teacher || state.teacher;
      state.dateText = p.dateText || state.dateText;
      state.coordMessage = p.coordMessage || "";

      // rows
      if(Array.isArray(p.rows) && p.rows.length === 5){
        state.rows = p.rows;
      }

      hydrateUI();
    }
  }catch(err){
    console.warn("Falha ao carregar:", err);
  }
}

async function saveToBackend(){
  if(!API_URL || API_URL.includes("COLE_AQUI")) {
    alert("Cole a URL do Web App do Apps Script em app.js (API_URL).");
    return;
  }

  const key = makeKey();

  const payload = {
    key,
    term: state.term,
    weekStart: toISODate(state.weekStart),
    teacher: state.teacher,
    dateText: state.dateText,
    rows: state.rows,
    coordMessage: state.coordMessage,
  };

  // Vamos salvar via GET para ficar simples (mais compatível)
  const url = `${API_URL}?action=save&data=${encodeURIComponent(JSON.stringify(payload))}`;

  try{
    const res = await fetch(url, { method:"GET" });
    const data = await res.json();
    if(data?.ok){
      toast("Salvo ✅");
    }else{
      toast("Não salvou (verifique Apps Script)");
    }
  }catch(err){
    console.warn("Falha ao salvar:", err);
    toast("Falha ao salvar (verifique CORS/Deploy)");
  }
}

/* =========================
   UI HYDRATE
========================= */
function hydrateUI(){
  const weekLabel = document.getElementById("weekLabel");
  const dateField = document.getElementById("dateField");
  const teacherName = document.getElementById("teacherName");
  const coordMessage = document.getElementById("coordMessage");
  const termLabel = document.getElementById("termLabel");

  if(termLabel) termLabel.textContent = `${state.term}º Bimestre - LIVRO/TURMA`;
  if(weekLabel) weekLabel.textContent = state.weekLabel;
  if(dateField) dateField.innerText = state.dateText;
  if(teacherName) teacherName.innerText = state.teacher;

  if(coordMessage){
    if(!state.isViewMode) coordMessage.setAttribute("contenteditable","true");
    coordMessage.innerHTML = state.coordMessage || "";
  }

  renderRows();
}

async function setWeek(mondayDate){
  state.weekStart = mondayDate;

  const mon = new Date(mondayDate);
  const fri = new Date(mondayDate);
  fri.setDate(fri.getDate()+4);

  const label = `(${mon.getDate()} a ${fri.getDate()} de ${MONTHS_PT[mon.getMonth()]})`;
  state.weekLabel = label;
  state.dateText = `${mon.getDate()} a ${fri.getDate()} de ${MONTHS_PT[mon.getMonth()]}`;

  // default rows for this week
  state.rows = buildInitialRows(state.weekStart);

  setQueryParams({
    term: state.term,
    week: toISODate(state.weekStart),
  });

  hydrateUI();
  await loadFromBackend();
}

/* =========================
   SHARE (WhatsApp)
========================= */
function initShare(){
  const shareBtn = document.getElementById("shareBtn");
  if(!shareBtn || state.isViewMode) return;

  shareBtn.addEventListener("click", async () => {
    // salva antes de compartilhar
    await saveToBackend();

    const base = window.location.origin + window.location.pathname.replace("index.html","").replace(/\/$/,"/");
    const viewLink = `${base}view.html?term=${encodeURIComponent(state.term)}&week=${encodeURIComponent(toISODate(state.weekStart))}`;

    const msg = `Lesson Prep (somente leitura):\n${viewLink}`;
    const wa = `https://wa.me/?text=${encodeURIComponent(msg)}`;

    window.open(wa, "_blank");
  });
}

/* =========================
   LOAD FROM QUERY
========================= */
function applyQueryState(){
  const q = getQueryParams();

  if(q.term) state.term = q.term;
  const termLabel = document.getElementById("termLabel");
  if(termLabel) termLabel.textContent = `${state.term}º Bimestre - LIVRO/TURMA`;

  let w = q.week ? fromISODate(q.week) : defaultWeekIfNone();
  state.weekStart = mondayOf(w);

  const mon = new Date(state.weekStart);
  const fri = new Date(state.weekStart);
  fri.setDate(fri.getDate()+4);

  state.weekLabel = `(${mon.getDate()} a ${fri.getDate()} de ${MONTHS_PT[mon.getMonth()]})`;
  state.dateText = `${mon.getDate()} a ${fri.getDate()} de ${MONTHS_PT[mon.getMonth()]}`;

  state.rows = buildInitialRows(state.weekStart);
}

/* =========================
   TOAST
========================= */
function toast(text){
  const t = document.createElement("div");
  t.style.position = "fixed";
  t.style.left = "50%";
  t.style.bottom = "90px";
  t.style.transform = "translateX(-50%)";
  t.style.background = "#111";
  t.style.color = "#fff";
  t.style.padding = "10px 12px";
  t.style.borderRadius = "14px";
  t.style.fontWeight = "800";
  t.style.boxShadow = "0 10px 24px rgba(0,0,0,.25)";
  t.style.zIndex = "99999";
  t.textContent = text;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(), 1600);
}

/* =========================
   INIT
========================= */
async function init(){
  applyQueryState();
  initToolbar();

  hydrateUI();

  initWeekPicker();
  initTermPicker();
  initShare();

  // Save button
  const saveBtn = document.getElementById("saveBtn");
  if(saveBtn && !state.isViewMode){
    saveBtn.addEventListener("click", saveToBackend);
  }

  // load saved data
  await loadFromBackend();
}

init();
