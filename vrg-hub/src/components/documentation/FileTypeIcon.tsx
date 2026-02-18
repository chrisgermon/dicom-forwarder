import {
  FileText,
  FileImage,
  FileSpreadsheet,
  FileVideo,
  FileAudio,
  FileCode,
  FileArchive,
  File,
} from 'lucide-react';

interface FileTypeIconProps {
  fileName: string;
  fileType?: string;
  className?: string;
}

export function FileTypeIcon({ fileName, fileType, className = "h-5 w-5" }: FileTypeIconProps) {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  const mimeType = fileType?.toLowerCase() || '';

  // Images
  if (
    ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico'].includes(extension) ||
    mimeType.startsWith('image/')
  ) {
    return <FileImage className={className} />;
  }

  // Documents
  if (
    ['doc', 'docx', 'txt', 'rtf', 'odt'].includes(extension) ||
    mimeType.includes('word') ||
    mimeType.includes('text')
  ) {
    return <FileText className={className} />;
  }

  // Spreadsheets
  if (
    ['xls', 'xlsx', 'csv', 'ods'].includes(extension) ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('excel')
  ) {
    return <FileSpreadsheet className={className} />;
  }

  // Videos
  if (
    ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(extension) ||
    mimeType.startsWith('video/')
  ) {
    return <FileVideo className={className} />;
  }

  // Audio
  if (
    ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'].includes(extension) ||
    mimeType.startsWith('audio/')
  ) {
    return <FileAudio className={className} />;
  }

  // Code
  if (
    ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'html', 'css', 'scss', 'json', 'xml', 'yaml', 'yml'].includes(extension)
  ) {
    return <FileCode className={className} />;
  }

  // Archives
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(extension)) {
    return <FileArchive className={className} />;
  }

  // Default
  return <File className={className} />;
}
