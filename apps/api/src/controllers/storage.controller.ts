import { Request, Response } from 'express';
import * as minioService from '../services/minio.service';

type PresignedAction = 'upload' | 'download';

function isSupportedAction(value: unknown): value is PresignedAction {
  return value === 'upload' || value === 'download';
}

export async function createPresignedUrl(req: Request, res: Response): Promise<void> {
  const { action, bucketName, fileName, fileType } = req.body;

  if (!isSupportedAction(action)) {
    res.status(400).json({ success: false, message: "action must be 'upload' or 'download'." });
    return;
  }

  if (typeof fileName !== 'string' || !fileName.trim()) {
    res.status(400).json({ success: false, message: 'fileName is required.' });
    return;
  }

  if (action === 'upload' && (typeof fileType !== 'string' || !fileType.trim())) {
    res.status(400).json({ success: false, message: 'fileType is required for upload actions.' });
    return;
  }

  try {
    const result = await minioService.generatePresignedObjectUrl({
      action,
      bucketName: typeof bucketName === 'string' && bucketName.trim() ? bucketName.trim() : undefined,
      fileName: fileName.trim(),
      fileType: typeof fileType === 'string' ? fileType.trim() : undefined,
      userId: req.user!.id,
    });

    res.status(201).json({
      success: true,
      data: {
        fileKey: result.fileKey,
        bucketName: result.bucketName,
        uploadUrl: action === 'upload' ? result.url : undefined,
        downloadUrl: action === 'download' ? result.url : undefined,
        expiresInSeconds: 60 * 15,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to generate presigned URL.';
    const status = message.includes('Unsupported bucket') ? 400 : 503;
    res.status(status).json({ success: false, message });
  }
}
