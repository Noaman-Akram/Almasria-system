// Egyptian Cities
export const EGYPTIAN_CITIES = [
  'Cairo',
  'Alexandria',
  'Giza',
  'Shubra El-Kheima',
  'Port Said',
  'Suez',
  'Luxor',
  'Mansoura',
  'El-Mahalla El-Kubra',
  'Tanta',
  'Asyut',
  'Ismailia',
  'Fayyum',
  'Zagazig',
  'Aswan',
  'Damietta',
  'Damanhur',
  'Minya',
  'Beni Suef',
  'Hurghada',
  'Qena',
  'Sohag',
  'Shibin El Kom',
  'Banha',
  'Kafr el-Sheikh',
  'Arish',
  'Mallawi',
  'Bilbays',
  'Marsa Matruh',
  'Idfu',
  'Mit Ghamr',
  'Al-Hamidiyya',
  'Desouk',
  'Qalyub',
  'Abu Kabir',
  'Kafr el-Dawwar',
  'Girga',
  'Akhmim',
  'Matareya'
];

// Work Types
export const WORK_TYPES = [
  { name: 'Kitchen', code: 'K', value: 'kitchen', label: 'Kitchen' },
  { name: 'Walls', code: 'W', value: 'walls', label: 'Walls' },
  { name: 'Floor', code: 'F', value: 'floor', label: 'Floor' },
  { name: 'Other', code: 'X', value: 'other', label: 'Other' }
];

// Material Types
export const MATERIAL_TYPES = [
  { value: 'marble', label: 'Marble' },
  { value: 'granite', label: 'Granite' },
  { value: 'quartz', label: 'Quartz' },
  { value: 'ceramic', label: 'Ceramic' },
  { value: 'porcelain', label: 'Porcelain' },
  { value: 'natural_stone', label: 'Natural Stone' },
  { value: 'other', label: 'Other' }
];

// Units
export const UNITS = [
  { value: 'meter', label: 'Meter (m)' },
  { value: 'square_meter', label: 'Square Meter (m²)' },
  { value: 'piece', label: 'Piece' },
  { value: 'linear_meter', label: 'Linear Meter' }
];

// Engineers/Workers
export const ENGINEERS = [
  { value: 'ahmed_hassan', label: 'Ahmed Hassan' },
  { value: 'mohamed_ali', label: 'Mohamed Ali' },
  { value: 'omar_mahmoud', label: 'Omar Mahmoud' },
  { value: 'khaled_ibrahim', label: 'Khaled Ibrahim' },
  { value: 'youssef_ahmed', label: 'Youssef Ahmed' },
  { value: 'mahmoud_omar', label: 'Mahmoud Omar' },
  { value: 'hassan_mohamed', label: 'Hassan Mohamed' },
  { value: 'ibrahim_khaled', label: 'Ibrahim Khaled' },
  { value: 'ali_youssef', label: 'Ali Youssef' },
  { value: 'other', label: 'Other' }
];

// Work Order Stages

export const WORK_ORDER_STAGES = [
  { value: 'purchasing', label: 'Purchasing' },
  { value: 'cutting', label: 'Cutting' },
  { value: 'finishing', label: 'Finishing' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'installing', label: 'Installing' }
];

// Stage Statuses
export const STAGE_STATUSES = [
  { value: 'not_started', label: 'Not Started', color: 'gray' },
  { value: 'scheduled', label: 'Scheduled', color: 'blue' },
  { value: 'in_progress', label: 'In Progress', color: 'yellow' },
  { value: 'completed', label: 'Completed', color: 'green' },
  { value: 'delayed', label: 'Delayed', color: 'red' },
  { value: 'on_hold', label: 'On Hold', color: 'orange' }
];

// Order Statuses
export const ORDER_STATUSES = {
  SALE: [
    { value: 'pending', label: 'Pending' },
    { value: 'converted', label: 'Converted to Work Order' },
    { value: 'cancelled', label: 'Cancelled' }
  ],
  WORK: [
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ]
};

// Employee Rates (per hour in EGP)
export const EMPLOYEE_RATES = [
  { name: 'Senior Engineer', rate: 150 },
  { name: 'Junior Engineer', rate: 100 },
  { name: 'Technician', rate: 80 },
  { name: 'Helper', rate: 50 },
  { name: 'Supervisor', rate: 120 }
];