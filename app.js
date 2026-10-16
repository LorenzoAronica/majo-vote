/* Majorana Vote — v1.0, nessuna libreria esterna. Tutti i dati restano nel browser. */
'use strict';

const STORAGE_KEY = 'majorana-vote-v1';
const DEFAULT_TARGET = 9;
const MAX_SUBJECTS = 40;
const GRADE_OPTIONS = Array.from({length: 19}, (_, i) => 1 + i * 0.5);
const format = value => Number.isFinite(value) ? value.toLocaleString('it-IT', {minimumFractionDigits: 1, maximumFractionDigits: 2}) : '—';
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;'}[char]));

function newId() { return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function validNumber(input) {
  if (input === '' || input === null || input === undefined) return NaN;
  return Number(String(input).trim().replace(',', '.'));
}
function clampNumber(value, min, max, fallback) { return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback; }
function normalizeGrade(item) {
  if (!item || typeof item !== 'object') return null;
  const value = Number(item.value), weight = Number(item.weight);
  if (!Number.isFinite(value) || value < 1 || value > 10 || ![0.25, 0.5, 1, 1.5, 2].includes(weight)) return null;
  return {id: typeof item.id === 'string' ? item.id : newId(), value, weight};
}
function normalizeState(raw) {
  const subjects = Array.isArray(raw?.subjects) ? raw.subjects.slice(0, MAX_SUBJECTS).map(item => ({
    id: typeof item?.id === 'string' ? item.id : newId(),
    name: String(item?.name ?? 'Materia').slice(0, 45),
    target: Math.round(clampNumber(Number(item?.target), 1, 10, DEFAULT_TARGET) * 10) / 10,
    grades: Array.isArray(item?.grades) ? item.grades.slice(0, 300).map(normalizeGrade).filter(Boolean) : []
  })) : [];
  const selectedId = subjects.some(subject => subject.id === raw?.selectedId) ? raw.selectedId : (subjects[0]?.id || null);
  return {subjects, selectedId};
}
function loadState() {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? normalizeState(JSON.parse(raw)) : {subjects:[],selectedId:null}; }
  catch { return {subjects:[],selectedId:null}; }
}
let state = loadState();
let toastTimer;
function persist() {
  try {localStorage.setItem(STORAGE_KEY, JSON.stringify(state));}
  catch {notify('Il browser non può salvare i dati. Controlla lo spazio disponibile.');}
}
function notify(message) {
  const element = document.getElementById('toast');
  element.textContent = message; element.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => element.classList.remove('show'), 2900);
}
function computeStats(grades) {
  const weight = grades.reduce((sum, grade) => sum + grade.weight, 0);
  const score = grades.reduce((sum, grade) => sum + grade.value * grade.weight, 0);
  return {weight, score, average: weight ? score / weight : NaN};
}
function selectedSubject() { return state.subjects.find(subject => subject.id === state.selectedId) || null; }

/**
 * Trova la combinazione più equilibrata tra i voti [1, 1.5, ..., 10] che
 * raggiunga almeno la media desiderata. Le combinazioni sono ordinate in
 * modo crescente per evitare duplicati. Prima minimizza lo scarto, poi la
 * dispersione tra i voti, per fornire un esempio semplice e realistico.
 */
function findExampleCombination(requiredSum, count) {
  let best = null, bestExcess = Infinity, bestVariance = Infinity;
  const path = [];
  function visit(startIndex, sum) {
    const missing = count - path.length;
    if (sum + missing * 10 < requiredSum - 1e-8) return;
    if (sum + missing * GRADE_OPTIONS[startIndex] >= requiredSum && bestExcess <= 1e-8) return;
    if (!missing) {
      const excess = sum - requiredSum;
      if (excess < -1e-8) return;
      const mean = sum / count;
      const variance = path.reduce((total, value) => total + (value - mean) ** 2, 0);
      if (excess < bestExcess - 1e-8 || (Math.abs(excess - bestExcess) <= 1e-8 && variance < bestVariance - 1e-8)) {
        best = [...path]; bestExcess = excess; bestVariance = variance;
      }
      return;
    }
    for (let i = startIndex; i < GRADE_OPTIONS.length; i++) {
      path.push(GRADE_OPTIONS[i]);
      visit(i, sum + GRADE_OPTIONS[i]);
      path.pop();
    }
  }
  visit(0, 0);
  return best;
}

function minPerfectGrades(stats, target) {
  if (!stats.weight) return null;
  if (stats.average >= target - 1e-9) return 0;
  if (target >= 10 - 1e-9) return Infinity;
  return Math.max(1, Math.ceil((target * stats.weight - stats.score) / (10 - target) - 1e-9));
}

