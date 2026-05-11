import { getMongoDb } from "./client";
import type {
  WiseTeacherDoc,
  WiseStudentDoc,
  WiseCourseSessionDoc,
  ClassroomTeacherDoc,
  StudentClassroomDoc,
  EvaluationSessionDoc,
  WiseClassroomParsedDoc,
} from "./types";

const ACTIVE_FILTER = { is_active: true };

// ─── Teachers ─────────────────────────────────────────────────────────────

export async function listTeachers(opts: { search?: string; limit?: number } = {}): Promise<WiseTeacherDoc[]> {
  const db = await getMongoDb();
  const q: Record<string, unknown> = { ...ACTIVE_FILTER };
  if (opts.search) {
    const re = new RegExp(escapeRegex(opts.search), "i");
    q.$or = [{ name: re }, { email: re }];
  }
  return db
    .collection<WiseTeacherDoc>("wise_teachers")
    .find(q, { projection: { raw: 0 } })
    .sort({ name: 1 })
    .limit(opts.limit ?? 1000)
    .toArray();
}

export async function getTeacherById(wiseTeacherId: string): Promise<WiseTeacherDoc | null> {
  const db = await getMongoDb();
  return db
    .collection<WiseTeacherDoc>("wise_teachers")
    .findOne({ wise_teacher_id: wiseTeacherId }, { projection: { raw: 0 } });
}

export async function countTeachers(): Promise<number> {
  const db = await getMongoDb();
  return db.collection<WiseTeacherDoc>("wise_teachers").countDocuments(ACTIVE_FILTER);
}

// ─── Students ─────────────────────────────────────────────────────────────

// Enriched student type — adds grade/subject derived from the student's
// classroom membership (since wise_students has no grade field).
export interface WiseStudentEnriched extends WiseStudentDoc {
  grade: string | null;
  subject: string | null;
}

/**
 * For a set of students, look up their classroom memberships and the parsed
 * classroom subject codes (which encode year_level + subject). Returns a map
 * keyed by wise_student_id → { grade, subject } using the first/most-recent
 * classroom for that student.
 */
async function deriveStudentGrade(
  wiseStudentIds: string[],
): Promise<Map<string, { grade: string | null; subject: string | null }>> {
  const out = new Map<string, { grade: string | null; subject: string | null }>();
  if (wiseStudentIds.length === 0) return out;
  const db = await getMongoDb();
  const links = await db
    .collection<StudentClassroomDoc>("wise_student_classrooms")
    .find({ wise_student_id: { $in: wiseStudentIds } })
    .project<{ wise_student_id: string; wise_class_id: string; classroom_subject_raw: string | null }>({
      wise_student_id: 1, wise_class_id: 1, classroom_subject_raw: 1, _id: 0,
    })
    .toArray();
  const firstClassByStudent = new Map<string, string>();
  for (const l of links) {
    if (!firstClassByStudent.has(l.wise_student_id)) firstClassByStudent.set(l.wise_student_id, l.wise_class_id);
  }
  const classIds = [...new Set(links.map((l) => l.wise_class_id))];
  const parsedDocs = classIds.length
    ? await db
        .collection<WiseClassroomParsedDoc & { parsed?: { year_level?: number; subject?: string } }>("wise_classroom_parsed")
        .find({ wise_class_id: { $in: classIds } })
        .project<{ wise_class_id: string; year_level: number | string | null; subject_code: string | null; parsed?: { year_level?: number; subject?: string } }>({
          wise_class_id: 1, year_level: 1, subject_code: 1, parsed: 1, _id: 0,
        })
        .toArray()
    : [];
  const parsedByClass = new Map(parsedDocs.map((p) => [p.wise_class_id, p]));

  for (const sid of wiseStudentIds) {
    const classId = firstClassByStudent.get(sid);
    if (!classId) { out.set(sid, { grade: null, subject: null }); continue; }
    const p = parsedByClass.get(classId);
    const yr = p?.year_level ?? p?.parsed?.year_level ?? null;
    const subj = p?.subject_code ?? p?.parsed?.subject ?? null;
    out.set(sid, {
      grade: yr != null ? String(yr) : null,
      subject: subj ?? null,
    });
  }
  return out;
}

function attachGrade(s: WiseStudentDoc, info: { grade: string | null; subject: string | null } | undefined): WiseStudentEnriched {
  return { ...s, grade: info?.grade ?? null, subject: info?.subject ?? null };
}

