// Einfache Heuristik für Kategorie/Vendor/Icon.
// Erweiterbar: weitere UUIDs/Name-Muster ergänzen.

const uuidMap = {
  "fddf": { category: "Audio",               vendor: "JBL",       icon: "🎵" },
  "fef3": { category: "IoT/Tracker",         vendor: "",          icon: "📡" },
  "fcf1": { category: "IoT/Beacon",          vendor: "",          icon: "📡" },
  "fe07": { category: "Fahrzeug/Telematik",  vendor: "",          icon: "🚚" },
  "fe61": { category: "Smart Home / IoT",    vendor: "",          icon: "🏠" },
  "fecf": { category: "Wearable",            vendor: "",          icon: "⌚" }
};

function nameHeuristics(name) {
  const n = (name || "").toLowerCase();
  if (n.includes("jbl"))           return { category: "Audio",              vendor: "JBL",      icon: "🎵" };
  if (n.includes("samsung") || n.includes("tv"))
                                   return { category: "Unterhaltung",       vendor: "Samsung",  icon: "📺" };
  if (n.includes("dtco"))          return { category: "Fahrzeug",           vendor: "DTCO",     icon: "🚛" };
  if (n.includes("led_ble"))       return { category: "Beleuchtung",        vendor: "",         icon: "💡" };
  if (n.includes("sierzega"))      return { category: "Verkehr",            vendor: "Sierzega", icon: "🚦" };
  if (n.includes("echo") || n.includes("alexa"))
                                   return { category: "Smart Speaker",      vendor: "Amazon",   icon: "🔊" };
  if (n.includes("nothing ear") || n.includes("galaxy watch") || n.includes("buds"))
                                   return { category: "Wearable",           vendor: "",         icon: "⌚" };
  return null;
}

export function profileDevice(rec) {
  const byName = nameHeuristics(rec.deviceName);
  if (byName) return byName;

  if (Array.isArray(rec.serviceUUIDs) && rec.serviceUUIDs.length) {
    // 128-bit → short 16-bit extrahieren (FFFF-Block), robust gegen Formatvarianten
    const first = String(rec.serviceUUIDs[0]).toLowerCase().replace(/[^a-f0-9]/g, "");
    // Übliche 128-bit Basisform: 0000XXXX-0000-1000-8000-00805f9b34fb → XXXX ist short
    const short = first.length >= 8 ? first.slice(4, 8) : first.slice(-4);
    if (uuidMap[short]) return uuidMap[short];
  }

  return { category: "Unbekannt", vendor: "", icon: "❓" };
}
