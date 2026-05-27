import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { assignStudentToOfflineClass, getAuditLogs, getTeacherAnalytics } from "@/lib/hsk.functions";
import { AdminAuditLogsPanel, AdminMappingPanel, AdminTeacherAnalyticsPanel } from "./HSK_AdminPanelUi";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HSK_Theme } from "@/theme/HSK_Theme";

export function HSK_AdminPanelView() {
  const qc = useQueryClient();
  const assignFn = useServerFn(assignStudentToOfflineClass);
  const auditFn = useServerFn(getAuditLogs);
  const analyticsFn = useServerFn(getTeacherAnalytics);

  const [studentId, setStudentId] = useState("");
  const [classId, setClassId] = useState("");
  const [activeTab, setActiveTab] = useState("mapping");

  const auditQuery = useQuery({ queryKey: ["audit"], queryFn: () => auditFn() });
  const analyticsQuery = useQuery({ queryKey: ["teacher-analytics"], queryFn: () => analyticsFn() });

  const handleAssign = async () => {
    await assignFn({ data: { studentId, classId } });
    qc.invalidateQueries({ queryKey: ["audit"] });
    setStudentId("");
    setClassId("");
  };

  const filteredAuditRows = useMemo(() => {
    const search = "";
    const rows = (auditQuery.data ?? []) as any[];
    return rows.filter((row) => !!row);
  }, [auditQuery.data]);

  return (
    <div className="space-y-6" style={{ backgroundColor: HSK_Theme.light.surface }}>
      <div>
        <h1 className="font-display text-2xl font-bold">Bảng điều khiển Admin</h1>
        <p className="text-sm text-muted-foreground">
          Master control panel — gán lớp, theo dõi giáo viên và audit log toàn hệ thống.
        </p>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="mapping">Mapping học viên ↔ lớp</TabsTrigger>
          <TabsTrigger value="teachers">Giáo viên & đánh giá</TabsTrigger>
          <TabsTrigger value="audit">Audit logs</TabsTrigger>
        </TabsList>
        <TabsContent value="mapping" className="mt-6">
          <AdminMappingPanel
            studentId={studentId}
            classId={classId}
            onStudentIdChange={setStudentId}
            onClassIdChange={setClassId}
            onAssign={handleAssign}
            isSubmitDisabled={!studentId || !classId}
          />
        </TabsContent>
        <TabsContent value="teachers" className="mt-6">
          <AdminTeacherAnalyticsPanel
            teachers={analyticsQuery.data?.teachers ?? []}
            ratings={analyticsQuery.data?.ratings ?? []}
          />
        </TabsContent>
        <TabsContent value="audit" className="mt-6">
          <AdminAuditLogsPanel logs={filteredAuditRows} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
