import { format } from 'date-fns';
import { useMemo } from 'react';
import { Button } from '../../../components/components/ui/button';
import type { OrderStageAssignment, Order, OrderStage } from '../types';
import { AssignmentCard } from './AssignmentCard';
import { cn } from '../../../lib/utils';

interface DayColumnProps {
  date: Date;
  assignments: OrderStageAssignment[];
  onAddAssignment: (date: Date) => void;
  onEditAssignment: (
    assignment: OrderStageAssignment,
    additionalAssignments?: OrderStageAssignment[]
  ) => void; // FIXED: Add additionalAssignments parameter
  onDeleteAssignment: (assignment: OrderStageAssignment) => void;
  orders: Order[];
  stages: OrderStage[];
  isCurrentDay: boolean;
}

function DayColumn({
  date,
  assignments,
  onAddAssignment,
  onEditAssignment,
  onDeleteAssignment,
  orders,
  stages,
  isCurrentDay,
}: DayColumnProps) {
  const day = format(date, 'EEE');
  const dayNumber = format(date, 'd');
  const isToday = isCurrentDay;

  // Group assignments by order_stage_id and work_date to show multiple employees on same card
  const groupedAssignments = useMemo(() => {
    const groups: Record<string, OrderStageAssignment[]> = {};

    assignments.forEach((assignment) => {
      const key = `${assignment.order_stage_id}-${assignment.work_date}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(assignment);
    });

    return groups;
  }, [assignments]);

  return (
    <div className="flex flex-col border-r last:border-r-0 min-h-0">
      <div
        className={cn(
          'p-3 text-center border-b',
          isToday ? 'bg-blue-50 font-medium' : 'bg-gray-50'
        )}
      >
        <div className="text-sm text-gray-500 mb-1">{day}</div>
        <div
          className={cn(
            'mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
            isToday && 'bg-blue-600 text-white'
          )}
        >
          {dayNumber}
        </div>
      </div>

      <div className="flex-1 p-2 space-y-3 overflow-y-auto min-h-[200px]">
        {Object.entries(groupedAssignments).map(([key, group]) => {
          const primaryAssignment = group[0]; // First assignment in the group
          const additionalAssignments = group.slice(1); // Rest of the assignments

          // Find the stage first to get the order_id
          const stage = stages.find(
            (s) => s.id === primaryAssignment.order_stage_id
          );
          // Find the order using the stage's order_detail_id
          const order =
            stage && stage.order_detail_id
              ? orders.find((o) =>
                  o.order_details?.some(
                    (detail) => detail.detail_id === stage.order_detail_id
                  )
                )
              : undefined;

          return (
            <AssignmentCard
              key={key}
              assignment={primaryAssignment}
              additionalAssignments={additionalAssignments}
              order={order}
              stage={stage}
              onClick={() =>
                onEditAssignment(primaryAssignment, additionalAssignments)
              } // FIXED: Pass additional assignments
              onDelete={onDeleteAssignment}
            />
          );
        })}

        {assignments.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-8">
            No assignments
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground border-dashed border-2 border-gray-300 hover:border-gray-400 py-3"
          onClick={() => onAddAssignment(date)}
        >
          + Add Assignment
        </Button>
      </div>
    </div>
  );
}

interface CalendarGridProps {
  weekDays: Date[];
  assignments: OrderStageAssignment[];
  onAddAssignment: (date: Date) => void;
  onEditAssignment: (
    assignment: OrderStageAssignment,
    additionalAssignments?: OrderStageAssignment[]
  ) => void; // FIXED: Add additionalAssignments parameter
  onDeleteAssignment: (assignment: OrderStageAssignment) => void;
  orders: Order[];
  stages: OrderStage[];
  isCurrentDay: (date: Date) => boolean;
}

export function CalendarGrid({
  weekDays,
  assignments,
  onAddAssignment,
  onEditAssignment,
  onDeleteAssignment,
  orders,
  stages,
  isCurrentDay,
}: CalendarGridProps) {
  // Group assignments by date for better performance
  const assignmentsByDate = useMemo(() => {
    return assignments.reduce<Record<string, OrderStageAssignment[]>>(
      (acc, assignment) => {
        const date = assignment.work_date;
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(assignment);
        return acc;
      },
      {}
    );
  }, [assignments]);

  return (
    <div className="flex flex-1 overflow-hidden">
      {weekDays.map((date) => {
        const dateKey = format(date, 'yyyy-MM-dd');
        const dayAssignments = assignmentsByDate[dateKey] || [];

        return (
          <DayColumn
            key={dateKey}
            date={date}
            assignments={dayAssignments}
            onAddAssignment={onAddAssignment}
            onEditAssignment={onEditAssignment}
            onDeleteAssignment={onDeleteAssignment}
            orders={orders}
            stages={stages}
            isCurrentDay={isCurrentDay(date)}
          />
        );
      })}
    </div>
  );
}