export async function listStudents(opts: { search?: string; limit?: number } = {}): Promise<WiseStudentEnriched[]> {
  const db = await getMongoDb();
  const q: Record<string, unknown> = { ...ACTIVE_FILTER };
  if (opts.search) {
    const re = new RegExp(escapeRegex(opts.search), "i");
    q.$or = [{ name: re }, { email: re }];
  }
  const rows = await db
    .collection<WiseStudentDoc>("wise_students")
    .find(q, { projection: { raw: 0 } })
    .sort({ name: 1 })
    .limit(opts.limit ?? 2000)
    .toArray();
  const grades = await deriveStudentGrade(rows.map((r) => r.wise_student_id));
  return rows.map((r) => attachGrade(r, grades.get(r.wise_student_id)));
}

export async function getStudentById(wiseStudentId: string): Promise<WiseStudentEnriched | null> {
  const db = await getMongoDb();
  const s = await db
    .collection<WiseStudentDoc>("wise_students")
    .findOne({ wise_student_id: wiseStudentId }, { projection: { raw: 0 } });
  if (!s) return null;
  const grades = await deriveStudentGrade([wiseStudentId]);
  return attachGrade(s, grades.get(wiseStudentId));
}

/**
 * Two-hop join: teacher → classroom_teachers → wise_student_classrooms → wise_students.
 * Returns unique students enrolled in any classroom this teacher teaches, each
 * enriched with grade + subject from the first matching classroom's parsed code.
 */
export async function getStudentsByTeacher(wiseTeacherId: string): Promise<WiseStudentEnriched[]> {
  const db = await getMongoDb();
  const classroomLinks = await db
    .collection<ClassroomTeacherDoc>("classroom_teachers")
    .find({ wise_teacher_id: wiseTeacherId })
    .project<{ wise_class_id: string }>({ wise_class_id: 1, _id: 0 })
    .toArray();
  const classIds = classroomLinks.map((c) => c.wise_class_id);
  if (classIds.length === 0) return [];

  const studentLinks = await db
    .collection<StudentClassroomDoc>("wise_student_classrooms")
    .find({ wise_class_id: { $in: classIds } })
    .project<{ wise_student_id: string }>({ wise_student_id: 1, _id: 0 })
    .toArray();
  const studentIds = [...new Set(studentLinks.map((l) => l.wise_student_id))];
  if (studentIds.length === 0) return [];

  const rows = await db
    .collection<WiseStudentDoc>("wise_students")
    .find({ wise_student_id: { $in: studentIds }, ...ACTIVE_FILTER }, { projection: { raw: 0 } })
    .sort({ name: 1 })
    .toArray();
  const grades = await deriveStudentGrade(rows.map((r) => r.wise_student_id));
  return rows.map((r) => attachGrade(r, grades.get(r.wise_student_id)));
}

export async function countStudents(): Promise<number> {
  const db = await getMongoDb();
  return db.collection<WiseStudentDoc>("wise_students").countDocuments(ACTIVE_FILTER);
}

// ─── Sessions / classes ───────────────────────────────────────────────────

export interface ListSessionsOpts {
  teacherId?: string;       // wise_teacher_id
  studentId?: string;       // wise_student_id
  status?: string;          // UPCOMING / COMPLETED / CANCELLED
  search?: string;          // matches title/student name/teacher name
  page?: number;
  limit?: number;
  from?: Date;
  to?: Date;
}

