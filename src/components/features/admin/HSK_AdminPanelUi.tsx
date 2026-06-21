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
import { Star, MoreHorizontal, Pencil, Trash2, Eye, EyeOff, ChevronDown, Plus, Minus } from "lucide-react";
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

const DAY_LABELS = new Map<number, string>([
  [0, "Chủ nhật"],
  [1, "Thứ 2"],
  [2, "Thứ 3"],
  [3, "Thứ 4"],
  [4, "Thứ 5"],
  [5, "Thứ 6"],
  [6, "Thứ 7"],
]);

const CLASS_STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ khai giảng',
  active: 'Đang hoạt động',
  completed: 'Đã hoàn thành',
};

const csvEscape = (v: any) => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return '"' + s.replace(/"/g, '""') + '"';
};

const downloadCsv = (csvContent: string, fileName: string) => {
  const bom = "\uFEFF";
  const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const getClassId = (c: any) => String(c?.class_id ?? c?.classId ?? "").trim();

const getCurrentStudents = (c: any) => Number(c?.current_students ?? c?.current_students_count ?? 0);

const getMaxStudents = (c: any) => Number(c?.max_students ?? 0) || 0;

const hasTeacherAssigned = (c: any) => Boolean(c?.teacher_id ?? c?.teacherId ?? c?.teacher_staff_code ?? c?.teacher_staffCode);

const isVisibleClass = (c: any) => {
  const status = c?.status ?? "";
  const notFull = !getMaxStudents(c) || getCurrentStudents(c) < getMaxStudents(c);
  return status === "active" || notFull || !hasTeacherAssigned(c);
};

const findTeacherRecord = (teachers: any[] | undefined, idOrCode: any) => {
  if (!idOrCode || !Array.isArray(teachers)) return null;
  const key = String(idOrCode);
  return (
    teachers.find((x: any) =>
      String(x.id ?? "") === key ||
      String(x.specific_id ?? x.specificId ?? "") === key ||
      String(x.staff_code ?? x.staffCode ?? "") === key ||
      String(x.teacher_id ?? "") === key,
    ) ?? null
  );
};

const formatTeacherDisplay = (teacher: any, fallback: string | null) => {
  if (!teacher) return fallback ?? "";
  const staffCode = teacher.staff_code ?? teacher.staffCode ?? fallback ?? "";
  const fullName = teacher.full_name ?? teacher.fullName ?? "";
  return fullName ? `${staffCode} — ${fullName}` : staffCode;
};

const formatBirthDateCell = (birthYearOrDate: any) => {
  if (birthYearOrDate === null || birthYearOrDate === undefined || birthYearOrDate === "") return "";
  if (typeof birthYearOrDate === "string") {
    const d = new Date(birthYearOrDate);
    if (!Number.isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    }
    return String(birthYearOrDate);
  }
  return `01/01/${birthYearOrDate}`;
};

const mergeClassEvents = (remoteEvents: any[] | null, localEvents: any[], classId: string) => {
  return [
    ...((remoteEvents ?? []).filter((e: any) => String(e.class_id ?? classId) === String(classId))),
    ...((localEvents ?? []).filter((e: any) => String(e.class_id) === String(classId))),
  ].sort((a: any, b: any) => {
    const ta = new Date(a.created_at ?? a.event_ts ?? 0).getTime();
    const tb = new Date(b.created_at ?? b.event_ts ?? 0).getTime();
    return tb - ta;
  });
};

// ─── Reusable sort utilities ──────────────────────────────────────────────────

/**
 * Reusable sort hook.
 * • Click once on a column → ascending (A→Z / 0→9).
 * • Click same column again → descending.
 * Pass an optional `getComparableValue` for computed / nested sort keys.
 */
function useSortableTable<T extends Record<string, any>>(
  data: T[],
  getComparableValue?: (item: T, key: string) => any,
) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = [...data].sort((a, b) => {
    if (!sortKey) return 0;
    const av = getComparableValue ? getComparableValue(a, sortKey) : (a[sortKey] ?? '');
    const bv = getComparableValue ? getComparableValue(b, sortKey) : (b[sortKey] ?? '');
    if (av === bv) return 0;
    const dir = sortDir === 'asc' ? 1 : -1;
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
    return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' }) * dir;
  });

  return { sortKey, sortDir, handleSort, sorted };
}

