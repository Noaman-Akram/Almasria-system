import React from 'react';
import { cn } from "../../../lib/utils";
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarProps {
  selected?: Date;
  onSelect?: (date: Date | null) => void;
  disabled?: (date: Date) => boolean;
}

export function Calendar({ 
  selected, 
  onSelect, 
  disabled,
}: CalendarProps) {
  // State for displayed month/year, default to selected or today
  const [displayedDate, setDisplayedDate] = React.useState(() => selected ? new Date(selected) : new Date());

  // If selected changes (e.g., from parent), update displayed month to match
  React.useEffect(() => {
    if (selected) {
      setDisplayedDate(new Date(selected));
    }
  }, [selected]);

  const firstDayOfMonth = new Date(displayedDate.getFullYear(), displayedDate.getMonth(), 1);
  const daysInMonth = new Date(displayedDate.getFullYear(), displayedDate.getMonth() + 1, 0).getDate();
  const firstDayOfWeek = firstDayOfMonth.getDay();

  const days = [];
  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(displayedDate.getFullYear(), displayedDate.getMonth(), i));
  }

  const isSelectedDate = (date: Date) => {
    if (!selected || !date) return false;
    return date.getDate() === selected.getDate() && 
      date.getMonth() === selected.getMonth() && 
      date.getFullYear() === selected.getFullYear();
  };

  const isDisabled = (date: Date) => {
    if (!date) return false;
    return disabled ? disabled(date) : false;
  };

  // Handlers for month navigation
  const goToPrevMonth = () => {
    setDisplayedDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const goToNextMonth = () => {
    setDisplayedDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  return (
    <div className="p-3 select-none">
      <div className="mb-4 flex justify-between items-center">
        <button onClick={goToPrevMonth} className="p-1" aria-label="Previous month" type="button">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="font-medium">{format(displayedDate, 'MMMM yyyy')}</div>
        <button onClick={goToNextMonth} className="p-1" aria-label="Next month" type="button">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {weekDays.map((day) => (
          <div key={day} className="text-xs font-medium text-gray-500 mb-1">
            {day}
          </div>
        ))}
        {days.map((day, i) => (
          <button
            key={i}
            disabled={day ? isDisabled(day) : true}
            onClick={() => day && onSelect?.(day)}
            className={cn(
              "h-9 w-9 rounded-md text-center text-sm p-0 font-normal",
              !day && "text-gray-300 cursor-default",
              day && "hover:bg-gray-100 focus:bg-gray-100",
              isSelectedDate(day as Date) && "bg-blue-100 text-blue-900",
              isDisabled(day as Date) && "text-gray-300 cursor-not-allowed hover:bg-transparent"
            )}
            type="button"
          >
            {day ? format(day, 'd') : ''}
          </button>
        ))}
      </div>
    </div>
  );
} 