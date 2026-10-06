export interface ContinentMeta {
  id: string;
  name: string;
  aliases: string[];
  emoji: string;
  center: [number, number];
  zoom: number;
  color: string;
  borderColor: string;
  fillColor: string;
  description: string;
  polygon: [number, number][]; // [lat, lng] array forming continent outline polygon
}

export const CONTINENTS_DATA: ContinentMeta[] = [
  {
    id: 'europe',
    name: 'Europe',
    aliases: ['Europe'],
    emoji: '🇪🇺',
    center: [52.0, 15.0],
    zoom: 4,
    color: '#38bdf8',
    borderColor: '#38bdf8',
    fillColor: '#0369a1',
    description: 'Ancient deciduous forests, alpine ecosystems, taiga woodlands, and pristine protected reserves.',
    polygon: [
      [71.5, -25.0],
      [71.5, 45.0],
      [68.0, 60.0],
      [55.0, 60.0],
      [42.0, 50.0],
      [36.0, 42.0],
      [35.0, 28.0],
      [36.0, -10.0],
      [44.0, -10.0],
      [60.0, -12.0],
      [71.5, -25.0]
    ]
  },
  {
    id: 'asia',
    name: 'Asia',
    aliases: ['Asia'],
    emoji: '🌏',
    center: [32.0, 95.0],
    zoom: 3,
    color: '#10b981',
    borderColor: '#10b981',
    fillColor: '#064e3b',
    description: 'Vast Siberian taiga, Himalayan cloud ranges, Sundarbans mangroves, and tropical rainforests.',
    polygon: [
      [77.0, 60.0],
      [77.0, 180.0],
      [55.0, 170.0],
      [20.0, 145.0],
      [1.0, 125.0],
      [-11.0, 120.0],
      [-11.0, 95.0],
      [8.0, 75.0],
      [22.0, 60.0],
      [30.0, 48.0],
      [42.0, 45.0],
      [55.0, 60.0],
      [77.0, 60.0]
    ]
  },
  {
    id: 'africa',
    name: 'Africa',
    aliases: ['Africa'],
    emoji: '🌍',
    center: [2.0, 22.0],
    zoom: 3,
    color: '#f59e0b',
    borderColor: '#f59e0b',
    fillColor: '#78350f',
    description: 'Congo Basin rainforests, Rift Valley cloud forests, Miombo woodlands, and Madagascar biodiversity hotspots.',
    polygon: [
      [37.5, -18.0],
      [37.5, 33.0],
      [30.0, 35.0],
      [12.0, 52.0],
      [-12.0, 50.0],
      [-26.0, 51.0],
      [-35.5, 27.0],
      [-35.5, 17.0],
      [-5.0, 8.0],
      [5.0, -15.0],
      [15.0, -18.0],
      [37.5, -18.0]
    ]
  },
  {
    id: 'north-america',
    name: 'North America',
    aliases: ['North America'],
    emoji: '🌎',
    center: [42.0, -100.0],
    zoom: 3,
    color: '#a855f7',
    borderColor: '#c084fc',
    fillColor: '#581c87',
    description: 'Canadian boreal taiga, Pacific temperate rainforests, Redwood national parks, and Appalachian mountain woodlands.',
    polygon: [
      [72.0, -168.0],
      [72.0, -55.0],
      [50.0, -50.0],
      [30.0, -75.0],
      [15.0, -83.0],
      [7.0, -77.0],
      [7.0, -84.0],
      [18.0, -105.0],
      [32.0, -120.0],
      [58.0, -140.0],
      [65.0, -168.0],
      [72.0, -168.0]
    ]
  },
  {
    id: 'south-america',
    name: 'South America',
    aliases: ['South America'],
    emoji: '🌿',
    center: [-15.0, -60.0],
    zoom: 3,
    color: '#22c55e',
    borderColor: '#4ade80',
    fillColor: '#14532d',
    description: 'The Amazon basin, Atlantic coastal rainforest, Valdivian temperate forests, and Pantanal wetland fringes.',
    polygon: [
      [12.5, -75.0],
      [10.0, -60.0],
      [-5.0, -35.0],
      [-23.0, -42.0],
      [-35.0, -53.0],
      [-55.5, -67.0],
      [-55.5, -75.0],
      [-38.0, -74.0],
      [-18.0, -72.0],
      [-4.0, -81.0],
      [8.0, -78.0],
      [12.5, -75.0]
    ]
  },
  {
    id: 'oceania',
    name: 'Oceania',
    aliases: ['Oceania', 'Australia/Oceania'],
    emoji: '🦘',
    center: [-25.0, 140.0],
    zoom: 4,
    color: '#ec4899',
    borderColor: '#f472b6',
    fillColor: '#831843',
    description: 'Ancient Gondwana rainforests, Daintree tropical wilderness, and Tasmanian old-growth eucalyptus ecosystems.',
    polygon: [
      [-10.0, 110.0],
      [-10.0, 160.0],
      [-15.0, 180.0],
      [-48.0, 180.0],
      [-48.0, 165.0],
      [-44.0, 145.0],
      [-38.0, 115.0],
      [-20.0, 110.0],
      [-10.0, 110.0]
    ]
  }
];

export const getContinentByIdOrName = (val: string): ContinentMeta | undefined => {
  const norm = val.toLowerCase().trim();
  return CONTINENTS_DATA.find(
    c => c.id === norm || c.name.toLowerCase() === norm || c.aliases.some(a => a.toLowerCase() === norm)
  );
};
