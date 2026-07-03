export interface AirportInfo {
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  // Optional car-routing coords (road-accessible point outside terminal).
  // When set, Valhalla car/walk routing uses these instead of lat/lng, which
  // often sits inside restricted terminal grounds that cause slow routes.
  carLat?: number;
  carLng?: number;
}

// Common airports by IATA code — extend as needed
export const AIRPORTS: Record<string, AirportInfo> = {
  // Israel
  TLV: { name: "Ben Gurion International", city: "Tel Aviv", country: "Israel", lat: 32.0114, lng: 34.8867 },
  // Hungary
  // lat/lng = Terminal 2 bus stop (100E terminus) — required for correct Transitous transit routing
  // carLat/carLng = public road approach before terminal gates — gives accurate Valhalla car routing
  BUD: { name: "Ferenc Liszt International", city: "Budapest", country: "Hungary",
    lat: 47.4337, lng: 19.2548, carLat: 47.4295, carLng: 19.2480 },
  // UK
  LHR: { name: "Heathrow", city: "London", country: "United Kingdom", lat: 51.4700, lng: -0.4543 },
  LGW: { name: "Gatwick", city: "London", country: "United Kingdom", lat: 51.1537, lng: -0.1821 },
  STN: { name: "Stansted", city: "London", country: "United Kingdom", lat: 51.8860, lng: 0.2389 },
  LTN: { name: "Luton", city: "London", country: "United Kingdom", lat: 51.8747, lng: -0.3683 },
  // France
  CDG: { name: "Charles de Gaulle", city: "Paris", country: "France", lat: 49.0097, lng: 2.5479 },
  ORY: { name: "Orly", city: "Paris", country: "France", lat: 48.7233, lng: 2.3794 },
  // Germany
  FRA: { name: "Frankfurt", city: "Frankfurt", country: "Germany", lat: 50.0379, lng: 8.5622 },
  MUC: { name: "Munich", city: "Munich", country: "Germany", lat: 48.3538, lng: 11.7861 },
  TXL: { name: "Tegel", city: "Berlin", country: "Germany", lat: 52.5597, lng: 13.2877 },
  BER: { name: "Brandenburg", city: "Berlin", country: "Germany", lat: 52.3667, lng: 13.5033 },
  HAM: { name: "Hamburg", city: "Hamburg", country: "Germany", lat: 53.6304, lng: 9.9882 },
  DUS: { name: "Düsseldorf", city: "Düsseldorf", country: "Germany", lat: 51.2895, lng: 6.7668 },
  CGN: { name: "Cologne Bonn", city: "Cologne", country: "Germany", lat: 50.8659, lng: 7.1427 },
  STR: { name: "Stuttgart", city: "Stuttgart", country: "Germany", lat: 48.6900, lng: 9.2220 },
  NUE: { name: "Nuremberg", city: "Nuremberg", country: "Germany", lat: 49.4987, lng: 11.0669 },
  // Netherlands
  AMS: { name: "Schiphol", city: "Amsterdam", country: "Netherlands", lat: 52.3086, lng: 4.7639 },
  // Spain
  MAD: { name: "Barajas", city: "Madrid", country: "Spain", lat: 40.4936, lng: -3.5668 },
  BCN: { name: "El Prat", city: "Barcelona", country: "Spain", lat: 41.2971, lng: 2.0785 },
  AGP: { name: "Costa del Sol", city: "Málaga", country: "Spain", lat: 36.6749, lng: -4.4991 },
  PMI: { name: "Son San Joan", city: "Palma de Mallorca", country: "Spain", lat: 39.5517, lng: 2.7388 },
  // Italy
  FCO: { name: "Fiumicino", city: "Rome", country: "Italy", lat: 41.8003, lng: 12.2389 },
  MXP: { name: "Malpensa", city: "Milan", country: "Italy", lat: 45.6306, lng: 8.7281 },
  VCE: { name: "Marco Polo", city: "Venice", country: "Italy", lat: 45.5053, lng: 12.3519 },
  NAP: { name: "Naples", city: "Naples", country: "Italy", lat: 40.8860, lng: 14.2908 },
  // Greece
  ATH: { name: "Eleftherios Venizelos", city: "Athens", country: "Greece", lat: 37.9364, lng: 23.9445 },
  SKG: { name: "Thessaloniki", city: "Thessaloniki", country: "Greece", lat: 40.5197, lng: 22.9709 },
  HER: { name: "Heraklion", city: "Heraklion", country: "Greece", lat: 35.3397, lng: 25.1803 },
  RHO: { name: "Diagoras", city: "Rhodes", country: "Greece", lat: 36.4054, lng: 28.0862 },
  // Turkey
  IST: { name: "Istanbul Airport", city: "Istanbul", country: "Turkey", lat: 41.2753, lng: 28.7519 },
  SAW: { name: "Sabiha Gökçen", city: "Istanbul", country: "Turkey", lat: 40.8986, lng: 29.3092 },
  // UAE
  DXB: { name: "Dubai International", city: "Dubai", country: "United Arab Emirates", lat: 25.2532, lng: 55.3657 },
  AUH: { name: "Abu Dhabi International", city: "Abu Dhabi", country: "United Arab Emirates", lat: 24.4330, lng: 54.6511 },
  // USA
  JFK: { name: "John F. Kennedy", city: "New York", country: "United States", lat: 40.6413, lng: -73.7781 },
  EWR: { name: "Newark Liberty", city: "New York", country: "United States", lat: 40.6895, lng: -74.1745 },
  LGA: { name: "LaGuardia", city: "New York", country: "United States", lat: 40.7769, lng: -73.8740 },
  LAX: { name: "Los Angeles International", city: "Los Angeles", country: "United States", lat: 33.9425, lng: -118.4081 },
  ORD: { name: "O'Hare", city: "Chicago", country: "United States", lat: 41.9742, lng: -87.9073 },
  MIA: { name: "Miami International", city: "Miami", country: "United States", lat: 25.7959, lng: -80.2870 },
  SFO: { name: "San Francisco International", city: "San Francisco", country: "United States", lat: 37.6213, lng: -122.3790 },
  BOS: { name: "Logan International", city: "Boston", country: "United States", lat: 42.3656, lng: -71.0096 },
  // Austria
  VIE: { name: "Vienna International", city: "Vienna", country: "Austria", lat: 48.1103, lng: 16.5697 },
  // Switzerland
  ZUR: { name: "Zurich", city: "Zurich", country: "Switzerland", lat: 47.4647, lng: 8.5492 },
  ZRH: { name: "Zurich", city: "Zurich", country: "Switzerland", lat: 47.4647, lng: 8.5492 },
  GVA: { name: "Geneva", city: "Geneva", country: "Switzerland", lat: 46.2381, lng: 6.1089 },
  // Poland
  WAW: { name: "Chopin", city: "Warsaw", country: "Poland", lat: 52.1657, lng: 20.9671 },
  KRK: { name: "John Paul II", city: "Krakow", country: "Poland", lat: 50.0777, lng: 19.7848 },
  // Czech Republic
  PRG: { name: "Václav Havel", city: "Prague", country: "Czech Republic", lat: 50.1008, lng: 14.2600 },
  // Romania
  OTP: { name: "Henri Coandă", city: "Bucharest", country: "Romania", lat: 44.5711, lng: 26.0850 },
  // Croatia
  ZAG: { name: "Franjo Tuđman", city: "Zagreb", country: "Croatia", lat: 45.7429, lng: 16.0688 },
  SPU: { name: "Split", city: "Split", country: "Croatia", lat: 43.5389, lng: 16.2998 },
  DBV: { name: "Dubrovnik", city: "Dubrovnik", country: "Croatia", lat: 42.5614, lng: 18.2682 },
  // Serbia
  BEG: { name: "Nikola Tesla", city: "Belgrade", country: "Serbia", lat: 44.8184, lng: 20.3091 },
  // Portugal
  LIS: { name: "Humberto Delgado", city: "Lisbon", country: "Portugal", lat: 38.7756, lng: -9.1354 },
  OPO: { name: "Francisco Sá Carneiro", city: "Porto", country: "Portugal", lat: 41.2481, lng: -8.6814 },
  // Scandinavia
  ARN: { name: "Stockholm Arlanda", city: "Stockholm", country: "Sweden", lat: 59.6519, lng: 17.9186 },
  OSL: { name: "Oslo Gardermoen", city: "Oslo", country: "Norway", lat: 60.1939, lng: 11.1004 },
  CPH: { name: "Copenhagen", city: "Copenhagen", country: "Denmark", lat: 55.6181, lng: 12.6560 },
  HEL: { name: "Helsinki Vantaa", city: "Helsinki", country: "Finland", lat: 60.3172, lng: 24.9633 },
  // Canada
  YYZ: { name: "Pearson International", city: "Toronto", country: "Canada", lat: 43.6777, lng: -79.6248 },
  YUL: { name: "Montréal–Trudeau", city: "Montreal", country: "Canada", lat: 45.4706, lng: -73.7408 },
  // Asia
  BKK: { name: "Suvarnabhumi", city: "Bangkok", country: "Thailand", lat: 13.6900, lng: 100.7501 },
  SIN: { name: "Changi", city: "Singapore", country: "Singapore", lat: 1.3644, lng: 103.9915 },
  HKG: { name: "Hong Kong International", city: "Hong Kong", country: "China", lat: 22.3080, lng: 113.9185 },
  NRT: { name: "Narita", city: "Tokyo", country: "Japan", lat: 35.7720, lng: 140.3929 },
  HND: { name: "Haneda", city: "Tokyo", country: "Japan", lat: 35.5494, lng: 139.7798 },
  ICN: { name: "Incheon", city: "Seoul", country: "South Korea", lat: 37.4602, lng: 126.4407 },
  PEK: { name: "Capital International", city: "Beijing", country: "China", lat: 40.0799, lng: 116.6031 },
  PVG: { name: "Pudong", city: "Shanghai", country: "China", lat: 31.1443, lng: 121.8083 },
  BOM: { name: "Chhatrapati Shivaji", city: "Mumbai", country: "India", lat: 19.0896, lng: 72.8656 },
  DEL: { name: "Indira Gandhi", city: "Delhi", country: "India", lat: 28.5562, lng: 77.1000 },
};

export function lookupAirport(iata: string): AirportInfo | null {
  return AIRPORTS[iata.toUpperCase()] ?? null;
}

/** Returns the road-accessible car-routing coordinates for an airport waypoint ID.
 *  Falls back to the display coordinates if no separate car coord is stored. */
export function getAirportCarCoord(waypointId: string): { lat: number; lng: number } | null {
  const match = waypointId.match(/^__airport_(?:dep|arr)_(.+)$/);
  if (!match) return null;
  const info = lookupAirport(match[1]);
  if (!info) return null;
  return { lat: info.carLat ?? info.lat, lng: info.carLng ?? info.lng };
}
