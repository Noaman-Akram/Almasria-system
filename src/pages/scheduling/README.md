# Scheduling Feature

This directory contains the scheduling feature for the application, which allows users to manage work assignments across different orders, stages, and employees.

## Directory Structure

```
scheduling/
├── components/           # Reusable UI components
│   ├── CalendarHeader/   # Header with navigation controls
│   ├── CalendarGrid/     # Main calendar grid view
│   ├── AssignmentCard/   # Card for displaying assignment details
│   └── AssignmentForm/   # Form for adding/editing assignments
├── hooks/               # Custom React hooks
│   ├── useCalendarNavigation.ts
│   ├── useAssignments.ts
│   └── useFilters.ts
├── utils/               # Utility functions
│   └── assignmentUtils.ts
├── types.ts             # TypeScript type definitions
├── constants.ts         # Constants and configuration
└── schedulingService.ts # API service functions
```

## Key Components

### CalendarHeader
Displays the current week range and provides navigation controls.

### CalendarGrid
Renders a weekly view of assignments with days as columns.

### AssignmentCard
Displays information about a single assignment in the calendar.

### AssignmentForm
A modal form for creating or editing assignments.

## Hooks

### useCalendarNavigation
Manages calendar navigation state and date calculations.

### useAssignments
Handles data fetching and state management for assignments.

### useFilters
Manages filtering logic for assignments.

## Usage

```tsx
import SchedulingPage from './scheduling/SchedulingPage';

function App() {
  return (
    <div className="app">
      <SchedulingPage />
    </div>
  );
}
```

## Data Flow

1. The `SchedulingPage` component initializes the necessary hooks.
2. `useCalendarNavigation` manages the current date and week calculations.
3. `useAssignments` fetches and manages assignment data based on the current date range.
4. `useFilters` handles filtering of assignments based on user selections.
5. User interactions (e.g., clicking "Add Assignment") trigger state updates and API calls.

## Features

- Weekly calendar view
- Assignment creation, editing, and deletion
- Filtering by order, employee, and status
- Responsive design
- Multi-day assignment support

## Dependencies

- date-fns: Date manipulation
- lucide-react: Icons
- @radix-ui/react-dialog: Accessible dialog/modal
- @radix-ui/react-popover: Accessible popover
- @radix-ui/react-select: Accessible select component
