import type { Client } from 'basic-ftp';

interface FileItem {
  name: string;
  path: string;
  size: number;
  modifiedAt: Date;
  depth: number;
}

export declare function getFtpClient(): Promise<Client>;
export declare function listFiles(
  client: Client, 
  relativePath: string,
  maxDepth?: number,
  currentDepth?: number
): Promise<FileItem[]>;

interface DownloadResult {
  downloaded: boolean;
  hash: string;
}

export declare function downloadFile(
  client: Client, 
  ftpFilePath: string, 
  localFilePath: string
): Promise<DownloadResult>;
