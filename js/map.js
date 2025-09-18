import { profileDevice } from './profiler.js';

export class MapView {
  constructor() {
    this.map = null;
    this.markers = L.layerGroup();
    this.heat = null;
    this.hasHeat = !!L.heatLayer;
  }

  init(domId = 'map') {
    this.map = L.map(domId, { zoomControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(this.map);
    this.markers.addTo(this.map);
    this.map.setView([51.1657, 10.4515], 5); // Deutschland-Start
  }

  clear() {
    this.markers.clearLayers();
    if (this.heat) { this.map.removeLayer(this.heat); this.heat = null; }
  }

  addRecord(rec) {
    if (typeof rec.latitude !== 'number' || typeof rec.longitude !== 'number') return;

    const prof = profileDevice(rec); // { category, vendor, icon }

    const popup = [
      `<b>${rec.deviceName || '(kein Name)'}</b> ${prof.icon || ''}`,
      `Kategorie: ${prof.category}`,
      `Hersteller: ${prof.vendor || '(unbekannt)'}`,
      `Zeit: ${rec.timestamp}`,
      `RSSI: ${Number.isFinite(rec.rssi) ? rec.rssi : '–'} dBm`,
      `UUIDs: ${rec.serviceUUIDs && rec.serviceUUIDs.length ? rec.serviceUUIDs.join(', ') : '(leer)'}`,
      `Pos: ${rec.latitude.toFixed(6)}, ${rec.longitude.toFixed(6)}`
    ].join('<br>');

    const m = L.marker([rec.latitude, rec.longitude]);
    m.bindPopup(popup);
    this.markers.addLayer(m);
  }

  fitToData() {
    const bounds = this.markers.getLayers().map(m => m.getLatLng());
    if (bounds.length) {
      this.map.fitBounds(L.latLngBounds(bounds), { padding: [24, 24] });
    }
  }

  setHeat(records) {
    if (!this.hasHeat) return;
    if (this.heat) { this.map.removeLayer(this.heat); this.heat = null; }
    if (!records.length) return;

    // RSSI [-90 … -30] → Gewicht [0 … 1]
    const toWeight = rssi => {
      const min = -90, max = -30;
      if (!Number.isFinite(rssi)) return 0;
      const clamped = Math.max(min, Math.min(max, rssi));
      return (clamped - min) / (max - min);
    };

    const pts = records
      .filter(r => typeof r.latitude === 'number' && typeof r.longitude === 'number')
      .map(r => [r.latitude, r.longitude, toWeight(r.rssi)]);

    if (!pts.length) return;

    this.heat = L.heatLayer(pts, { radius: 25, blur: 15, maxZoom: 17 });
    this.heat.addTo(this.map);
  }
}
