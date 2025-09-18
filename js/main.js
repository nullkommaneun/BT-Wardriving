import { GeoTracker } from './geo.js';
import { StorageManager } from './storage.js';
import { MapView } from './map.js';
import { BLEScanner } from './ble.js';
import { SessionManager } from './session.js';
import { profileDevice } from './profiler.js';

const $ = sel => document.querySelector(sel);

const state = {
  all: [], driveMode:false, packetCount:0, uniqueDevices:new Set(),
  sessionId:null, rateWindow:[], counterTimer:null, wakeLock:null
};

function pruneRateWindow(now=Date.now()){const cutoff=now-60000;while(state.rateWindow.length && state.rateWindow[0]<cutoff) state.rateWindow.shift();}
function updateCounters(){const now=Date.now();pruneRateWindow(now);$('#counterDevices').textContent=state.uniqueDevices.size;$('#counterPackets').textContent=state.packetCount;$('#counterRate').textContent=`${state.rateWindow.length}/min`;$('#sessionId').textContent=state.sessionId||'–';}

function renderTable(records){const body=$('#tblBody');body.innerHTML='';if(!records.length){$('#empty').style.display='block';return;}$('#empty').style.display='none';const shown=records.slice(0,5);for(const r of shown){const tr=document.createElement('tr');tr.innerHTML=`<td>${r.timestamp}</td><td>${r.icon||''} ${r.deviceName||''}</td><td>${r.serviceUUIDs.join(';')}</td><td>${r.rssi}</td><td>${r.latitude}</td><td>${r.longitude}</td>`;body.appendChild(tr);}}

const storage=new StorageManager(),geo=new GeoTracker(),mapView=new MapView(),sessions=new SessionManager(id=>{state.sessionId=id;});
let scanner=null;

async function onStartScan(){scanner=new BLEScanner(()=>{},()=>geo.getSnapshot(),async recRaw=>{const rec={...recRaw,timestamp:new Date().toISOString(),sessionId:sessions.ensureActiveSession()};const prof=profileDevice(rec);Object.assign(rec,prof);state.all.push(rec);await storage.add(rec);state.packetCount++;const now=Date.now();state.rateWindow.push(now);pruneRateWindow(now);const key=(rec.deviceName||'')+(rec.serviceUUIDs[0]||'');state.uniqueDevices.add(key);renderTable(state.all);});await scanner.start();}

$('#btnStart').onclick=onStartScan;
if(!state.counterTimer) state.counterTimer=setInterval(updateCounters,1000);
