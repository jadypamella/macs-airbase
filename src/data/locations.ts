export interface Location {
  lat: number
  lng: number
  label: string
  type: string
}

export const LOCATIONS: Record<string, Location> = {
  'runway-main':   { lat: 56.267, lng: 15.265, label: 'Startbana / Main Runway',      type: 'runway' },
  'apron-north':   { lat: 56.270, lng: 15.260, label: 'Norra Plattan / North Apron',  type: 'apron' },
  'fuel-depot':    { lat: 56.264, lng: 15.258, label: 'Bränsleförråd / Fuel Depot',   type: 'fuel' },
  'arming-pad':    { lat: 56.268, lng: 15.272, label: 'Beväpningsplats / Arming Pad', type: 'arming' },
  'hangar-alpha':  { lat: 56.265, lng: 15.255, label: 'Hangar Alpha / Maintenance',   type: 'maintenance' },
  'ops-center':    { lat: 56.269, lng: 15.263, label: 'Operationscentral / Ops Center', type: 'ops' },
  'radar-tower':   { lat: 56.272, lng: 15.268, label: 'Radartorn / Radar Tower',      type: 'radar' },
  'base-bravo':    { lat: 56.310, lng: 15.180, label: 'Bas Bravo / Base Bravo',       type: 'alternate' },
  'base-charlie':  { lat: 56.230, lng: 15.340, label: 'Bas Charlie / Base Charlie',   type: 'alternate' },
  'threat-vector': { lat: 56.380, lng: 15.520, label: 'Hotvektor / Threat Vector',    type: 'threat' },
}

export const MAC_POSITIONS: Record<string, Location> = {
  OPS:    { lat: 56.268377, lng: 15.272857, label: 'Operationscentral / Ops Center', type: 'ops' },
  FUEL:   { lat: 56.264227, lng: 15.273499, label: 'Bränsleförråd / Fuel Depot', type: 'fuel' },
  ARMING: { lat: 56.266431, lng: 15.273033, label: 'Beväpningsplats / Arming Pad', type: 'arming' },
  MAINT:  { lat: 56.264638, lng: 15.270250, label: 'Hangar Alpha / Maintenance', type: 'maintenance' },
  THREAT: { lat: 56.272000, lng: 15.268000, label: 'Radartorn / Radar Tower', type: 'radar' },
}

export const EVENT_LOCATION_MAP: Record<string, string> = {
  'TASKING_ORDER':         'ops-center',
  'FUEL_LOW':              'fuel-depot',
  'FUEL_RESUPPLY_UPDATE':  'fuel-depot',
  'AIRCRAFT_GROUNDED':     'hangar-alpha',
  'MAINTENANCE_COMPLETE':  'hangar-alpha',
  'ORDNANCE_DEMAND':       'arming-pad',
  'RADAR_CONTACT':         'radar-tower',
  'THREAT_ESCALATION':     'radar-tower',
  'THREAT_RESOLVED':       'radar-tower',
  'SCRAMBLE_ORDER':        'runway-main',
  'DISPERSAL_ORDER':       'ops-center',
  'EW_JAMMING':            'radar-tower',
}
