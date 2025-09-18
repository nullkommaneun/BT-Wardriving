import { GeoTracker } from './geo.js';
import { StorageManager } from './storage.js';
import { MapView } from './map.js';
import { applyFilters } from './filters.js';
import { exportJSON, exportCSV } from './export.js';
import { BLEScanner } from './ble.js';
import { clusterRecords } from './cluster.js';
import { profileDevice } from './profiler.js';

const $ = sel => document.querySelector(sel);

const state = {
  all: [],
  filtered: [],
  heatOn: false
};

const MAX_ROWS = 5; // maximale Zeilen in der Tabelle

function setStatus(msg) { $('#status').textContent = msg; }
function setSupportBadge(txt, ok=true) {
  const el = $('#supportBadge');
  el.textContent = `Support: ${txt}`;
  el.style.background = ok ? '#263042' : '#4a1f1f';
  el.style.color = ok ? '#9aa0a6' : '#ffd7d7';
}

function validateRecord(rec) {
  try {
    const out = {
      timestamp: new Date(rec.timestamp).toISOString(),
      deviceName: String(rec.deviceName || ''),
      serviceUUIDs: Array.isArray(rec.serviceUUIDs) ? rec.serviceUUIDs.map(x => String(x)) : [],
      rssi: Number.isFinite(rec.rssi) ? Math.trunc(rec.rssi) : null,
      latitude:  (typeof rec.latitude  === 'number' && Number.isFinite(rec.latitude))  ? rec.latitude  : null,
      longitude: (typeof rec.longitude === 'number' && Number.isFinite(rec.longitude)) ? rec.longitude : null
    };
    return out;
  } catch {
    return null;
  }
}

function renderTable(records) {
  const body = $('#tblBody');
  body.innerHTML = '';

  if (!records.length) {
    $('#empty').classList.remove('hidden');
    return;
  }
  $('#empty').classList.add('hidden');

  const shown = records.slice(0, MAX_ROWS);
  const frag = document.createDocumentFragment();

  for (const r of shown) {
    const prof = profileDevice(r); // {icon, category, vendor}
    const tr = document.createElement('tr');
    const td = (txt) => { const x = document.createElement('td'); x.textContent = txt; return x; };

    tr.appendChild(td(r.timestamp));
    const nameWithIcon = `${prof?.icon ? prof.icon + ' ' : ''}${r.deviceName || ''}`;
    tr.appendChild(td(nameWithIcon));
    tr.appendChild(td((r.serviceUUIDs && r.serviceUUIDs.length) ? r.serviceUUIDs.join(';') : ''));
    tr.appendChild(td(Number.isFinite(r.rssi) ? String(r.rssi) : ''));
    tr.appendChild(td(typeof r.latitude  === 'number' ? r.latitude.toFixed(6)  : ''));
    tr.appendChild(td(typeof r.longitude === 'number' ? r.longitude.toFixed(6) : ''));
    frag.appendChild(tr);
  }

  if (records.length > MAX_ROWS) {
    const more = document.createElement('tr');
    const tdMore = document.createElement('td');
    tdMore.colSpan = 6;
    tdMore.textContent = `… ${records.length - MAX_ROWS} weitere Einträge verborgen (Liste begrenzt auf ${MAX_ROWS}).`;
    more.appendChild(tdMore);
    frag.appendChild(more);
  }

  body.appendChild(frag);
}

function applyAndRenderFilters() {
  const criteria = {
    name: $('#fltName').value,
    rssiMin: Number($('#fltRssiMin').value),
    rssiMax: Number($('#fltRssiMax').value),
    fromIso: $('#fltFrom').value ? new Date($('#fltFrom').value).toISOString() : null,
    toIso: $('#fltTo').value ? new Date($('#fltTo').value).toISOString() : null
  };
  if (!Number.isFinite(criteria.rssiMin)) delete criteria.rssiMin;
  if (!Number.isFinite(criteria.rssiMax)) delete criteria.rssiMax;

  let filtered = applyFilters(state.all, criteria);
  if ($('#chkCluster').checked) {
    filtered = clusterRecords(filtered, 5000);
  }

  state.filtered = filtered;
  renderTable(state.filtered);
  mapView.clear();
  for (const r of state.filtered) mapView.addRecord(r);
  if (state.heatOn) mapView.setHeat(state.filtered);
  mapView.fitToData();
  $('#legend').classList.toggle('hidden', !state.heatOn);
}

function hookFilters() {
  ['#fltName','#fltRssiMin','#fltRssiMax','#fltFrom','#fltTo','#chkCluster'].forEach(sel => {
    document.querySelector(sel).addEventListener('input', applyAndRenderFilters);
    document.querySelector(sel).addEventListener('change', applyAndRenderFilters);
  });
  $('#chkHeatmap').addEventListener('change', (e)=>{
    state.heatOn = !!e.target.checked;
    applyAndRenderFilters();
  });
}

const storage = new StorageManager(setStatus);
const geo = new GeoTracker(setStatus);
const mapView = new MapView();
let scanner = null;

async function bootstrap() {
  mapView.init('map');
  await storage.init();
  geo.start();
  state.all = await storage.getAll();
  applyAndRenderFilters();

  if (!('bluetooth' in navigator)) {
    setSupportBadge('Web Bluetooth NICHT verfügbar', false);
  } else {
    const tmpScanner = new BLEScanner(()=>{}, ()=>null, ()=>{});
    const sup = tmpScanner.getSupportSummary();
    if (sup.hasLEScan) setSupportBadge('LE-Scan verfügbar');
    else if (sup.canWatch) setSupportBadge('Nur watchAdvertisements (Auswahl nötig)');
    else setSupportBadge('Bluetooth vorhanden, Scan nicht verfügbar', false);
  }

  $('#btnStart').addEventListener('click', onStartScan);
  $('#btnStop').addEventListener('click', onStopScan);
  $('#btnExportJSON').addEventListener('click', () => exportJSON(state.filtered.length ? state.filtered : state.all));
  $('#btnExportCSV').addEventListener('click', () => exportCSV(state.filtered.length ? state.filtered : state.all));
  $('#btnClear').addEventListener('click', onClear);

  hookFilters();
  setStatus('Bereit.');
}

async function onStartScan() {
  if (scanner && scanner.active) return;
  $('#btnStart').disabled = true;
  setStatus('Starte Scan… bitte Berechtigungen bestätigen.');
  scanner = new BLEScanner(setStatus, () => geo.getSnapshot(), async (recRaw) => {
    const rec = validateRecord(recRaw);
    if (!rec) return;
    if (state.all.some(r => r.timestamp === rec.timestamp)) {
      rec.timestamp = new Date(Date.parse(rec.timestamp)+1).toISOString();
    }
    await storage.add(rec);
    state.all.push(rec);
    applyAndRenderFilters();
  });

  try {
    await scanner.start();
    $('#btnStop').disabled = false;
    setStatus('Scan läuft. Anzeigen werden fortlaufend hinzugefügt.');
  } catch (e) {
    setStatus(`Scan-Start fehlgeschlagen: ${e.message}`);
    $('#btnStart').disabled = false;
  }
}

async function onStopScan() {
  if (!scanner) return;
  $('#btnStop').disabled = true;
  await scanner.stop();
  $('#btnStart').disabled = false;
  setStatus('Scan gestoppt.');
}

async function onClear() {
  await onStopScan();
  await storage.clear();
  state.all = [];
  state.filtered = [];
  mapView.clear();
  renderTable([]);
  $('#empty').classList.remove('hidden');
  setStatus('Alle Daten gelöscht.');
}

bootstrap();
