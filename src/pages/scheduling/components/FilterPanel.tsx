"use client"

import type React from "react"

import { useState, useMemo } from "react"
import { Filter, ChevronLeft, X, Calendar, Users, Layers, AlertTriangle } from "lucide-react"
import { Button } from "../../../components/components/ui/button"
import { Label } from "../../../components/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/components/ui/select"
import { Badge } from "../../../components/components/ui/badge"
import { ScrollArea } from "../../../components/components/ui/scroll-area"
import MultiSelect from "../ui/MultiSelect"
import type { Order, OrderStage, Employee } from "../../../types/entities"

interface FilterPanelProps {
  orders: Order[]
  employees: Employee[]
  stages: OrderStage[]
  selectedOrderId: number | null
  setSelectedOrderId: (id: number | null) => void
  selectedEmployees: string[]
  setSelectedEmployees: (employees: string[]) => void
  selectedStatuses: string[]
  setSelectedStatuses: (statuses: string[]) => void
  resetFilters: () => void
  isAnyFilterActive: boolean
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  orders,
  employees,
  stages,
  selectedOrderId,
  setSelectedOrderId,
  selectedEmployees,
  setSelectedEmployees,
  selectedStatuses,
  setSelectedStatuses,
  resetFilters,
  isAnyFilterActive,
}) => {
  const [isExpanded, setIsExpanded] = useState(false) // Changed to false - not open by default
  const width = 320 // Fixed width, no more resizing

  const allStatuses = useMemo(() => {
    const statuses = new Set<string>()
    stages.forEach((stage) => {
      if (stage.status) {
        statuses.add(stage.status)
      }
    })
    return Array.from(statuses)
  }, [stages])

  const toggleStatus = (status: string) => {
    const newStatuses = selectedStatuses.includes(status)
      ? selectedStatuses.filter((s) => s !== status)
      : [...selectedStatuses, status]
    setSelectedStatuses(newStatuses)
  }

  return (
    <div
      className="border-l border-gray-200 bg-white flex flex-col h-full transition-all duration-300"
      style={{ width: isExpanded ? `${width}px` : "60px" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        {isExpanded ? (
          <>
            <div className="flex items-center gap-3">
              <Filter className="h-5 w-5 text-gray-600" />
              <div>
                <h2 className="font-semibold text-lg text-gray-900">Filters</h2>
                <p className="text-sm text-gray-500">Quickly find assignments</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {isAnyFilterActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="text-xs h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setIsExpanded(false)} className="h-7 w-7 p-0">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setIsExpanded(true)} className="h-8 w-8 p-0 mx-auto">
            <Filter className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isExpanded && (
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            {/* Date Filter */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <Label className="text-sm font-medium text-gray-700">Date</Label>
              </div>
              <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">No date selected</div>
            </div>

            {/* Employee Filter */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <Label className="text-sm font-medium text-gray-700">Employee</Label>
              </div>
              <MultiSelect options={employees} selected={selectedEmployees} onChange={setSelectedEmployees} />
            </div>

            {/* Stage Filter */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-gray-500" />
                <Label className="text-sm font-medium text-gray-700">Stage</Label>
              </div>
              <Select
                value={selectedStatuses.length > 0 ? selectedStatuses[0] : ""}
                onValueChange={(value) => {
                  if (value) {
                    setSelectedStatuses([value])
                  } else {
                    setSelectedStatuses([])
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {allStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority Filter */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-gray-500" />
                <Label className="text-sm font-medium text-gray-700">Priority</Label>
              </div>
              <Select>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Order Filter */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">Order</Label>
              <Select
                value={selectedOrderId?.toString() || ""}
                onValueChange={(value) => {
                  setSelectedOrderId(value ? Number(value) : null)
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Orders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  {orders.map((order: Order) => (
                    <SelectItem key={order.id} value={order.id.toString()}>
                      <div className="flex flex-col">
                        <span className="font-medium">{order.code}</span>
                        <span className="text-xs text-gray-500 truncate">{order.customer_name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Active Filters Summary */}
            {isAnyFilterActive && (
              <div className="pt-4 border-t border-gray-200">
                <Label className="text-sm font-medium text-gray-700 mb-3 block">Active Filters</Label>
                <div className="space-y-2">
                  {selectedOrderId && (
                    <div className="flex items-center justify-between text-sm bg-blue-50 p-2 rounded">
                      <span className="text-blue-700">Order:</span>
                      <span className="font-medium text-blue-900">
                        {orders.find((o) => o.id === selectedOrderId)?.code}
                      </span>
                    </div>
                  )}
                  {selectedEmployees.length > 0 && (
                    <div className="flex items-center justify-between text-sm bg-green-50 p-2 rounded">
                      <span className="text-green-700">Employees:</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        {selectedEmployees.length}
                      </Badge>
                    </div>
                  )}
                  {selectedStatuses.length > 0 && (
                    <div className="flex items-center justify-between text-sm bg-purple-50 p-2 rounded">
                      <span className="text-purple-700">Stages:</span>
                      <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                        {selectedStatuses.length}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}

export default FilterPanel
