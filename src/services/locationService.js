const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search';

const PRELOADED_ROUTES = [
  // Mexicali / Tijuana / Ensenada / Tecate
  { id: 'mxi-tij', label: 'Mexicali -> Tijuana', origin: 'Mexicali', destination: 'Tijuana', distanceKm: 180, tollOneWay: 235 },
  { id: 'tij-mxi', label: 'Tijuana -> Mexicali', origin: 'Tijuana', destination: 'Mexicali', distanceKm: 180, tollOneWay: 235 },
  { id: 'mxi-tec', label: 'Mexicali -> Tecate', origin: 'Mexicali', destination: 'Tecate', distanceKm: 130, tollOneWay: 165 },
  { id: 'tec-mxi', label: 'Tecate -> Mexicali', origin: 'Tecate', destination: 'Mexicali', distanceKm: 130, tollOneWay: 165 },
  { id: 'mxi-ens', label: 'Mexicali -> Ensenada', origin: 'Mexicali', destination: 'Ensenada', distanceKm: 245, tollOneWay: 320 },
  { id: 'ens-mxi', label: 'Ensenada -> Mexicali', origin: 'Ensenada', destination: 'Mexicali', distanceKm: 245, tollOneWay: 320 },
  { id: 'tij-ros', label: 'Tijuana -> Rosarito', origin: 'Tijuana', destination: 'Rosarito', distanceKm: 22, tollOneWay: 48 },
  { id: 'ros-tij', label: 'Rosarito -> Tijuana', origin: 'Rosarito', destination: 'Tijuana', distanceKm: 22, tollOneWay: 48 },
  { id: 'tij-ens', label: 'Tijuana -> Ensenada', origin: 'Tijuana', destination: 'Ensenada', distanceKm: 104, tollOneWay: 163 },
  { id: 'ens-tij', label: 'Ensenada -> Tijuana', origin: 'Ensenada', destination: 'Tijuana', distanceKm: 104, tollOneWay: 163 },
  { id: 'tec-tij', label: 'Tecate -> Tijuana', origin: 'Tecate', destination: 'Tijuana', distanceKm: 60, tollOneWay: 95 },
  { id: 'tij-tec', label: 'Tijuana -> Tecate', origin: 'Tijuana', destination: 'Tecate', distanceKm: 60, tollOneWay: 95 },

  // Guadalajara y alrededores
  { id: 'gdl-zap', label: 'Guadalajara -> Zapopan', origin: 'Guadalajara', destination: 'Zapopan', distanceKm: 14, tollOneWay: 0 },
  { id: 'zap-gdl', label: 'Zapopan -> Guadalajara', origin: 'Zapopan', destination: 'Guadalajara', distanceKm: 14, tollOneWay: 0 },
  { id: 'gdl-tep', label: 'Guadalajara -> Tepic', origin: 'Guadalajara', destination: 'Tepic', distanceKm: 206, tollOneWay: 438 },
  { id: 'tep-gdl', label: 'Tepic -> Guadalajara', origin: 'Tepic', destination: 'Guadalajara', distanceKm: 206, tollOneWay: 438 },
  { id: 'gdl-pvr', label: 'Guadalajara -> Puerto Vallarta', origin: 'Guadalajara', destination: 'Puerto Vallarta', distanceKm: 319, tollOneWay: 890 },
  { id: 'pvr-gdl', label: 'Puerto Vallarta -> Guadalajara', origin: 'Puerto Vallarta', destination: 'Guadalajara', distanceKm: 319, tollOneWay: 890 },

  // CDMX y centro
  { id: 'cdmx-pue', label: 'CDMX -> Puebla', origin: 'Ciudad de Mexico', destination: 'Puebla', distanceKm: 134, tollOneWay: 216 },
  { id: 'pue-cdmx', label: 'Puebla -> CDMX', origin: 'Puebla', destination: 'Ciudad de Mexico', distanceKm: 134, tollOneWay: 216 },
  { id: 'cdmx-qro', label: 'CDMX -> Queretaro', origin: 'Ciudad de Mexico', destination: 'Queretaro', distanceKm: 219, tollOneWay: 334 },
  { id: 'qro-cdmx', label: 'Queretaro -> CDMX', origin: 'Queretaro', destination: 'Ciudad de Mexico', distanceKm: 219, tollOneWay: 334 },
  { id: 'cdmx-tol', label: 'CDMX -> Toluca', origin: 'Ciudad de Mexico', destination: 'Toluca', distanceKm: 66, tollOneWay: 110 },
  { id: 'tol-cdmx', label: 'Toluca -> CDMX', origin: 'Toluca', destination: 'Ciudad de Mexico', distanceKm: 66, tollOneWay: 110 },
  { id: 'cdmx-cue', label: 'CDMX -> Cuernavaca', origin: 'Ciudad de Mexico', destination: 'Cuernavaca', distanceKm: 89, tollOneWay: 149 },
  { id: 'cue-cdmx', label: 'Cuernavaca -> CDMX', origin: 'Cuernavaca', destination: 'Ciudad de Mexico', distanceKm: 89, tollOneWay: 149 },
  { id: 'cdmx-pac', label: 'CDMX -> Pachuca', origin: 'Ciudad de Mexico', destination: 'Pachuca', distanceKm: 95, tollOneWay: 69 },
  { id: 'pac-cdmx', label: 'Pachuca -> CDMX', origin: 'Pachuca', destination: 'Ciudad de Mexico', distanceKm: 95, tollOneWay: 69 },

  // Monterrey y norte
  { id: 'mtm-gdl', label: 'Monterrey -> Guadalajara', origin: 'Monterrey', destination: 'Guadalajara', distanceKm: 828, tollOneWay: 1546 },
  { id: 'gdl-mtm', label: 'Guadalajara -> Monterrey', origin: 'Guadalajara', destination: 'Monterrey', distanceKm: 828, tollOneWay: 1546 },
  { id: 'mtm-slt', label: 'Monterrey -> San Luis Potosi', origin: 'Monterrey', destination: 'San Luis Potosi', distanceKm: 513, tollOneWay: 861 },
  { id: 'slt-mtm', label: 'San Luis Potosi -> Monterrey', origin: 'San Luis Potosi', destination: 'Monterrey', distanceKm: 513, tollOneWay: 861 },
  { id: 'mtm-sal', label: 'Monterrey -> Saltillo', origin: 'Monterrey', destination: 'Saltillo', distanceKm: 89, tollOneWay: 123 },
  { id: 'sal-mtm', label: 'Saltillo -> Monterrey', origin: 'Saltillo', destination: 'Monterrey', distanceKm: 89, tollOneWay: 123 },

  // Sureste y otros
  { id: 'mer-can', label: 'Merida -> Cancun', origin: 'Merida', destination: 'Cancun', distanceKm: 307, tollOneWay: 602 },
  { id: 'can-mer', label: 'Cancun -> Merida', origin: 'Cancun', destination: 'Merida', distanceKm: 307, tollOneWay: 602 },
  { id: 'mer-cam', label: 'Merida -> Campeche', origin: 'Merida', destination: 'Campeche', distanceKm: 177, tollOneWay: 225 },
  { id: 'cam-mer', label: 'Campeche -> Merida', origin: 'Campeche', destination: 'Merida', distanceKm: 177, tollOneWay: 225 },
  { id: 'oax-pue', label: 'Oaxaca -> Puebla', origin: 'Oaxaca', destination: 'Puebla', distanceKm: 341, tollOneWay: 622 },
  { id: 'pue-oax', label: 'Puebla -> Oaxaca', origin: 'Puebla', destination: 'Oaxaca', distanceKm: 341, tollOneWay: 622 },
  { id: 'leo-gto', label: 'Leon -> Guanajuato', origin: 'Leon', destination: 'Guanajuato', distanceKm: 54, tollOneWay: 44 },
  { id: 'gto-leo', label: 'Guanajuato -> Leon', origin: 'Guanajuato', destination: 'Leon', distanceKm: 54, tollOneWay: 44 },
  { id: 'chh-jrz', label: 'Chihuahua -> Ciudad Juarez', origin: 'Chihuahua', destination: 'Ciudad Juarez', distanceKm: 370, tollOneWay: 598 },
  { id: 'jrz-chh', label: 'Ciudad Juarez -> Chihuahua', origin: 'Ciudad Juarez', destination: 'Chihuahua', distanceKm: 370, tollOneWay: 598 },
  { id: 'her-nog', label: 'Hermosillo -> Nogales', origin: 'Hermosillo', destination: 'Nogales', distanceKm: 282, tollOneWay: 404 },
  { id: 'nog-her', label: 'Nogales -> Hermosillo', origin: 'Nogales', destination: 'Hermosillo', distanceKm: 282, tollOneWay: 404 },
  { id: 'ver-xal', label: 'Veracruz -> Xalapa', origin: 'Veracruz', destination: 'Xalapa', distanceKm: 108, tollOneWay: 141 },
  { id: 'xal-ver', label: 'Xalapa -> Veracruz', origin: 'Xalapa', destination: 'Veracruz', distanceKm: 108, tollOneWay: 141 },
  { id: 'cul-maz', label: 'Culiacan -> Mazatlan', origin: 'Culiacan', destination: 'Mazatlan', distanceKm: 220, tollOneWay: 354 },
  { id: 'maz-cul', label: 'Mazatlan -> Culiacan', origin: 'Mazatlan', destination: 'Culiacan', distanceKm: 220, tollOneWay: 354 },
  { id: 'tor-clq', label: 'Torreon -> Saltillo', origin: 'Torreon', destination: 'Saltillo', distanceKm: 258, tollOneWay: 477 },
  { id: 'clq-tor', label: 'Saltillo -> Torreon', origin: 'Saltillo', destination: 'Torreon', distanceKm: 258, tollOneWay: 477 },
  { id: 'aca-chi', label: 'Acapulco -> Chilpancingo', origin: 'Acapulco', destination: 'Chilpancingo', distanceKm: 107, tollOneWay: 158 },
  { id: 'chi-aca', label: 'Chilpancingo -> Acapulco', origin: 'Chilpancingo', destination: 'Acapulco', distanceKm: 107, tollOneWay: 158 },
  { id: 'qro-slp', label: 'Queretaro -> San Luis Potosi', origin: 'Queretaro', destination: 'San Luis Potosi', distanceKm: 203, tollOneWay: 336 },
  { id: 'slp-qro', label: 'San Luis Potosi -> Queretaro', origin: 'San Luis Potosi', destination: 'Queretaro', distanceKm: 203, tollOneWay: 336 },
  { id: 'pue-ver', label: 'Puebla -> Veracruz', origin: 'Puebla', destination: 'Veracruz', distanceKm: 278, tollOneWay: 518 },
  { id: 'ver-pue', label: 'Veracruz -> Puebla', origin: 'Veracruz', destination: 'Puebla', distanceKm: 278, tollOneWay: 518 },
  { id: 'tap-tux', label: 'Tuxtla Gutierrez -> Tapachula', origin: 'Tuxtla Gutierrez', destination: 'Tapachula', distanceKm: 385, tollOneWay: 543 },
  { id: 'tux-tap', label: 'Tapachula -> Tuxtla Gutierrez', origin: 'Tapachula', destination: 'Tuxtla Gutierrez', distanceKm: 385, tollOneWay: 543 },
  { id: 'mzt-lmo', label: 'Mazatlan -> Los Mochis', origin: 'Mazatlan', destination: 'Los Mochis', distanceKm: 442, tollOneWay: 702 },
  { id: 'lmo-mzt', label: 'Los Mochis -> Mazatlan', origin: 'Los Mochis', destination: 'Mazatlan', distanceKm: 442, tollOneWay: 702 }
];

const buildDestinationLabel = (item) => {
  const city = item.address?.city || item.address?.town || item.address?.village || item.address?.municipality || item.address?.county;
  const state = item.address?.state;
  const country = item.address?.country;

  const parts = [city, state, country].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(', ');
  }

  return item.display_name;
};

export const searchDestinations = async (query, signal) => {
  const trimmedQuery = query.trim();
  if (trimmedQuery.length < 2) {
    return [];
  }

  const params = new URLSearchParams({
    q: trimmedQuery,
    format: 'jsonv2',
    addressdetails: '1',
    limit: '6',
    dedupe: '1',
    'accept-language': 'es'
  });

  const response = await fetch(`${NOMINATIM_BASE_URL}?${params.toString()}`, {
    method: 'GET',
    signal,
    headers: {
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('No fue posible buscar destinos.');
  }

  const data = await response.json();

  return data.map((item) => ({
    id: item.place_id,
    label: buildDestinationLabel(item),
    fullName: item.display_name,
    lat: item.lat,
    lon: item.lon
  }));
};

export const getPreloadedRoutes = () => PRELOADED_ROUTES;
