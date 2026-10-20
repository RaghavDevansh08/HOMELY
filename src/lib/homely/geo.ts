export type City = { name: string; lat: number; lng: number; pins: string[] };

export const CITIES: City[] = [
  { name: "Bengaluru", lat: 12.9716, lng: 77.5946, pins: ["560"] },
  { name: "Mumbai", lat: 19.076, lng: 72.8777, pins: ["400"] },
  { name: "Delhi", lat: 28.6139, lng: 77.209, pins: ["110"] },
  { name: "Hyderabad", lat: 17.385, lng: 78.4867, pins: ["500"] },
  { name: "Chennai", lat: 13.0827, lng: 80.2707, pins: ["600"] },
  { name: "Pune", lat: 18.5204, lng: 73.8567, pins: ["411"] },
  { name: "Kolkata", lat: 22.5726, lng: 88.3639, pins: ["700"] },
  { name: "Ahmedabad", lat: 23.0225, lng: 72.5714, pins: ["380"] },
];

export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const r = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function matchPlace(input: string): { label: string; lat: number; lng: number; city: string } | null {
  const raw = input.trim();
  if (!raw) return null;
  const pin = raw.match(/\b(\d{6})\b/);
  if (pin) {
    const prefix = pin[1].slice(0, 3);
    const city = CITIES.find((c) => c.pins.includes(prefix));
    if (city) return { label: `${city.name} · ${pin[1]}`, lat: city.lat, lng: city.lng, city: city.name };
  }
  const lowered = raw.toLowerCase();
  const city = CITIES.find((c) => lowered.includes(c.name.toLowerCase()));
  if (city) return { label: city.name, lat: city.lat, lng: city.lng, city: city.name };
  return null;
}

export function weekdayFromDate(isoDate: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const d = new Date(`${isoDate}T12:00:00+05:30`);
  if (Number.isNaN(d.getTime())) return null;
  return d.getDay();
}
