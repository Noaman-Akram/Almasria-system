import { useState } from 'react';
import { format, isBefore, isEqual, addDays } from 'date-fns';
import { Button } from '../../../components/components/ui/button';
import { Label } from '../../../components/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/components/ui/popover';
import { Calendar as CalendarComponent } from '../../../components/components/ui/calendar';
import { Calendar } from 'lucide-react';
import { cn } from '../../../lib/utils';

const DateRangePicker = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  isMultiDay,
}: {
  startDate: Date | null;
  endDate: Date | null;
  onStartDateChange: (date: Date | null) => void;
  onEndDateChange: (date: Date | null) => void;
  isMultiDay: boolean;
}) => {
  const [isStartDateOpen, setIsStartDateOpen] = useState(false);
  const [isEndDateOpen, setIsEndDateOpen] = useState(false);

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label>Start Date *</Label>
        <Popover open={isStartDateOpen} onOpenChange={setIsStartDateOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}
            >
              <Calendar className="mr-2 h-4 w-4" />
              {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              selected={startDate || undefined}
              onSelect={(date) => {
                onStartDateChange(date);
                setIsStartDateOpen(false);
                if (isMultiDay && date && endDate && (isBefore(endDate, date) || isEqual(endDate, date))) {
                  onEndDateChange(addDays(date, 1));
                }
              }}
               
            />
          </PopoverContent>
        </Popover>
      </div>
      {isMultiDay && (
        <div>
          <Label>End Date *</Label>
          <Popover open={isEndDateOpen} onOpenChange={setIsEndDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                 selected={endDate || undefined}
                onSelect={(date) => {
                  onEndDateChange(date);
                  setIsEndDateOpen(false);
                }}
                disabled={(date) => (startDate ? isBefore(date, startDate) || isEqual(date, startDate) : false)}
               />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker; 