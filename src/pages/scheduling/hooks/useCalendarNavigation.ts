import { useState, useMemo, useCallback } from 'react';
import { addWeeks, startOfWeek, endOfWeek, addDays, format, isSameDay } from 'date-fns';

function useCalendarNavigation(initialDate = new Date()) {
  const [currentDate, setCurrentDate] = useState(initialDate);

  // Calculate week range
  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const weekEnd = useMemo(() => endOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  
  // Generate array of days in the week
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  // Format week range text (e.g., "Apr 1, 2023 - Apr 7, 2023")
  const weekRangeText = useMemo(
    () => `${format(weekStart, 'MMM d, yyyy')} - ${format(weekEnd, 'MMM d, yyyy')}`,
    [weekStart, weekEnd]
  );

  // Navigation functions
  const goToPreviousWeek = useCallback(() => {
    setCurrentDate((prev) => addWeeks(prev, -1));
  }, []);

  const goToNextWeek = useCallback(() => {
    setCurrentDate((prev) => addWeeks(prev, 1));
  }, []);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // Check if a date is today
  const isCurrentDay = useCallback((date: Date) => {
    return isSameDay(date, new Date());
  }, []);

  return {
    currentDate,
    weekStart,
    weekEnd,
    weekDays,
    weekRangeText,
    goToPreviousWeek,
    goToNextWeek,
    goToToday,
    isCurrentDay,
  };
}

export default useCalendarNavigation;