/** Sortable column header — triangle turns blue when this column is the active sort key. */
function SortableTableHead({
  label,
  sortKey,
  currentSortKey,
  sortDir,
  onSort,
  className,
}: {
  label: string;
  sortKey: string;
  currentSortKey: string | null;
  sortDir: 'asc' | 'desc';
  onSort: (key: string) => void;
  className?: string;
}) {
  const isActive = currentSortKey === sortKey;
  return (
    <TableHead
      className={`cursor-pointer select-none ${className ?? ''}`}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1 whitespace-nowrap">
        {label}
        <span
          className={`text-[10px] transition-colors ${isActive ? 'text-blue-500' : 'text-muted-foreground/30'}`}
          aria-hidden="true"
        >
          {isActive && sortDir === 'desc' ? '▼' : '▲'}
        </span>
      </span>
    </TableHead>
  );
}

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
  getClassEvents,
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
  getClassEvents?: (classId: string) => Promise<any[]>;
  teachers?: any[];
}) {
  const [classDetails, setClassDetails] = useState<any | null>(null);
  const [studentEnrollments, setStudentEnrollments] = useState<any[] | null>(null);
  const [localErrors, setLocalErrors] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!classId || !getClassDetails) {
      setClassDetails(null);
      return;
    }
    getClassDetails(classId)
      .then((d) => {
        if (!cancelled) setClassDetails(d ?? null);
      })
      .catch(() => {
        if (!cancelled) setClassDetails(null);
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
    getStudentEnrollments(studentId)
      .then((r) => {
        if (!cancelled) setStudentEnrollments(r ?? []);
      })
      .catch(() => {
        if (!cancelled) setStudentEnrollments([]);
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
  const [addStudentNote, setAddStudentNote] = useState('');
  const [teacherChangeNote, setTeacherChangeNote] = useState('');
  const [removingStudent, setRemovingStudent] = useState<{ id: string; name: string } | null>(null);
  const [removeStudentNote, setRemoveStudentNote] = useState('');

  // suggestions
  const [studentSuggestions, setStudentSuggestions] = useState<any[] | null>(null);
  const [studentSuggestionsLoading, setStudentSuggestionsLoading] = useState(false);
  const studentDebounceRef = useRef<number | null>(null);
  const [localClassEvents, setLocalClassEvents] = useState<any[]>([]);
  const [remoteClassEvents, setRemoteClassEvents] = useState<any[] | null>(null);
  const [loadingClassEvents, setLoadingClassEvents] = useState(false);
  const [classEventsError, setClassEventsError] = useState<string | null>(null);
  const [classEventsVisible, setClassEventsVisible] = useState(true);

  const pushLocalClassEvent = (eventType: string, details: Record<string, any>) => {
    const cid = selectedClass?.class_id ?? selectedClass?.classId ?? classId;
    if (!cid) return;
    setLocalClassEvents((prev) => ([
      {
        event_id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        class_id: cid,
        event_type: eventType,
        details,
        source: 'ui-session',
        created_at: new Date().toISOString(),
      },
      ...prev,
    ]));
  };

  const refreshClassEvents = async (cid?: string) => {
    if (!getClassEvents) return;
    const classIdToFetch = cid ?? (selectedClass?.class_id ?? selectedClass?.classId ?? classId);
    if (!classIdToFetch) {
      setRemoteClassEvents(null);
      return;
    }
    setLoadingClassEvents(true);
    setClassEventsError(null);
    try {
      const events = await getClassEvents(classIdToFetch);
      setRemoteClassEvents(events ?? []);
    } catch (e: any) {
      setClassEventsError((e && e.message) ? e.message : 'Không thể tải sự kiện lớp học.');
      setRemoteClassEvents([]);
    } finally {
      setLoadingClassEvents(false);
    }
  };

  // immediate fetch helper for student suggestions (used on focus)
  const fetchStudentSuggestionsNow = async (q?: string) => {
    if (!getStudentSuggestions) return;
    const query = String(q ?? '').trim();
    if (!query) {
      setStudentSuggestions([]);
      setStudentSuggestionsLoading(false);
      return;
    }
    setStudentSuggestionsLoading(true);
    try {
      const res = await getStudentSuggestions(query);
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

  const refreshClassesList = async () => {
    if (!getClasses) return [];
    setLoadingClassesList(true);
    try {
      const all = (await getClasses()) ?? [];
      setClassesList(all);
      return all;
    } catch {
      setClassesList([]);
      return [];
    } finally {
      setLoadingClassesList(false);
    }
  };

  const refreshEnrollmentsForClass = async (targetClassId: string) => {
    if (!getClassEnrollments || !targetClassId) return;
    setLoadingEnrollments(true);
    try {
      const rows = (await getClassEnrollments(targetClassId)) ?? [];
      setSelectedEnrollments(rows);
    } catch {
      setSelectedEnrollments([]);
    } finally {
      setLoadingEnrollments(false);
    }
  };

  const openClass = (c: any) => {
    const selectedClassId = getClassId(selectedClass);
    const targetClassId = getClassId(c);
    // toggle collapse if already open
    if (selectedClassId && selectedClassId === targetClassId) {
      setSelectedClass(null);
      setSelectedEnrollments(null);
      return;
    }
    setSelectedClass(c);
    setSelectedEnrollments(null);
    if (!getClassEnrollments) return;
    refreshEnrollmentsForClass(targetClassId);
    if (getClassEvents) {
      refreshClassEvents(targetClassId);
    }
  };
  // add student by staff_code (UI passes staff_code, parent resolves to id)
  const handleAddStudent = async (classIdToUse?: string, staffCode?: string) => {
    if (!onAddStudentToClass) return;
    const cid = classIdToUse || getClassId(selectedClass) || classId;
    const code = staffCode ?? addStudentCode ?? studentId;
    if (!cid || !code) return setActionError('Cần `Class ID` và `Mã nhân viên`.');

    // Capacity check: prevent adding beyond class max size when dialog remains open
    const maxStudents = Number(selectedClass?.max_students ?? 0);
    const currentStudents = Array.isArray(selectedEnrollments)
      ? selectedEnrollments.length
      : Number(selectedClass?.current_students ?? 0);
    if (maxStudents > 0 && currentStudents >= maxStudents) {
      return setActionError(`Lớp đã đủ sĩ số (${currentStudents}/${maxStudents}), không thể thêm học viên.`);
    }

    // Duplicate check: verify student is not already enrolled in this class
    if (selectedEnrollments && selectedEnrollments.length > 0) {
      const codeNorm = String(code).trim().toLowerCase();
      const alreadyEnrolled = selectedEnrollments.some((s: any) => {
        const sc = String(s.staff_code ?? s.student_id ?? s.specific_id ?? s.id ?? '').trim().toLowerCase();
        return sc === codeNorm;
      });
      if (alreadyEnrolled) {
        return setActionError(`Học viên "${code}" đã có trong danh sách lớp này, không thể thêm trùng.`);
      }
    }

    setActionPending(true); setActionError(null);
    try {
      await onAddStudentToClass(cid, code);
      pushLocalClassEvent('student_added', {
        student_code: code,
        note: addStudentNote.trim() || 'Thêm học viên vào lớp',
      });
      // refresh lists
      const all = await refreshClassesList();
      const refreshedClass = (all ?? []).find((x:any) => getClassId(x) === String(cid));
      if (refreshedClass) setSelectedClass(refreshedClass);
      // Refresh enrollments for the currently selected class without toggling collapse
      if (selectedClass) await refreshEnrollmentsForClass(getClassId(selectedClass));
      // Clear input for convenience
      setAddStudentCode('');
      setAddStudentNote('');
      // Close dialog if user enabled auto-close
      if (autoCloseAfterAdd) setAddDialogOpen(false);
      if (getClassEvents) await refreshClassEvents(cid);
    } catch (e: any) {
      setActionError((e && e.message) ? e.message : 'Không thể thêm học viên.');
    } finally { setActionPending(false); }
  };

  const handleRemoveStudent = async (sid: string, note?: string) => {
    if (!onRemoveStudentFromClass || !selectedClass) return;
    setActionPending(true); setActionError(null);
    try {
      const selectedClassId = getClassId(selectedClass);
      await onRemoveStudentFromClass(selectedClassId, sid);
      pushLocalClassEvent('student_removed', {
        student_code: sid,
        note: note?.trim() || 'Xoá học viên khỏi lớp',
      });
      // Refresh enrollments for the current class without toggling collapse
      await refreshEnrollmentsForClass(selectedClassId);
      // Refresh classes list counts
      await refreshClassesList();
      if (getClassEvents) await refreshClassEvents(selectedClassId);
      setRemovingStudent(null);
      setRemoveStudentNote('');
    } catch (e: any) {
      setActionError((e && e.message) ? e.message : 'Không thể xoá học viên.');
    } finally { setActionPending(false); }
  };

  // update teacher for selectedClass
  const handleUpdateTeacher = async () => {
    if (!onUpdateClass || !selectedClass) return setActionError('Không có lớp để cập nhật.');
    const cid = getClassId(selectedClass) || classId;
    if (!cid) return setActionError('Cần mã lớp.');
    setActionPending(true); setActionError(null);
    try {
      const oldTid = selectedClass.teacher_id ?? selectedClass.teacherId ?? null;
      const oldT = findTeacherRecord(teachers, oldTid);
      const oldTeacherLabel = formatTeacherDisplay(oldT, selectedClass.teacher_staff_code ?? selectedClass.teacher_code ?? oldTid);
      const newT = findTeacherRecord(teachers, teacherEdit);
      const newTeacherLabel = formatTeacherDisplay(newT, teacherEdit);

      await onUpdateClass(cid, { teacher_id: teacherEdit });
      pushLocalClassEvent('teacher_changed', {
        old_teacher: oldTeacherLabel,
        new_teacher: newTeacherLabel,
        note: teacherChangeNote.trim() || 'Đổi giáo viên',
      });
      // refresh classes list and selected class
      const all = await refreshClassesList();
      const found = (all ?? []).find((x:any) => getClassId(x) === String(cid));
      if (found) setSelectedClass(found);

      // also try getClassDetails if available (preferred) to populate latest fields
      if (getClassDetails) {
        try {
          const det = await getClassDetails(cid);
          if (det) setSelectedClass(det);
        } catch (e) {
          // ignore
        }
      }

      await refreshEnrollmentsForClass(cid);
      if (getClassEvents) await refreshClassEvents(cid);
      setTeacherChangeNote('');
    } catch (e: any) {
      setActionError((e && e.message) ? e.message : 'Không thể cập nhật giáo viên.');
    } finally { setActionPending(false); }
  };

  useEffect(() => {
    if (!selectedClass) {
      setRemoteClassEvents(null);
      setClassEventsError(null);
      return;
    }
    if (!getClassEvents) return;
    refreshClassEvents(getClassId(selectedClass));
  }, [selectedClass, getClassEvents]);

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
      setStudentSuggestions([]);
      setStudentSuggestionsLoading(false);
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
      const t = findTeacherRecord(teachers, tid);
      setTeacherEdit(t ? (t.staff_code ?? t.staffCode ?? (t.specific_id ?? t.specificId ?? t.id)) : String(tid));
    } else {
      setTeacherEdit(selectedClass.teacher_staff_code ?? selectedClass.teacher_code ?? selectedClass.teacher_id ?? selectedClass.teacherId ?? '');
    }
  }, [selectedClass]);

  // compute classes to display: active OR not full OR missing teacher
  const displayClasses = (classesList ?? []).filter((c: any) => isVisibleClass(c));

  const {
    sortKey: classMappingSortKey,
    sortDir: classMappingSortDir,
    handleSort: handleClassMappingSort,
    sorted: sortedDisplayClasses,
  } = useSortableTable(displayClasses, (c, key) => {
    if (key === 'current_students') return getCurrentStudents(c);
    if (key === 'start_time') return String(c.start_time ?? '');
    return String(c[key] ?? '');
  });

  const exportClassCsv = () => {
    const cols = [
      'class_id',
      'class_name',
      'teacher_id',
      'teacher_name',
      'current_students',
      'max_students',
      'schedule_days',
      'start_time',
      'end_time',
      'status',
    ];

    const resolveTeacherLabel = (teacherId: any) => {
      const id = String(teacherId ?? '').trim();
      if (!id) return '';
      const teacher = findTeacherRecord(teachers, id);
      if (!teacher) return id;
      return formatTeacherDisplay(teacher, id);
    };

    const formatScheduleDays = (scheduleDays: any) => {
      if (!Array.isArray(scheduleDays)) return '';
      return scheduleDays.map((day: number) => DAY_LABELS.get(day) ?? String(day)).join('; ');
    };

    const rows = sortedDisplayClasses.map((c: any) => {
      const currentStudents = Number(c.current_students ?? c.current_students_count ?? 0);
      const teacherId = c.teacher_id ?? c.teacherId ?? '';
      const teacherName = resolveTeacherLabel(teacherId);
      return cols.map((col) => {
        if (col === 'teacher_name') return csvEscape(teacherName);
        if (col === 'current_students') return csvEscape(currentStudents);
        if (col === 'max_students') return csvEscape(c.max_students ?? '');
        if (col === 'schedule_days') return csvEscape(formatScheduleDays(c.schedule_days));
        return csvEscape(c[col] ?? '');
      }).join(',');
    });

    const header = cols.map((col) => csvEscape(col)).join(',');
    const csv = [header, ...rows].join('\n');
    downloadCsv(csv, `hsk_classes_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const exportClassEventsCsv = () => {
    const currentClassId = selectedClass?.class_id ?? selectedClass?.classId ?? classId;
    if (!currentClassId) return;

    const merged = mergeClassEvents(remoteClassEvents, localClassEvents, String(currentClassId));

    const cols = ['event_id', 'event_type', 'created_at', 'actor', 'source', 'details'];
    const rows = merged.map((ev: any, idx: number) => {
      const evType = String(ev.event_type ?? 'event');
      const when = ev.created_at ?? ev.event_ts ?? '';
      const actor = ev.actor_name ?? ev.user_full_name ?? ev.actor_specific_id ?? ev.user_specific_id ?? ev.source ?? 'system';
      const details = JSON.stringify(ev.details ?? ev.new_value ?? {}, null, 0);
      return [
        csvEscape(ev.event_id ?? `${evType}-${idx}`),
        csvEscape(evType),
        csvEscape(when),
        csvEscape(actor),
        csvEscape(ev.source ?? ''),
        csvEscape(details),
      ].join(',');
    });

    const header = cols.map((col) => csvEscape(col)).join(',');
    const csv = [header, ...rows].join('\n');
    downloadCsv(
      csv,
      `hsk_class_events_${String(currentClassId).replace(/[^a-zA-Z0-9_-]+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`,
    );
  };

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
            <Button size="sm" variant="ghost" onClick={exportClassCsv}>Export</Button>
            <Button size="sm" variant="ghost" onClick={refreshClassesList}>Refresh</Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead label="Mã" sortKey="class_id" currentSortKey={classMappingSortKey} sortDir={classMappingSortDir} onSort={handleClassMappingSort} />
                <SortableTableHead label="Tên lớp" sortKey="class_name" currentSortKey={classMappingSortKey} sortDir={classMappingSortDir} onSort={handleClassMappingSort} />
                <SortableTableHead label="Sĩ số" sortKey="current_students" currentSortKey={classMappingSortKey} sortDir={classMappingSortDir} onSort={handleClassMappingSort} className="text-center" />
                <SortableTableHead label="Thứ / Giờ" sortKey="start_time" currentSortKey={classMappingSortKey} sortDir={classMappingSortDir} onSort={handleClassMappingSort} />
                <SortableTableHead label="Trạng thái" sortKey="status" currentSortKey={classMappingSortKey} sortDir={classMappingSortDir} onSort={handleClassMappingSort} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingClassesList ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Đang tải...</TableCell></TableRow>
              ) : sortedDisplayClasses.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Không có lớp.</TableCell></TableRow>
              ) : (
                sortedDisplayClasses.map((c:any) => {
                  const cur = getCurrentStudents(c);
                  const max = getMaxStudents(c) || null;
                  const pct = max ? (cur / max) : 0;
                  const badgeClass = pct >= 1 ? 'bg-destructive text-destructive-foreground' : pct >= 0.8 ? 'bg-yellow-100 text-yellow-800' : 'bg-emerald-100 text-emerald-700';
                  return (
                    <TableRow key={getClassId(c)} onClick={() => openClass(c)} className={getClassId(selectedClass) === getClassId(c) ? 'bg-muted/5' : ''}>
                      <TableCell className="font-mono text-xs">{getClassId(c)}</TableCell>
                      <TableCell>{c.class_name ?? '—'}</TableCell>
                      <TableCell className="text-center"><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass}`}>{cur}{max ? `/${max}` : ''}</span></TableCell>
                      <TableCell className="text-xs">{(c.schedule_days ?? []).join(', ')} {c.start_time ? `— ${c.start_time}` : ''}</TableCell>
                      <TableCell><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : c.status === 'completed' ? 'bg-muted text-muted-foreground' : 'bg-yellow-100 text-yellow-800'}`}>{CLASS_STATUS_LABELS[c.status] ?? c.status}</span></TableCell>
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
                  <Button size="sm" onClick={() => setAddDialogOpen(true)} disabled={actionPending || (Number(selectedClass?.max_students ?? 0) > 0 && ((Array.isArray(selectedEnrollments) ? selectedEnrollments.length : Number(selectedClass?.current_students ?? 0)) >= Number(selectedClass?.max_students ?? 0)))}>Thêm học viên</Button>
                </div>
              </div>
              <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3 items-center">
                <div className="text-sm text-muted-foreground">Giáo viên hiện tại</div>
                <div className="font-medium sm:col-span-2">{(() => {
                  if (!selectedClass) return '—';
                  const tid = selectedClass.teacher_id ?? selectedClass.teacherId ?? '';
                  const t = findTeacherRecord(teachers, tid);
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
                <div className="text-sm text-muted-foreground pt-1">Lý do thay đổi</div>
                <div className="sm:col-span-2">
                  <Input
                    value={teacherChangeNote}
                    onChange={(e) => setTeacherChangeNote(e.target.value)}
                    placeholder="VD: dạy bù, đổi giáo viên chủ nhiệm, giáo viên nghỉ phép..."
                  />
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
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { setRemovingStudent({ id: s.staff_code ?? s.student_id ?? s.specific_id ?? s.id, name: s.full_name ?? s.student_name ?? '—' }); setRemoveStudentNote(''); }} disabled={actionPending}>Xoá</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {actionError && <div className="mt-3 text-sm text-destructive">{actionError}</div>}

              <div className="mt-4 rounded-lg border border-border bg-card p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="font-medium">Thông tin sự kiện lớp học</div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setClassEventsVisible((v) => !v)}
                      aria-label={classEventsVisible ? 'Ẩn danh sách sự kiện' : 'Hiện danh sách sự kiện'}
                    >
                      {classEventsVisible ? <Minus className="mr-1 h-4 w-4" /> : <Plus className="mr-1 h-4 w-4" />}
                      {classEventsVisible ? 'Ẩn' : 'Hiện'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={exportClassEventsCsv}
                      disabled={!selectedClass}
                    >
                      Export logs
                    </Button>
                    <span className="text-xs text-muted-foreground">UI preview</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => refreshClassEvents(selectedClass.class_id ?? selectedClass.classId)}
                      disabled={!getClassEvents || loadingClassEvents}
                    >
                      Refresh
                    </Button>
                  </div>
                </div>

                {classEventsVisible ? (() => {
                  const currentClassId = getClassId(selectedClass);
                  const merged = mergeClassEvents(remoteClassEvents, localClassEvents, currentClassId);

                  if (loadingClassEvents) {
                    return <div className="text-sm text-muted-foreground">Đang tải sự kiện...</div>;
                  }

                  if (classEventsError) {
                    return <div className="text-sm text-destructive">{classEventsError}</div>;
                  }

                  if (merged.length === 0) {
                    return (
                      <div className="text-sm text-muted-foreground">
                        Chưa có sự kiện. Hiện panel sẽ hiển thị sự kiện theo phiên; khi nối CSDL sẽ hiện lịch sử đầy đủ.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      {merged.slice(0, 30).map((ev: any, idx: number) => {
                        const evType = String(ev.event_type ?? 'event').toLowerCase();
                        const when = ev.created_at ?? ev.event_ts;
                        const badgeClass = evType.includes('teacher')
                          ? 'bg-indigo-100 text-indigo-700'
                          : evType.includes('remove')
                            ? 'bg-destructive/10 text-destructive'
                            : evType.includes('add')
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-muted text-muted-foreground';
                        const actor = ev.actor_name ?? ev.user_full_name ?? ev.actor_specific_id ?? ev.user_specific_id ?? ev.source ?? 'system';
                        return (
                          <div key={ev.event_id ?? `${evType}-${idx}`} className="rounded-md border border-border p-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass}`}>{evType}</span>
                              <span className="text-xs text-muted-foreground">{when ? new Date(when).toLocaleString() : '—'}</span>
                              <span className="text-xs text-muted-foreground">{actor}</span>
                            </div>
                            <div className="mt-1 text-sm text-muted-foreground break-words">{JSON.stringify(ev.details ?? ev.new_value ?? {}, null, 0)}</div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })() : (
                  <div className="text-sm text-muted-foreground">
                    Danh sách sự kiện đang được ẩn. Nhấn nút Hiện để xem lại.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Chọn một lớp để xem học viên.</div>
          )}
        </div>
      </div>
      {/* Add student dialog */}
      <Dialog open={addDialogOpen} onOpenChange={(v) => { setAddDialogOpen(v); if (!v) { setAddStudentCode(''); setAddStudentNote(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm học viên vào lớp {selectedClass?.class_id ?? ''}</DialogTitle>
            <DialogDescription>Nhập mã học viên và lý do ghi danh.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Label>Mã học viên</Label>
              <Input 
                value={addStudentCode} 
                onChange={(e) => setAddStudentCode(e.target.value)} 
                onFocus={() => fetchStudentSuggestionsNow(addStudentCode)} 
                className="font-mono" 
                placeholder="ST-0001" 
              />
              {studentSuggestionsLoading && <div className="text-xs text-muted-foreground mt-1">Đang tìm...</div>}
              {!studentSuggestionsLoading && String(addStudentCode ?? '').trim().length > 0 && Array.isArray(studentSuggestions) && studentSuggestions.length === 0 && (
                <div className="text-xs text-muted-foreground mt-1">Không tìm thấy học viên phù hợp.</div>
              )}
              <div className="mt-2 flex items-center gap-2">
                <Checkbox checked={autoCloseAfterAdd} onCheckedChange={(v) => setAutoCloseAfterAdd(!!v)} />
                <div className="text-sm">Đóng cửa sổ sau khi thêm</div>
              </div>
              {studentSuggestions && studentSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 z-50 mt-1 max-h-40 overflow-auto rounded-md border bg-popover p-1 shadow-lg top-full">
                  {studentSuggestions.map((s:any) => (
                    <div 
                      key={s.staff_code ?? s.specific_id ?? s.id} 
                      className="cursor-pointer px-2 py-1 hover:bg-muted rounded text-sm" 
                      onMouseDown={(e) => { 
                        e.preventDefault(); 
                        setAddStudentCode(s.staff_code ?? s.specific_id ?? s.id); 
                        setStudentSuggestions(null); 
                      }}
                    >
                      {(s.staff_code ?? s.specific_id ?? s.id)} — {s.full_name ?? s.student_name ?? ''}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Lý do / Ghi chú (tùy chọn)</Label>
              <Input
                value={addStudentNote}
                onChange={(e) => setAddStudentNote(e.target.value)}
                placeholder="VD: nhập học mới, chuyển lớp, ghi danh bổ sung..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => { setAddDialogOpen(false); setAddStudentCode(''); setAddStudentNote(''); }}>Huỷ</Button>
              <Button 
                onClick={() => handleAddStudent(selectedClass?.class_id, addStudentCode)} 
                disabled={actionPending || !String(addStudentCode ?? '').trim()}
              >
                Thêm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Confirm remove student dialog */}
      <Dialog open={!!removingStudent} onOpenChange={(v) => { if (!v) { setRemovingStudent(null); setRemoveStudentNote(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xoá học viên</DialogTitle>
            <DialogDescription>
              Xoá học viên {removingStudent?.name} ({removingStudent?.id}) khỏi lớp {selectedClass?.class_id ?? ''}?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label>Lý do xoá (tùy chọn)</Label>
            <Input
              value={removeStudentNote}
              onChange={(e) => setRemoveStudentNote(e.target.value)}
              placeholder="VD: học viên xin nghỉ, chuyển lớp, không phù hợp lịch..."
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setRemovingStudent(null); setRemoveStudentNote(''); }}>Huỷ</Button>
            <Button
              variant="destructive"
              onClick={() => { if (removingStudent) handleRemoveStudent(removingStudent.id, removeStudentNote); }}
              disabled={actionPending}
            >
              Xác nhận xoá
            </Button>
          </DialogFooter>
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
  const {
    sortKey: teacherSortKey,
    sortDir: teacherSortDir,
    handleSort: handleTeacherSort,
    sorted: sortedTeachers,
  } = useSortableTable(teachers ?? [], (t, key) => {
    if (['avg_stars', 'total_reviews', 'total_penalties'].includes(key)) return Number(t[key] ?? 0);
    return String(t[key] ?? '');
  });

  const {
    sortKey: ratingSortKey,
    sortDir: ratingSortDir,
    handleSort: handleRatingSort,
    sorted: sortedRatings,
  } = useSortableTable(ratings ?? [], (r, key) => {
    if (key === 'stars') return Number(r.stars ?? 0);
    if (key === 'created_at') return new Date(r.created_at ?? 0).getTime();
    return String(r[key] ?? '');
  });

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
              <SortableTableHead label="Teacher ID" sortKey="teacher_id" currentSortKey={teacherSortKey} sortDir={teacherSortDir} onSort={handleTeacherSort} />
              <SortableTableHead label="Họ tên" sortKey="full_name" currentSortKey={teacherSortKey} sortDir={teacherSortDir} onSort={handleTeacherSort} />
              <SortableTableHead label="Average rating" sortKey="avg_stars" currentSortKey={teacherSortKey} sortDir={teacherSortDir} onSort={handleTeacherSort} />
              <SortableTableHead label="Tổng review" sortKey="total_reviews" currentSortKey={teacherSortKey} sortDir={teacherSortDir} onSort={handleTeacherSort} />
              <SortableTableHead label="Late cancellations" sortKey="total_penalties" currentSortKey={teacherSortKey} sortDir={teacherSortDir} onSort={handleTeacherSort} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTeachers.map((t) => (
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
              <SortableTableHead label="Thời gian" sortKey="created_at" currentSortKey={ratingSortKey} sortDir={ratingSortDir} onSort={handleRatingSort} />
              <SortableTableHead label="Teacher" sortKey="teacher_name" currentSortKey={ratingSortKey} sortDir={ratingSortDir} onSort={handleRatingSort} />
              <SortableTableHead label="Học viên" sortKey="student_name" currentSortKey={ratingSortKey} sortDir={ratingSortDir} onSort={handleRatingSort} />
              <SortableTableHead label="Sao" sortKey="stars" currentSortKey={ratingSortKey} sortDir={ratingSortDir} onSort={handleRatingSort} />
              <TableHead>Nhận xét</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRatings.map((r) => (
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
  const {
    sortKey: logSortKey,
    sortDir: logSortDir,
    handleSort: handleLogSort,
    sorted: sortedLogs,
  } = useSortableTable(logs ?? [], (l, key) => {
    if (key === 'created_at') return new Date(l.created_at ?? 0).getTime();
    if (key === 'user') return String(l.user_full_name ?? l.user_specific_id ?? '');
    return String(l[key] ?? '');
  });

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead label="Thời gian" sortKey="created_at" currentSortKey={logSortKey} sortDir={logSortDir} onSort={handleLogSort} />
              <SortableTableHead label="User" sortKey="user" currentSortKey={logSortKey} sortDir={logSortDir} onSort={handleLogSort} />
              <SortableTableHead label="Action" sortKey="action" currentSortKey={logSortKey} sortDir={logSortDir} onSort={handleLogSort} />
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedLogs.map((log, index) => (
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
    student_account_type: true,
    status: true,
    phone: true,
    birth_year: true,
    created_at: false,
    updated_at: false,
  });
  const [filterText, setFilterText] = useState("");

  const toggleColumn = (key: string) => setVisibleColumns((s) => ({ ...s, [key]: !s[key] }));

  const filteredUsers = (users ?? []).filter((u: any) => {
    if (!filterText) return true;
    const q = filterText.toLowerCase();
    return (
      String(u.full_name ?? "").toLowerCase().includes(q) ||
      String(u.email ?? "").toLowerCase().includes(q) ||
      String(u.specific_id ?? "").toLowerCase().includes(q) ||
      String(u.staff_code ?? "").toLowerCase().includes(q) ||
      String(u.phone ?? "").toLowerCase().includes(q)
    );
  });

  const {
    sortKey: userSortKey,
    sortDir: userSortDir,
    handleSort: handleUserSort,
    sorted: displayedUsers,
  } = useSortableTable(filteredUsers);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [deletingUser, setDeletingUser] = useState<any>(null);
  const [deleteMode, setDeleteMode] = useState<"soft" | "hard">("soft");

  const [editFullName, setEditFullName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editStudentAccountType, setEditStudentAccountType] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editBirthDate, setEditBirthDate] = useState<any>("");

  const openEdit = (user: any) => {
    setEditingUser(user);
    setEditFullName(user.full_name || "");
    setEditRole(user.role || "student");
    setEditStudentAccountType(user.student_account_type || "");
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
    if (editStudentAccountType !== (editingUser.student_account_type || "")) payload.studentAccountType = editStudentAccountType || null;
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
    const cols = ['specific_id','staff_code','full_name','email','role','student_account_type','status','phone','birth_year','created_at','updated_at'];
    const rows = displayedUsers.map((u: any) => cols.map((c) => (c === 'birth_year' ? csvEscape(formatBirthDateCell(u.birth_year)) : csvEscape(u[c] ?? ''))).join(','));
    const header = cols.map((c) => csvEscape(c)).join(',');
    const csv = [header, ...rows].join('\n');
    downloadCsv(csv, `hsk_users_${new Date().toISOString().slice(0,10)}.csv`);
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
                      { key: 'student_account_type', label: 'Loại học viên' },
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
            const colOrder = ['staff_code','specific_id','full_name','email','role','student_account_type','status','phone','birth_year','created_at','updated_at'];
            const labels: Record<string,string> = {
              staff_code: 'Mã nhân viên',
              specific_id: 'Specific ID',
              full_name: 'Họ tên',
              email: 'Email',
              role: 'Vai trò',
              student_account_type: 'Loại học viên',
              status: 'Trạng thái',
              phone: 'Số điện thoại',
              birth_year: 'Năm sinh',
              created_at: 'Tạo lúc',
              updated_at: 'Cập nhật lúc',
            };
            const visibleKeys = colOrder.filter((k) => visibleColumns[k]);
            const visibleCount = visibleKeys.length;
            const supportsSort = new Set(['specific_id','staff_code','full_name','email','role','student_account_type','status','birth_year','created_at','updated_at']);
            return (
              <Table>
                <TableHeader>
                  <TableRow>
                    {colOrder.map((k) =>
                      visibleColumns[k] ? (
                        supportsSort.has(k) ? (
                          <SortableTableHead
                            key={k}
                            label={labels[k]}
                            sortKey={k}
                            currentSortKey={userSortKey}
                            sortDir={userSortDir}
                            onSort={handleUserSort}
                          />
                        ) : (
                          <TableHead key={k}>{labels[k]}</TableHead>
                        )
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
                          if (k === 'student_account_type') return <TableCell key={k} className="capitalize">{u.student_account_type ?? '—'}</TableCell>;
                          if (k === 'status') return (
                            <TableCell key={k}>
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${u.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-destructive/10 text-destructive'}`}>
                                {u.status}
                              </span>
                            </TableCell>
                          );
                          if (k === 'phone') return <TableCell key={k} className="font-mono text-xs">{u.phone ?? '—'}</TableCell>;
                          if (k === 'birth_year') {
                            const display = formatBirthDateCell(u.birth_year) || '—';
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
              <Select value={editRole} onValueChange={(value) => {
                setEditRole(value);
                if (value !== 'student') setEditStudentAccountType('');
              }}>
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
            {editRole === 'student' && (
              <div className="space-y-1.5">
                <Label>Loại tài khoản học viên</Label>
                <Select value={editStudentAccountType} onValueChange={setEditStudentAccountType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn online hoặc offline" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
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

  const filteredClasses = (classes ?? []).filter((c: any) => {
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

  const {
    sortKey: classesSortKey,
    sortDir: classesSortDir,
    handleSort: handleClassesSort,
    sorted: displayed,
  } = useSortableTable(filteredClasses, (c, key) => {
    if (key === 'current_students') return Number(currentStudentCounts?.[c.class_id] ?? c.current_students ?? 0);
    if (key === 'teacher_id') {
      const t = (teachers ?? []).find((x:any) => x.teacher_id === c.teacher_id || x.specific_id === c.teacher_id || x.id === c.teacher_id);
      return String(t?.full_name ?? c.teacher_id ?? '');
    }
    if (key === 'schedule_days') return Array.isArray(c.schedule_days) ? c.schedule_days.slice().sort((a:number,b:number)=>a-b).join(',') : '';
    return c[key] ?? '';
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
            <Button variant="ghost" onClick={startCreate}>Refresh</Button>
          </div>
        </div>

        { (classes ?? []).length === 0 && (
          <div className="mb-3 rounded-md bg-muted/5 border border-muted p-3 text-sm text-muted-foreground">Không có dữ liệu lớp học. Nếu bạn vừa tạo lớp mà không thấy gì, kiểm tra bảng `classes` trên Supabase hoặc xem lỗi từ mutation.</div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Mã lớp</Label>
            <Input placeholder="L-OFL-HSK1-NC-0001" value={form.classId} onChange={(e) => setForm((s:any)=>({...s,classId:e.target.value}))} />
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
                <SelectItem value="pending">Chờ khai giảng</SelectItem>
                <SelectItem value="active">Đang hoạt động</SelectItem>
                <SelectItem value="completed">Đã hoàn thành</SelectItem>
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
                  if (k === 'schedule_days') return csvEscape(formatSchedule(c.schedule_days));
                  if (k === 'current_students') return csvEscape(currentStudentCounts?.[c.class_id] ?? c.current_students ?? 0);
                  if (k === 'start_date' || k === 'end_date' || k === 'created_at' || k === 'updated_at') return csvEscape(formatDate(c[k]));
                  return csvEscape(c[k] ?? '');
                }).join(','));
                const header = ['class_id','class_name','teacher_id','current_students','schedule_days','total_lessons','start_date','end_date','start_time','end_time','max_students','room_link','status','created_at','updated_at'].map((h)=>csvEscape(h)).join(',');
                const csv = [header, ...rows].join('\n');
                downloadCsv(csv, `hsk_classes_${new Date().toISOString().slice(0,10)}.csv`);
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
                  {colOrder.map((k) => visibleColumns[k] ? (
                    <SortableTableHead
                      key={k}
                      label={labels[k]}
                      sortKey={k}
                      currentSortKey={classesSortKey}
                      sortDir={classesSortDir}
                      onSort={handleClassesSort}
                    />
                  ) : null)}
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
                        if (k === 'status') return <TableCell key={k}><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : c.status === 'completed' ? 'bg-muted text-muted-foreground' : 'bg-yellow-100 text-yellow-800'}`}>{CLASS_STATUS_LABELS[c.status] ?? c.status}</span></TableCell>;
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
