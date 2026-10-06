import { BMKGRawData, EarthquakeEvent, Disaster } from '../../types';

export function normalizeBMKG(raw: BMKGRawData, idPrefix: string = 'bmkg'): { event: EarthquakeEvent; disaster: Disaster } {
  const coordsStr = raw.Coordinates || '-6.2088,106.8456';
  const [latStr, lngStr] = coordsStr.split(',');
  const lat = parseFloat(latStr) || -6.2;
  const lng = parseFloat(lngStr) || 106.8;

  const eventTime = raw.DateTime || (raw.Tanggal && raw.Jam ? `${raw.Tanggal} ${raw.Jam}` : new Date().toISOString());
  const eventId = `${idPrefix}-${(raw.DateTime || raw.Tanggal || Date.now().toString()).replace(/[^a-zA-Z0-9]/g, '')}`;

  const event: EarthquakeEvent = {
    id: eventId,
    source: 'BMKG',
    magnitude: raw.Magnitude || '5.0',
    depth: raw.Kedalaman || '10 km',
    location: raw.Wilayah || 'Wilayah Indonesia',
    region: raw.Wilayah?.split(',')?.pop()?.trim() || 'Indonesia',
    coordinates: {
      latitude: lat,
      longitude: lng,
    },
    eventTime: eventTime,
    potensi: raw.Potensi || 'Tidak berpotensi tsunami',
    shakemap: raw.Shakemap ? `https://data.bmkg.go.id/DataMKG/TEWS/${raw.Shakemap}` : undefined,
    fetchedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  const disaster: Disaster = {
    id: `disaster-${eventId}`,
    earthquakeEventId: eventId,
    title: `Gempa M ${event.magnitude} - ${event.location}`,
    magnitude: event.magnitude,
    depth: event.depth,
    location: event.location,
    coordinates: event.coordinates,
    eventTime: event.eventTime,
    status: 'pending_verification', // New BMKG data always enters pending_verification
    verificationMethod: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return { event, disaster };
}

export async function fetchAutogempa(): Promise<{ event: EarthquakeEvent; disaster: Disaster } | null> {
  try {
    // Try our proxy endpoint first to bypass CORS
    let res = await fetch('/api/bmkg/autogempa');
    if (!res.ok) {
      // Fallback direct
      res = await fetch('https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json');
    }
    const json = await res.json();
    const raw = json.data?.Infogempa?.gempa || json.Infogempa?.gempa;
    if (raw) {
      return normalizeBMKG(raw, 'auto');
    }
    return null;
  } catch (err) {
    console.error('Failed to fetch autogempa:', err);
    return null;
  }
}

export async function fetchGempaterkini(): Promise<{ event: EarthquakeEvent; disaster: Disaster }[]> {
  try {
    let res = await fetch('/api/bmkg/gempaterkini');
    if (!res.ok) {
      res = await fetch('https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json');
    }
    const json = await res.json();
    const list: BMKGRawData[] = json.data?.Infogempa?.gempa || json.Infogempa?.gempa || [];
    return list.map((raw, index) => normalizeBMKG(raw, `recent-${index}`));
  } catch (err) {
    console.error('Failed to fetch gempaterkini:', err);
    return [];
  }
}
