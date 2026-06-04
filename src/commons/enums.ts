export enum SensorQuality {
  OUT_OF_SERVICE = "Out of service",
  BAD = "Bad",
  REGULAR = "Regular",
  GOOD = "Good",
  EXCELLENT = "Excellent",
}

export enum LabelType {
  EQUIPMENT = 'equipment',
  LOCATION = 'location',
  POSITION = 'position',
}

export const ModbusBitParity = [
  'none',
  'odd',
  'even',
]

export const BaudRate = [
  9600,
  19200,
  38400,
  57600,
  115200,
]

export const AlarmType = [
  'Non set',
  'Absolute',
  'Unbalance',
  'Dispersion',
  'Hysteresis',
]

export const ReleFlag = [
  'Non set',
  'Rele 1',
  'Rele 2',
]

export const TagEncoding = [
  { label: 'FM0', value: 0},
  { label: 'MILLER 2', value: 1},
  { label: 'MILLER 4', value: 2},
  { label: 'MILLER 8', value: 3},
];

export const Region = [
  { label: 'Europe', value: 8},
  { label: 'North America', value: 1},
];
