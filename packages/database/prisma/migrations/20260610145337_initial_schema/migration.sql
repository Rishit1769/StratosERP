-- CreateTable
CREATE TABLE `subject` (
    `subject_id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `semester_level` INTEGER NOT NULL,
    `has_lab` BOOLEAN NOT NULL DEFAULT false,
    `lab_marks_weight` INTEGER NULL,

    PRIMARY KEY (`subject_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `global_config` (
    `config_id` INTEGER NOT NULL AUTO_INCREMENT,
    `active_semester_type` VARCHAR(4) NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,

    PRIMARY KEY (`config_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `faculty` (
    `faculty_id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `email_id` VARCHAR(150) NOT NULL,
    `designation_role` VARCHAR(30) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL DEFAULT '',
    `is_hod` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `email_id`(`email_id`),
    PRIMARY KEY (`faculty_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_user` (
    `admin_id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `email_id` VARCHAR(150) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,

    UNIQUE INDEX `email_id`(`email_id`),
    PRIMARY KEY (`admin_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student` (
    `uid` VARCHAR(30) NOT NULL,
    `email_id` VARCHAR(150) NOT NULL,
    `current_semester` INTEGER NOT NULL,
    `academic_year` VARCHAR(10) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL DEFAULT '',

    UNIQUE INDEX `email_id`(`email_id`),
    PRIMARY KEY (`uid`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_subject_record` (
    `student_uid` VARCHAR(30) NOT NULL,
    `subject_id` INTEGER NOT NULL,
    `status` VARCHAR(10) NOT NULL,
    `marks` DECIMAL(5, 2) NULL,

    INDEX `idx_ssr_student`(`student_uid`),
    INDEX `idx_ssr_subject`(`subject_id`),
    PRIMARY KEY (`student_uid`, `subject_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `timetable_slot` (
    `slot_id` INTEGER NOT NULL AUTO_INCREMENT,
    `day_of_week` VARCHAR(10) NOT NULL,
    `start_time` TIME(0) NOT NULL,
    `end_time` TIME(0) NOT NULL,
    `subject_id` INTEGER NOT NULL,
    `faculty_id` INTEGER NOT NULL,

    INDEX `idx_slot_faculty`(`faculty_id`),
    INDEX `idx_slot_subject`(`subject_id`),
    PRIMARY KEY (`slot_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lecture_log` (
    `log_id` INTEGER NOT NULL AUTO_INCREMENT,
    `slot_id` INTEGER NOT NULL,
    `syllabus_topics_taught` TEXT NULL,
    `additional_topics_taught` TEXT NULL,
    `execution_date` DATE NOT NULL,

    INDEX `idx_log_slot`(`slot_id`),
    INDEX `idx_log_date`(`execution_date`),
    UNIQUE INDEX `uq_log_slot_date`(`slot_id`, `execution_date`),
    PRIMARY KEY (`log_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `grievance_ticket` (
    `ticket_id` INTEGER NOT NULL AUTO_INCREMENT,
    `student_uid` VARCHAR(30) NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `description` TEXT NOT NULL,
    `evidence` TEXT NULL,
    `status` VARCHAR(15) NOT NULL DEFAULT 'Open',
    `assigned_authority_id` INTEGER NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_grievance_student`(`student_uid`),
    INDEX `idx_grievance_status`(`status`),
    INDEX `fk_grievance_authority`(`assigned_authority_id`),
    PRIMARY KEY (`ticket_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leave_substitution` (
    `leave_id` INTEGER NOT NULL AUTO_INCREMENT,
    `absent_faculty_id` INTEGER NOT NULL,
    `substitute_faculty_id` INTEGER NOT NULL,
    `leave_date` DATE NOT NULL,
    `type` VARCHAR(15) NOT NULL,

    INDEX `idx_leave_absent`(`absent_faculty_id`),
    INDEX `idx_leave_date`(`leave_date`),
    INDEX `fk_leave_substitute`(`substitute_faculty_id`),
    PRIMARY KEY (`leave_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notice_board` (
    `notice_id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `target_audience` VARCHAR(15) NOT NULL,
    `ai_filter_tags` JSON NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`notice_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lab_batch` (
    `batch_id` INTEGER NOT NULL AUTO_INCREMENT,
    `subject_id` INTEGER NOT NULL,
    `batch_name` VARCHAR(20) NOT NULL,
    `faculty_id` INTEGER NOT NULL,

    INDEX `fk_batch_faculty`(`faculty_id`),
    UNIQUE INDEX `uq_subject_batch`(`subject_id`, `batch_name`),
    PRIMARY KEY (`batch_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `experiment` (
    `experiment_id` INTEGER NOT NULL AUTO_INCREMENT,
    `subject_id` INTEGER NOT NULL,
    `experiment_no` INTEGER NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `max_marks` INTEGER NOT NULL,

    UNIQUE INDEX `uq_experiment`(`subject_id`, `experiment_no`),
    PRIMARY KEY (`experiment_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lab_session` (
    `session_id` INTEGER NOT NULL AUTO_INCREMENT,
    `subject_id` INTEGER NOT NULL,
    `batch_id` INTEGER NOT NULL,
    `session_date` DATE NOT NULL,
    `assigned_faculty_id` INTEGER NOT NULL,
    `original_faculty_id` INTEGER NULL,
    `is_substitute` BOOLEAN NOT NULL DEFAULT false,
    `status` VARCHAR(15) NOT NULL DEFAULT 'Pending',

    INDEX `idx_lab_session_subject_date`(`subject_id`, `session_date`),
    INDEX `fk_session_batch`(`batch_id`),
    INDEX `fk_session_faculty`(`assigned_faculty_id`),
    INDEX `idx_lab_sess_date`(`subject_id`, `session_date`),
    PRIMARY KEY (`session_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lab_attendance` (
    `attendance_id` INTEGER NOT NULL AUTO_INCREMENT,
    `session_id` INTEGER NOT NULL,
    `student_uid` VARCHAR(30) NOT NULL,
    `status` VARCHAR(10) NOT NULL,

    INDEX `idx_lab_attendance_session`(`session_id`),
    INDEX `fk_lab_attendance_student`(`student_uid`),
    INDEX `idx_lab_att_sess`(`session_id`),
    UNIQUE INDEX `uq_lab_attendance`(`session_id`, `student_uid`),
    PRIMARY KEY (`attendance_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lab_marks` (
    `mark_id` INTEGER NOT NULL AUTO_INCREMENT,
    `student_uid` VARCHAR(30) NOT NULL,
    `subject_id` INTEGER NOT NULL,
    `experiment_id` INTEGER NOT NULL,
    `session_id` INTEGER NOT NULL,
    `viva_marks` DECIMAL(5, 2) NULL,
    `execution_marks` DECIMAL(5, 2) NULL,
    `journal_marks` DECIMAL(5, 2) NULL,
    `total_marks` DECIMAL(5, 2) NULL,
    `remarks` TEXT NULL,
    `updated_by` INTEGER NULL,
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_lab_marks_student`(`student_uid`),
    INDEX `fk_lab_marks_experiment`(`experiment_id`),
    INDEX `fk_lab_marks_faculty`(`updated_by`),
    INDEX `fk_lab_marks_session`(`session_id`),
    INDEX `fk_lab_marks_subject`(`subject_id`),
    INDEX `idx_lab_marks_stu`(`student_uid`),
    UNIQUE INDEX `uq_lab_marks`(`student_uid`, `experiment_id`),
    PRIMARY KEY (`mark_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lab_submission` (
    `submission_id` INTEGER NOT NULL AUTO_INCREMENT,
    `student_uid` VARCHAR(30) NOT NULL,
    `experiment_id` INTEGER NOT NULL,
    `file_url` TEXT NULL,
    `submitted_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `status` VARCHAR(15) NULL,

    INDEX `fk_submission_experiment`(`experiment_id`),
    INDEX `fk_submission_student`(`student_uid`),
    PRIMARY KEY (`submission_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `aicte_points` (
    `record_id` INTEGER NOT NULL AUTO_INCREMENT,
    `student_uid` VARCHAR(30) NOT NULL,
    `activity` VARCHAR(255) NOT NULL,
    `points` INTEGER NOT NULL,
    `awarded_by` INTEGER NOT NULL,
    `awarded_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_aicte_student`(`student_uid`),
    INDEX `fk_aicte_faculty`(`awarded_by`),
    INDEX `idx_aicte_stu`(`student_uid`),
    PRIMARY KEY (`record_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tg_assignment` (
    `assignment_id` INTEGER NOT NULL AUTO_INCREMENT,
    `faculty_id` INTEGER NOT NULL,
    `student_uid` VARCHAR(30) NOT NULL,
    `semester` INTEGER NOT NULL,

    INDEX `idx_tga_faculty`(`faculty_id`),
    INDEX `idx_tga_student`(`student_uid`),
    INDEX `idx_tga_fac`(`faculty_id`),
    INDEX `idx_tga_stu`(`student_uid`),
    UNIQUE INDEX `uq_tga`(`faculty_id`, `student_uid`, `semester`),
    PRIMARY KEY (`assignment_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
