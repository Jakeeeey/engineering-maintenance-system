"use client";

import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Activity, Search, RefreshCcw } from "lucide-react";

import { SchedulesTable } from "./components/SchedulesTable";
import { WorkOrdersTable } from "./components/WorkOrdersTable";
import { AddScheduleModal } from "./components/AddScheduleModal";
import { LogUsageModal } from "./components/LogUsageModal";
import { EditScheduleModal } from "./components/EditScheduleModal";

import {
  useGetSchedules,
  useGetWorkOrders,
  useCompleteWorkOrder,
} from "./hooks/usePreventiveMaintenance";
import { MaintenanceSchedule } from "./types";

interface PreventiveMaintenanceModuleProps {
  roleName?: string;
}

export default function PreventiveMaintenanceModule({ roleName }: PreventiveMaintenanceModuleProps) {
  const [activeTab, setActiveTab] = useState<string>("schedules");
  const [isAddScheduleModalOpen, setIsAddScheduleModalOpen] = useState(false);
  const [isLogUsageModalOpen, setIsLogUsageModalOpen] = useState(false);
  
  const [scheduleToEdit, setScheduleToEdit] = useState<MaintenanceSchedule | null>(null);
  
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: schedules,
    isLoading: isLoadingSchedules,
    refetch: refetchSchedules,
  } = useGetSchedules();

  const {
    data: workOrders,
    isLoading: isLoadingWorkOrders,
    refetch: refetchWorkOrders,
  } = useGetWorkOrders();

  const { mutateAsync: completeWorkOrder, isPending: isCompleting } = useCompleteWorkOrder(() => {
    refetchWorkOrders();
  });

  const handleCompleteWorkOrder = async (id: string) => {
    try {
      await completeWorkOrder({ id });
    } catch (error) {
      console.error(error);
    }
  };

  const handleRefresh = () => {
    refetchSchedules();
    refetchWorkOrders();
  };

  const filteredSchedules = useMemo(() => {
    if (!schedules) return [];
    const q = searchQuery.toLowerCase();
    return schedules.filter(s => 
      s.id.toString().includes(q) || 
      s.assetId.toString().includes(q) ||
      (s.itemName && s.itemName.toLowerCase().includes(q)) ||
      (s.classification && s.classification.toLowerCase().includes(q))
    );
  }, [schedules, searchQuery]);

  const filteredWorkOrders = useMemo(() => {
    if (!workOrders) return [];
    const q = searchQuery.toLowerCase();
    return workOrders.filter(w => 
      w.id.toString().includes(q) ||
      w.assetId.toString().includes(q) ||
      (w.itemName && w.itemName.toLowerCase().includes(q)) ||
      (w.description && w.description.toLowerCase().includes(q))
    );
  }, [workOrders, searchQuery]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Preventive Maintenance</h1>
          <p className="text-muted-foreground">Manage proactive maintenance schedules and view automated work orders.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsLogUsageModalOpen(true)}>
            <Activity className="mr-2 h-4 w-4" /> Log Usage
          </Button>
          <Button onClick={() => setIsAddScheduleModalOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Schedule
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 max-w-sm mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8" 
          />
        </div>
        <Button variant="outline" size="icon" onClick={handleRefresh}>
          <RefreshCcw className="h-4 w-4" />
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="schedules">Active Schedules</TabsTrigger>
          <TabsTrigger value="work-orders">Work Orders</TabsTrigger>
        </TabsList>
        <TabsContent value="schedules" className="space-y-4">
          <SchedulesTable 
            schedules={filteredSchedules} 
            isLoading={isLoadingSchedules} 
            roleName={roleName}
            onEdit={(schedule) => setScheduleToEdit(schedule)}
          />
        </TabsContent>
        <TabsContent value="work-orders" className="space-y-4">
          <WorkOrdersTable 
            workOrders={filteredWorkOrders} 
            isLoading={isLoadingWorkOrders} 
            onComplete={handleCompleteWorkOrder}
            isCompleting={isCompleting}
          />
        </TabsContent>
      </Tabs>

      <AddScheduleModal
        isOpen={isAddScheduleModalOpen}
        onClose={() => setIsAddScheduleModalOpen(false)}
        onSuccess={() => refetchSchedules()}
      />
      
      {scheduleToEdit && (
        <EditScheduleModal
          isOpen={true}
          schedule={scheduleToEdit}
          onClose={() => setScheduleToEdit(null)}
          onSuccess={() => {
            setScheduleToEdit(null);
            refetchSchedules();
          }}
        />
      )}
      
      <LogUsageModal
        isOpen={isLogUsageModalOpen}
        onClose={() => setIsLogUsageModalOpen(false)}
        onSuccess={() => {
          refetchWorkOrders();
        }}
      />
    </div>
  );
}
