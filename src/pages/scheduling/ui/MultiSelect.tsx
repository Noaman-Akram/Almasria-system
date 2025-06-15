import { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../../components/components/ui/popover';
import { Button } from '../../../components/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../../../components/components/ui/command';
import { Badge } from '../../../components/components/ui/badge';
import { ScrollArea } from '../../../components/components/ui/scroll-area';
import { cn } from '../../../lib/utils';
import { Employee } from '../types';
import { ChevronDown } from 'lucide-react';

const MultiSelect = ({
  options,
  selected,
  onChange,
}: {
  options: Employee[];
  selected: string[];
  onChange: (selected: string[]) => void;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between text-left h-8 text-xs"
        >
          {selected.length > 0 ? (
            <div className="flex items-center gap-1">
              <Badge variant="secondary" className="text-xs px-1 py-0">
                {selected.length} selected
              </Badge>
            </div>
          ) : (
            <span className="text-muted-foreground">Select employees...</span>
          )}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search employees..."
            className="h-8 text-xs"
          />
          <CommandList>
            <CommandEmpty>No employee found.</CommandEmpty>
            <CommandGroup>
              <ScrollArea className="h-40">
                {options.map((employee) => (
                  <CommandItem
                    key={employee.id}
                    value={employee.name}
                    onSelect={() => {
                      const newSelected = selected.includes(employee.name)
                        ? selected.filter((name) => name !== employee.name)
                        : [...selected, employee.name];
                      onChange(newSelected);
                    }}
                    className="text-xs"
                  >
                    <div
                      className={cn(
                        'mr-2 flex h-3 w-3 items-center justify-center rounded-sm border border-primary',
                        selected.includes(employee.name)
                          ? 'bg-primary text-primary-foreground'
                          : 'opacity-50 [&_svg]:invisible'
                      )}
                    >
                      <svg
                        className="h-2 w-2"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </div>
                    <div className="flex flex-col">
                      <span>{employee.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({employee.role})
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </ScrollArea>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default MultiSelect;
