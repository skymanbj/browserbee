import { FileAttachment, AttachmentType, ContentBlock } from '../../background/types';

const IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/svg+xml',
]);

const PDF_MIME_TYPE = 'application/pdf';

const TEXT_EXTENSIONS = new Set([
  '.txt', '.md', '.csv', '.json', '.xml', '.html', '.css', '.js', '.ts',
  '.tsx', '.jsx', '.py', '.java', '.c', '.cpp', '.h', '.sh', '.yaml',
  '.yml', '.toml', '.ini', '.cfg', '.log', '.sql', '.rb', '.go', '.rs',
  '.swift', '.kt', '.dart', '.r', '.m', '.pl', '.lua', '.vim', '.el',
  '.conf', '.properties', '.gradle', '.cmake', '.makefile',
]);

const MAX_IMAGE_WIDTH = 2048;
const IMAGE_QUALITY = 0.8;
const MAX_IMAGE_SIZE = 4 * 1024 * 1024;
const MAX_ATTACHMENTS = 5;

export function isImageMime(mime: string): boolean {
  return IMAGE_MIME_TYPES.has(mime.toLowerCase());
}

export function isPdfMime(mime: string): boolean {
  return mime.toLowerCase() === PDF_MIME_TYPE;
}

export function isTextMime(mime: string): boolean {
  if (mime.startsWith('text/')) return true;
  return false;
}

export function isTextExtension(filename: string): boolean {
  const ext = '.' + filename.split('.').pop()?.toLowerCase();
  return TEXT_EXTENSIONS.has(ext);
}

export function getAttachmentType(file: File): AttachmentType {
  if (isImageMime(file.type)) return 'image';
  if (isPdfMime(file.type)) return 'pdf';
  if (isTextMime(file.type) || isTextExtension(file.name)) return 'text';
  return 'text';
}

export function getAcceptedFileTypes(): string {
  return 'image/*,.pdf,.txt,.md,.csv,.json,.xml,.html,.css,.js,.ts,.py,.java,.c,.cpp,.h,.sh,.yaml,.yml,.toml,.sql,.rb,.go,.rs,.swift,.kt';
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

export function compressImage(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      if (width > MAX_IMAGE_WIDTH) {
        const ratio = MAX_IMAGE_WIDTH / width;
        width = MAX_IMAGE_WIDTH;
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL('image/jpeg', IMAGE_QUALITY);
      resolve(compressed);
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export function generateThumbnail(dataUrl: string, maxSize: number = 80): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      const ratio = Math.min(maxSize / width, maxSize / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.6));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function dataUrlToBase64(dataUrl: string): string {
  const idx = dataUrl.indexOf(',');
  return idx >= 0 ? dataUrl.substring(idx + 1) : dataUrl;
}

function dataUrlToMimeType(dataUrl: string): string {
  const match = dataUrl.match(/^data:([^;]+);/);
  return match ? match[1] : 'application/octet-stream';
}

export async function processFile(file: File): Promise<FileAttachment> {
  const attachmentType = getAttachmentType(file);
  const id = `att-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  if (attachmentType === 'image') {
    const dataUrl = await readFileAsDataUrl(file);
    const compressed = await compressImage(dataUrl);
    const thumbnail = await generateThumbnail(compressed);
    const base64Data = dataUrlToBase64(compressed);

    return {
      id,
      name: file.name,
      type: 'image',
      mimeType: dataUrlToMimeType(compressed) || file.type || 'image/jpeg',
      data: base64Data,
      size: file.size,
      thumbnail,
    };
  }

  if (attachmentType === 'pdf') {
    const dataUrl = await readFileAsDataUrl(file);
    const base64Data = dataUrlToBase64(dataUrl);

    return {
      id,
      name: file.name,
      type: 'pdf',
      mimeType: file.type || 'application/pdf',
      data: base64Data,
      size: file.size,
    };
  }

  const textContent = await readFileAsText(file);

  return {
    id,
    name: file.name,
    type: 'text',
    mimeType: file.type || 'text/plain',
    data: textContent,
    size: file.size,
  };
}

export async function processFiles(files: File[]): Promise<FileAttachment[]> {
  const results: FileAttachment[] = [];
  for (const file of files) {
    try {
      const attachment = await processFile(file);
      results.push(attachment);
    } catch (err) {
      console.error(`Failed to process file ${file.name}:`, err);
    }
  }
  return results;
}

export function getFilesFromDataTransfer(dataTransfer: DataTransfer): File[] {
  const files: File[] = [];
  if (dataTransfer.files) {
    for (let i = 0; i < dataTransfer.files.length; i++) {
      const file = dataTransfer.files[i];
      if (isAcceptedFile(file)) {
        files.push(file);
      }
    }
  }
  return files;
}

export function getFilesFromClipboard(clipboardData: DataTransfer): File[] {
  const files: File[] = [];
  if (clipboardData.items) {
    for (let i = 0; i < clipboardData.items.length; i++) {
      const item = clipboardData.items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file && isAcceptedFile(file)) {
          files.push(file);
        }
      }
    }
  }
  return files;
}

function isAcceptedFile(file: File): boolean {
  if (isImageMime(file.type)) return true;
  if (isPdfMime(file.type)) return true;
  if (isTextMime(file.type)) return true;
  if (isTextExtension(file.name)) return true;
  if (file.type === '') return isTextExtension(file.name);
  return false;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function checkAttachmentLimits(attachments: FileAttachment[], newFiles: File[]): { ok: boolean; message?: string } {
  const total = attachments.length + newFiles.length;
  if (total > MAX_ATTACHMENTS) {
    return { ok: false, message: `最多支持 ${MAX_ATTACHMENTS} 个附件` };
  }

  for (const file of newFiles) {
    if (file.size > MAX_IMAGE_SIZE && isImageMime(file.type)) {
      return { ok: false, message: `图片 ${file.name} 过大（超过 4MB），请压缩后重试` };
    }
  }

  return { ok: true };
}

export function attachmentsToContentBlocks(prompt: string, attachments: FileAttachment[]): string | ContentBlock[] {
  if (!attachments || attachments.length === 0) return prompt;

  const blocks: ContentBlock[] = [];
  blocks.push({ type: 'text', text: prompt });

  for (const att of attachments) {
    if (att.type === 'image') {
      blocks.push({ type: 'image', data: att.data, mimeType: att.mimeType });
    } else if (att.type === 'pdf') {
      blocks.push({ type: 'pdf', data: att.data, name: att.name });
    } else if (att.type === 'text') {
      blocks.push({ type: 'text', text: `[File: ${att.name}]\n${att.data}` });
    }
  }

  return blocks;
}
