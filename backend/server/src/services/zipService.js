const archiver = require('archiver');
const { R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME } = process.env;
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

class ZipService {
  constructor() {
    this.s3Client = new S3Client({
      endpoint: R2_ENDPOINT,
      region: 'auto',
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
  }

  async createDocumentsZip(documents, applicationId) {
    return new Promise(async (resolve, reject) => {
      try {
        const archive = archiver('zip', {
          zlib: { level: 9 } // Maximum compression
        });

        const buffers = [];
        archive.on('data', (chunk) => buffers.push(chunk));
        archive.on('end', () => {
          const zipBuffer = Buffer.concat(buffers);
          resolve(zipBuffer);
        });
        archive.on('error', (err) => reject(err));

        // Add each document to the zip
        for (const doc of documents) {
          try {
            // Extract the file key from the URL
            const fileKey = this.extractKeyFromUrl(doc.file_url);
            
            if (fileKey) {
              // Get the file from R2
              const command = new GetObjectCommand({
                Bucket: R2_BUCKET_NAME,
                Key: fileKey,
              });

              const response = await this.s3Client.send(command);
              const fileBuffer = await this.streamToBuffer(response.Body);

              // Add file to zip with a clean name
              const fileName = doc.original_name || `${doc.doc_type}_${doc.id}`;
              archive.append(fileBuffer, { name: fileName });
            }
          } catch (docError) {
            console.error(`Error adding document ${doc.id} to zip:`, docError);
            // Continue with other documents even if one fails
          }
        }

        // Finalize the zip
        await archive.finalize();
      } catch (error) {
        reject(error);
      }
    });
  }

  extractKeyFromUrl(fileUrl) {
    if (!fileUrl) return null;
    
    try {
      // If it's a full URL, extract the key part
      if (fileUrl.includes('://')) {
        const url = new URL(fileUrl);
        return url.pathname.substring(1); // Remove leading slash
      }
      
      // If it's already a key, return as-is
      return fileUrl;
    } catch (error) {
      console.error('Error extracting key from URL:', error);
      return null;
    }
  }

  async streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  async getDocumentBuffer(fileKey) {
    try {
      const command = new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: fileKey,
      });

      const response = await this.s3Client.send(command);
      return await this.streamToBuffer(response.Body);
    } catch (error) {
      console.error('Error getting document from R2:', error);
      throw error;
    }
  }

  async getDocumentStream(fileKey) {
    try {
      const command = new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: fileKey,
      });

      const response = await this.s3Client.send(command);
      return response.Body;
    } catch (error) {
      console.error('Error getting document stream from R2:', error);
      throw error;
    }
  }

  async createCompletePackageZip(pdfBuffer, documents, applicationId) {
    return new Promise(async (resolve, reject) => {
      try {
        const archive = archiver('zip', {
          zlib: { level: 9 } // Maximum compression
        });

        const buffers = [];
        archive.on('data', (chunk) => buffers.push(chunk));
        archive.on('end', () => {
          const zipBuffer = Buffer.concat(buffers);
          resolve(zipBuffer);
        });
        archive.on('error', (err) => reject(err));

        // Add the PDF first - ensure it's a proper Buffer
        const pdfBuf = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);
        archive.append(pdfBuf, { name: `application_${applicationId}.pdf` });

        // Add each document to the zip
        for (const doc of documents) {
          try {
            // Extract the file key from the URL
            const fileKey = this.extractKeyFromUrl(doc.file_url);
            
            if (fileKey) {
              // Get the file from R2
              const command = new GetObjectCommand({
                Bucket: R2_BUCKET_NAME,
                Key: fileKey,
              });

              const response = await this.s3Client.send(command);
              const fileBuffer = await this.streamToBuffer(response.Body);

              // Add file to zip with a clean name
              const fileName = doc.original_name || `${doc.doc_type}_${doc.id}`;
              const folderName = doc.doc_type === 'kyc_document' ? 'KYC_Documents' : 'Application_Documents';
              archive.append(fileBuffer, { name: `${folderName}/${fileName}` });
            }
          } catch (docError) {
            console.error(`Error adding document ${doc.id} to zip:`, docError);
            // Continue with other documents even if one fails
          }
        }

        // Finalize the zip
        await archive.finalize();
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = new ZipService();