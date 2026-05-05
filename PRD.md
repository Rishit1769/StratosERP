Product Requirements Document (PRD): StratosERP Phase-I
1. Project Overview & Scope

Repository: rishit1769/stratoserp
StratosERP (Phase-I) focuses on establishing the foundational infrastructure for a comprehensive, standalone institutional educational platform. This architecture explicitly omits multi-tenant SaaS complexities in favor of a strictly isolated, single-institution model ensuring maximum data privacy and operational control. The phase prioritizes robust Role-Based Access Control (RBAC), algorithmic logistics, and seamless academic workflows.

Project Stakeholders:

    Development: Rishit Singh, Pranjali Khade

    Mentorship: Mr. Loukik Salvi

2. Technology Stack

(As referenced in your repository and image_03d7c0.png)

    Frontend: Next.js 15, TypeScript, Tailwind CSS

    Backend: Node.js, Express (RESTful APIs)

    Database: MySQL 8.0+ (Strictly relational data integrity)

    Object Storage: MinIO (S3-compatible, for assets and academic resources)

    AI/ML: Gemini API (Automated parsing, triage, and reporting)


3. Role-Based Access & Core Workflows (Phase-I)

The system operates on 7 distinct modules, each defined by strict scopes and data privileges:

    Admin: The global architect. Manages bulk data ingestion (CSV to MySQL), defines global thresholds (AICTE points, active ODD/EVEN semesters), triggers batch progressions, and oversees automated alumni transitions. Also handles infrastructure logic like exam seating matrices and grievance triage oversight.

    HOD (Head of Department): Department-level overseer. Assigns faculty to subjects and secondary roles (Class Incharge, TG). Accesses aggregated branch analytics and serves as the primary escalation point for academic disputes.

    Class Incharge: Division-level monitor. Tracks early alerts via an AI dashboard (flagging low attendance or dipping GPAs), manages digital PTM portfolios, and oversees progression readiness for their assigned batch.

    Subject Incharge: Granular academic authority. Handles internal/suppli marks, executes smart attendance, uploads study materials to MinIO, and logs daily lecture execution against the master syllabus.

    Practical Teacher (Lab Instructor): Manages experiment-level marking (Viva, Execution, Journal). Controls locked, session-based attendance and grading for specific lab batches (A1, A2, etc.), ensuring independent practical tracking.

    Teacher Guardian (TG): Personal mentor for a ~20-student cohort. Evaluates AICTE points, resolves interpersonal grievances routed by Gemini, and utilizes AI to generate personalized "Areas of Improvement" reports for parents.

    Student: The end-user. Accesses a central dashboard tracking active subjects, [KT]/[SUPPLI] backlogs, timetable locators, and MinIO-hosted study materials. Identified strictly by Institutional Email and a standardized UID ([StartYear]-[ClassDivision RollNo]-[EndYear]).

4. System Architecture & AI Integration

    Database: 16 structured MySQL tables tracking everything from global_config and student_subject_record to lab_session and grievance_ticket. Relational constraints ensure zero orphaned records.

    Gemini AI Layer:

        Routes student grievances to the correct authority (Admin, HOD, TG, etc.).

        Auto-drafts formal institutional notices based on data thresholds (e.g., low attendance warnings).

        Generates "Areas of Improvement" summaries by analyzing grades and attendance.

    MinIO Asset Pipeline: Handles all binary data, including student submissions, formal notices, and study material PDFs.