import { OrderStageAssignment, OrderStage, Order } from '../types';

interface ColorScheme {
  bg: string;
  text: string;
  border: string;
  icon: string;
}

export const getStageColorScheme = (status?: string): ColorScheme => {
  switch (status?.toLowerCase()) {
    case "completed":
      return {
        bg: "bg-blue-100",
        text: "text-blue-700",
        border: "border-blue-200",
        icon: "text-blue-500",
      };
    case "in progress":
    case "in_progress":
      return {
        bg: "bg-green-100",
        text: "text-green-700",
        border: "border-green-200",
        icon: "text-green-500",
      };
    case "pending":
      return {
        bg: "bg-amber-100",
        text: "text-amber-700",
        border: "border-amber-200",
        icon: "text-amber-500",
      };
    case "delayed":
      return {
        bg: "bg-red-100",
        text: "text-red-700",
        border: "border-red-200",
        icon: "text-red-500",
      };
    default:
      return {
        bg: "bg-gray-100",
        text: "text-gray-700",
        border: "border-gray-200",
        icon: "text-gray-500",
      };
  }
};

export const groupAssignmentsByStageAndDate = (assignments: OrderStageAssignment[]): Record<string, OrderStageAssignment[]> => {
  const grouped: Record<string, OrderStageAssignment[]> = {};
  
  assignments.forEach((assignment) => {
    const key = `${assignment.order_stage_id}-${assignment.work_date}`;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(assignment);
  });
  
  return grouped;
};

export const getOrderForAssignment = (
  assignment: OrderStageAssignment, 
  orders: Order[], 
  stages: OrderStage[]
): Order | undefined => {
  const stage = stages.find(s => s.id === assignment.order_stage_id);
  if (!stage || !('order_id' in stage)) return undefined;
  
  return orders.find(order => order.id === stage.order_id);
};

export const getStageForAssignment = (
  assignment: OrderStageAssignment, 
  stages: OrderStage[]
): OrderStage | undefined => {
  return stages.find(stage => stage.id === assignment.order_stage_id);
};