export async function listSessions(opts: ListSessionsOpts = {}): Promise<{
  items: WiseCourseSessionDoc[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}> {
  const db = await getMongoDb();
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(Math.max(opts.limit ?? 12, 1), 100);
  const q: Record<string, unknown> = {};

  if (opts.teacherId) {
    // Either populated userId._id matches, or denormalized teacher_id field matches.
    q.$or = [{ "userId._id": opts.teacherId }, { teacher_id: opts.teacherId }, { userId: opts.teacherId }];
  }
  if (opts.studentId) {
    q["students._id"] = opts.studentId;
  }
  if (opts.status) {
    q.meetingStatus = opts.status.toUpperCase();
  }
  if (opts.search) {
    const re = new RegExp(escapeRegex(opts.search), "i");
    const ors = (q.$or as object[]) ?? [];
    q.$and = [
      ...(q.$or ? [{ $or: ors }] : []),
      { $or: [{ title: re }, { teacher_name: re }, { class_name: re }] },
    ];
    delete q.$or;
  }
  if (opts.from || opts.to) {
    const rng: Record<string, Date> = {};
    if (opts.from) rng.$gte = opts.from;
    if (opts.to) rng.$lte = opts.to;
    q.scheduled_start_time_dt = rng;
  }

  const col = db.collection<WiseCourseSessionDoc>("wise_course_sessions");
  const projection = {
    _id: 0,
    session_id: 1,
    meetingStatus: 1,
    title: 1,
    scheduledStartTime: 1,
    scheduledEndTime: 1,
    classId: 1,
    userId: 1,
    teacher_id: 1,
    teacher_name: 1,
    class_id: 1,
    class_name: 1,
    students: 1,
  };

  const [items, total] = await Promise.all([
    col
      .find(q, { projection })
      .sort({ scheduled_start_time_dt: -1, scheduledStartTime: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    col.countDocuments(q),
  ]);

  // Enrich sessions that carry only a bare classId string with the
  // (student_name, subject_raw) pair from wise_student_classrooms so the
  // frontend always has a real name to display.
  await enrichSessionsWithClassroom(items);

  return { items, total, page, limit, hasMore: page * limit < total };
}

// Sessions get a `__parsed` field after enrichment containing the parsed
// year_level + subject_code so the route layer can surface them as grade.
export interface ParsedClassroomInfo {
  yearLevel: string | null;
  subjectCode: string | null;
  country: string | null;
}

async function enrichSessionsWithClassroom(sessions: WiseCourseSessionDoc[]): Promise<void> {
  // Collect ALL class IDs from the result set — we'll enrich every session
  // with parsed info, not just the ones whose classId is a bare string.
  const allIds = new Set<string>();
  for (const s of sessions) {
    if (typeof s.classId === "string" && s.classId) allIds.add(s.classId);
    else if (s.classId && typeof s.classId === "object") allIds.add(s.classId._id);
    else if (s.class_id) allIds.add(s.class_id);
  }
  if (allIds.size === 0) return;

  const db = await getMongoDb();
  const [links, parsedDocs] = await Promise.all([
    db
      .collection<StudentClassroomDoc>("wise_student_classrooms")
      .find(
        { wise_class_id: { $in: [...allIds] } },
        { projection: { _id: 0, wise_class_id: 1, student_name: 1, classroom_subject_raw: 1, classroom_name: 1 } },
      )
      .toArray(),
    db
      .collection<WiseClassroomParsedDoc & { parsed?: { year_level?: number; subject?: string } }>("wise_classroom_parsed")
      .find({ wise_class_id: { $in: [...allIds] } })
      .project<{ wise_class_id: string; year_level: number | string | null; subject_code: string | null; country: string | null; parsed?: { year_level?: number; subject?: string } }>({
        wise_class_id: 1, year_level: 1, subject_code: 1, country: 1, parsed: 1, _id: 0,
      })
      .toArray(),
  ]);

  const linkByClass = new Map<string, StudentClassroomDoc>();
  for (const l of links) {
    if (!linkByClass.has(l.wise_class_id)) linkByClass.set(l.wise_class_id, l);
  }
  const parsedByClass = new Map<string, ParsedClassroomInfo>();
  for (const p of parsedDocs) {
    const yr = p.year_level ?? p.parsed?.year_level ?? null;
    const subj = p.subject_code ?? p.parsed?.subject ?? null;
    parsedByClass.set(p.wise_class_id, {
      yearLevel: yr != null ? String(yr) : null,
      subjectCode: subj ?? null,
      country: p.country ?? null,
    });
  }

  for (const s of sessions) {
    let cid: string | null = null;
    if (typeof s.classId === "string") cid = s.classId;
    else if (s.classId && typeof s.classId === "object") cid = s.classId._id;
    else if (s.class_id) cid = s.class_id;
    if (!cid) continue;

    // Fill in name/subject from classroom links when the session doc only
    // carries a bare classroom id.
    const link = linkByClass.get(cid);
    if (link) {
      const studentName = link.student_name ?? link.classroom_name ?? null;
      const subjectRaw = link.classroom_subject_raw ?? null;
      if (typeof s.classId === "string" || !s.classId) {
        s.classId = { _id: cid, name: studentName ?? undefined, subject: subjectRaw ?? undefined };
      } else if (s.classId && typeof s.classId === "object") {
        if (!s.classId.name && studentName) s.classId.name = studentName;
        if (!s.classId.subject && subjectRaw) s.classId.subject = subjectRaw;
      }
    }

    // Stash parsed info on the session for the route formatter to read.
    const parsed = parsedByClass.get(cid);
    if (parsed) {
      (s as WiseCourseSessionDoc & { __parsed?: ParsedClassroomInfo }).__parsed = parsed;
    }
  }
}

export async function getSessionById(sessionId: string): Promise<WiseCourseSessionDoc | null> {
  const db = await getMongoDb();
  const doc = await db
    .collection<WiseCourseSessionDoc>("wise_course_sessions")
    .findOne({ session_id: sessionId });
  if (doc) await enrichSessionsWithClassroom([doc]);
  return doc;
}

// ─── Existing AI evaluations (Tough Tongue snapshots) ─────────────────────

export async function getEvaluationForSession(wiseSessionId: string): Promise<EvaluationSessionDoc | null> {
  const db = await getMongoDb();
  return db
    .collection<EvaluationSessionDoc>("sessions")
    .findOne({ wise_session_id: wiseSessionId });
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
