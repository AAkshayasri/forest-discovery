import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const forestsRaw = `Forest,Country/Region,Continent,Latitude,Longitude
Sundarbans mangroves,India / Bangladesh,Asia,21.95,89.18
Western Ghats moist forests,India,Asia,11.00,76.50
Silent Valley,India (Kerala),Asia,11.08,76.44
Nagarhole-Bandipur,India (Karnataka),Asia,11.90,76.35
Gir Forest,India (Gujarat),Asia,21.12,70.80
Corbett / Terai Arc,India (Uttarakhand),Asia,29.53,78.95
Namdapha,India (Arunachal),Asia,27.50,96.40
Chittagong Hill Tracts,Bangladesh,Asia,22.60,92.20
Chitwan lowland sal forest,Nepal,Asia,27.50,84.33
Sinharaja,Sri Lanka,Asia,6.40,80.45
Borneo lowland rainforest,Indonesia/Malaysia/Brunei,Asia,1.00,114.00
Danum Valley,Malaysia (Sabah),Asia,5.00,117.70
Gunung Mulu,Malaysia (Sarawak),Asia,4.05,114.90
Taman Negara,Malaysia,Asia,4.60,102.40
Ulu Temburong,Brunei,Asia,4.55,115.15
Leuser Ecosystem,Indonesia (Sumatra),Asia,3.70,97.35
Kerinci Seblat,Indonesia (Sumatra),Asia,-2.00,101.50
Bukit Barisan Selatan,Indonesia (Sumatra),Asia,-5.20,104.30
Lorentz,Indonesia (Papua),Asia,-4.50,137.50
Khao Yai,Thailand,Asia,14.44,101.37
Kaeng Krachan,Thailand,Asia,12.80,99.40
Cardamom Mountains,Cambodia,Asia,12.00,103.20
Nam Ha,Laos,Asia,20.95,101.30
Cat Tien,Vietnam,Asia,11.42,107.43
Cuc Phuong,Vietnam,Asia,20.30,105.65
Palawan / Puerto Princesa,Philippines,Asia,10.20,118.90
Sierra Madre (Luzon),Philippines,Asia,16.50,122.00
Siberian taiga (central),Russia,Asia,62.00,100.00
Sikhote-Alin / Ussuri,Russia,Asia,45.50,136.50
Greater Khingan (Da Hinggan),China,Asia,50.50,122.50
Changbai Mountain,China,Asia,42.00,128.10
Shennongjia,China (Hubei),Asia,31.50,110.40
Zhangjiajie,China (Hunan),Asia,29.32,110.43
Xishuangbanna tropical forest,China (Yunnan),Asia,21.95,101.20
Khan Khentii taiga,Mongolia,Asia,48.80,108.50
Shirakami-Sanchi beech forest,Japan,Asia,40.50,140.10
Yakushima cedar forest,Japan,Asia,30.35,130.50
Gotjawal forest Jeju,South Korea,Asia,33.37,126.53
Hyrcanian (Caspian) forests,Iran / Azerbaijan,Asia,36.80,52.00
Caucasus mixed forests,Georgia / Armenia,Asia,42.50,44.00
Tian Shan walnut-fruit forests,Kyrgyzstan,Asia,41.35,72.50
Dhofar cloud forests,Oman,Asia,17.10,54.20
Congo Basin rainforest (core),DR Congo,Africa,-0.50,22.00
Salonga,DR Congo,Africa,-1.90,20.90
Virunga forests,DR Congo,Africa,-0.90,29.30
Ituri Forest,DR Congo,Africa,1.50,28.50
Dja Faunal Reserve,Cameroon,Africa,3.00,13.00
Campo-Ma'an,Cameroon,Africa,2.35,10.10
Odzala-Kokoua,Congo (Rep.),Africa,0.75,14.90
Nouabale-Ndoki,Congo (Rep.),Africa,2.50,16.40
Monte Alen,Equatorial Guinea,Africa,1.60,10.30
Minkebe,Gabon,Africa,1.90,12.80
Lope-Okanda,Gabon,Africa,-0.20,11.60
Ivindo,Gabon,Africa,0.15,12.60
Dzanga-Sangha,Central African Republic,Africa,2.90,16.35
Tai National Park,Cote d'Ivoire,Africa,5.85,-7.35
Sapo National Park,Liberia,Africa,5.80,-8.85
Gola Rainforest,Sierra Leone,Africa,7.70,-10.80
Kakum National Park,Ghana,Africa,6.40,-1.38
Omo Forest Reserve,Nigeria,Africa,6.90,4.35
Cross River forests,Nigeria,Africa,6.10,8.70
Bia National Park,Ghana,Africa,6.55,-3.10
Kakamega Forest,Kenya,Africa,0.28,34.87
Aberdare Forest,Kenya,Africa,-0.40,36.70
Mau Forest Complex,Kenya,Africa,-0.30,35.70
Mount Kenya forest belt,Kenya,Africa,-0.15,37.30
Bwindi Impenetrable Forest,Uganda,Africa,-1.05,29.65
Kibale Forest,Uganda,Africa,0.50,30.35
Budongo Forest,Uganda,Africa,1.75,31.55
Mabira Forest,Uganda,Africa,0.45,32.90
Harenna Forest (Bale Mountains),Ethiopia,Africa,6.80,39.75
Kafa Biosphere Reserve,Ethiopia,Africa,7.30,36.20
Nyungwe Forest,Rwanda,Africa,-2.50,29.20
Kibira National Park,Burundi,Africa,-2.75,29.35
Jozani Forest,Tanzania (Zanzibar),Africa,-6.25,39.40
Udzungwa Mountains,Tanzania,Africa,-7.85,36.85
Eastern Arc forests (general),Tanzania,Africa,-7.00,37.00
Knysna-Tsitsikamma forest,South Africa,Africa,-34.00,23.10
Kruger woodland/mopane belt,South Africa,Africa,-24.00,31.50
Miombo woodlands (central belt),Zambia,Africa,-13.50,27.50
Gorongosa forests,Mozambique,Africa,-18.68,34.35
Chimanimani forest,Zimbabwe/Mozambique,Africa,-19.75,33.10
Kasungu / Miombo,Malawi,Africa,-12.98,33.10
Mkomazi-Miombo transition,Tanzania,Africa,-4.20,38.00
Okavango riparian forest,Botswana,Africa,-19.30,22.90
Namib escarpment woodland,Namibia,Africa,-22.00,16.50
Andasibe-Mantadia (eastern rainforest),Madagascar,Africa,-18.93,48.42
Masoala rainforest,Madagascar,Africa,-15.65,50.10
Ankarafantsika (dry forest),Madagascar,Africa,-16.30,46.80
Ranomafana rainforest,Madagascar,Africa,-21.25,47.42
Spiny forest (south),Madagascar,Africa,-23.50,44.50
Rif cedar/oak forests,Morocco,Africa,35.00,-5.00
Atlas Mountains cedar forests,Morocco,Africa,33.30,-5.10
Kroumirie forests,Tunisia,Africa,36.85,8.90
Kabylie forests,Algeria,Africa,36.70,4.50
Canadian Boreal Forest (core),Canada,North America,55.00,-100.00
Great Bear Rainforest,Canada (BC),North America,52.50,-128.00
Clayoquot Sound,Canada (BC),North America,49.20,-125.90
Boreal Shield (Ontario/Quebec),Canada,North America,50.00,-80.00
Algonquin Provincial Park forest,Canada (Ontario),North America,45.83,-78.35
Acadian forest region,Canada (Maritimes),North America,46.00,-66.00
Mackenzie boreal forest,Canada (NWT),North America,62.00,-122.00
Yukon boreal/taiga,Canada (Yukon),North America,63.00,-135.00
Vancouver Island temperate rainforest,Canada (BC),North America,49.65,-125.45
Olympic National Forest,USA (WA),North America,47.80,-123.60
Hoh Rainforest,USA (WA),North America,47.86,-123.93
Tongass National Forest,USA (Alaska),North America,57.00,-133.50
Chugach National Forest,USA (Alaska),North America,60.80,-147.50
Redwood National and State Parks,USA (California),North America,41.30,-124.00
Mount Hood National Forest,USA (Oregon),North America,45.37,-121.70
Willamette National Forest,USA (Oregon),North America,44.10,-122.20
Sierra Nevada forests (Sequoia/Kings Canyon),USA (California),North America,36.60,-118.75
Yosemite forest belt,USA (California),North America,37.85,-119.55
Rocky Mountain National Forest belt,USA (Colorado),North America,40.35,-105.65
White Mountains (Arizona),USA (Arizona),North America,34.00,-109.50
Kaibab National Forest,USA (Arizona),North America,36.40,-112.10
Black Hills National Forest,USA (South Dakota),North America,44.00,-103.60
Bitterroot National Forest,USA (Montana/Idaho),North America,45.90,-114.10
Great Smoky Mountains forest,USA (TN/NC),North America,35.61,-83.50
Appalachian forest (general),USA,North America,38.00,-80.50
Shenandoah National Forest,USA (Virginia),North America,38.53,-78.35
Adirondack Park forest,USA (New York),North America,44.00,-74.20
White Mountain National Forest,USA (New Hampshire),North America,44.10,-71.40
Green Mountain National Forest,USA (Vermont),North America,43.40,-72.90
Ozark National Forest,USA (Arkansas),North America,35.80,-93.20
Big Thicket forest,USA (Texas),North America,30.42,-94.35
Congaree forest,USA (South Carolina),North America,33.80,-80.80
Everglades / South Florida forest-wetland,USA (Florida),North America,25.85,-80.90
Lacandon Jungle,Mexico (Chiapas),North America,16.80,-90.90
Calakmul Biosphere Reserve,Mexico (Yucatan),North America,18.30,-89.80
Sierra Madre Occidental pine-oak forest,Mexico,North America,26.00,-106.50
Sierra Madre del Sur,Mexico,North America,17.30,-100.00
Monarch Butterfly Biosphere Reserve,Mexico,North America,19.60,-100.25
Maya Biosphere Reserve,Guatemala,North America,17.25,-89.90
Sierra de las Minas,Guatemala,North America,15.15,-89.75
Rio Plátano Biosphere Reserve,Honduras,North America,15.60,-85.10
Bosawas Biosphere Reserve,Nicaragua,North America,13.85,-84.90
Indio Maiz Biological Reserve,Nicaragua,North America,10.95,-84.15
Corcovado National Park,Costa Rica,North America,8.53,-83.58
Monteverde Cloud Forest,Costa Rica,North America,10.30,-84.80
La Amistad International Park,Costa Rica/Panama,North America,9.30,-83.00
Darien Forest,Panama,North America,8.00,-77.70
El Yunque National Forest,USA (Puerto Rico),North America,18.28,-65.78
Blue and John Crow Mountains forest,Jamaica,North America,18.05,-76.55
Sierra de Bahoruco,Dominican Republic,North America,18.15,-71.50
Massif de la Hotte,Haiti,North America,18.35,-74.05
Amazon Rainforest (core),Brazil,South America,-3.50,-62.00
Tapajos National Forest,Brazil (Para),South America,-4.30,-55.00
Jau National Park,Brazil (Amazonas),South America,-1.90,-61.60
Xingu Indigenous Park forest,Brazil (Mato Grosso),South America,-10.50,-53.00
Amazonas (Peruvian Amazon),Peru,South America,-5.00,-75.00
Manu National Park,Peru,South America,-12.20,-71.40
Tambopata National Reserve,Peru,South America,-12.85,-69.30
Yasuni National Park,Ecuador,South America,-0.95,-76.00
Sangay National Park,Ecuador,South America,-2.05,-78.35
Chiribiquete National Park,Colombia,South America,0.30,-72.30
Amacayacu National Park,Colombia,South America,-3.75,-70.25
Madidi National Park,Bolivia,South America,-14.00,-68.50
Noel Kempff Mercado National Park,Bolivia,South America,-13.90,-60.90
Amazonas state forest,Venezuela,South America,3.50,-66.00
Canaima National Park,Venezuela,South America,5.90,-61.80
Central Suriname Nature Reserve,Suriname,South America,3.90,-56.10
Guiana Amazonian Park,French Guiana,South America,3.50,-53.20
Iwokrama Forest,Guyana,South America,4.60,-58.90
Atlantic Forest (Mata Atlantica core),Brazil,South America,-20.00,-43.50
Serra do Mar,Brazil (Sao Paulo/Parana),South America,-24.00,-47.00
Iguacu National Park forest,Brazil/Argentina,South America,-25.60,-54.45
Serra dos Orgaos,Brazil (Rio de Janeiro),South America,-22.45,-43.03
Pantanal fringe forest,Brazil,South America,-17.50,-57.00
Valdivian Temperate Rainforest,Chile,South America,-40.00,-72.50
Alerce Andino National Park,Chile,South America,-41.50,-72.40
Chiloe National Park,Chile,South America,-42.60,-74.10
Nahuel Huapi forest,Argentina,South America,-41.10,-71.50
Los Alerces National Park,Argentina,South America,-42.85,-71.65
Tierra del Fuego forest,Argentina/Chile,South America,-54.50,-68.50
Yungas cloud forest,Bolivia/Argentina,South America,-22.00,-64.80
Calilegua National Park,Argentina,South America,-23.70,-64.85
Podocarpus National Park,Ecuador,South America,-4.10,-79.10
Sierra Nevada de Santa Marta forest,Colombia,South America,10.83,-73.65
Darien Gap forest (Colombian side),Colombia,South America,7.80,-77.50
Kanuku Mountains,Guyana,South America,3.10,-59.30
Gran Chaco dry forest,Paraguay/Argentina,South America,-23.00,-60.50
Cerrado woodland (transition),Brazil,South America,-15.00,-47.50
Scandinavian boreal forest (general),Sweden,Europe,63.00,16.00
Tyresta National Park,Sweden,Europe,59.13,18.33
Fulufjallet forest,Sweden,Europe,61.57,12.70
Femundsmarka forest,Norway,Europe,62.20,12.10
Trillemarka-Rollagsfjell,Norway,Europe,60.05,9.30
Nordland boreal forest,Norway,Europe,66.50,14.50
Nuuksio National Park,Finland,Europe,60.30,24.55
Karelian old-growth forest,Finland,Europe,63.50,30.50
Urho Kekkonen National Park,Finland,Europe,68.10,27.70
Sjaelso forest,Denmark,Europe,55.90,12.45
Black Forest (Schwarzwald),Germany,Europe,48.20,8.15
Bavarian Forest,Germany,Europe,49.05,13.30
Thuringian Forest,Germany,Europe,50.65,10.75
Teutoburg Forest,Germany,Europe,51.95,8.40
Ardennes Forest,Belgium/Luxembourg/France,Europe,50.10,5.60
Foret de Fontainebleau,France,Europe,48.40,2.70
Foret de Chambord/Sologne,France,Europe,47.60,1.70
Vosges Forest,France,Europe,48.20,7.05
Landes Forest,France,Europe,44.30,-0.90
Bialowieza Forest,Poland/Belarus,Europe,52.70,23.85
Bory Tucholskie,Poland,Europe,53.70,17.75
Veluwe forest,Netherlands,Europe,52.15,5.75
New Forest,United Kingdom,Europe,50.85,-1.60
Caledonian Forest,United Kingdom (Scotland),Europe,57.10,-4.70
Killarney National Park forest,Ireland,Europe,51.95,-9.50
Bohemian Forest (Sumava),Czech Republic,Europe,49.10,13.55
Carpathian primeval beech forests,Romania/Ukraine/Slovakia,Europe,47.50,24.50
Retezat National Park forest,Romania,Europe,45.37,22.85
Bukk National Park forest,Hungary,Europe,48.10,20.50
Tatra National Park forest,Poland/Slovakia,Europe,49.20,20.00
Carpathian Biosphere Reserve,Ukraine,Europe,48.30,24.00
Belovezhskaya Pushcha,Belarus,Europe,52.60,23.80
Berezinsky Biosphere Reserve,Belarus,Europe,54.75,28.30
Russian taiga (European part),Russia,Europe,62.00,45.00
Kologriv Forest,Russia,Europe,58.85,44.35
Sila National Park forest,Italy,Europe,39.30,16.55
Aspromonte forest,Italy,Europe,38.15,15.90
Abruzzo Lazio and Molise NP forest,Italy,Europe,41.75,13.95
Cansiglio Forest,Italy,Europe,46.05,12.40
Irati Forest,Spain,Europe,42.95,-1.05
Picos de Europa forest,Spain,Europe,43.20,-4.85
Muniellos Forest,Spain,Europe,43.05,-6.75
Sierra de las Nieves forest,Spain,Europe,36.70,-4.95
Peneda-Geres National Park forest,Portugal,Europe,41.75,-8.20
Perucica primeval forest,Bosnia and Herzegovina,Europe,43.30,18.60
Pindus Mountains forest,Greece,Europe,39.70,21.20
Rila National Park forest,Bulgaria,Europe,42.15,23.55
Rodopi Mountains forest,Bulgaria/Greece,Europe,41.50,24.80
Daintree Rainforest,Australia (Queensland),Australia/Oceania,-16.25,145.42
Wet Tropics of Queensland,Australia (Queensland),Australia/Oceania,-17.00,145.50
Atherton Tablelands rainforest,Australia (Queensland),Australia/Oceania,-17.27,145.48
Eungella National Park forest,Australia (Queensland),Australia/Oceania,-21.13,148.50
Lamington National Park,Australia (Queensland),Australia/Oceania,-28.23,153.13
Gondwana Rainforests,Australia (NSW/QLD),Australia/Oceania,-28.50,153.20
Iron Range National Park,Australia (Queensland),Australia/Oceania,-12.72,143.30
Litchfield National Park forest,Australia (Northern Territory),Australia/Oceania,-13.18,130.79
Kakadu forest/woodland,Australia (Northern Territory),Australia/Oceania,-12.85,132.50
Blue Mountains forest,Australia (NSW),Australia/Oceania,-33.70,150.30
Royal National Park forest,Australia (NSW),Australia/Oceania,-34.12,151.07
Border Ranges National Park,Australia (NSW),Australia/Oceania,-28.35,153.05
Barrington Tops forest,Australia (NSW),Australia/Oceania,-31.90,151.45
South East Forests National Park,Australia (NSW),Australia/Oceania,-37.05,149.35
Dandenong Ranges forest,Australia (Victoria),Australia/Oceania,-37.85,145.35
Otway Ranges forest,Australia (Victoria),Australia/Oceania,-38.65,143.55
Yarra Ranges forest,Australia (Victoria),Australia/Oceania,-37.65,145.75
Wombat State Forest,Australia (Victoria),Australia/Oceania,-37.40,144.15
Errinundra National Park,Australia (Victoria),Australia/Oceania,-37.30,148.90
Tasmanian Wilderness (TWWHA),Australia (Tasmania),Australia/Oceania,-42.20,146.20
Tarkine (Takayna) Forest,Australia (Tasmania),Australia/Oceania,-41.30,145.10
Franklin-Gordon Wild Rivers forest,Australia (Tasmania),Australia/Oceania,-42.35,145.90
Mount Field National Park forest,Australia (Tasmania),Australia/Oceania,-42.68,146.68
Hartz Mountains forest,Australia (Tasmania),Australia/Oceania,-43.13,146.75
Styx Valley (tall eucalypt),Australia (Tasmania),Australia/Oceania,-42.75,146.55
Karri Forest (Boranup/Pemberton),Australia (Western Australia),Australia/Oceania,-34.35,115.90
Walpole-Nornalup NP (Tingle forest),Australia (Western Australia),Australia/Oceania,-34.98,116.75
Porongurup National Park forest,Australia (Western Australia),Australia/Oceania,-34.68,117.90
Mount Lofty Ranges forest,Australia (South Australia),Australia/Oceania,-34.95,138.75
Kangaroo Island forest remnants,Australia (South Australia),Australia/Oceania,-35.80,137.25
Waipoua Forest (kauri),New Zealand,Australia/Oceania,-35.63,173.55
Fiordland forest,New Zealand,Australia/Oceania,-45.40,167.70
Te Urewera forest,New Zealand,Australia/Oceania,-38.65,177.15
Papua New Guinea lowland rainforest,Papua New Guinea,Australia/Oceania,-6.50,145.00
New Caledonia rainforest,New Caledonia,Australia/Oceania,-21.30,165.50
Solomon Islands rainforest,Solomon Islands,Australia/Oceania,-9.00,160.00
Vanuatu rainforest,Vanuatu,Australia/Oceania,-16.50,168.00`;

