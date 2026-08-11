-- CreateTable: question-level exam marks for performance heatmaps
CREATE TABLE `question_mark` (
    `question_mark_id` INTEGER NOT NULL AUTO_INCREMENT,
    `student_uid` VARCHAR(30) NOT NULL,
    `subject_id` INTEGER NOT NULL,
    `exam_type` VARCHAR(10) NOT NULL,
    `question_no` INTEGER NOT NULL,
    `max_marks` INTEGER NOT NULL,
    `marks` DECIMAL(5, 2) NOT NULL,

    PRIMARY KEY (`question_mark_id`),
    UNIQUE INDEX `uq_question_mark` (`student_uid`, `subject_id`, `exam_type`, `question_no`),
    INDEX `idx_qm_subject_exam` (`subject_id`, `exam_type`),
    CONSTRAINT `fk_qm_student` FOREIGN KEY (`student_uid`) REFERENCES `student` (`uid`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_qm_subject` FOREIGN KEY (`subject_id`) REFERENCES `subject` (`subject_id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
