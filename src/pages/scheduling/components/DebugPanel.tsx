import React, { useState } from 'react';
import { Code, Bug, ChevronUp, ChevronDown, RefreshCw } from 'lucide-react';
import { Button } from '../../../components/components/ui/button';
import { format } from 'date-fns';
import { OrderStageAssignment } from '../types';
import { cn } from '../../../lib/utils';

interface DebugPanelProps {
  weekStart: Date;
  weekEnd: Date;
  assignments: OrderStageAssignment[];
  loading: boolean;
  onRefresh: () => void;
}

const DebugPanel: React.FC<DebugPanelProps> = ({
  weekStart,
  weekEnd,
  assignments,
  loading,
  onRefresh
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Group assignments by date for better display
  const assignmentsByDate = assignments.reduce<Record<string, OrderStageAssignment[]>>((acc, assignment) => {
    const date = assignment.work_date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(assignment);
    return acc;
  }, {});

  const dateRange = `${format(weekStart, 'yyyy-MM-dd')} to ${format(weekEnd, 'yyyy-MM-dd')}`;
  
  const handleCopyToClipboard = () => {
    const debugData = {
      dateRange,
      assignmentsCount: assignments.length,
      assignments,
      groupedByDate: assignmentsByDate
    };
    
    navigator.clipboard.writeText(JSON.stringify(debugData, null, 2))
      .then(() => {
        alert('Debug data copied to clipboard');
      })
      .catch(err => {
        console.error('Failed to copy debug data:', err);
      });
  };

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 bg-gray-900 text-white transition-all duration-300 z-50 border-t border-gray-700",
      isExpanded ? "h-[50vh]" : "h-10"
    )}>
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 py-2 cursor-pointer bg-gray-800 hover:bg-gray-700 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <Bug size={16} className="text-green-400" />
          <span className="font-medium">Scheduling Debug Panel</span>
          <span className="text-xs text-gray-400">({dateRange})</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs bg-gray-700 px-2 py-1 rounded">
            {assignments.length} assignments
          </span>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 text-white hover:text-white hover:bg-gray-700"
            onClick={(e) => {
              e.stopPropagation();
              onRefresh();
            }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </Button>
          {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </div>
      </div>

      {/* Debug Content */}
      {isExpanded && (
        <div className="h-[calc(50vh-40px)] overflow-auto p-4">
          <div className="flex justify-between mb-4">
            <h3 className="text-lg font-semibold">OrderStageAssignments</h3>
            <Button 
              size="sm" 
              variant="outline" 
              className="text-xs"
              onClick={handleCopyToClipboard}
            >
              <Code size={14} className="mr-1" /> Copy JSON
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw size={24} className="animate-spin text-blue-400 mr-2" />
              <span>Loading assignments...</span>
            </div>
          ) : assignments.length === 0 ? (
            <div className="bg-gray-800 p-4 rounded text-center">
              <p>No assignments found for this week.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Group by date */}
              {Object.entries(assignmentsByDate).map(([date, dayAssignments]) => (
                <div key={date} className="bg-gray-800 p-4 rounded">
                  <h4 className="font-medium text-blue-300 mb-2">{date} ({dayAssignments.length})</h4>
                  <div className="space-y-3">
                    {dayAssignments.map((assignment, index) => (
                      <div key={`${assignment.id}-${index}`} className="bg-gray-700 p-3 rounded-md">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="col-span-2 flex justify-between items-center">
                            <span className="font-bold text-green-300">ID: {assignment.id}</span>
                            <span className="text-xs bg-blue-900 px-2 py-1 rounded-full">
                              {assignment.is_done ? 'Completed' : 'Pending'}
                            </span>
                          </div>
                          
                          <div>
                            <span className="text-gray-400">order_stage_id:</span>{' '}
                            <span className={assignment.order_stage_id ? 'text-white' : 'text-red-400'}>
                              {assignment.order_stage_id ?? 'null'}
                            </span>
                          </div>
                          
                          <div>
                            <span className="text-gray-400">employee_name:</span>{' '}
                            <span className="text-white">{assignment.employee_name}</span>
                          </div>
                          
                          <div>
                            <span className="text-gray-400">work_date:</span>{' '}
                            <span className="text-white">{assignment.work_date}</span>
                          </div>
                          
                          <div>
                            <span className="text-gray-400">employee_rate:</span>{' '}
                            <span className={assignment.employee_rate ? 'text-white' : 'text-gray-500'}>
                              {assignment.employee_rate ?? 'null'}
                            </span>
                          </div>
                          
                          <div className="col-span-2">
                            <span className="text-gray-400">note:</span>{' '}
                            <span className={assignment.note ? 'text-white' : 'text-gray-500'}>
                              {assignment.note || 'null'}
                            </span>
                          </div>
                          
                          <div className="col-span-2">
                            <span className="text-gray-400">created_at:</span>{' '}
                            <span className={assignment.created_at ? 'text-white' : 'text-gray-500'}>
                              {assignment.created_at || 'null'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="mt-4 bg-gray-800 p-4 rounded">
            <h4 className="font-medium text-blue-300 mb-2">Database Schema</h4>
            <div className="text-xs font-mono overflow-x-auto whitespace-nowrap">
              <p><span className="text-purple-300">order_stage_assignments</span> (</p>
              <p className="pl-4"><span className="text-green-300">id</span> (integer),</p>
              <p className="pl-4"><span className="text-green-300">order_stage_id</span> (integer, nullable),</p>
              <p className="pl-4"><span className="text-green-300">employee_name</span> (text),</p>
              <p className="pl-4"><span className="text-green-300">work_date</span> (date),</p>
              <p className="pl-4"><span className="text-green-300">note</span> (text, nullable),</p>
              <p className="pl-4"><span className="text-green-300">is_done</span> (boolean, nullable),</p>
              <p className="pl-4"><span className="text-green-300">created_at</span> (timestamp with time zone, nullable),</p>
              <p className="pl-4"><span className="text-green-300">employee_rate</span> (numeric, nullable)</p>
              <p>)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugPanel;