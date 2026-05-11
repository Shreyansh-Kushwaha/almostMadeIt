// Shapes inferred from reading the Python CRM source (app/services/wise_directory_sync.py
// and app/modules/wise/controller.py). All IDs are stored as STRINGS — Mongo's
// ObjectId values are stringified by the upstream sync before insertion. We
// keep them as strings throughout to avoid accidental ObjectId boundary bugs.

export interface WiseTeacherDoc {
  _id?: string;
  wise_teacher_id: string;       // unique — primary key for us
  name: string | null;
  email: string | null;
  phone: string | null;
  classes: string[];             // array of wise_class_ids
  is_primary_anywhere?: boolean;
  is_active: boolean;
  last_synced_at?: Date;
  deactivated_at?: Date;
}

export interface WiseStudentDoc {
  _id?: string;
  wise_student_id: string;       // unique
  name: string | null;
  email: string | null;
  phone: string | null;
  classes: string[];             // array of wise_class_ids
  is_active: boolean;
  last_synced_at?: Date;
}

// wise_course_sessions — scheduled Wise lessons. Mixed shape because legacy
// rows can have classId/userId as either an embedded doc OR a bare string.
export interface WiseCourseSessionDoc {
  _id?: string;
  session_id: string;            // unique
  meetingStatus: "UPCOMING" | "COMPLETED" | "CANCELLED" | string;
  title: string;
  scheduledStartTime: string;    // ISO
  scheduledEndTime: string;
  scheduled_start_time_dt?: Date;
  // Populated form: { _id, name, subject? }
  // Legacy form: bare ObjectId string
  classId: { _id: string; name?: string; subject?: string } | string | null;
  userId: { _id: string; name: string } | string | null;
  // Denormalized fallbacks used when classId/userId are bare strings
  teacher_id?: string;
  teacher_name?: string;
  class_id?: string;
  class_name?: string;
  students?: Array<{ _id: string; name?: string }>;
  updated_at?: Date;
}

// classroom_teachers — (wise_class_id, wise_teacher_id) join, written by
// the Wise classroom-membership webhooks.
export interface ClassroomTeacherDoc {
  wise_class_id: string;
  wise_teacher_id: string;
  teacher_name?: string | null;
  teacher_email?: string | null;
  is_primary?: boolean;
}

// wise_student_classrooms — (wise_student_id, wise_class_id) join.
export interface StudentClassroomDoc {
  wise_student_id: string;
  wise_class_id: string;
  classroom_name?: string | null;
  classroom_subject_raw?: string | null;
  student_name?: string | null;
  student_email?: string | null;
}

// wise_classroom_parsed — parsed metadata for classroom subject codes like
// "UK-0324-Adam-0126-Maths-9".
export interface WiseClassroomParsedDoc {
  wise_class_id: string;
  raw_subject?: string;
  country?: string | null;
  year_level?: string | null;
  subject_code?: string | null;
  class_name?: string | null;
}

// Evaluation snapshot from the Tough Tongue pipeline (already in CRM Mongo).
export interface EvaluationSessionDoc {
  _id?: string;
  wise_session_id: string;
  teacher_id?: string;
  teacher_name?: string;
  student_id?: string;
  student_name?: string;
  summary?: string;
  transcript?: string;
  transcript_content?: string;
  status?: string;
  upload_status?: string;
  final_score?: number;
  tt_last_snapshot?: {
    status?: string;
    final_score?: number;
    summary?: string;
    [k: string]: unknown;
  };
  evaluation_results?: { final_score?: number; [k: string]: unknown };
  created_at?: Date;
  updated_at?: Date;
  scheduled_time?: string;
  start_time?: string;
}
