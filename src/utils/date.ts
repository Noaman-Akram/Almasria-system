export const formatDate = (date: string | Date): string => {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// New function for detailed date formatting with time and seconds
export const formatDateTime = (date: string | Date): string => {
  const d = new Date(date);
  
  // Format date part
  const dateStr = d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  
  // Format time part with seconds
  const timeStr = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
  
  return `${dateStr} at ${timeStr}`;
};

// Alternative format for more compact display
export const formatDateTimeCompact = (date: string | Date): string => {
  const d = new Date(date);
  
  // Format as: MM/DD/YYYY HH:MM:SS AM/PM
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};