function render() {
  const totalGrades = state.subjects.reduce((sum, subject) => sum + subject.grades.length, 0);
  const averages = state.subjects.map(subject => computeStats(subject.grades).average).filter(Number.isFinite);
  const overall = averages.length ? averages.reduce((sum, avg) => sum + avg, 0) / averages.length : NaN;
  document.getElementById('overall-average').textContent = format(overall);
  document.getElementById('subject-count').textContent = String(state.subjects.length);
  document.getElementById('grade-count').textContent = String(totalGrades);
  document.getElementById('year').textContent = String(new Date().getFullYear());

  const subjectList = document.getElementById('subject-list');
  subjectList.innerHTML = state.subjects.length ? state.subjects.map(subject => {
    const active = subject.id === state.selectedId;
    const average = computeStats(subject.grades).average;
    const name = escapeHTML(subject.name);
    return `<button type="button" class="subject-item ${active ? 'active' : ''}" data-subject-id="${escapeHTML(subject.id)}" aria-pressed="${active}"><span class="subject-symbol" aria-hidden="true">${name.charAt(0).toLocaleUpperCase('it-IT')}</span><span class="subject-name">${name}</span><span class="subject-average">${format(average)}</span></button>`;
  }).join('') : '<div class="subject-empty">Ancora nessuna materia.<br>Aggiungine una qui sotto!</div>';

  const subject = selectedSubject();
  document.getElementById('empty-detail').hidden = !!subject;
  document.getElementById('detail-content').hidden = !subject;
  if (!subject) return;
  document.getElementById('active-subject-name').textContent = subject.name;
  const stats = computeStats(subject.grades);
  document.getElementById('subject-average').textContent = format(stats.average);
  document.getElementById('subject-grade-count').textContent = String(subject.grades.length);
  document.getElementById('subject-target-badge').textContent = format(subject.target);
  document.getElementById('target-value').value = String(subject.target);
  const gradeList = document.getElementById('grade-list');
  gradeList.innerHTML = subject.grades.length ? subject.grades.map(grade => `<div class="grade-row"><span class="grade-pill">${format(grade.value)}</span><span class="grade-weight">Peso ${Math.round(grade.weight * 100)}%</span><button class="remove-grade" type="button" data-grade-id="${escapeHTML(grade.id)}" aria-label="Rimuovi voto ${format(grade.value)}">×</button></div>`).join('') : '<div class="no-grades">Nessun voto inserito. Aggiungi il primo per calcolare la tua media.</div>';
  renderSimulator(stats, subject.target);
}

function renderSimulator(stats, target) {
  const result = document.getElementById('simulator-result');
  if (!stats.weight) {
    result.innerHTML = '<div class="simulator-intro">Inserisci almeno un voto per scoprire quali risultati ti servono per raggiungere il tuo obiettivo.</div>';
    return;
  }
  const attained = stats.average >= target - 1e-9;
  const intro = `<div class="simulator-intro">Media attuale: <strong>${format(stats.average)}</strong> · Obiettivo: <strong>${format(target)}</strong>. ${attained ? 'Hai già raggiunto questa media! Ecco alcuni esempi per mantenerla dopo altre verifiche.' : 'Ecco quali combinazioni possono portarti almeno al risultato che desideri.'}</div>`;
  let plans = '';
  for (let count = 1; count <= 4; count++) {
    const requiredSum = target * (stats.weight + count) - stats.score;
    const combo = findExampleCombination(requiredSum, count);
    if (combo) {
      const finalAverage = (stats.score + combo.reduce((sum, grade) => sum + grade, 0)) / (stats.weight + count);
      plans += `<div class="plan"><div class="plan-label">Con ${count} ${count === 1 ? 'voto' : 'voti'} in più</div><div class="plan-combo">${combo.map(grade => `<span>${format(grade)}</span>`).join('<b>+</b>')}</div><div class="plan-outcome">Media finale: ${format(finalAverage)}</div></div>`;
    } else {
      plans += `<div class="plan plan-unreachable"><div class="plan-label">Con ${count} ${count === 1 ? 'voto' : 'voti'} in più</div><div class="plan-combo">Non basta</div><div class="plan-outcome">Anche prendendo tutti 10</div></div>`;
    }
  }
  const min = minPerfectGrades(stats, target);
  let note;
  if (min === 0) note = '<div class="min-plan neutral">✦ Hai già raggiunto il tuo obiettivo. Le simulazioni mostrano come puoi mantenerlo.</div>';
  else if (min === Infinity) note = '<div class="min-plan warning">Raggiungere una media esatta di 10 non è possibile con un numero finito di nuovi voti se hai già voti inferiori a 10.</div>';
  else note = `<div class="min-plan">✦ Numero minimo teorico di nuovi voti: <strong>${min}</strong>, se fossero tutti 10 con peso 100%.</div>`;
  result.innerHTML = intro + `<div class="simulator-grid">${plans}</div>` + note;
}

