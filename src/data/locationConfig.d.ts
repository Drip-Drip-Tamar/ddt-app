// Type declarations for locationConfig.js (remove when the module is converted to TypeScript)

export interface MonitoringLocation {
  name: string;
  center: {
    lat: number;
    lng: number;
  };
  defaultRadius: number;
  description?: string;
}

export interface RiverStations {
  freshwaterStationId: string;
  tidalStationId: string;
}

export interface BathingWater {
  id: string;
  label: string;
}

export interface MonitoringConfig {
  primaryLocation: MonitoringLocation;
  riverStations: RiverStations;
  bathingWaters: BathingWater[];
}

export function getMonitoringConfig(): Promise<MonitoringConfig>;
export function getPrimaryLocation(): Promise<MonitoringLocation>;
export function getRiverStations(): Promise<RiverStations>;
export function getBathingWaters(): Promise<BathingWater[]>;
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number;
export function clearConfigCache(): void;
