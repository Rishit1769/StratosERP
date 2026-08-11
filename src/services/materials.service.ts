import { db, parseJsonArray, run, selectRows, type DbRow } from "@/lib/db";

export type MaterialRecord = {
  material_id: number;
  subject_id: number;
  subject_name: string;
  file_key: string;
  file_name: string;
  file_type: string | null;
  bucket_name: string;
  uploaded_by: number | null;
  uploaded_by_name: string | null;
  uploaded_at: Date | string | null;
};

export async function registerMaterial(data: {
  subjectId: number;
  fileKey: string;
  fileName: string;
  fileType?: string;
  bucketName?: string;
  uploadedBy?: number;
}): Promise<number> {
  const result = await run(
    db,
    `
    INSERT INTO study_material (subject_id, file_key, file_name, file_type, bucket_name, uploaded_by)
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      data.subjectId,
      data.fileKey,
      data.fileName,
      data.fileType || null,
      data.bucketName || "study-materials",
      data.uploadedBy ?? null,
    ]
  );
  return result.insertId;
}

const MATERIAL_SELECT = `
  SELECT
    sm.material_id,
    sm.subject_id,
    sub.name AS subject_name,
    sm.file_key,
    sm.file_name,
    sm.file_type,
    sm.bucket_name,
    sm.uploaded_by,
    f.name AS uploaded_by_name,
    sm.uploaded_at
  FROM study_material sm
  JOIN subject sub ON sub.subject_id = sm.subject_id
  LEFT JOIN faculty f ON f.faculty_id = sm.uploaded_by
`;

export async function listMaterialsBySubject(subjectId: number): Promise<MaterialRecord[]> {
  const rows = await selectRows<DbRow>(db, `${MATERIAL_SELECT} WHERE sm.subject_id = ? ORDER BY sm.uploaded_at DESC`, [
    subjectId,
  ]);
  return rows.map(normalizeMaterial);
}

export async function listAllMaterials(): Promise<MaterialRecord[]> {
  const rows = await selectRows<DbRow>(db, `${MATERIAL_SELECT} ORDER BY sm.uploaded_at DESC`);
  return rows.map(normalizeMaterial);
}

function normalizeMaterial(row: DbRow): MaterialRecord {
  return {
    material_id: Number(row.material_id),
    subject_id: Number(row.subject_id),
    subject_name: String(row.subject_name ?? ""),
    file_key: String(row.file_key ?? ""),
    file_name: String(row.file_name ?? ""),
    file_type: row.file_type ? String(row.file_type) : null,
    bucket_name: String(row.bucket_name ?? "study-materials"),
    uploaded_by: row.uploaded_by !== null && row.uploaded_by !== undefined ? Number(row.uploaded_by) : null,
    uploaded_by_name: row.uploaded_by_name ? String(row.uploaded_by_name) : null,
    uploaded_at: row.uploaded_at ? String(row.uploaded_at) : null,
  };
}