// Parse forests
const lines = forestsRaw.trim().split('\n').slice(1);
const parsedForests = lines.map((line, idx) => {
  const parts = line.split(',');
  const name = parts[0].trim();
  const countryRegion = parts[1].trim();
  const continent = parts[2].trim();
  const latitude = parseFloat(parts[3].trim());
  const longitude = parseFloat(parts[4].trim());

  let country = countryRegion;
  let state = "";
  if (countryRegion.includes('(') && countryRegion.includes(')')) {
    const match = countryRegion.match(/^(.*?)\s*\((.*?)\)$/);
    if (match) {
      country = match[1].trim();
      state = match[2].trim();
    }
  }

  const { climate, area, desc } = determineClimateAndArea(name, continent, latitude);

  const delta = 0.15;
  const boundary = {
    type: "Feature",
    properties: { name },
    geometry: {
      type: "Polygon",
      coordinates: [[
        [Number((longitude - delta).toFixed(4)), Number((latitude - delta).toFixed(4))],
        [Number((longitude + delta).toFixed(4)), Number((latitude - delta).toFixed(4))],
        [Number((longitude + delta).toFixed(4)), Number((latitude + delta).toFixed(4))],
        [Number((longitude - delta).toFixed(4)), Number((latitude + delta).toFixed(4))],
        [Number((longitude - delta).toFixed(4)), Number((latitude - delta).toFixed(4))]
      ]]
    }
  };

  return {
    id: idx + 1,
    name,
    country,
    state,
    continent,
    latitude,
    longitude,
    area,
    climate,
    description: desc,
    boundary
  };
});

console.log(`Parsed ${parsedForests.length} forests.`);

// 1. Write server/database/forests_static.json
const forestsPath = path.resolve(__dirname, 'forests_static.json');
fs.writeFileSync(forestsPath, JSON.stringify(parsedForests, null, 2), 'utf-8');
console.log(`Updated ${forestsPath} with ${parsedForests.length} forests.`);

// 2. Drop obsolete zoos table if present in auth.db
const dbPath = path.resolve(__dirname, 'auth.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`DROP TABLE IF EXISTS zoos`, (err) => {
    if (err) {
      console.error("Error dropping zoos table:", err);
    }
    db.close();
  });
});


