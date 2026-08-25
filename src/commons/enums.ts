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
  { label: 'FM0',      value: 'FM0' },
  { label: 'Miller 2', value: 'M2'  },
  { label: 'Miller 4', value: 'M4'  },
  { label: 'Miller 8', value: 'M8'  },
];

export const Region = [
  { label: 'North America', value: 'NA' },
  { label: 'Europe',        value: 'EU' },
];

export const ReaderQ       = ['AUTO', 'Q0', 'Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8', 'Q9', 'Q10', 'Q11', 'Q12', 'Q13', 'Q14', 'Q15'];
export const ReaderSession = ['S0', 'S1', 'S2', 'S3'];
export const ReaderTarget  = ['A', 'B'];
