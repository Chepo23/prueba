export const TRANSPORT_CONFIG = {
  automovil: { label: 'Automóvil', capacity: 4, defaultFuelPrice: 23.8 },
  pickups: { label: 'Pick Ups', capacity: 5, defaultFuelPrice: 25.2 },
  motocicleta: { label: 'Motocicleta', capacity: 1, defaultFuelPrice: 23.0 },
  camioneta: { label: 'Camioneta', capacity: 8, defaultFuelPrice: 25.0 },
  automovil_remolque: { label: 'Automóvil con Remolque 1 Eje', capacity: 6, defaultFuelPrice: 26.5 }
};

export const TOLL_MULTIPLIER = {
  automovil: 1,
  pickups: 1,
  motocicleta: 0.5,
  camioneta: 1.5,
  automovil_remolque: 2
};

export const getTransportLabel = (transportType) => {
  return TRANSPORT_CONFIG[transportType]?.label || transportType;
};
