import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly publicUrl: string;

  constructor(private configService: ConfigService) {
    const accountId = this.configService.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('R2_SECRET_ACCESS_KEY');
    
    this.bucketName = this.configService.get<string>('R2_BUCKET_NAME') || 'servicios-arquitectura';
    this.publicUrl = this.configService.get<string>('R2_PUBLIC_URL') || '';

    // Inicializar cliente S3 compatible con R2
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || '',
      },
    });
  }

  /**
   * Sube un archivo a R2.
   * @param buffer - Buffer del archivo
   * @param filename - Nombre del archivo a guardar
   * @param mimeType - Tipo MIME del archivo
   * @returns URL pública del archivo subido
   */
  async uploadFile(buffer: Buffer, filename: string, mimeType: string): Promise<string> {
    const key = `portfolio/${filename}`;

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
        }),
      );

      this.logger.log(`Archivo subido exitosamente: ${key}`);
      return this.getPublicUrl(filename);
    } catch (error) {
      this.logger.error(`Error al subir archivo: ${error.message}`);
      throw error;
    }
  }

  /**
   * Elimina un archivo de R2.
   * @param filename - Nombre del archivo a eliminar
   */
  async deleteFile(filename: string): Promise<void> {
    const key = `portfolio/${filename}`;

    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );

      this.logger.log(`Archivo eliminado exitosamente: ${key}`);
    } catch (error) {
      this.logger.error(`Error al eliminar archivo: ${error.message}`);
      // No lanzamos el error para no bloquear la eliminación del registro en DB
    }
  }

  /**
   * Construye la URL pública de un archivo.
   * @param filename - Nombre del archivo
   * @returns URL pública completa
   */
  getPublicUrl(filename: string): string {
    return `${this.publicUrl}/portfolio/${filename}`;
  }
}
