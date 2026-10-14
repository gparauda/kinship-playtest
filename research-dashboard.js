"use strict";

let sessions = [];
let meanTurnsChart;
let distributionChart;

const $ = (id) => document.getElementById(id);
const labels = {
  age_band: "Age band",
  game_experience: "Game experience",
  first_game: "First game",
  playtest_condition: "Condition",
};

async function requestAnalysis(password) {
  const response = await fetch(KINSHIP_SYNC_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: KINSHIP_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${KINSHIP_SUPABASE_PUBLISHABLE_KEY}` },
    body: JSON.stringify({ action: "get_analysis", dashboardPassword: password }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Dashboard data could not be loaded.");
  return data.sessions || [];
}

function uniqueValues(field) {
  return [...new Set(sessions.map((row) => String(row[field] ?? "Not recorded")))].sort();
}

function fillOptions(id, values) {
  const select = $(id);
  values.forEach((value) => select.add(new Option(value, value)));
}

function filteredSessions() {
  return sessions.filter((row) =>
    (!$('filter-age').value || row.age_band === $('filter-age').value) &&
    (!$('filter-experience').value || row.game_experience === $('filter-experience').value) &&
    (!$('filter-first').value || String(row.first_game) === $('filter-first').value)
  );
}

function groupRows(rows) {
  const first = $('group-one').value;
  const second = $('group-two').value;
  const groups = new Map();
  rows.forEach((row) => {
    const key = [row[first] ?? "Not recorded", second ? row[second] ?? "Not recorded" : null].filter((x) => x !== null).join(" · ");
    const group = groups.get(key) || [];
    group.push(row); groups.set(key, group);
  });
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function renderMetrics(rows) {
  const mean = rows.length ? rows.reduce((sum, row) => sum + Number(row.turns_survived || 0), 0) / rows.length : 0;
  $('metrics').innerHTML = `<div class="metric"><span>Completed sessions</span><strong>${rows.length}</strong></div><div class="metric"><span>Mean turns survived</span><strong>${mean.toFixed(1)}</strong></div><div class="metric"><span>Victories</span><strong>${rows.filter((row) => row.victory).length}</strong></div>`;
}

function renderCharts(rows) {
  const groups = groupRows(rows);
  const groupLabels = groups.map(([label]) => label);
  const means = groups.map(([, values]) => values.reduce((sum, row) => sum + Number(row.turns_survived || 0), 0) / values.length);
  meanTurnsChart?.destroy();
  meanTurnsChart = new Chart($('mean-turns-chart'), { type: 'bar', data: { labels: groupLabels, datasets: [{ label: 'Mean turns survived', data: means, backgroundColor: '#80683d' }] }, options: { responsive: true, scales: { y: { beginAtZero: true, max: 100 } } } });

  const bins = Array.from({ length: 10 }, (_, i) => ({ label: `${i * 10 + 1}–${(i + 1) * 10}`, count: 0 }));
  rows.forEach((row) => bins[Math.min(9, Math.floor((Number(row.turns_survived || 1) - 1) / 10))].count++);
  distributionChart?.destroy();
  distributionChart = new Chart($('distribution-chart'), { type: 'bar', data: { labels: bins.map((bin) => bin.label), datasets: [{ label: 'Sessions', data: bins.map((bin) => bin.count), backgroundColor: '#53765b' }] }, options: { responsive: true } });
}

function renderTable(rows) {
  $('session-table').innerHTML = rows.map((row) => `<tr><td>${row.turns_survived ?? ''}</td><td>${row.age_band ?? ''}</td><td>${row.game_experience ?? ''}</td><td>${row.first_game ? 'Yes' : 'No'}</td><td>${Number(row.mean_food_workers || 0).toFixed(2)}</td><td>${Number(row.mean_hunt_workers || 0).toFixed(2)}</td><td>${Number(row.mean_kinship_workers || 0).toFixed(2)}</td><td>${Number(row.mean_technology_workers || 0).toFixed(2)}</td><td>${Number(row.mean_worship_workers || 0).toFixed(2)}</td></tr>`).join('');
}

function refresh() {
  const rows = filteredSessions();
  renderMetrics(rows); renderCharts(rows); renderTable(rows);
}

function solve(matrix, vector) {
  const a = matrix.map((row, i) => [...row, vector[i]]); const n = a.length;
  for (let col = 0; col < n; col++) {
    let pivot = col; for (let row = col + 1; row < n; row++) if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    if (Math.abs(a[pivot][col]) < 1e-10) return null;
    [a[col], a[pivot]] = [a[pivot], a[col]];
    const divisor = a[col][col]; for (let j = col; j <= n; j++) a[col][j] /= divisor;
    for (let row = 0; row < n; row++) if (row !== col) { const factor = a[row][col]; for (let j = col; j <= n; j++) a[row][j] -= factor * a[col][j]; }
  }
  return a.map((row) => row[n]);
}

function runRegression() {
  const predictors = ['mean_food_workers', 'mean_hunt_workers', 'mean_kinship_workers', 'mean_technology_workers'];
  const rows = filteredSessions().filter((row) => predictors.every((field) => Number.isFinite(Number(row[field]))));
  if (rows.length < predictors.length + 3) { $('regression-output').textContent = `Need at least ${predictors.length + 3} complete filtered sessions; found ${rows.length}.`; return; }
  const x = rows.map((row) => [1, ...predictors.map((field) => Number(row[field]))]); const y = rows.map((row) => Number(row.turns_survived));
  const xtx = x[0].map((_, i) => x[0].map((__, j) => x.reduce((sum, row) => sum + row[i] * row[j], 0))); const xty = x[0].map((_, i) => x.reduce((sum, row, index) => sum + row[i] * y[index], 0));
  const coefficients = solve(xtx, xty);
  if (!coefficients) { $('regression-output').textContent = 'Model cannot be estimated: the selected allocation predictors are linearly dependent in this sample.'; return; }
  $('regression-output').textContent = ['OLS: turns survived', ...['Intercept', ...predictors].map((name, i) => `${name.padEnd(28)} ${coefficients[i].toFixed(3)}`), `\nSessions: ${rows.length}`, '\nInterpretation: descriptive association only.'].join('\n');
}

$('access-form').addEventListener('submit', async (event) => {
  event.preventDefault(); $('access-message').textContent = 'Loading…';
  try {
    sessions = await requestAnalysis($('dashboard-password').value);
    sessionStorage.setItem('kinship-dashboard-password', $('dashboard-password').value);
    fillOptions('filter-age', uniqueValues('age_band')); fillOptions('filter-experience', uniqueValues('game_experience'));
    ['group-one', 'group-two'].forEach((id) => { $(id).innerHTML = id === 'group-two' ? '<option value="">None</option>' : ''; Object.entries(labels).forEach(([value, label]) => $(id).add(new Option(label, value))); });
    $('group-one').value = 'game_experience'; $('access-panel').hidden = true; $('dashboard').hidden = false; refresh();
  } catch (error) { $('access-message').textContent = error.message; }
});

['filter-age', 'filter-experience', 'filter-first', 'group-one', 'group-two'].forEach((id) => $(id).addEventListener('change', refresh));
$('run-regression').addEventListener('click', runRegression);