function addSubject(name) {
  const cleanName = name.trim().replace(/\s+/g, ' ');
  if (!cleanName || cleanName.length > 45) return notify('Inserisci un nome valido (massimo 45 caratteri).');
  if (state.subjects.length >= MAX_SUBJECTS) return notify('Hai raggiunto il numero massimo di materie.');
  if (state.subjects.some(subject => subject.name.toLocaleLowerCase('it-IT') === cleanName.toLocaleLowerCase('it-IT'))) return notify('Questa materia è già presente.');
  const subject = {id:newId(),name:cleanName,target:DEFAULT_TARGET,grades:[]};
  state.subjects.push(subject); state.selectedId = subject.id; persist(); render();
  document.getElementById('grade-value').focus();
}

document.getElementById('subject-form').addEventListener('submit', event => {
  event.preventDefault(); const input = document.getElementById('subject-name');
  addSubject(input.value); input.value = '';
});
document.getElementById('subject-list').addEventListener('click', event => {
  const button = event.target.closest('[data-subject-id]'); if (!button) return;
  state.selectedId = button.dataset.subjectId; persist(); render();
});
document.getElementById('hero-add').addEventListener('click', () => {
  document.getElementById('subject-name').scrollIntoView({behavior:'smooth',block:'center'});
  document.getElementById('subject-name').focus({preventScroll:true});
});
document.getElementById('grade-form').addEventListener('submit', event => {
  event.preventDefault(); const subject = selectedSubject(); if (!subject) return;
  const input = document.getElementById('grade-value');
  const grade = validNumber(input.value); const weight = Number(document.getElementById('grade-weight').value);
  if (!Number.isFinite(grade) || grade < 1 || grade > 10 || Math.abs(grade * 100 - Math.round(grade * 100)) > 1e-7 || ![0.25,0.5,1,1.5,2].includes(weight)) return notify('Inserisci un voto valido da 1 a 10.');
  subject.grades.push({id:newId(),value:grade,weight});
  persist(); render(); input.value = ''; input.focus();
});
document.getElementById('grade-list').addEventListener('click', event => {
  const button = event.target.closest('[data-grade-id]'); if (!button) return;
  const subject = selectedSubject(); if (!subject) return;
  subject.grades = subject.grades.filter(grade => grade.id !== button.dataset.gradeId);
  persist(); render();
});
document.getElementById('target-value').addEventListener('change', event => {
  const subject = selectedSubject(); if (!subject) return;
  const target = validNumber(event.target.value);
  if (!Number.isFinite(target) || target < 1 || target > 10) {
    notify('L’obiettivo deve essere compreso tra 1 e 10.'); event.target.value = subject.target; return;
  }
  subject.target = Math.round(target * 10) / 10; persist(); render();
});
document.getElementById('delete-subject').addEventListener('click', () => {
  const subject = selectedSubject(); if (!subject) return;
  if (!confirm(`Eliminare ${subject.name} e tutti i voti inseriti?`)) return;
  state.subjects = state.subjects.filter(item => item.id !== subject.id);
  state.selectedId = state.subjects[0]?.id || null;
  persist(); render(); notify('Materia eliminata.');
});
document.getElementById('reset-data').addEventListener('click', () => {
  if (!state.subjects.length) return notify('Non ci sono dati da cancellare.');
  if (!confirm('Eliminare tutte le materie e tutti i voti salvati su questo dispositivo?')) return;
  state = {subjects:[],selectedId:null}; persist(); render(); notify('Tutti i dati sono stati eliminati.');
});
document.getElementById('load-demo').addEventListener('click', () => {
  if (state.subjects.length && !confirm('Caricare i dati di esempio? Le materie e i voti attuali saranno sostituiti.')) return;
  const mk = (name, values, target) => ({id:newId(),name,target,grades:values.map(value=>({id:newId(),value,weight:1}))});
  const subjects=[mk('Matematica',[7,7,7,7],9),mk('Italiano',[8,7.5,9],8.5),mk('Inglese',[7.5,8,8.5],9)];
  state={subjects,selectedId:subjects[0].id}; persist(); render();
  document.querySelector('.section-heading').scrollIntoView({behavior:'smooth',block:'start'});
  notify('Esempio caricato: puoi modificarlo liberamente.');
});
render();
