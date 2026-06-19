import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Star, MoreHorizontal, Pencil, Trash2, Eye, EyeOff, ChevronDown } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function AdminMappingPanel({
  studentId,
  classId,
  onStudentIdChange,
  onClassIdChange,
  onAssign,
  isSubmitDisabled,
  getClassDetails,
  getStudentEnrollments,
  getClasses,
  getClassEnrollments,
  onAddStudentToClass,
  onRemoveStudentFromClass,
  getStudentSuggestions,
  onUpdateClass,
  teachers,
}: {
  studentId: string;
  classId: string;
  onStudentIdChange: (value: string) => void;
  onClassIdChange: (value: string) => void;
  onAssign: () => void;
  isSubmitDisabled: boolean;
  // optional helpers (provided by caller or can be left undefined)
  getClassDetails?: (classId: string) => Promise<any>;
  getStudentEnrollments?: (studentId: string) => Promise<any[]>;
  getClasses?: () => Promise<any[]>;
  getClassEnrollments?: (classId: string) => Promise<any[]>;
  onAddStudentToClass?: (classId: string, studentId: string) => Promise<any>;
  onRemoveStudentFromClass?: (classId: string, studentId: string) => Promise<any>;
  getStudentSuggestions?: (q: string) => Promise<any[]>;
  onUpdateClass?: (classId: string, updates: Record<string, any>) => Promise<any>;
  teachers?: any[];
}) {
  const [classDetails, setClassDetails] = useState<any | null>(null);
  const [studentEnrollments, setStudentEnrollments] = useState<any[] | null>(null);
  const [loadingClass, setLoadingClass] = useState(false);
  const [loadingStudent, setLoadingStudent] = useState(false);
  const [localErrors, setLocalErrors] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!classId || !getClassDetails) {
      setClassDetails(null);
      return;
    }
    setLoadingClass(true);
    getClassDetails(classId)
      .then((d) => {
        if (!cancelled) setClassDetails(d ?? null);
      })
      .catch(() => {
        if (!cancelled) setClassDetails(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingClass(false);
      });
    return () => {
      cancelled = true;
    };
  }, [classId, getClassDetails]);

  useEffect(() => {
    let cancelled = false;
    if (!studentId || !getStudentEnrollments) {
      setStudentEnrollments(null);
      return;
    }
    setLoadingStudent(true);
    getStudentEnrollments(studentId)
      .then((r) => {
        if (!cancelled) setStudentEnrollments(r ?? []);
      })
      .catch(() => {
        if (!cancelled) setStudentEnrollments([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingStudent(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId, getStudentEnrollments]);

  // simple helpers
  const timeToMinutes = (t?: string) => {
    if (!t) return null;
    const [hh, mm] = t.split(":");
    const h = Number(hh ?? 0);
    const m = Number(mm ?? 0);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  };

  useEffect(() => {
    const errs: string[] = [];
    if (classDetails) {
      const cur = Number(classDetails.current_students ?? classDetails.current_students_count ?? 0);
      const max = Number(classDetails.max_students ?? classDetails.max_students ?? 0);
      if (max && cur >= max) errs.push("Lớp đã đầy");
      if (classDetails.status && classDetails.status !== "active") errs.push(`Lớp không ở trạng thái 'active' (trạng thái: ${classDetails.status})`);
    }
    if (studentEnrollments && classDetails) {
      // duplicate check
      if (studentEnrollments.some((e) => (e.class_id ?? e.classId) === (classDetails.class_id ?? classDetails.classId))) {
        errs.push("Học viên đã được ghi danh vào lớp này");
      }
      // schedule naive overlap: check weekday intersection + time overlap when schedule_days and start_time/end_time exist
      try {
        const aDays = Array.isArray(classDetails?.schedule_days) ? classDetails.schedule_days : [];
        const aStart = timeToMinutes(classDetails?.start_time);
        const aEnd = timeToMinutes(classDetails?.end_time);
        if (aDays.length && (aStart !== null && aEnd !== null)) {
          for (const en of studentEnrollments) {
            const bDays = Array.isArray(en?.schedule_days) ? en.schedule_days : [];
            const overlapDay = aDays.some((d: number) => bDays.includes(d));
            if (!overlapDay) continue;
            const bStart = timeToMinutes(en?.start_time);
            const bEnd = timeToMinutes(en?.end_time);
            if (bStart === null || bEnd === null) continue;
            if (Math.max(aStart, bStart) < Math.min(aEnd, bEnd)) {
              errs.push(`Xung đột lịch với lớp ${en.class_id ?? en.classId}`);
              break;
            }
          }
        }
      } catch (e) {
        // ignore schedule parse errors
      }
    }
    setLocalErrors(errs);
  }, [classDetails, studentEnrollments]);

  const localIsDisabled = localErrors.length > 0;

  // class roster panel state
  const [classesList, setClassesList] = useState<any[] | null>(null);
  const [loadingClassesList, setLoadingClassesList] = useState(false);
  const [selectedClass, setSelectedClass] = useState<any | null>(null);
  const [selectedEnrollments, setSelectedEnrollments] = useState<any[] | null>(null);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [teacherEdit, setTeacherEdit] = useState<string>('');
  const [teacherSuggestions, setTeacherSuggestions] = useState<any[] | null>(null);
  const [teacherSuggestionsVisible, setTeacherSuggestionsVisible] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addStudentCode, setAddStudentCode] = useState('');
  const [autoCloseAfterAdd, setAutoCloseAfterAdd] = useState(false);

  // suggestions
  const [classSuggestionsVisible, setClassSuggestionsVisible] = useState(false);
  const [filteredClassSuggestions, setFilteredClassSuggestions] = useState<any[]>([]);
  const [studentSuggestions, setStudentSuggestions] = useState<any[] | null>(null);
  const [studentSuggestionsLoading, setStudentSuggestionsLoading] = useState(false);
  const studentDebounceRef = useRef<number | null>(null);

  // immediate fetch helper for student suggestions (used on focus)
  const fetchStudentSuggestionsNow = async (q?: string) => {
    if (!getStudentSuggestions) return;
    setStudentSuggestionsLoading(true);
    try {
      const res = await getStudentSuggestions(String(q ?? studentId ?? '').trim());
      setStudentSuggestions(res ?? []);
    } catch (e) {
      setStudentSuggestions([]);
    } finally {
      setStudentSuggestionsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    if (!getClasses) return;
    setLoadingClassesList(true);
    getClasses()
      .then((r: any) => { if (!cancelled) setClassesList(r ?? []); })
      .catch(() => { if (!cancelled) setClassesList([]); })
      .finally(() => { if (!cancelled) setLoadingClassesList(false); });
    return () => { cancelled = true; };
  }, [getClasses]);

  // when a Class ID is typed, try to open that class and load its enrollments
  useEffect(() => {
    if (!classId) return;
    const found = (classesList ?? []).find((c:any) => String(c.class_id ?? c.classId).toLowerCase() === String(classId).toLowerCase());
    if (found) {
      openClass(found);
      return;
    }
    if (getClassEnrollments) {
      const minimal = { class_id: classId, class_name: null };
      setSelectedClass(minimal);
      setSelectedEnrollments(null);
      setLoadingEnrollments(true);
      getClassEnrollments(classId)
        .then((r: any) => setSelectedEnrollments(r ?? []))
        .catch(() => setSelectedEnrollments([]))
        .finally(() => setLoadingEnrollments(false));
    }
  }, [classId, classesList, getClassEnrollments]);

  // update class suggestions when classesList or classId changes
  useEffect(() => {
    if (!classesList) return setFilteredClassSuggestions([]);
    // filter classes according to requirement: show active OR not full OR missing teacher
    const visibleClasses = (classesList ?? []).filter((c:any) => {
      const status = c.status ?? '';
      const cur = Number(c.current_students ?? c.current_students_count ?? 0);
      const max = Number(c.max_students ?? c.max_students ?? 0) || 0;
      const hasTeacher = Boolean(c.teacher_id ?? c.teacherId ?? c.teacher_staff_code ?? c.teacher_staffCode);
      const notFull = !max || cur < max;
      return status === 'active' || notFull || !hasTeacher;
    });
    const q = String(classId ?? '').trim().toLowerCase();
    if (!q) {
      setFilteredClassSuggestions(visibleClasses.slice(0, 10));
      return;
    }
    const filtered = visibleClasses.filter((c:any) => (String(c.class_id ?? '').toLowerCase().includes(q) || String(c.class_name ?? '').toLowerCase().includes(q))).slice(0, 10);
    setFilteredClassSuggestions(filtered);
  }, [classesList, classId]);

  const openClass = (c: any) => {
    // toggle collapse if already open
    if (selectedClass?.class_id === (c.class_id ?? c.classId)) {
      setSelectedClass(null);
      setSelectedEnrollments(null);
      return;
    }
    setSelectedClass(c);
    setSelectedEnrollments(null);
    if (!getClassEnrollments) return;
    setLoadingEnrollments(true);
    getClassEnrollments(c.class_id ?? c.classId)
      .then((r: any) => setSelectedEnrollments(r ?? []))
      .catch(() => setSelectedEnrollments([]))
      .finally(() => setLoadingEnrollments(false));
    // close class suggestions when opening
    setClassSuggestionsVisible(false);
  };
  // add student by staff_code (UI passes staff_code, parent resolves to id)
  const handleAddStudent = async (classIdToUse?: string, staffCode?: string) => {
    if (!onAddStudentToClass) return;
    const cid = classIdToUse ?? (selectedClass?.class_id ?? selectedClass?.classId ?? classId);
    const code = staffCode ?? addStudentCode ?? studentId;
    if (!cid || !code) return setActionError('Cần `Class ID` và `Mã nhân viên`.');
    setActionPending(true); setActionError(null);
    try {
      await onAddStudentToClass(cid, code);
      // refresh lists
      if (getClasses) { setLoadingClassesList(true); await getClasses().then((r: any)=>setClassesList(r ?? [])).finally(()=>setLoadingClassesList(false)); }
      // Refresh enrollments for the currently selected class without toggling collapse
      if (selectedClass && getClassEnrollments) {
        setLoadingEnrollments(true);
        await getClassEnrollments(selectedClass.class_id ?? selectedClass.classId)
          .then((r: any) => setSelectedEnrollments(r ?? []))
          .catch(() => setSelectedEnrollments([]))
          .finally(() => setLoadingEnrollments(false));
      }
      // Clear input for convenience
      setAddStudentCode('');
      // Close dialog if user enabled auto-close
      if (autoCloseAfterAdd) setAddDialogOpen(false);
    } catch (e: any) {
      setActionError((e && e.message) ? e.message : 'Không thể thêm học viên.');
    } finally { setActionPending(false); }
  };

  const handleRemoveStudent = async (sid: string) => {
    if (!onRemoveStudentFromClass || !selectedClass) return;
    setActionPending(true); setActionError(null);
    try {
      await onRemoveStudentFromClass(selectedClass.class_id ?? selectedClass.classId, sid);
      // Refresh enrollments for the current class without toggling collapse
      if (getClassEnrollments) {
        setLoadingEnrollments(true);
        await getClassEnrollments(selectedClass.class_id ?? selectedClass.classId)
          .then((r: any) => setSelectedEnrollments(r ?? []))
          .catch(() => setSelectedEnrollments([]))
          .finally(() => setLoadingEnrollments(false));
      }
      // Refresh classes list counts
      if (getClasses) { setLoadingClassesList(true); await getClasses().then((r: any)=>setClassesList(r ?? [])).finally(()=>setLoadingClassesList(false)); }
    } catch (e: any) {
      setActionError((e && e.message) ? e.message : 'Không thể xoá học viên.');
    } finally { setActionPending(false); }
  };

  // update teacher for selectedClass
  const handleUpdateTeacher = async () => {
    if (!onUpdateClass || !selectedClass) return setActionError('Không có lớp để cập nhật.');
    const cid = selectedClass.class_id ?? selectedClass.classId ?? classId;
    if (!cid) return setActionError('Cần mã lớp.');
    setActionPending(true); setActionError(null);
    try {
      await onUpdateClass(cid, { teacher_id: teacherEdit });
      // refresh class list and enrollments without toggling collapse
      // refresh classes list
      if (getClasses) { setLoadingClassesList(true); const all = await getClasses().then((r:any)=>r ?? []).catch(()=>[]).finally(()=>setLoadingClassesList(false)); setClassesList(all);
        // try to update selectedClass from fresh data
        const found = (all ?? []).find((x:any) => String(x.class_id ?? x.classId) === String(cid));
        if (found) setSelectedClass(found);
      }

      // also try getClassDetails if available (preferred) to populate latest fields
      if (getClassDetails) {
        try {
          const det = await getClassDetails(cid);
          if (det) setSelectedClass(det);
        } catch (e) {
          // ignore
        }
      }

      if (getClassEnrollments) {
        setLoadingEnrollments(true);
        await getClassEnrollments(cid)
          .then((r:any)=>setSelectedEnrollments(r ?? []))
          .catch(()=>setSelectedEnrollments([]))
          .finally(()=>setLoadingEnrollments(false));
      }
    } catch (e: any) {
      setActionError((e && e.message) ? e.message : 'Không thể cập nhật giáo viên.');
    } finally { setActionPending(false); }
  };

  // student suggestions: debounce and call getStudentSuggestions if provided
  useEffect(() => {
    if (studentDebounceRef.current) window.clearTimeout(studentDebounceRef.current);
    if (!getStudentSuggestions) return;
    const q = String(studentId ?? '').trim();
    if (!q) {
      setStudentSuggestions(null);
      setStudentSuggestionsLoading(false);
      return;
    }
    setStudentSuggestionsLoading(true);
    studentDebounceRef.current = window.setTimeout(() => {
      getStudentSuggestions(q).then((res: any) => {
        setStudentSuggestions(res ?? []);
      }).catch(() => setStudentSuggestions([])).finally(() => setStudentSuggestionsLoading(false));
    }, 300);
    return () => { if (studentDebounceRef.current) window.clearTimeout(studentDebounceRef.current); };
  }, [studentId, getStudentSuggestions]);

  // also support suggestions while typing in the add-student dialog
  useEffect(() => {
    if (!getStudentSuggestions) return;
    const q = String(addStudentCode ?? '').trim();
    if (!q) {
      // don't clear existing suggestions aggressively when dialog empty
      return;
    }
    const handle = window.setTimeout(async () => {
      setStudentSuggestionsLoading(true);
      try {
        const res = (await getStudentSuggestions(q)) ?? [];
        // sort results so exact/starts-with staff_code matches first, then name matches
        const ql = q.toLowerCase();
        res.sort((a: any, b: any) => {
          const aCode = String(a.staff_code ?? a.specific_id ?? a.id ?? '').toLowerCase();
          const bCode = String(b.staff_code ?? b.specific_id ?? b.id ?? '').toLowerCase();
          const aName = String(a.full_name ?? a.student_name ?? '').toLowerCase();
          const bName = String(b.full_name ?? b.student_name ?? '').toLowerCase();
          const aScore = (aCode === ql ? 100 : aCode.startsWith(ql) ? 90 : (aCode.includes(ql) ? 50 : 0)) + (aName.includes(ql) ? 10 : 0);
          const bScore = (bCode === ql ? 100 : bCode.startsWith(ql) ? 90 : (bCode.includes(ql) ? 50 : 0)) + (bName.includes(ql) ? 10 : 0);
          return bScore - aScore;
        });
        setStudentSuggestions(res);
      } catch (e) {
        setStudentSuggestions([]);
      } finally {
        setStudentSuggestionsLoading(false);
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [addStudentCode, getStudentSuggestions]);

  // teacher suggestions based on `teachers` prop and teacherEdit input
  useEffect(() => {
    if (!teachers) return setTeacherSuggestions(null);
    const q = String(teacherEdit ?? '').trim().toLowerCase();
    if (!q) {
      setTeacherSuggestions(null);
      return;
    }
    const filtered = (teachers ?? []).filter((t:any) => {
      const sc = String(t.staff_code ?? t.staffCode ?? t.specific_id ?? '').toLowerCase();
      const name = String(t.full_name ?? t.fullName ?? '').toLowerCase();
      return sc.includes(q) || name.includes(q);
    }).slice(0, 10);
    setTeacherSuggestions(filtered);
  }, [teacherEdit, teachers]);

  // when selectedClass changes, prefill teacher edit input
  useEffect(() => {
    if (!selectedClass) {
      setTeacherEdit('');
      return;
    }
    // try to show teacher staff_code for readability if available via teachers prop
    const tid = selectedClass.teacher_id ?? selectedClass.teacherId ?? '';
    if (tid && teachers && Array.isArray(teachers)) {
      const t = teachers.find((x:any) => String(x.id) === String(tid) || String(x.specific_id ?? x.specificId) === String(tid) || String(x.teacher_id) === String(tid));
      setTeacherEdit(t ? (t.staff_code ?? t.staffCode ?? (t.specific_id ?? t.specificId ?? t.id)) : String(tid));
    } else {
      setTeacherEdit(selectedClass.teacher_staff_code ?? selectedClass.teacher_code ?? selectedClass.teacher_id ?? selectedClass.teacherId ?? '');
    }
  }, [selectedClass]);

  // compute classes to display: active OR not full OR missing teacher
  const displayClasses = (classesList ?? []).filter((c:any) => {
    const status = c.status ?? '';
    const cur = Number(c.current_students ?? c.current_students_count ?? 0);
    const max = Number(c.max_students ?? c.max_students ?? 0) || 0;
    const hasTeacher = Boolean(c.teacher_id ?? c.teacherId ?? c.teacher_staff_code ?? c.teacher_staffCode);
    const notFull = !max || cur < max;
    return status === 'active' || notFull || !hasTeacher;
  });

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      {/* Removed direct mapping inputs; only show class list & roster */}

      {/* local inline errors/warnings */}
      {localErrors.length > 0 && (
        <div className="mt-3 space-y-1">
          {localErrors.map((err, i) => (
            <div key={i} className={err.includes('Xung đột') ? 'text-sm text-yellow-800' : 'text-sm text-destructive'}>{err}</div>
          ))}
        </div>
      )}

      {/* Classes roster panel */}
      <div className="mt-6 rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="font-medium">Quản lý danh sách & sĩ số lớp học</h4>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => { if (getClasses) { setLoadingClassesList(true); getClasses().then((r: any)=>setClassesList(r ?? [])).finally(()=>setLoadingClassesList(false)); } }}>Refresh</Button>
          </div>
          {/* class suggestions dropdown */}
          {classSuggestionsVisible && filteredClassSuggestions.length > 0 && (
            <div className="absolute z-40 mt-1 w-64 max-h-56 overflow-auto rounded-md border bg-popover p-1">
              {filteredClassSuggestions.map((s:any) => (
                <div key={s.class_id} className="cursor-pointer px-2 py-1 hover:bg-muted" onMouseDown={() => { onClassIdChange(s.class_id); setClassSuggestionsVisible(false); openClass(s); }}>{s.class_id} — {s.class_name ?? ''}</div>
              ))}
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã</TableHead>
                <TableHead>Tên lớp</TableHead>
                <TableHead className="text-center">Sĩ số</TableHead>
                <TableHead>Thứ / Giờ</TableHead>
                <TableHead>Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingClassesList ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Đang tải...</TableCell></TableRow>
              ) : displayClasses.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Không có lớp.</TableCell></TableRow>
              ) : (
                displayClasses.map((c:any) => {
                  const cur = Number(c.current_students ?? c.current_students_count ?? 0);
                  const max = Number(c.max_students ?? 0) || null;
                  const pct = max ? (cur / max) : 0;
                  const badgeClass = pct >= 1 ? 'bg-destructive text-destructive-foreground' : pct >= 0.8 ? 'bg-yellow-100 text-yellow-800' : 'bg-emerald-100 text-emerald-700';
                  return (
                    <TableRow key={c.class_id} onClick={() => openClass(c)} className={selectedClass?.class_id === c.class_id ? 'bg-muted/5' : ''}>
                      <TableCell className="font-mono text-xs">{c.class_id}</TableCell>
                      <TableCell>{c.class_name ?? '—'}</TableCell>
                      <TableCell className="text-center"><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass}`}>{cur}{max ? `/${max}` : ''}</span></TableCell>
                      <TableCell className="text-xs">{(c.schedule_days ?? []).join(', ')} {c.start_time ? `— ${c.start_time}` : ''}</TableCell>
                      <TableCell><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : c.status === 'completed' ? 'bg-muted text-muted-foreground' : 'bg-yellow-100 text-yellow-800'}`}>{c.status}</span></TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* selected class enrollments */}
        <div className="mt-4">
          {selectedClass ? (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="font-medium">Thông tin lớp: {selectedClass.class_id}</div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => setAddDialogOpen(true)} disabled={actionPending || (selectedClass.max_students && (Number(selectedClass.current_students ?? 0) >= Number(selectedClass.max_students)))}>Thêm học viên</Button>
                </div>
              </div>
              <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3 items-center">
                <div className="text-sm text-muted-foreground">Giáo viên hiện tại</div>
                <div className="font-medium sm:col-span-2">{(() => {
                  if (!selectedClass) return '—';
                  const tid = selectedClass.teacher_id ?? selectedClass.teacherId ?? '';
                  let t: any = null;
                  if (teachers && Array.isArray(teachers) && tid) {
                    t = teachers.find((x: any) => String(x.id) === String(tid) || String(x.specific_id ?? x.specificId ?? '') === String(tid) || String(x.staff_code ?? x.staffCode ?? '') === String(tid));
                  }
                  const name = t?.full_name ?? selectedClass.teacher_name ?? '';
                  const staff = t?.staff_code ?? selectedClass.teacher_staff_code ?? selectedClass.teacher_code ?? '';
                  if (name && staff) return `${name} — ${staff}`;
                  if (name) return `${name}${staff ? ` — ${staff}` : ''}`;
                  if (staff) return `${staff}${tid && staff !== tid ? ` — ${tid}` : ''}`;
                  return tid || '—';
                })()}</div>
                <div className="text-sm text-muted-foreground">Thay đổi giáo viên (Mã giáo viên)</div>
                <div className="sm:col-span-2 flex items-center gap-2">
                  <div className="relative">
                    <Input value={teacherEdit} onChange={(e) => { setTeacherEdit(e.target.value); setTeacherSuggestionsVisible(true); }} onFocus={() => setTeacherSuggestionsVisible(true)} className="w-56 font-mono" />
                    {teacherSuggestionsVisible && teacherSuggestions && teacherSuggestions.length > 0 && (
                      <div className="absolute z-40 mt-1 w-56 max-h-40 overflow-auto rounded-md border bg-popover p-1">
                        {teacherSuggestions.map((t:any) => (
                          <div key={t.staff_code ?? t.specific_id ?? t.id} className="cursor-pointer px-2 py-1 hover:bg-muted" onMouseDown={() => { setTeacherEdit(t.staff_code ?? t.specific_id ?? t.id); setTeacherSuggestions(null); setTeacherSuggestionsVisible(false); }}>{(t.staff_code ?? t.specific_id ?? t.id)} — {t.full_name}</div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button size="sm" onClick={handleUpdateTeacher} disabled={actionPending || !teacherEdit}>Cập nhật</Button>
                </div>
              </div>
              {loadingEnrollments ? (
                <div className="text-sm text-muted-foreground">Đang tải học viên...</div>
              ) : (selectedEnrollments ?? []).length === 0 ? (
                <div className="text-sm text-muted-foreground">Chưa có học viên.</div>
              ) : (
                <div className="space-y-2">
                  {(selectedEnrollments ?? []).map((s:any) => (
                    <div key={s.student_id ?? s.specific_id ?? s.id ?? s.staff_code} className="flex items-center justify-between rounded-md border p-2">
                      <div>
                        <div className="font-medium">{s.full_name ?? s.student_name ?? '—'}</div>
                        <div className="font-mono text-xs text-muted-foreground">{s.staff_code ?? s.student_id ?? s.specific_id ?? s.id}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleRemoveStudent(s.staff_code ?? s.student_id ?? s.specific_id ?? s.id)} disabled={actionPending}>Xoá</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {actionError && <div className="mt-3 text-sm text-destructive">{actionError}</div>}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Chọn một lớp để xem học viên.</div>
          )}
        </div>
      </div>
      {/* Add student dialog */}
      <Dialog open={addDialogOpen} onOpenChange={(v) => setAddDialogOpen(v)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm học viên vào lớp {selectedClass?.class_id ?? ''}</DialogTitle>
            <DialogDescription>Nhập mã học viên để thêm vào lớp.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Mã học viên</Label>
              <Input value={addStudentCode} onChange={(e) => setAddStudentCode(e.target.value)} onFocus={() => fetchStudentSuggestionsNow(addStudentCode)} className="font-mono" placeholder="ST-0001" />
              {studentSuggestionsLoading && <div className="text-xs text-muted-foreground">Đang tìm...</div>}
              <div className="mt-2 flex items-center gap-2">
                <Checkbox checked={autoCloseAfterAdd} onCheckedChange={(v) => setAutoCloseAfterAdd(!!v)} />
                <div className="text-sm">Đóng cửa sổ sau khi thêm</div>
              </div>
              {studentSuggestions && studentSuggestions.length > 0 && (
                <div className="mt-1 max-h-40 overflow-auto rounded-md border bg-popover p-1">
                  {studentSuggestions.map((s:any) => (
                    <div key={s.staff_code ?? s.specific_id ?? s.id} className="cursor-pointer px-2 py-1 hover:bg-muted" onMouseDown={() => { setAddStudentCode(s.staff_code ?? s.specific_id ?? s.id); setStudentSuggestions(null); }}>{(s.staff_code ?? s.specific_id ?? s.id)} — {s.full_name ?? s.student_name ?? ''}</div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => { setAddDialogOpen(false); setAddStudentCode(''); }}>Huỷ</Button>
              <Button onClick={() => handleAddStudent(selectedClass?.class_id, addStudentCode)} disabled={actionPending || !addStudentCode}>Thêm</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
///tạo panel chứa danh sách lớp
export function AdminTeacherAnalyticsPanel({
  teachers,
  ratings,
}: {
  teachers: any[];
  ratings: any[];
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border p-4">
          <h3 className="font-display text-base font-semibold">
            Tổng hợp giáo viên — đánh giá & vi phạm
          </h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Teacher ID</TableHead>
              <TableHead>Họ tên</TableHead>
              <TableHead>Average rating</TableHead>
              <TableHead>Tổng review</TableHead>
              <TableHead>Late cancellations</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teachers.map((t) => (
              <TableRow key={t.teacher_id}>
                <TableCell className="font-mono text-xs">{t.teacher_id}</TableCell>
                <TableCell>{t.full_name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                    <span className="font-semibold">{Number(t.avg_stars).toFixed(2)}</span>
                  </div>
                </TableCell>
                <TableCell>{t.total_reviews}</TableCell>
                <TableCell>
                  <span
                    className={
                      Number(t.total_penalties) > 0
                        ? "font-semibold text-destructive"
                        : "text-muted-foreground"
                    }
                  >
                    {t.total_penalties}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border p-4">
          <h3 className="font-display text-base font-semibold">Feedback chi tiết từ học viên</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Thời gian</TableHead>
              <TableHead>Teacher</TableHead>
              <TableHead>Học viên</TableHead>
              <TableHead>Sao</TableHead>
              <TableHead>Nhận xét</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ratings.map((r) => (
              <TableRow key={r.rating_id}>
                <TableCell className="whitespace-nowrap text-xs">
                  {new Date(r.created_at).toLocaleString()}
                </TableCell>
                <TableCell>
                  <div className="font-medium">{r.teacher_name ?? "—"}</div>
                  <div className="font-mono text-xs text-muted-foreground">{r.teacher_id}</div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{r.student_name ?? "—"}</div>
                  <div className="font-mono text-xs text-muted-foreground">{r.student_id}</div>
                </TableCell>
                <TableCell>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={
                          n <= r.stars
                            ? "h-3.5 w-3.5 fill-warning text-warning"
                            : "text-muted-foreground/30"
                        }
                      />
                    ))}
                  </div>
                </TableCell>
                <TableCell className="max-w-md text-sm">{r.comment ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function AdminAuditLogsPanel({
  logs,
}: {
  logs: any[];
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Thời gian</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log, index) => (
              <TableRow key={`${log.log_id ?? index}-${log.created_at}`}>
                <TableCell className="text-xs whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString()}
                </TableCell>
                <TableCell>
                  <div>{log.user_full_name ?? log.user_specific_id ?? "—"}</div>
                  <div className="font-mono text-xs text-muted-foreground">{log.user_specific_id}</div>
                </TableCell>
                <TableCell>{log.action}</TableCell>
                <TableCell className="max-w-xl text-sm text-muted-foreground">
                  {JSON.stringify(log.details ?? {})}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function AdminUserManagementPanel({
  users,
  onUpdateUser,
  onDeleteUser,
  isPending,
}: {
  users: any[];
  onUpdateUser: (payload: any) => void;
  onDeleteUser: (id: string, hardDelete: boolean) => void;
  isPending: boolean;
}) {
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    specific_id: false,
    staff_code: true,
    full_name: true,
    email: true,
    role: true,
    status: true,
    phone: true,
    birth_year: true,
    created_at: false,
    updated_at: false,
  });
  const [filterText, setFilterText] = useState("");
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const toggleColumn = (key: string) => setVisibleColumns((s) => ({ ...s, [key]: !s[key] }));

  const displayedUsers = (users ?? [])
    .filter((u: any) => {
      if (!filterText) return true;
      const q = filterText.toLowerCase();
      return (
        String(u.full_name ?? "").toLowerCase().includes(q) ||
        String(u.email ?? "").toLowerCase().includes(q) ||
        String(u.specific_id ?? "").toLowerCase().includes(q) ||
        String(u.staff_code ?? "").toLowerCase().includes(q) ||
        String(u.phone ?? "").toLowerCase().includes(q)
      );
    })
    .sort((a: any, b: any) => {
      if (!sortBy) return 0;
      const av = (a[sortBy] ?? '') as any;
      const bv = (b[sortBy] ?? '') as any;
      if (av === bv) return 0;
      if (sortDir === 'asc') return av > bv ? 1 : -1;
      return av > bv ? -1 : 1;
    });
  const [editingUser, setEditingUser] = useState<any>(null);
  const [deletingUser, setDeletingUser] = useState<any>(null);
  const [deleteMode, setDeleteMode] = useState<"soft" | "hard">("soft");

  const [editFullName, setEditFullName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editBirthDate, setEditBirthDate] = useState<any>("");

  const openEdit = (user: any) => {
    setEditingUser(user);
    setEditFullName(user.full_name || "");
    setEditRole(user.role || "student");
    setEditStatus(user.status || "active");
    setEditPhone(user.phone || "");
    setEditPassword("");
    if (user && user.birth_year) {
      setEditBirthDate(typeof user.birth_year === 'string' ? user.birth_year : `${user.birth_year}-01-01`);
    } else {
      setEditBirthDate("");
    }
    setShowEditPassword(false);
  };

  const handleUpdate = () => {
    if (!editingUser) return;
    const payload: any = { id: editingUser.id };
    if (editFullName !== editingUser.full_name) payload.fullName = editFullName;
    if (editRole !== editingUser.role) payload.role = editRole;
    if (editStatus !== editingUser.status) payload.status = editStatus;
    if (editPhone !== editingUser.phone) payload.phone = editPhone;
    if (editPassword) payload.password = editPassword;
    // send full date string when available, otherwise fall back to year
    if (editBirthDate !== (editingUser.birth_year ? (typeof editingUser.birth_year === 'string' ? editingUser.birth_year : `${editingUser.birth_year}-01-01`) : "")) {
      if (editBirthDate) {
        payload.birthDate = editBirthDate;
      } else {
        const y = editingUser.birth_year ?? null;
        if (y !== null && y !== undefined) payload.birthYear = Number(y);
      }
    }

    onUpdateUser(payload);
    setEditingUser(null);
  };

  // export displayed users as CSV
  const exportCsv = () => {
    const cols = ['specific_id','staff_code','full_name','email','role','status','phone','birth_year','created_at','updated_at'];
    const escape = (v: any) => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      return '"' + s.replace(/"/g, '""') + '"';
    };
    const formatBirth = (u: any) => {
      const by = u.birth_year;
      if (by === null || by === undefined || by === '') return '';
      if (typeof by === 'string') {
        const d = new Date(by);
        if (!Number.isNaN(d.getTime())) {
          const dd = String(d.getDate()).padStart(2, '0');
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const yyyy = d.getFullYear();
          return `${dd}/${mm}/${yyyy}`;
        }
        return String(by);
      }
      return `01/01/${by}`;
    };
    const rows = displayedUsers.map((u: any) => cols.map((c) => (c === 'birth_year' ? escape(formatBirth(u)) : escape(u[c] ?? ''))).join(','));
    const header = cols.map((c) => escape(c)).join(',');
    const csv = [header, ...rows].join('\n');
    // prepend UTF-8 BOM so Excel detects UTF-8 with accents correctly
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hsk_users_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-8 space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Quản lý toàn bộ tài khoản</h3>
          <div className="flex items-center gap-3">
            <div className="text-sm text-muted-foreground">Tổng: {displayedUsers.length} / {users.length} tài khoản</div>
            <div className="flex items-center gap-2">
              <Input placeholder="Tìm kiếm" value={filterText} onChange={(e) => setFilterText(e.target.value)} />
              <Button size="sm" variant="ghost" onClick={exportCsv}>Export</Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Xem cột <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <div className="p-2">
                    {[
                      { key: 'specific_id', label: 'Specific ID' },
                      { key: 'staff_code', label: 'Mã nhân viên' },
                      { key: 'full_name', label: 'Họ tên' },
                      { key: 'email', label: 'Email' },
                      { key: 'role', label: 'Vai trò' },
                      { key: 'status', label: 'Trạng thái' },
                      { key: 'phone', label: 'Số điện thoại' },
                      { key: 'birth_year', label: 'Năm sinh' },
                      { key: 'created_at', label: 'Tạo lúc' },
                      { key: 'updated_at', label: 'Cập nhật lúc' },
                    ].map((c) => (
                      <label
                        key={c.key}
                        className="flex items-center gap-2 px-2 py-1"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox checked={!!visibleColumns[c.key]} onCheckedChange={() => toggleColumn(c.key)} />
                        <span className="text-sm">{c.label}</span>
                      </label>
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          {(() => {
            const colOrder = ['staff_code','specific_id','full_name','email','role','status','phone','birth_year','created_at','updated_at'];
            const labels: Record<string,string> = {
              staff_code: 'Mã nhân viên',
              specific_id: 'Specific ID',
              full_name: 'Họ tên',
              email: 'Email',
              role: 'Vai trò',
              status: 'Trạng thái',
              phone: 'Số điện thoại',
              birth_year: 'Năm sinh',
              created_at: 'Tạo lúc',
              updated_at: 'Cập nhật lúc',
            };
            const visibleKeys = colOrder.filter((k) => visibleColumns[k]);
            const visibleCount = visibleKeys.length;
            const supportsSort = new Set(['specific_id','staff_code','full_name','email','role','status','birth_year','created_at','updated_at']);
            return (
              <Table>
                <TableHeader>
                  <TableRow>
                    {colOrder.map((k) =>
                      visibleColumns[k] ? (
                        <TableHead key={k} onClick={() => {
                          if (!supportsSort.has(k)) return;
                          setSortBy(k);
                          setSortDir(sortBy === k ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc');
                        }}>
                          {labels[k]}
                        </TableHead>
                      ) : null
                    )}
                    <TableHead className="text-right">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={visibleCount + 1} className="text-center text-muted-foreground">
                        Không có tài khoản nào.
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayedUsers.map((u) => (
                      <TableRow key={u.id}>
                        {colOrder.map((k) => {
                          if (!visibleColumns[k]) return null;
                          if (k === 'specific_id') return <TableCell key={k} className="font-mono text-xs">{u.specific_id}</TableCell>;
                          if (k === 'staff_code') return <TableCell key={k} className="font-mono text-xs">{u.staff_code ?? '—'}</TableCell>;
                          if (k === 'full_name') return <TableCell key={k} className="font-medium">{u.full_name}</TableCell>;
                          if (k === 'email') return <TableCell key={k}>{u.email}</TableCell>;
                          if (k === 'role') return <TableCell key={k} className="capitalize">{u.role}</TableCell>;
                          if (k === 'status') return (
                            <TableCell key={k}>
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${u.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-destructive/10 text-destructive'}`}>
                                {u.status}
                              </span>
                            </TableCell>
                          );
                          if (k === 'phone') return <TableCell key={k} className="font-mono text-xs">{u.phone ?? '—'}</TableCell>;
                          if (k === 'birth_year') {
                            const by = u.birth_year;
                            let display = '—';
                            if (by !== null && by !== undefined) {
                              if (typeof by === 'string') {
                                const d = new Date(by);
                                if (!Number.isNaN(d.getTime())) {
                                  const dd = String(d.getDate()).padStart(2, '0');
                                  const mm = String(d.getMonth() + 1).padStart(2, '0');
                                  const yyyy = d.getFullYear();
                                  display = `${dd}/${mm}/${yyyy}`;
                                } else {
                                  display = String(by);
                                }
                              } else {
                                display = `01/01/${by}`;
                              }
                            }
                            return <TableCell key={k} className="text-xs">{display}</TableCell>;
                          }
                          if (k === 'created_at') return <TableCell key={k} className="text-xs">{u.created_at ? new Date(u.created_at).toLocaleString() : '—'}</TableCell>;
                          if (k === 'updated_at') return <TableCell key={k} className="text-xs">{u.updated_at ? new Date(u.updated_at).toLocaleString() : '—'}</TableCell>;
                          return null;
                        })}
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(u)}>
                                <Pencil className="mr-2 h-4 w-4" /> Chỉnh sửa
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-orange-600 focus:text-orange-600"
                                onClick={() => {
                                  setDeletingUser(u);
                                  setDeleteMode('soft');
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Vô hiệu hoá (Soft Delete)
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => {
                                  setDeletingUser(u);
                                  setDeleteMode('hard');
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Xoá vĩnh viễn
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            );
          })()}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(v) => !v && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa tài khoản</DialogTitle>
            <DialogDescription>
              Thay đổi thông tin hoặc đặt lại mật khẩu cho {editingUser?.email}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1.5">
              <Label>Họ tên</Label>
              <Input value={editFullName} onChange={(e) => setEditFullName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Số điện thoại</Label>
              <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Vai trò</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Học viên</SelectItem>
                  <SelectItem value="teacher">Giáo viên</SelectItem>
                  <SelectItem value="logistics">Logistics</SelectItem>
                  <SelectItem value="care">CSKH</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Trạng thái</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Ngày sinh</Label>
              <Input type="date" value={editBirthDate} onChange={(e) => setEditBirthDate(e.target.value)} />
            </div>
            <div className="space-y-1.5 relative">
              <Label>Mật khẩu mới (Bỏ trống nếu không đổi)</Label>
              <div className="relative">
                <Input
                  type={showEditPassword ? "text" : "password"}
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="********"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-9 w-9"
                  onClick={() => setShowEditPassword(!showEditPassword)}
                >
                  {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Hủy
            </Button>
            <Button onClick={handleUpdate} disabled={isPending}>
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingUser} onOpenChange={(v) => !v && setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteMode === "hard" ? "Xác nhận xoá vĩnh viễn" : "Vô hiệu hoá tài khoản"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteMode === "hard"
                ? `Bạn có chắc chắn muốn xoá tài khoản ${deletingUser?.email}? Hành động này không thể hoàn tác và sẽ xoá toàn bộ dữ liệu liên quan.`
                : `Bạn có chắc muốn vô hiệu hoá tài khoản ${deletingUser?.email}? Người dùng sẽ không thể đăng nhập cho đến khi được kích hoạt lại.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className={deleteMode === "hard" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "bg-orange-600 hover:bg-orange-600/90"}
              onClick={() => {
                if (!deletingUser) return;
                onDeleteUser(deletingUser.id, deleteMode === "hard");
                setDeletingUser(null);
              }}
            >
              {deleteMode === "hard" ? "Xoá vĩnh viễn" : "Vô hiệu hoá"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function AdminClassesPanel({
  classes,
  teachers,
  currentStudentCounts,
  isPending,
  createMutation,
  updateMutation,
  deleteMutation,
  onCreateClass,
  onUpdateClass,
  onDeleteClass,
}: {
  classes: any[];
  teachers: any[];
  currentStudentCounts?: Record<string, number>;
  isPending: boolean;
  createMutation?: any;
  updateMutation?: any;
  deleteMutation?: any;
  onCreateClass: (payload: any) => void;
  onUpdateClass: (payload: any) => void;
  onDeleteClass: (classId: string) => void;
}) {
  const [filterText, setFilterText] = useState("");
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({
    classId: "",
    className: "",
    totalLessons: 15,
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    scheduleDays: [] as number[],
    maxStudents: 10,
    teacherId: "",
    roomLink: "",
    status: "pending",
  });
  const [deleting, setDeleting] = useState<any>(null);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    class_id: true,
    class_name: true,
    teacher_id: true,
    current_students: true,
    schedule_days: true,
    total_lessons: false,
    start_date: false,
    end_date: false,
    start_time: false,
    end_time: false,
    max_students: false,
    room_link: false,
    status: true,
    created_at: false,
    updated_at: false,
  });
  const toggleColumn = (k: string) => setVisibleColumns((s) => ({ ...s, [k]: !s[k] }));
  const [searchColumn, setSearchColumn] = useState<string>('all');

  const DAYS = [
    { label: "Thứ 2", v: 1 },
    { label: "Thứ 3", v: 2 },
    { label: "Thứ 4", v: 3 },
    { label: "Thứ 5", v: 4 },
    { label: "Thứ 6", v: 5 },
    { label: "Thứ 7", v: 6 },
    { label: "Chủ nhật", v: 0 },
  ];

  const displayed = (classes ?? []).filter((c: any) => {
    if (!filterText) return true;
    const q = filterText.toLowerCase();
    const match = (v: any) => String(v ?? '').toLowerCase().includes(q);
    // helper to find teacher by id
    const findTeacher = () => (teachers ?? []).find((x: any) => x.teacher_id === c.teacher_id || x.specific_id === c.teacher_id || x.id === c.teacher_id);

    if (searchColumn === 'all') {
      if (match(c.class_id) || match(c.class_name) || match(c.teacher_id) || match(currentStudentCounts?.[c.class_id] ?? c.current_students) || match(c.total_lessons) || match(c.start_date) || match(c.end_date) || match(c.start_time) || match(c.end_time) || match(c.max_students) || match(c.room_link) || match(c.status)) return true;
      // schedule days labels
      if (Array.isArray(c.schedule_days) && (c.schedule_days ?? []).some((d: number) => String(DAYS.find(x => x.v === d)?.label ?? d).toLowerCase().includes(q))) return true;
      const t = findTeacher();
      if (t && match(t.full_name)) return true;
      return false;
    }

    if (searchColumn === 'teacher_id') {
      const t = findTeacher();
      return match(c.teacher_id) || (t && match(t.full_name));
    }

    if (searchColumn === 'schedule_days') {
      return Array.isArray(c.schedule_days) && (c.schedule_days ?? []).some((d: number) => String(DAYS.find(x => x.v === d)?.label ?? d).toLowerCase().includes(q));
    }

    // generic column search
    return match((c as any)[searchColumn]);
  });

  const startCreate = () => {
    setEditing(null);
    setForm({
      classId: "",
      className: "",
      totalLessons: 15,
      startDate: "",
      endDate: "",
      startTime: "",
      endTime: "",
      scheduleDays: [],
      maxStudents: 10,
      teacherId: "",
      roomLink: "",
      status: "pending",
    });
  };

  const openEdit = (c: any) => {
    setEditing(c);
    setForm({
      classId: c.class_id,
      className: c.class_name ?? "",
      totalLessons: c.total_lessons ?? 15,
      startDate: c.start_date ?? "",
      endDate: c.end_date ?? "",
      startTime: c.start_time ?? "",
      endTime: c.end_time ?? "",
      scheduleDays: Array.isArray(c.schedule_days) ? c.schedule_days : [],
      maxStudents: c.max_students ?? 10,
      teacherId: c.teacher_id ?? "",
      roomLink: c.room_link ?? "",
      status: c.status ?? "pending",
    });
  };

  const submit = () => {
    const payload: any = {
      classId: form.classId,
      className: form.className,
      totalLessons: Number(form.totalLessons) || 15,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      startTime: form.startTime || undefined,
      endTime: form.endTime || undefined,
      scheduleDays: form.scheduleDays,
      maxStudents: Number(form.maxStudents) || 10,
      teacherId: form.teacherId || undefined,
      roomLink: form.roomLink || undefined,
      status: form.status,
    };
    if (editing) {
      onUpdateClass({ classId: editing.class_id, updates: {
        class_name: payload.className,
        total_lessons: payload.totalLessons,
        start_date: payload.startDate,
        end_date: payload.endDate,
        start_time: payload.startTime,
        end_time: payload.endTime,
        schedule_days: payload.scheduleDays,
        max_students: payload.maxStudents,
        teacher_id: payload.teacherId,
        room_link: payload.roomLink,
        status: payload.status,
      }});
    } else {
      onCreateClass(payload);
    }
    // clear only after mutation success (handled in effects below)
  };

  useEffect(() => {
    if (createMutation?.isSuccess) {
      startCreate();
    }
  }, [createMutation?.isSuccess]);

  useEffect(() => {
    if (updateMutation?.isSuccess) {
      setEditing(null);
    }
  }, [updateMutation?.isSuccess]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Tạo lớp học</h3>
          <div className="flex items-center gap-2">
            <Input placeholder="Tìm kiếm" value={filterText} onChange={(e) => setFilterText(e.target.value)} />
            <Button variant="ghost" onClick={startCreate}>Làm mới DS</Button>
          </div>
        </div>

        { (classes ?? []).length === 0 && (
          <div className="mb-3 rounded-md bg-muted/5 border border-muted p-3 text-sm text-muted-foreground">Không có dữ liệu lớp học. Nếu bạn vừa tạo lớp mà không thấy gì, kiểm tra bảng `classes` trên Supabase hoặc xem lỗi từ mutation.</div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Mã lớp</Label>
            <Input placeholder="L-OFF-HSK1-NC-0001" value={form.classId} onChange={(e) => setForm((s:any)=>({...s,classId:e.target.value}))} />
          </div>
          <div className="space-y-1.5">
            <Label>Tên lớp</Label>
            <Input value={form.className} onChange={(e) => setForm((s:any)=>({...s,className:e.target.value}))} />
          </div>
          <div className="space-y-1.5">
            <Label>Tổng buổi</Label>
            <Input type="number" value={String(form.totalLessons)} onChange={(e) => setForm((s:any)=>({...s,totalLessons: Number(e.target.value)}))} />
          </div>
          <div className="space-y-1.5">
            <Label>Sĩ số tối đa</Label>
            <Input type="number" value={String(form.maxStudents)} onChange={(e) => setForm((s:any)=>({...s,maxStudents: Number(e.target.value)}))} />
          </div>
          <div className="space-y-1.5">
            <Label>Ngày bắt đầu</Label>
            <Input type="date" value={form.startDate} onChange={(e) => setForm((s:any)=>({...s,startDate:e.target.value}))} />
          </div>
          <div className="space-y-1.5">
            <Label>Ngày kết thúc</Label>
            <Input type="date" value={form.endDate} onChange={(e) => setForm((s:any)=>({...s,endDate:e.target.value}))} />
          </div>
          <div className="space-y-1.5">
            <Label>Giờ bắt đầu</Label>
            <Input type="time" value={form.startTime} onChange={(e) => setForm((s:any)=>({...s,startTime:e.target.value}))} />
          </div>
          <div className="space-y-1.5">
            <Label>Giờ kết thúc</Label>
            <Input type="time" value={form.endTime} onChange={(e) => setForm((s:any)=>({...s,endTime:e.target.value}))} />
          </div>

          <div className="space-y-1.5">
            <Label>Thứ trong tuần</Label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((d) => (
                <label key={d.v} className="inline-flex items-center gap-2">
                  <Checkbox checked={form.scheduleDays?.includes(d.v)} onCheckedChange={() => {
                    const set = new Set(form.scheduleDays || []);
                    if (set.has(d.v)) set.delete(d.v); else set.add(d.v);
                    setForm((s:any)=>({...s,scheduleDays: Array.from(set)}));
                  }} />
                  <span className="text-sm">{d.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Giáo viên</Label>
            <Select value={form.teacherId} onValueChange={(v) => setForm((s:any)=>({...s,teacherId: v === '__none' ? '' : v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">— Không chọn —</SelectItem>
                {(teachers ?? []).map((t:any) => {
                  const id = t.teacher_id ?? t.specific_id ?? t.id ?? "";
                  if (!id) return null;
                  return (
                    <SelectItem key={id} value={id}>{t.full_name ?? id}</SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Room / Link</Label>
            <Input value={form.roomLink} onChange={(e) => setForm((s:any)=>({...s,roomLink:e.target.value}))} />
          </div>

          <div className="space-y-1.5">
            <Label>Trạng thái</Label>
            <Select value={form.status} onValueChange={(v) => setForm((s:any)=>({...s,status:v}))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">pending</SelectItem>
                <SelectItem value="active">active</SelectItem>
                <SelectItem value="completed">completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button onClick={submit} disabled={isPending}>{editing ? 'Lưu thay đổi' : 'Tạo lớp mới'}</Button>
          {editing && <Button variant="outline" onClick={startCreate}>Hủy chỉnh sửa</Button>}
        </div>
        <div className="mt-3">
          {createMutation?.isSuccess && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Tạo lớp thành công.</div>
          )}
          {createMutation?.isError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{(createMutation.error as Error)?.message ?? 'Không thể tạo lớp.'}</div>
          )}
          {updateMutation?.isSuccess && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 mt-2">Cập nhật lớp thành công.</div>
          )}
          {updateMutation?.isError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive mt-2">{(updateMutation.error as Error)?.message ?? 'Không thể cập nhật lớp.'}</div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="font-medium">Danh sách lớp ({displayed.length})</h4>
          <div className="flex items-center gap-3">
            <div className="text-sm text-muted-foreground">Tổng: {displayed.length} / {(classes ?? []).length}</div>
            <div className="flex items-center gap-2">
              <Input placeholder="Tìm kiếm" value={filterText} onChange={(e) => setFilterText(e.target.value)} />
              <Button size="sm" variant="ghost" onClick={() => {
                // export CSV
                const cols = ['class_id','class_name','teacher_id','current_students','schedule_days','total_lessons','start_date','end_date','start_time','end_time','max_students','room_link','status','created_at','updated_at'];
                const escape = (v: any) => {
                  if (v === null || v === undefined) return '';
                  const s = String(v);
                  return '"' + s.replace(/"/g, '""') + '"';
                };
                const formatSchedule = (sd: any) => {
                  if (!sd) return '';
                  try {
                    return (sd ?? []).map((d: number) => DAYS.find(x => x.v === d)?.label ?? d).join('; ');
                  } catch { return String(sd); }
                };
                const formatDate = (v: any) => {
                  if (!v) return '';
                  const d = new Date(v);
                  if (!Number.isNaN(d.getTime())) return d.toLocaleString();
                  return String(v);
                };
                const rows = displayed.map((c:any) => cols.map((k) => {
                  if (k === 'schedule_days') return escape(formatSchedule(c.schedule_days));
                  if (k === 'current_students') return escape(currentStudentCounts?.[c.class_id] ?? c.current_students ?? 0);
                  if (k === 'start_date' || k === 'end_date' || k === 'created_at' || k === 'updated_at') return escape(formatDate(c[k]));
                  return escape(c[k] ?? '');
                }).join(','));
                const header = ['class_id','class_name','teacher_id','current_students','schedule_days','total_lessons','start_date','end_date','start_time','end_time','max_students','room_link','status','created_at','updated_at'].map((h)=>escape(h)).join(',');
                const csv = [header, ...rows].join('\n');
                const bom = '\uFEFF';
                const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `hsk_classes_${new Date().toISOString().slice(0,10)}.csv`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
              }}>Export</Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Xem cột <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <div className="p-2">
                    {[
                      { key: 'class_id', label: 'Mã lớp' },
                      { key: 'class_name', label: 'Tên lớp' },
                      { key: 'teacher_id', label: 'Giáo viên' },
                      { key: 'current_students', label: 'Số học viên' },
                      { key: 'schedule_days', label: 'Thứ' },
                      { key: 'total_lessons', label: 'Tổng buổi' },
                      { key: 'start_date', label: 'Ngày bắt đầu' },
                      { key: 'end_date', label: 'Ngày kết thúc' },
                      { key: 'start_time', label: 'Giờ bắt đầu' },
                      { key: 'end_time', label: 'Giờ kết thúc' },
                      { key: 'max_students', label: 'Sĩ số tối đa' },
                      { key: 'room_link', label: 'Room / Link' },
                      { key: 'status', label: 'Trạng thái' },
                      { key: 'created_at', label: 'Tạo lúc' },
                      { key: 'updated_at', label: 'Cập nhật lúc' },
                    ].map((c) => (
                      <label
                        key={c.key}
                        className="flex items-center gap-2 px-2 py-1"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox checked={!!visibleColumns[c.key]} onCheckedChange={() => toggleColumn(c.key)} />
                        <span className="text-sm">{c.label}</span>
                      </label>
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {(() => {
          const colOrder = ['class_id','class_name','teacher_id','current_students','schedule_days','total_lessons','start_date','end_date','start_time','end_time','max_students','room_link','status','created_at','updated_at'];
          const labels: Record<string,string> = {
            class_id: 'Mã',
            class_name: 'Tên lớp',
            teacher_id: 'Giáo viên',
            current_students: 'Số học viên',
            schedule_days: 'Thứ',
            total_lessons: 'Tổng buổi',
            start_date: 'Ngày bắt đầu',
            end_date: 'Ngày kết thúc',
            start_time: 'Giờ bắt đầu',
            end_time: 'Giờ kết thúc',
            max_students: 'Sĩ số tối đa',
            room_link: 'Room / Link',
            status: 'Trạng thái',
            created_at: 'Tạo lúc',
            updated_at: 'Cập nhật lúc',
          };
          const visibleKeys = colOrder.filter((k) => visibleColumns[k]);
          const visibleCount = visibleKeys.length;
          return (
            <Table>
              <TableHeader>
                <TableRow>
                  {colOrder.map((k) => visibleColumns[k] ? (<TableHead key={k}>{labels[k]}</TableHead>) : null)}
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayed.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={visibleCount + 1} className="text-center text-muted-foreground">Không có lớp học.</TableCell>
                  </TableRow>
                ) : (
                  displayed.map((c:any) => (
                    <TableRow key={c.class_id}>
                      {colOrder.map((k) => {
                        if (!visibleColumns[k]) return null;
                        if (k === 'class_id') return <TableCell key={k} className="font-mono text-xs">{c.class_id}</TableCell>;
                        if (k === 'class_name') return <TableCell key={k}>{c.class_name}</TableCell>;
                        if (k === 'teacher_id') return <TableCell key={k}>{(() => {
                          const id = c.teacher_id;
                          const t = (teachers ?? []).find((x:any) => x.teacher_id === id || x.specific_id === id || x.id === id);
                          return t ? (t.full_name ?? id) : (id ?? '—');
                        })()}</TableCell>;
                        if (k === 'current_students') {
                          const cur = Number(currentStudentCounts?.[c.class_id] ?? c.current_students ?? 0);
                          const max = Number(c.max_students ?? 0) || null;
                          if (!max) return <TableCell key={k} className="text-center">{cur}</TableCell>;
                          const pct = cur / max;
                          const badgeClass = pct >= 1 ? 'bg-destructive text-destructive-foreground' : pct >= 0.8 ? 'bg-yellow-100 text-yellow-800' : 'bg-emerald-100 text-emerald-700';
                          return <TableCell key={k} className="text-center"><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass}`}>{cur}/{max}</span></TableCell>;
                        }
                        if (k === 'schedule_days') return <TableCell key={k} className="text-xs">{(c.schedule_days ?? []).map((d:number)=>DAYS.find(x=>x.v===d)?.label ?? d).join(', ')}</TableCell>;
                        if (k === 'total_lessons') return <TableCell key={k} className="text-xs">{c.total_lessons ?? '—'}</TableCell>;
                        if (k === 'start_date') return <TableCell key={k} className="text-xs">{c.start_date ? new Date(c.start_date).toLocaleDateString() : '—'}</TableCell>;
                        if (k === 'end_date') return <TableCell key={k} className="text-xs">{c.end_date ? new Date(c.end_date).toLocaleDateString() : '—'}</TableCell>;
                        if (k === 'start_time') return <TableCell key={k} className="text-xs">{c.start_time ?? '—'}</TableCell>;
                        if (k === 'end_time') return <TableCell key={k} className="text-xs">{c.end_time ?? '—'}</TableCell>;
                        if (k === 'max_students') return <TableCell key={k} className="text-xs">{c.max_students ?? '—'}</TableCell>;
                        if (k === 'room_link') return <TableCell key={k} className="text-xs">{c.room_link ? <a href={c.room_link} target="_blank" rel="noreferrer" className="text-primary underline">Link</a> : '—'}</TableCell>;
                        if (k === 'status') return <TableCell key={k}><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : c.status === 'completed' ? 'bg-muted text-muted-foreground' : 'bg-yellow-100 text-yellow-800'}`}>{c.status}</span></TableCell>;
                        if (k === 'created_at') return <TableCell key={k} className="text-xs">{c.created_at ? new Date(c.created_at).toLocaleString() : '—'}</TableCell>;
                        if (k === 'updated_at') return <TableCell key={k} className="text-xs">{c.updated_at ? new Date(c.updated_at).toLocaleString() : '—'}</TableCell>;
                        return null;
                      })}
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(c)}><Pencil className="mr-2 h-4 w-4"/> Chỉnh sửa</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleting(c)}><Trash2 className="mr-2 h-4 w-4"/> Xoá</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          );
        })()}
      </div>

      <AlertDialog open={!!deleting} onOpenChange={(v)=>!v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xoá lớp</AlertDialogTitle>
            <AlertDialogDescription>Bạn có chắc muốn xoá lớp {deleting?.class_id} không? Hành động này sẽ xoá hoàn toàn.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => { if (deleting) onDeleteClass(deleting.class_id); setDeleting(null); }}>Xoá</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
