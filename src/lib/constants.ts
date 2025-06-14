export const WORK_TYPES = [
  { name: 'Kitchen', code: 'K', value: 'kitchen', label: 'Kitchen' },
  { name: 'Walls', code: 'W', value: 'walls', label: 'Walls' },
  { name: 'Floor', code: 'F', value: 'floor', label: 'Floor' },
  { name: 'Other', code: 'X', value: 'other', label: 'Other' }
] as const;

const ORDER_STATUSES = {
  sale: [
    { value: 'pending', label: 'Pending' },
    { value: 'converted', label: 'Converted to Work Order' },
    { value: 'cancelled', label: 'Cancelled' }
  ],
  work: [
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ]
} as const;

export const EGYPTIAN_CITIES = [
  'Cairo', 'Alexandria', 'Giza', 'Shubra El Kheima', 'Port Said',
  'Suez', 'Luxor', 'Mansoura', 'El-Mahalla El-Kubra', 'Tanta',
  'Asyut', 'Ismailia', 'Fayyum', 'Zagazig', 'Aswan', 'Damietta', 'Other'
] as const;

export const MATERIAL_TYPES = [
  { value: 'marble', label: 'Marble' },
  { value: 'quartz', label: 'Quartz' },
  { value: 'granite', label: 'Granite' }
] as const;

export const UNITS = [
  { value: 'count', label: 'Count' },
  { value: 'linear_meter_ML', label: 'Linear Meter (ml)' },
  { value: 'square_meter_M²', label: 'Square Meter (m²)' },
  { value: 'cubic_meter_M³', label: 'Cubic Meter (m³)' }
] as const;

export const ENGINEERS = [
  { value: 'محمد عويس', label: 'Eng. محمد عويس' },
  { value: 'عمرو البحراوي', label: 'Eng. عمرو البحراوي' },
  { value: 'تريزورى', label: 'Eng. تريزورى (تيريزا)' },
  { value: 'باسم الشحات', label: 'Eng. باسم الشحات (بصمة)' },
  { value: 'إسلام فؤاد', label: 'Eng. إسلام فؤاد' }
] as const;

export const WORK_ORDER_STAGES = [
  { value: 'purchasing', label: 'Purchasing' },
  { value: 'cutting', label: 'Cutting' },
  { value: 'finishing', label: 'Finishing' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'installing', label: 'Installing' }
] as const;

export const EMPLOYEE_RATES = [
  { value: 0.5, label: 'Half (0.5x)', numericValue: 0.5 },
  { value: 1, label: 'Normal (1x)', numericValue: 1 },
  { value: 1.5, label: 'One and Half (1.5x)', numericValue: 1.5 },
  { value: 2, label: 'Double (2x)', numericValue: 2 }
] as const;

export const STAGE_STATUSES = [
  { value: 'not_started', label: 'Not Started', color: 'gray' },
  { value: 'in_progress', label: 'In Progress', color: 'blue' },
  { value: 'completed', label: 'Completed', color: 'green' },
  { value: 'delayed', label: 'Delayed', color: 'red' },
  { value: 'on_hold', label: 'On Hold', color: 'yellow' }
] as const;

export const ORDER_TYPES = {
  SALE: 'sale',
  WORK: 'work'
} as const;