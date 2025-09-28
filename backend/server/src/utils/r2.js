const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const path = require('path');

class CloudflareR2 {
  constructor() {
    this.client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
    this.bucketName = process.env.R2_BUCKET_NAME;
    this.publicDomain = process.env.R2_PUBLIC_DOMAIN;
  }

  /**
   * Upload a file to R2
   * @param {Buffer} fileBuffer - The file buffer
   * @param {string} fileName - Original filename
   * @param {string} contentType - MIME type
   * @param {string} folder - Folder path in bucket (e.g., 'documents', 'profile-pictures')
   * @returns {Promise<{key: string, url: string}>} - File key and public URL
   */
  async uploadFile(fileBuffer, fileName, contentType, folder = '') {
    try {
      // Generate unique filename to prevent conflicts
      const fileExtension = path.extname(fileName);
      const uniqueId = crypto.randomUUID();
      const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const key = folder ? `${folder}/${uniqueId}_${sanitizedName}` : `${uniqueId}_${sanitizedName}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
        Metadata: {
          originalName: fileName,
          uploadedAt: new Date().toISOString(),
        },
      });

      await this.client.send(command);

      // Generate public URL
      const publicUrl = this.publicDomain 
        ? `${this.publicDomain}/${key}`
        : `${process.env.R2_ENDPOINT}/${this.bucketName}/${key}`;

      return {
        key,
        url: publicUrl,
        originalName: fileName,
        contentType,
        size: fileBuffer.length,
      };
    } catch (error) {
      console.error('R2 Upload Error:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Generate a presigned URL for direct upload from frontend
   * @param {string} fileName - Original filename
   * @param {string} contentType - MIME type
   * @param {string} folder - Folder path in bucket
   * @param {number} expiresIn - URL expiration in seconds (default: 1 hour)
   * @returns {Promise<{uploadUrl: string, key: string}>}
   */
  async generatePresignedUploadUrl(fileName, contentType, folder = '', expiresIn = 3600) {
    try {
      const fileExtension = path.extname(fileName);
      const uniqueId = crypto.randomUUID();
      const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const key = folder ? `${folder}/${uniqueId}_${sanitizedName}` : `${uniqueId}_${sanitizedName}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: contentType,
        Metadata: {
          originalName: fileName,
          uploadedAt: new Date().toISOString(),
        },
      });

      const uploadUrl = await getSignedUrl(this.client, command, { expiresIn });

      return {
        uploadUrl,
        key,
        publicUrl: this.publicDomain 
          ? `${this.publicDomain}/${key}`
          : `${process.env.R2_ENDPOINT}/${this.bucketName}/${key}`,
      };
    } catch (error) {
      console.error('R2 Presigned URL Error:', error);
      throw new Error(`Failed to generate presigned URL: ${error.message}`);
    }
  }

  /**
   * Delete a file from R2
   * @param {string} key - File key to delete
   * @returns {Promise<boolean>} - Success status
   */
  async deleteFile(key) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.client.send(command);
      return true;
    } catch (error) {
      console.error('R2 Delete Error:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Generate a presigned URL for downloading/viewing a file
   * @param {string} key - File key
   * @param {number} expiresIn - URL expiration in seconds (default: 1 hour)
   * @returns {Promise<string>} - Signed URL
   */
  async generatePresignedDownloadUrl(key, expiresIn = 3600) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      return await getSignedUrl(this.client, command, { expiresIn });
    } catch (error) {
      console.error('R2 Download URL Error:', error);
      throw new Error(`Failed to generate download URL: ${error.message}`);
    }
  }

  /**
   * Validate file type and size
   * @param {Object} file - Multer file object
   * @param {Object} options - Validation options
   * @returns {boolean} - Validation result
   */
  validateFile(file, options = {}) {
    const {
      allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
      maxSize = 10 * 1024 * 1024, // 10MB default
    } = options;

    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
    }

    if (file.size > maxSize) {
      throw new Error(`File too large. Maximum size: ${maxSize / (1024 * 1024)}MB`);
    }

    return true;
  }
}

// Singleton instance
const r2Client = new CloudflareR2();

module.exports = r2Client;