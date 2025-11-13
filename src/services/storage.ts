import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { env } from "@/lib/env";

export interface UploadResult {
  url: string;
  fileName: string;
}

export class StorageService {
  async uploadAudio(file: Buffer, originalName: string, mimeType: string): Promise<UploadResult> {
    const ext = path.extname(originalName);
    const fileName = `${uuidv4()}${ext}`;

    if (env.STORAGE_TYPE === "local") {
      return this.uploadLocal(file, fileName);
    } else if (env.STORAGE_TYPE === "s3") {
      return this.uploadS3(file, fileName, mimeType);
    }

    throw new Error("Invalid storage type");
  }

  private async uploadLocal(file: Buffer, fileName: string): Promise<UploadResult> {
    const storagePath = env.STORAGE_PATH || "./uploads";
    const uploadDir = path.join(process.cwd(), storagePath);

    // Ensure upload directory exists
    await fs.mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, fileName);
    await fs.writeFile(filePath, file);

    return {
      url: `/uploads/${fileName}`,
      fileName,
    };
  }

  private async uploadS3(file: Buffer, fileName: string, mimeType: string): Promise<UploadResult> {
    // S3 implementation
    // This would use AWS SDK to upload to S3
    // For now, throwing an error as AWS SDK needs to be configured
    throw new Error("S3 upload not yet implemented. Please use local storage for now.");
  }

  async deleteAudio(url: string): Promise<void> {
    if (env.STORAGE_TYPE === "local") {
      return this.deleteLocal(url);
    } else if (env.STORAGE_TYPE === "s3") {
      return this.deleteS3(url);
    }
  }

  private async deleteLocal(url: string): Promise<void> {
    const fileName = path.basename(url);
    const storagePath = env.STORAGE_PATH || "./uploads";
    const filePath = path.join(process.cwd(), storagePath, fileName);

    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error("Error deleting file:", error);
    }
  }

  private async deleteS3(url: string): Promise<void> {
    // S3 delete implementation
    throw new Error("S3 delete not yet implemented");
  }

  async getAudioStream(url: string): Promise<Buffer> {
    if (env.STORAGE_TYPE === "local") {
      const fileName = path.basename(url);
      const storagePath = env.STORAGE_PATH || "./uploads";
      const filePath = path.join(process.cwd(), storagePath, fileName);
      return fs.readFile(filePath);
    } else {
      throw new Error("S3 streaming not yet implemented");
    }
  }
}

export const storageService = new StorageService();
