import { Employee } from "./types";

// Static employee data
export const STATIC_EMPLOYEES: Employee[] = [
  { id: 1, name: 'وائل امين', role: '' },
  { id: 2, name: 'هانى مهند', role: '' },
  { id: 3, name: 'محمد فؤاد (توتا)', role: '' },
  { id: 4, name: 'محمود محمد (بسبوسه)', role: '' },
  { id: 5, name: 'على ماهر', role: '' },
  { id: 6, name: 'محمد الشرقاوى (لبيب)', role: '' },
  { id: 7, name: 'احمد متولى', role: '' },
  { id: 8, name: 'خالد', role: '' },
  { id: 9, name: 'كريم سعد', role: '' },
  { id: 10, name: 'محمد ابراهيم (كلوب)', role: '' },
  { id: 11, name: 'زياد وائل', role: '' },
  { id: 12, name: 'محمد سالم', role: '' },
  { id: 13, name: 'عيد سالم', role: '' },
  { id: 14, name: 'خارجى/اخر', role: '' },
];

// Stage statuses with colors
/* const STAGE_STATUSES = [
  { value: "not_started", label: "Not Started", color: "gray" },
  { value: "in_progress", label: "In Progress", color: "blue" },
  { value: "completed", label: "Completed", color: "green" },
  { value: "delayed", label: "Delayed", color: "red" },
  { value: "on_hold", label: "On Hold", color: "yellow" }
]; */

// Standard stages for work orders

// Debug flags
export const DEBUG = {
  ENABLED: true,
  LOG_API_CALLS: true,
  SHOW_PANEL: true,
  VERBOSE: false
};