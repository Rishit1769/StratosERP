-- Add global threshold fields to global_config (docs: Admin Threshold Definition)
ALTER TABLE `global_config`
  ADD COLUMN `max_aicte_points` INT NOT NULL DEFAULT 100,
  ADD COLUMN `min_attendance_percent` INT NOT NULL DEFAULT 75;

-- Add fee status to student (docs: Student dashboard shows fee status)
ALTER TABLE `student`
  ADD COLUMN `fee_status` VARCHAR(20) NOT NULL DEFAULT 'CLEAR';

-- CreateTable
CREATE TABLE `study_material` (
    `material_id` INTEGER NOT NULL AUTO_INCREMENT,
    `subject_id` INTEGER NOT NULL,
    `file_key` VARCHAR(500) NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_type` VARCHAR(100) NULL,
    `bucket_name` VARCHAR(100) NOT NULL DEFAULT 'study-materials',
    `uploaded_by` INTEGER NULL,
    `uploaded_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`material_id`),
    INDEX `idx_material_subject` (`subject_id`),
    INDEX `idx_material_uploader` (`uploaded_by`),
    CONSTRAINT `fk_material_subject` FOREIGN KEY (`subject_id`) REFERENCES `subject` (`subject_id`) ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT `fk_material_faculty` FOREIGN KEY (`uploaded_by`) REFERENCES `faculty` (`faculty_id`) ON DELETE SET NULL ON UPDATE RESTRICT
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
