export const DISPERSAL_ROUTE_BRAVO = {
  type: 'Feature' as const,
  geometry: {
    type: 'LineString' as const,
    coordinates: [
      [15.265, 56.267],
      [15.230, 56.280],
      [15.200, 56.295],
      [15.180, 56.310],
    ],
  },
  properties: { id: 'route-bravo' },
}

export const DISPERSAL_ROUTE_CHARLIE = {
  type: 'Feature' as const,
  geometry: {
    type: 'LineString' as const,
    coordinates: [
      [15.265, 56.267],
      [15.290, 56.255],
      [15.315, 56.243],
      [15.340, 56.230],
    ],
  },
  properties: { id: 'route-charlie' },
}
