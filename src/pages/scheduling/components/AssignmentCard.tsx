'use client';

import type React from 'react';
import { ClipboardList, Trash2, User } from 'lucide-react';
import { Button } from '../../../components/components/ui/button';
import { Badge } from '../../../components/components/ui/badge';
import { cn } from '../../../lib/utils';
import type { OrderStageAssignment, Order, OrderStage } from '../types';

interface AssignmentCardProps {
  assignment: OrderStageAssignment;
  additionalAssignments?: OrderStageAssignment[]; // For grouped assignments
  order?: Order;
  stage?: OrderStage;
  onClick?: () => void;
  onDelete?: (assignment: OrderStageAssignment) => void;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  isCompleted?: boolean;
  is_done?: boolean | null; // Add this to match your DB schema
}

// Stage-specific colors for both bar and badge
const getStageColors = (
  stageName: string | undefined
): { barColor: string; badgeColor: string } => {
  const stageKey = stageName?.toLowerCase() || 'default';

  const stageColorMap = {
    cutting: {
      barColor: 'bg-red-500',
      badgeColor: 'bg-red-100 text-red-800 border-red-200',
    },
    installing: {
      barColor: 'bg-green-500',
      badgeColor: 'bg-green-100 text-green-800 border-green-200',
    },
    finishing: {
      barColor: 'bg-blue-500',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    },
    delivery: {
      barColor: 'bg-purple-500',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    },
    pending: {
      barColor: 'bg-orange-500',
      badgeColor: 'bg-orange-100 text-orange-800 border-orange-200',
    },
    default: {
      barColor: 'bg-gray-500',
      badgeColor: 'bg-gray-100 text-gray-800 border-gray-200',
    },
  };

  return (
    stageColorMap[stageKey as keyof typeof stageColorMap] ||
    stageColorMap.default
  );
};

// Get priority color class (matching our schedule system)
const getPriorityColorClass = (priority?: string) => {
  switch (priority) {
    case 'urgent':
      return 'bg-red-500 border-red-600';
    case 'high':
      return 'bg-orange-500 border-orange-600';
    case 'low':
      return 'bg-blue-300 border-blue-400';
    default:
      return 'bg-gray-400 border-gray-500';
  }
};

// Priority badge component (matching our schedule system)
const PriorityBadge = ({ priority }: { priority?: string }) => {
  if (!priority || priority === 'normal') return null;

  const colorClass =
    {
      urgent: 'bg-red-100 text-red-800 border-red-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      low: 'bg-blue-100 text-blue-800 border-blue-200',
    }[priority] || '';

  return (
    <Badge variant="outline" className={`${colorClass} ml-1`}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </Badge>
  );
};

export const AssignmentCard = ({
  assignment,
  additionalAssignments = [],
  order,
  stage,
  onClick,
  onDelete,
  priority = 'normal',
  isCompleted = false,
}: AssignmentCardProps) => {
  const allAssignments = [assignment, ...additionalAssignments];
  const employeeNames = allAssignments.map((a) => a.employee_name);
  const isGrouped = additionalAssignments.length > 0;
  const isDone = assignment.is_done || false;

  const stageColors = getStageColors(stage?.stage_name);
  const priorityColor = getPriorityColorClass(priority);

  const handleDelete = (
    e: React.MouseEvent,
    assignmentToDelete: OrderStageAssignment
  ) => {
    e.stopPropagation();
    if (onDelete) {
      const confirmed = window.confirm(
        `Are you sure you want to delete this assignment?\n\nEmployee: ${assignmentToDelete.employee_name}\nDate: ${assignmentToDelete.work_date}\n\nThis action cannot be undone.`
      );
      if (confirmed) {
        onDelete(assignmentToDelete);
      }
    }
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'text-xs p-2 rounded-md border hover:bg-muted cursor-pointer relative overflow-hidden group transition-all duration-200',
        isCompleted ? 'bg-green-50 border-green-200' : 'bg-background',
        'hover:shadow-md'
      )}
    >
      {/* Stage color indicator bar (top) */}
      <div
        className={`absolute top-0 left-0 right-0 h-1.5 ${stageColors.barColor}`}
      ></div>
      {/* Done status ribbon */}
      {isDone && (
        <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded">
          Completed
        </div>
      )}

      {/* Completion date */}
      {isDone && assignment.order_stage?.actual_finish_date && (
        <div className="absolute top-2 right-2 text-xs text-green-700">
          {new Date(
            assignment.order_stage.actual_finish_date
          ).toLocaleDateString()}
        </div>
      )}
      <div className="space-y-2 mt-2">
        {/* Order Code and Priority */}
        <div className="font-medium flex items-center">
          {order?.code && (
            <>
              <ClipboardList className="h-3 w-3 mr-1 text-gray-600" />
              <span className="text-blue-700 font-bold">{order.code}</span>
              <PriorityBadge priority={priority} />
            </>
          )}
        </div>

        {/* Stage and Status */}
        <div className="flex items-center justify-between">
          {stage?.stage_name && (
            <Badge
              variant="outline"
              className={`text-xs ${stageColors.badgeColor}`}
            >
              {stage.stage_name}
            </Badge>
          )}
          <Badge
            variant="outline"
            className={
              isCompleted
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-yellow-50 text-yellow-700 border-yellow-200'
            }
          >
            {isCompleted ? 'Done' : 'Pending'}
          </Badge>
        </div>

        {/* Customer Info */}
        {order?.customer_name && (
          <div className="flex items-center text-muted-foreground">
            <span className="mr-1 text-sm">
              {' '}
              <User size={18} />
            </span>
            <span className="text-xs truncate">{order.customer_name}</span>
          </div>
        )}

        {/* Employee Info */}
        <div className="flex items-center text-muted-foreground">
          {isGrouped ? (
            <>
              <span className="mr-1 text-sm">🧑‍🏭</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-blue-700">
                  {employeeNames.length} workers
                </div>
                <div className="text-xs text-gray-600 truncate">
                  {employeeNames.slice(0, 2).join(', ')}
                  {employeeNames.length > 2 &&
                    ` +${employeeNames.length - 2} more`}
                </div>
              </div>
            </>
          ) : (
            <>
              <span className="mr-1 text-sm">🧑‍🏭</span>
              <span className="text-xs font-medium truncate">
                {assignment.employee_name}
              </span>
            </>
          )}
        </div>

        {/* Notes */}
        {assignment.note && (
          <div className="text-xs text-muted-foreground bg-white bg-opacity-60 p-2 rounded truncate">
            <span className="font-medium">📝</span> {assignment.note}
          </div>
        )}

        {/* Group indicator */}
        {isGrouped && (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-200"
          >
            👥 {allAssignments.length} assignments
          </Badge>
        )}
      </div>

      {/* Delete buttons - styled like our schedule system */}
      {onDelete && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {isGrouped ? (
            <div className="flex flex-col gap-1 bg-white rounded shadow-lg p-1 border">
              {allAssignments.map((assign) => (
                <Button
                  key={assign.id}
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-gray-400 hover:text-red-500 hover:bg-red-50"
                  onClick={(e) => handleDelete(e, assign)}
                  title={`Delete ${assign.employee_name}'s assignment`}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              ))}
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-gray-400 hover:text-red-500 hover:bg-red-50 bg-white shadow-sm border"
              onClick={(e) => handleDelete(e, assignment)}
              title="Delete assignment"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
