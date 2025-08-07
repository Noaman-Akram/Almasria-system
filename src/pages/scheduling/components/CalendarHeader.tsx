import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "../../../components/components/ui/button"

interface CalendarHeaderProps {
  currentDate: Date
  weekRangeText: string
  onPreviousWeek: () => void
  onNextWeek: () => void
  onToday: () => void
  onAddAssignment: () => void
}

function CalendarHeader({
  weekRangeText,
  onPreviousWeek,
  onNextWeek,
  onToday,
  onAddAssignment,
}: CalendarHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center space-x-2">
        <h1 className="text-2xl font-bold tracking-tight">Schedule</h1>
        <span className="text-muted-foreground">{weekRangeText}</span>
      </div>
      <div className="flex items-center space-x-2">
        <div className="flex items-center rounded-md border relative z-10" data-calendar-nav>
          <Button
            variant="ghost"
            size="sm"
            onClick={onPreviousWeek}
            className="h-8 w-8 p-0 relative z-20"
            onMouseDown={(e) => {
              e.stopPropagation();
              // Force close any open translate dropdown
              const translateDropdown = document.querySelector('.google-translate-container');
              if (translateDropdown) {
                const event = new CustomEvent('forceCloseTranslate');
                document.dispatchEvent(event);
              }
            }}
            onMouseUp={(e) => {
              e.stopPropagation();
            }}
            data-calendar-nav
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToday}
            className="h-8 px-2 text-xs relative z-20"
            onMouseDown={(e) => {
              e.stopPropagation();
              // Force close any open translate dropdown
              const translateDropdown = document.querySelector('.google-translate-container');
              if (translateDropdown) {
                const event = new CustomEvent('forceCloseTranslate');
                document.dispatchEvent(event);
              }
            }}
            onMouseUp={(e) => {
              e.stopPropagation();
            }}
            data-calendar-nav
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onNextWeek}
            className="h-8 w-8 p-0 relative z-20"
            onMouseDown={(e) => {
              e.stopPropagation();
              // Force close any open translate dropdown
              const translateDropdown = document.querySelector('.google-translate-container');
              if (translateDropdown) {
                const event = new CustomEvent('forceCloseTranslate');
                document.dispatchEvent(event);
              }
            }}
            onMouseUp={(e) => {
              e.stopPropagation();
            }}
            data-calendar-nav
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button 
          onClick={onAddAssignment}
          className="relative z-20"
          onMouseDown={(e) => {
            e.stopPropagation();
            // Force close any open translate dropdown
            const translateDropdown = document.querySelector('.google-translate-container');
            if (translateDropdown) {
              const event = new CustomEvent('forceCloseTranslate');
              document.dispatchEvent(event);
            }
          }}
          onMouseUp={(e) => {
            e.stopPropagation();
          }}
        >
          Add Assignment
        </Button>
      </div>
    </div>
  )
}

export default CalendarHeader
