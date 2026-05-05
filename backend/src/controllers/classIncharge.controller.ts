import { Request, Response } from 'express';
import * as ciService from '../services/classIncharge.service';
import * as geminiService from '../services/gemini.service';

export async function getClassAnalytics(req: Request, res: Response): Promise<void> {
  const data = await ciService.getClassAnalytics();
  res.json({ success: true, data });
}

export async function getAtRiskStudents(req: Request, res: Response): Promise<void> {
  const data = await ciService.getAtRiskStudents();
  res.json({ success: true, data });
}

export async function getStudentPortfolio(req: Request, res: Response): Promise<void> {
  const { uid } = req.params;
  const data = await ciService.getStudentPortfolio(uid);
  if (!data) { res.status(404).json({ success: false, message: 'Student not found.' }); return; }
  res.json({ success: true, data });
}

export async function getAllStudents(req: Request, res: Response): Promise<void> {
  const data = await ciService.getAllStudents();
  res.json({ success: true, data });
}

export async function getProgressionReadiness(req: Request, res: Response): Promise<void> {
  const data = await ciService.getProgressionReadiness();
  res.json({ success: true, data });
}

export async function getNotices(req: Request, res: Response): Promise<void> {
  const data = await ciService.getNoticesForClass();
  res.json({ success: true, data });
}

export async function createNotice(req: Request, res: Response): Promise<void> {
  const { title, ai_filter_tags } = req.body;
  if (!title) { res.status(400).json({ success: false, message: 'title required.' }); return; }
  const id = await ciService.createClassNotice(title, ai_filter_tags);
  res.status(201).json({ success: true, data: { notice_id: id } });
}

export async function generatePTMReport(req: Request, res: Response): Promise<void> {
  const { uid } = req.params;
  const portfolio = await ciService.getStudentPortfolio(uid);
  if (!portfolio) { res.status(404).json({ success: false, message: 'Student not found.' }); return; }
  const report = await geminiService.generatePTMReport(portfolio);
  res.json({ success: true, data: { uid, report } });
}
