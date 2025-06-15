import { Employee } from "./types";

// Static employee data
export const STATIC_EMPLOYEES: Employee[] = [
  { id: 1, name: "John Doe", role: "Technician" },
  { id: 2, name: "Jane Smith", role: "Technician" },
  { id: 3, name: "Mike Johnson", role: "Supervisor" },
  { id: 4, name: "Sara Wilson", role: "Designer" },
  { id: 5, name: "Ahmed Mohamed", role: "Installer" },
  { id: 6, name: "Fatima Ali", role: "Project Manager" },
  { id: 7, name: "Carlos Rodriguez", role: "Fabricator" },
  { id: 8, name: "Maria Garcia", role: "Quality Control" },
  { id: 9, name: "David Chen", role: "Measurement Specialist" },
  { id: 10, name: "Omar Khaled", role: "Installer" },
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