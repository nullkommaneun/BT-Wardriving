// einfache Heuristik-Mapping
const uuidMap = {
  "fddf": { category: "Audio", vendor: "JBL", icon: "🎵" },
  "fe07": { category: "Fahrzeug/Telematik", vendor: "unbekannt", icon: "🚚" },
  "fe61": { category: "IoT/SmartHome", vendor: "unbekannt", icon: "🏠" },
  "fecf": { category: "Wearable", vendor: "unbekannt", icon: "⌚" }
};

// Namensbasierte Muster
function nameHeuristics(name) {
  const n = (name || "").toLowerCase();
  if (n.includes("jbl")) return { category: "Audio", vendor: "JBL", icon: "🎵" };
  if (n.includes("samsung") || n.includes("tv")) return { category: "Unterhaltung", vendor: "Samsung", icon: "📺" };
  if (n.includes("dtco")) return { category: "Fahrzeug", vendor: "DTCO", icon: "🚛" };
  if (n.includes("led_ble")) return { category: "Beleuchtung", vendor: "unbekannt", icon: "💡" };
  if (n.includes("sierzega")) return { category: "Verkehr", vendor: "Sierzega", icon: "🚦" };
  if (n.includes("echo") || n.includes("alexa")) return { category: "Smart Speaker", vendor: "Amazon", icon: "🔊" };
  return null;
}

export function profileDevice(rec) {
  // Erst Name prüfen
  const h = nameHeuristics(rec.deviceName);
  if (h) return h;

  // Sonst UUID-Mapping (nur erste UUID checken)
  if (Array.isArray(rec.serviceUUIDs) && rec.serviceUUIDs.length) {
    const first = rec.serviceUUIDs[0].toLowerCase().replace(/[^a-f0-9]/g, "");
    const short = first.slice(4,8); // z. B. "fddf"
    if (uuidMap[short]) return uuidMap[short];
  }

  return { category: "Unbekannt", vendor: "", icon: "❓" };
}
