export type RoleSlug =
  | "admin"
  | "hod"
  | "class-incharge"
  | "subject-incharge"
  | "practical-teacher"
  | "teacher-guardian"
  | "student";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface ActionBlueprint {
  id: string;
  label: string;
  description: string;
  method: HttpMethod;
  path: string;
  body?: Record<string, unknown>;
}

export interface RoleBlueprint {
  slug: RoleSlug;
  roleName: string;
  strapline: string;
  accentFrom: string;
  accentTo: string;
  checkpoints: string[];
  kpis: Array<{
    label: string;
    value: string;
    hint: string;
  }>;
  actions: ActionBlueprint[];
}

export const roleBlueprints: RoleBlueprint[] = [
  {
    slug: "admin",
    roleName: "Admin",
    strapline: "Global configuration, governance, data ingestion, and lifecycle automation.",
    accentFrom: "#f97316",
    accentTo: "#fb7185",
    checkpoints: [
      "Set active semester window and academic policy thresholds.",
      "Ingest student, faculty, subject, and timetable data at scale.",
      "Run batch progression and alumni transition workflows.",
      "Generate exam seating and invigilation matrices.",
    ],
    kpis: [
      { label: "Active Semester", value: "ODD", hint: "Driven by global config" },
      { label: "Rows Ingested", value: "12.4k", hint: "CSV imports this cycle" },
      { label: "Students Progressed", value: "428", hint: "Auto progression run" },
    ],
    actions: [
      { id: "admin-config-get", label: "Fetch Global Config", description: "Read active semester and date range.", method: "GET", path: "/api/admin/config" },
      {
        id: "admin-config-set",
        label: "Set Global Config",
        description: "Update active semester and calendar boundaries.",
        method: "POST",
        path: "/api/admin/config",
        body: {
          active_semester_type: "ODD",
          start_date: "2026-07-15",
          end_date: "2026-12-10",
        },
      },
      { id: "admin-analytics", label: "Macro Analytics", description: "View institution-level stats.", method: "GET", path: "/api/admin/analytics" },
      { id: "admin-progress", label: "Trigger Batch Progression", description: "Run semester transition progression.", method: "POST", path: "/api/admin/batch-progression" },
      {
        id: "admin-exam-seating",
        label: "Generate Exam Seating",
        description: "Build seating allocation from classroom constraints.",
        method: "POST",
        path: "/api/admin/exam-seating",
        body: {
          classrooms: [
            { room: "A-301", capacity: 60 },
            { room: "A-302", capacity: 48 },
          ],
        },
      },
      {
        id: "admin-notice-ai",
        label: "Generate AI Notice",
        description: "Draft a formal notice using Gemini context.",
        method: "POST",
        path: "/api/admin/notices/ai",
        body: {
          context: "Send low attendance warning to Semester 5 students below 75% attendance.",
          target_audience: "INSTITUTE",
        },
      },
    ],
  },
  {
    slug: "hod",
    roleName: "HOD",
    strapline: "Department analytics, faculty deployment, and grievance escalation control.",
    accentFrom: "#0f766e",
    accentTo: "#2dd4bf",
    checkpoints: [
      "Track branch-wide academics, attendance, and outcomes.",
      "Assign subject ownership and secondary faculty roles.",
      "Resolve escalated grievances and schedule leave substitutions.",
      "Broadcast branch notices with AI-assisted drafting.",
    ],
    kpis: [
      { label: "Branch Avg Marks", value: "66.4", hint: "Current semester" },
      { label: "Escalated Tickets", value: "11", hint: "Need HOD action" },
      { label: "Faculty Assigned", value: "34", hint: "Across active slots" },
    ],
    actions: [
      { id: "hod-analytics", label: "Branch Analytics", description: "Get summary and semester distribution.", method: "GET", path: "/api/hod/analytics" },
      { id: "hod-faculty", label: "Faculty Roster", description: "List branch faculty and designations.", method: "GET", path: "/api/hod/faculty" },
      {
        id: "hod-assign-subject",
        label: "Assign Subject",
        description: "Map a subject to selected faculty.",
        method: "POST",
        path: "/api/hod/faculty/assign-subject",
        body: { subject_id: 1, faculty_id: 2 },
      },
      {
        id: "hod-assign-role",
        label: "Assign Faculty Role",
        description: "Set Class Incharge, Subject Incharge, or TG designation.",
        method: "POST",
        path: "/api/hod/faculty/assign-role",
        body: { faculty_id: 2, role: "Class Incharge" },
      },
      {
        id: "hod-leave",
        label: "Schedule Leave Substitution",
        description: "Plan planned/emergency substitute assignment.",
        method: "POST",
        path: "/api/hod/leave",
        body: {
          absent_faculty_id: 4,
          substitute_faculty_id: 6,
          leave_date: "2026-05-15",
          type: "Planned",
        },
      },
      {
        id: "hod-notice-ai",
        label: "AI Branch Notice",
        description: "Draft a branch-level notice with AI.",
        method: "POST",
        path: "/api/hod/notices/ai",
        body: { context: "Attendance intervention for 3rd year classes this week." },
      },
    ],
  },
  {
    slug: "class-incharge",
    roleName: "Class Incharge",
    strapline: "Division-level academic vigilance, PTM workflows, and progression readiness.",
    accentFrom: "#334155",
    accentTo: "#0ea5e9",
    checkpoints: [
      "Monitor class analytics and identify at-risk students.",
      "Review detailed portfolios and trigger PTM report generation.",
      "Track progression readiness and unresolved backlog patterns.",
      "Publish class notices and interventions.",
    ],
    kpis: [
      { label: "At-Risk Students", value: "19", hint: "Based on KT and marks" },
      { label: "PTM Reports", value: "52", hint: "Generated this month" },
      { label: "Readiness Score", value: "81%", hint: "Progression health" },
    ],
    actions: [
      { id: "ci-analytics", label: "Class Analytics", description: "View aggregate class performance metrics.", method: "GET", path: "/api/class-incharge/analytics" },
      { id: "ci-risk", label: "At-Risk Students", description: "List students with academic risk indicators.", method: "GET", path: "/api/class-incharge/students/at-risk" },
      { id: "ci-students", label: "All Students", description: "Get full student list with backlog count.", method: "GET", path: "/api/class-incharge/students" },
      {
        id: "ci-portfolio",
        label: "Student Portfolio",
        description: "Open full PTM-ready profile for a UID.",
        method: "GET",
        path: "/api/class-incharge/students/2023-CSE-A-01-2027/portfolio",
      },
      {
        id: "ci-ptm",
        label: "Generate PTM Report",
        description: "AI-assisted PTM summary generation.",
        method: "GET",
        path: "/api/class-incharge/students/2023-CSE-A-01-2027/ptm-report",
      },
      {
        id: "ci-notice",
        label: "Create Class Notice",
        description: "Publish notice to class audience.",
        method: "POST",
        path: "/api/class-incharge/notices",
        body: {
          title: "Mock interview drive on Friday at 10:00 AM",
          ai_filter_tags: ["CAREER", "URGENT"],
        },
      },
    ],
  },
  {
    slug: "subject-incharge",
    roleName: "Subject Incharge",
    strapline: "Subject-level marks, attendance, lecture logs, and syllabus pacing analytics.",
    accentFrom: "#7c3aed",
    accentTo: "#22d3ee",
    checkpoints: [
      "Manage marks and supplementary remediation records.",
      "Capture slot-based attendance using rapid toggles.",
      "Log post-lecture execution details for syllabus traceability.",
      "Generate syllabus pacing insights with AI.",
    ],
    kpis: [
      { label: "Subjects Owned", value: "5", hint: "Current assignment" },
      { label: "Attendance Filled", value: "94%", hint: "Lecture sessions" },
      { label: "Syllabus Pace", value: "On Track", hint: "AI analysis" },
    ],
    actions: [
      { id: "si-subjects", label: "My Subjects", description: "List all assigned subjects.", method: "GET", path: "/api/subject-incharge/subjects" },
      { id: "si-slot", label: "Active Slot", description: "Resolve current timetable slot by system time.", method: "GET", path: "/api/subject-incharge/slot/active" },
      {
        id: "si-attendance",
        label: "Mark Attendance",
        description: "Submit attendance for present and absent UID sets.",
        method: "POST",
        path: "/api/subject-incharge/attendance",
        body: {
          slot_id: 1,
          date: "2026-05-05",
          present_uids: ["2023-CSE-A-01-2027", "2023-CSE-A-02-2027"],
          absent_uids: ["2023-CSE-A-03-2027"],
        },
      },
      {
        id: "si-marks",
        label: "Save Internal Marks",
        description: "Insert or update marks for a student-subject pair.",
        method: "POST",
        path: "/api/subject-incharge/marks",
        body: {
          student_uid: "2023-CSE-A-01-2027",
          subject_id: 1,
          marks: 71,
        },
      },
      {
        id: "si-lecture",
        label: "Log Lecture",
        description: "Record syllabus and additional topics delivered.",
        method: "POST",
        path: "/api/subject-incharge/lecture-log",
        body: {
          slot_id: 1,
          syllabus_topics_taught: "Stacks, recursion, and DFS intro",
          additional_topics_taught: "Complexity recap",
          execution_date: "2026-05-05",
        },
      },
      {
        id: "si-analysis",
        label: "Run Syllabus Analysis",
        description: "Trigger AI pacing report against syllabus PDF.",
        method: "POST",
        path: "/api/subject-incharge/syllabus-analysis",
        body: {
          subject_id: 1,
          syllabus_pdf_url: "https://example.com/syllabus.pdf",
          lecture_logs_summary: "Covered Unit 1 fully and Unit 2 till sorting.",
        },
      },
    ],
  },
  {
    slug: "practical-teacher",
    roleName: "Practical Teacher",
    strapline: "Lab session ownership, attendance integrity, marks, and submission control.",
    accentFrom: "#14532d",
    accentTo: "#4ade80",
    checkpoints: [
      "Create and manage session-based practical executions.",
      "Capture attendance and experiment-level marks per student.",
      "Lock completed sessions to preserve audit integrity.",
      "Track submissions and batch-level performance.",
    ],
    kpis: [
      { label: "Sessions This Week", value: "14", hint: "Across all assigned batches" },
      { label: "Locked Sessions", value: "39", hint: "Immutable records" },
      { label: "Submission Compliance", value: "88%", hint: "On-time + submitted" },
    ],
    actions: [
      { id: "pt-sessions", label: "My Lab Sessions", description: "Fetch sessions assigned to current faculty.", method: "GET", path: "/api/practical-teacher/sessions" },
      {
        id: "pt-create-session",
        label: "Create Session",
        description: "Open a new practical session for subject and batch.",
        method: "POST",
        path: "/api/practical-teacher/sessions",
        body: { subject_id: 1, batch_id: 1, session_date: "2026-05-06" },
      },
      {
        id: "pt-attendance",
        label: "Save Session Attendance",
        description: "Persist attendance for a specific lab session.",
        method: "POST",
        path: "/api/practical-teacher/sessions/1/attendance",
        body: {
          attendance: [
            { student_uid: "2023-CSE-A-01-2027", status: "Present" },
            { student_uid: "2023-CSE-A-02-2027", status: "Absent" },
          ],
        },
      },
      {
        id: "pt-marks",
        label: "Upsert Practical Marks",
        description: "Save experiment-level viva, execution, and journal marks.",
        method: "POST",
        path: "/api/practical-teacher/sessions/1/marks",
        body: {
          student_uid: "2023-CSE-A-01-2027",
          subject_id: 1,
          experiment_id: 1,
          viva_marks: 8,
          execution_marks: 17,
          journal_marks: 9,
          remarks: "Good command of procedure",
        },
      },
      { id: "pt-experiments", label: "List Experiments", description: "Fetch practical experiment catalog for subject.", method: "GET", path: "/api/practical-teacher/experiments/1" },
      {
        id: "pt-submission",
        label: "Upsert Submission",
        description: "Track practical file submission state per experiment.",
        method: "POST",
        path: "/api/practical-teacher/submissions",
        body: {
          student_uid: "2023-CSE-A-01-2027",
          experiment_id: 1,
          file_url: "https://storage.local/exp1.pdf",
          status: "Submitted",
        },
      },
    ],
  },
  {
    slug: "teacher-guardian",
    roleName: "Teacher Guardian",
    strapline: "Mentorship cohorts, AICTE points, and student-centric grievance resolution.",
    accentFrom: "#be123c",
    accentTo: "#fb923c",
    checkpoints: [
      "Track mentee dashboards and unresolved backlog risks.",
      "Award and audit AICTE point activities.",
      "Resolve interpersonal grievances routed by AI.",
      "Generate improvement reports for PTM conversations.",
    ],
    kpis: [
      { label: "Mentee Cohort", value: "20", hint: "Current semester assignment" },
      { label: "Points Awarded", value: "312", hint: "Current cycle" },
      { label: "Open Tickets", value: "6", hint: "Awaiting TG action" },
    ],
    actions: [
      { id: "tg-mentees", label: "List Mentees", description: "Get assigned mentee roster with backlog counts.", method: "GET", path: "/api/teacher-guardian/mentees" },
      { id: "tg-portfolio", label: "Mentee Portfolio", description: "Open a student mentorship portfolio.", method: "GET", path: "/api/teacher-guardian/mentees/2023-CSE-A-01-2027" },
      { id: "tg-report", label: "Improvement Report", description: "Generate AI-driven areas of improvement report.", method: "GET", path: "/api/teacher-guardian/mentees/2023-CSE-A-01-2027/improvement-report" },
      {
        id: "tg-aicte-award",
        label: "Award AICTE Points",
        description: "Add co-curricular credit entry for a mentee.",
        method: "POST",
        path: "/api/teacher-guardian/aicte-points",
        body: {
          student_uid: "2023-CSE-A-01-2027",
          activity: "Hackathon finalist",
          points: 15,
        },
      },
      { id: "tg-grievances", label: "Assigned Grievances", description: "View open grievances mapped to TG.", method: "GET", path: "/api/teacher-guardian/grievances" },
      {
        id: "tg-resolve",
        label: "Resolve Grievance",
        description: "Mark grievance as resolved with authorization check.",
        method: "PUT",
        path: "/api/teacher-guardian/grievances/1/resolve",
      },
    ],
  },
  {
    slug: "student",
    roleName: "Student",
    strapline: "Self-service academic dashboard, timetable, grievances, materials, and lab marks.",
    accentFrom: "#1d4ed8",
    accentTo: "#6366f1",
    checkpoints: [
      "Track marks, attendance signals, and backlog status badges.",
      "Use timetable and live faculty locator in real-time.",
      "Submit grievances and follow routing outcomes.",
      "Access notices, materials, and lab evaluation records.",
    ],
    kpis: [
      { label: "Attendance", value: "78%", hint: "Semester average" },
      { label: "Backlog Subjects", value: "2", hint: "KT/SUPPLI active" },
      { label: "AICTE Points", value: "94", hint: "Student total" },
    ],
    actions: [
      { id: "st-dashboard", label: "Dashboard", description: "Fetch student profile and subject records.", method: "GET", path: "/api/student/dashboard" },
      { id: "st-timetable", label: "Timetable", description: "Fetch full weekly timetable for student semester.", method: "GET", path: "/api/student/timetable" },
      { id: "st-locator", label: "Live Faculty Locator", description: "Resolve currently active faculty slots.", method: "GET", path: "/api/student/faculty-locator" },
      {
        id: "st-grievance-submit",
        label: "Submit Grievance",
        description: "Create ticket and trigger AI routing.",
        method: "POST",
        path: "/api/student/grievances",
        body: {
          category: "Interpersonal/peer conflict",
          description: "Repeated disruption during practical sessions.",
          evidence: "https://example.com/evidence.png",
        },
      },
      { id: "st-grievances", label: "My Grievances", description: "List ticket history and statuses.", method: "GET", path: "/api/student/grievances" },
      { id: "st-lab", label: "Lab Marks", description: "View experiment-wise practical marks.", method: "GET", path: "/api/student/lab-marks" },
    ],
  },
];

export const roleBySlug: Record<RoleSlug, RoleBlueprint> = roleBlueprints.reduce(
  (acc, role) => {
    acc[role.slug] = role;
    return acc;
  },
  {} as Record<RoleSlug, RoleBlueprint>
);
