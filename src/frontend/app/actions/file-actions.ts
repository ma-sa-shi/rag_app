'use server';

import {
  uploadFile as uploadFileImpl,
  ingestFile as ingestFileImpl,
  getFileViewUrl as getFileViewUrlImpl,
} from '@/lib/file';
import {
  UploadActionResponse,
  IngestActionResponse,
  FileViewUrlActionResponse,
} from '@/types/file';

export async function uploadFile(
  _prevState: UploadActionResponse | null,
  formData: FormData
): Promise<UploadActionResponse> {
  return uploadFileImpl(_prevState, formData);
}

export async function ingestFile(
  docId: number,
  requestId: string = crypto.randomUUID()
): Promise<IngestActionResponse> {
  return ingestFileImpl(docId, requestId);
}

export async function getFileViewUrl(
  docId: number,
  requestId: string = crypto.randomUUID()
): Promise<FileViewUrlActionResponse> {
  return getFileViewUrlImpl(docId, requestId);
}
