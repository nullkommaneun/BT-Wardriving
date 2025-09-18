export class GeoTracker {
  constructor(statusCb = ()=>{}) {
    this.watchId = null;
    this.latest = null; // {lat, lng, ts}
    this.statusCb = statusCb;
  }
  start(opts={}) {
    if (!('geolocation' in navigator)) {
      this.statusCb('Geolocation nicht verfügbar.');
      return;
    }
    if (this.watchId !== null) return;
    const { enableHighAccuracy=false, timeout=10000, maximumAge=5000 } = opts;
    this.watchId = navigator.geolocation.watchPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        this.latest = { lat: latitude, lng: longitude, ts: Date.now() };
      },
      err => {
        this.statusCb(`Geolocation-Fehler: ${err.message}`);
      },
      { enableHighAccuracy, timeout, maximumAge }
    );
  }
  stop() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }
  getSnapshot() {
    return this.latest ? { ...this.latest } : null;
  }
}
