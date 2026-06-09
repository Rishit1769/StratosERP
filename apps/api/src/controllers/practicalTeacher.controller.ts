import { Request, Response } from 'express';
import * as ptService from '../services/practicalTeacher.service';

export async function getMySessions(req: Request, res: Response): Promise<void> {
  const facultyId = req.user!.id as number;
  const data = await ptService.getAssignedSessions(facultyId);
  res.json({ success: true, data });
}

export async function createSession(req: Request, res: Response): Promise<void> {
  const { subject_id, batch_id, session_date } = req.body;
  const facultyId = req.user!.id as number;
  if (!subject_id || !batch_id || !session_date) {
    res.status(400).json({ success: false, message: 'subject_id, batch_id, session_date required.' });
    return;
  }
  const id = await ptService.createLabSession({ subject_id, batch_id, session_date, assigned_faculty_id: facultyId });
  res.status(201).json({ success: true, data: { session_id: id } });
}

export async function completeSession(req: Request, res: Response): Promise<void> {
  const { session_id } = req.params;
  const facultyId = req.user!.id as number;
  await ptService.completeSession(Number(session_id), facultyId);
  res.json({ success: true, message: 'Session marked as completed.' });
}

export async function lockSession(req: Request, res: Response): Promise<void> {
  const { session_id } = req.params;
  const facultyId = req.user!.id as number;
  await ptService.lockSession(Number(session_id), facultyId);
  res.json({ success: true, message: 'Session locked.' });
}

export async function markAttendance(req: Request, res: Response): Promise<void> {
  const { session_id } = req.params;
  const { attendance } = req.body;
  const facultyId = req.user!.id as number;
  if (!Array.isArray(attendance)) {
    res.status(400).json({ success: false, message: 'attendance array required.' });
    return;
  }
  await ptService.markLabAttendance(Number(session_id), facultyId, attendance);
  res.json({ success: true, message: 'Attendance saved.' });
}

export async function getAttendance(req: Request, res: Response): Promise<void> {
  const { session_id } = req.params;
  const data = await ptService.getLabAttendance(Number(session_id));
  res.json({ success: true, data });
}

export async function upsertMarks(req: Request, res: Response): Promise<void> {
  const { session_id } = req.params;
  const { student_uid, subject_id, experiment_id, viva_marks, execution_marks, journal_marks, remarks } = req.body;
  const facultyId = req.user!.id as number;
  if (!student_uid || !subject_id || !experiment_id) {
    res.status(400).json({ success: false, message: 'student_uid, subject_id, experiment_id required.' });
    return;
  }
  await ptService.upsertLabMarks({
    student_uid, subject_id: Number(subject_id), experiment_id: Number(experiment_id),
    session_id: Number(session_id), viva_marks: Number(viva_marks) || 0,
    execution_marks: Number(execution_marks) || 0, journal_marks: Number(journal_marks) || 0,
    remarks, faculty_id: facultyId,
  });
  res.json({ success: true, message: 'Marks saved.' });
}

export async function getMarks(req: Request, res: Response): Promise<void> {
  const { session_id } = req.params;
  const data = await ptService.getLabMarksBySession(Number(session_id));
  res.json({ success: true, data });
}

export async function getExperiments(req: Request, res: Response): Promise<void> {
  const { subject_id } = req.params;
  const data = await ptService.getExperiments(Number(subject_id));
  res.json({ success: true, data });
}

export async function createExperiment(req: Request, res: Response): Promise<void> {
  const { subject_id, experiment_no, title, max_marks } = req.body;
  if (!subject_id || !experiment_no || !title || !max_marks) {
    res.status(400).json({ success: false, message: 'subject_id, experiment_no, title, max_marks required.' });
    return;
  }
  const id = await ptService.createExperiment({ subject_id, experiment_no, title, max_marks });
  res.status(201).json({ success: true, data: { experiment_id: id } });
}

export async function getBatches(req: Request, res: Response): Promise<void> {
  const { subject_id } = req.params;
  const data = await ptService.getLabBatches(Number(subject_id));
  res.json({ success: true, data });
}

export async function createBatch(req: Request, res: Response): Promise<void> {
  const { subject_id, batch_name, faculty_id } = req.body;
  if (!subject_id || !batch_name || !faculty_id) {
    res.status(400).json({ success: false, message: 'subject_id, batch_name, faculty_id required.' });
    return;
  }
  const id = await ptService.createLabBatch({ subject_id, batch_name, faculty_id });
  res.status(201).json({ success: true, data: { batch_id: id } });
}

export async function getSubmissions(req: Request, res: Response): Promise<void> {
  const { experiment_id } = req.params;
  const data = await ptService.getSubmissions(Number(experiment_id));
  res.json({ success: true, data });
}

export async function upsertSubmission(req: Request, res: Response): Promise<void> {
  const { student_uid, experiment_id, file_url, status } = req.body;
  if (!student_uid || !experiment_id || !status) {
    res.status(400).json({ success: false, message: 'student_uid, experiment_id, status required.' });
    return;
  }
  await ptService.upsertSubmission({ student_uid, experiment_id, file_url, status });
  res.json({ success: true, message: 'Submission updated.' });
}
