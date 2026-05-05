import { getGeminiModel } from '../config/gemini';

// ── Grievance Routing ─────────────────────────────────────────

export async function routeGrievance(
  category: string,
  description: string
): Promise<{ authority: string; reasoning: string }> {
  const model = getGeminiModel();
  const prompt = `
You are an institutional ERP grievance routing system for a college.
Given the following student grievance, determine the correct authority to handle it.

Authorities available:
- Admin: For institutional/infrastructure issues (fees, civil issues, college policy)
- HOD: For academic marks disputes unresolved by Subject Incharge, departmental issues
- ClassIncharge: For peer conflicts, class-level issues, attendance concerns
- SubjectIncharge: For subject-specific academic marks disputes
- TG: For interpersonal/peer conflicts, personal mentorship issues

Category: ${category}
Description: ${description}

Respond ONLY in JSON format:
{"authority": "one of: Admin|HOD|ClassIncharge|SubjectIncharge|TG", "reasoning": "brief explanation"}
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    // Extract JSON safely
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { authority: 'Admin', reasoning: 'Unable to determine routing.' };
    return JSON.parse(jsonMatch[0]);
  } catch {
    return { authority: 'Admin', reasoning: 'AI routing unavailable, defaulted to Admin.' };
  }
}

// ── Institutional Notice Generation ───────────────────────────

export async function generateInstitutionalNotice(
  context: string
): Promise<{ title: string; body: string; tags: string[] }> {
  const model = getGeminiModel();
  const prompt = `
You are an institutional notice drafting system for a college ERP.
Draft a formal institutional notice based on the following context:

Context: ${context}

Respond ONLY in JSON format:
{
  "title": "concise notice title",
  "body": "formal notice body text (2-4 sentences)",
  "tags": ["tag1", "tag2"] (relevant tags like: urgent, attendance, exam, hackathon, scholarship, etc.)
}
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { title: context, body: context, tags: [] };
    return JSON.parse(jsonMatch[0]);
  } catch {
    return { title: context, body: context, tags: [] };
  }
}

// ── Syllabus Pacing Analyzer ──────────────────────────────────

export async function analyzeSyllabusPacing(
  lectureLogs: string,
  syllabusPdfUrl: string
): Promise<{ pacing_status: string; percentage_covered: number; recommendation: string }> {
  const model = getGeminiModel();
  const prompt = `
You are an academic syllabus pacing analyzer for a college ERP.
Analyze how much syllabus has been covered based on the lecture logs provided.

Lecture Logs Summary: ${lectureLogs}
Syllabus Reference: ${syllabusPdfUrl}

Respond ONLY in JSON format:
{
  "pacing_status": "On Track | Behind Schedule | Ahead of Schedule",
  "percentage_covered": <number 0-100>,
  "recommendation": "brief actionable recommendation for the faculty"
}
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { pacing_status: 'Unknown', percentage_covered: 0, recommendation: 'Unable to analyze.' };
    return JSON.parse(jsonMatch[0]);
  } catch {
    return { pacing_status: 'Unknown', percentage_covered: 0, recommendation: 'AI analysis unavailable.' };
  }
}

// ── Areas of Improvement Report ───────────────────────────────

export async function generateAreasOfImprovement(portfolio: any): Promise<string> {
  const model = getGeminiModel();
  const prompt = `
You are a Teacher Guardian AI assistant for a college ERP.
Generate a personalized "Areas of Improvement" report for a student based on their academic portfolio.

Student UID: ${portfolio.student?.uid}
Semester: ${portfolio.student?.current_semester}
Academic Year: ${portfolio.student?.academic_year}

Subjects & Marks:
${JSON.stringify(portfolio.subjects, null, 2)}

AICTE Points:
${JSON.stringify(portfolio.aicte_points, null, 2)}

Active Grievances: ${portfolio.grievances?.filter((g: any) => g.status === 'Open').length || 0}

Write a professional, empathetic 3-5 paragraph report highlighting:
1. Academic strengths
2. Subjects needing improvement
3. Attendance/engagement concerns (if any)
4. Extracurricular/AICTE activity
5. Specific actionable recommendations

Keep the tone formal and supportive (suitable for sharing with parents).
`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch {
    return 'AI report generation unavailable at this time.';
  }
}

// ── PTM Report Generation ─────────────────────────────────────

export async function generatePTMReport(portfolio: any): Promise<string> {
  const model = getGeminiModel();
  const prompt = `
You are a Class Incharge AI assistant generating a Parent-Teacher Meeting (PTM) report.

Student UID: ${portfolio.student?.uid}
Semester: ${portfolio.student?.current_semester}
Academic Year: ${portfolio.student?.academic_year}
Total Backlogs: ${portfolio.backlog_count}

Subjects:
${JSON.stringify(portfolio.subjects, null, 2)}

Active Grievances: ${portfolio.grievances?.length || 0}

Generate a concise, formal PTM summary report in 2-3 paragraphs covering:
1. Overall academic performance
2. Key subjects of concern
3. Any backlogs/pending clearances
4. Recommended discussion points for parents

Keep it formal and suitable for institutional use.
`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch {
    return 'AI PTM report generation unavailable at this time.';
  }
}
