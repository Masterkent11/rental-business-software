export interface FileReaderPort {
  readBase64(file: File): Promise<string>;
  imageSize(file: File): Promise<{ width: number; height: number }>;
}
