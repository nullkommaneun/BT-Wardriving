export function clusterRecords(records, windowMs = 5000) {
  const out = [];
  const buckets = new Map();
  for (const r of records) {
    const firstUUID = (Array.isArray(r.serviceUUIDs) && r.serviceUUIDs.length) ? r.serviceUUIDs[0] : "";
    const key = (r.deviceName || "(anon)") + "|" + firstUUID;
    const t = Date.parse(r.timestamp);
    let cluster = buckets.get(key);
    if (!cluster || (t - cluster.lastTs) > windowMs) {
      cluster = {
        key,
        timestamp: r.timestamp,
        deviceName: r.deviceName || "",
        serviceUUIDs: new Set(r.serviceUUIDs || []),
        rssis: [],
        lats: [],
        lngs: [],
        lastTs: t
      };
      buckets.set(key, cluster);
      out.push(cluster);
    }
    for (const u of (r.serviceUUIDs || [])) cluster.serviceUUIDs.add(u);
    if (Number.isFinite(r.rssi)) cluster.rssis.push(r.rssi);
    if (typeof r.latitude === "number")  cluster.lats.push(r.latitude);
    if (typeof r.longitude === "number") cluster.lngs.push(r.longitude);
    cluster.lastTs = t;
  }
  return out.map(c => ({
    timestamp: c.timestamp,
    deviceName: c.deviceName,
    serviceUUIDs: Array.from(c.serviceUUIDs),
    rssi: c.rssis.length ? Math.round(c.rssis.reduce((a,b)=>a+b,0)/c.rssis.length) : null,
    latitude:  c.lats.length ? c.lats.reduce((a,b)=>a+b,0)/c.lats.length : null,
    longitude: c.lngs.length ? c.lngs.reduce((a,b)=>a+b,0)/c.lngs.length : null
  }));
}
