import { LabelType, ModbusBitParity, SensorQuality } from "./enums";

// Request
export interface IRequest {
  cmd: string;
  arg: string;
  data: any;
}

// Labels
export interface ILabelData {
  equipment: string[];
  location: string[];
  position: string[];
}

export interface ILabel {
  index: number;
  name: string;
  type: LabelType;
}

// Sensors
export interface ISensorConfig {
  location: number;
  position: number;
  equipment: number;
}

export interface ISensor {
  id: number;
  config: ISensorConfig;
  quality?: SensorQuality;
  rssid?: number;
  time_stamp?: number;
}

export interface ISensorData {
  id: number; 
  avg_temp: number;
  temp: number;
  std_dev: number;
  n_readings: number;
  quality: SensorQuality;
  rssid: number;
  time_stamp: number; // seconds since epoch
}

// System
export interface ISystem {
  serial: number;
  dir_modbus: number;
  baudrate: number;
  bit_parity: ModbusBitParity; 
}
// Menu & Sidebars
export interface IMenuItem {
  label: string;
  route?: string;
}
