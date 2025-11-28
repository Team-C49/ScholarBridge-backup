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

  // Alias for generateCompletePackage (used by trust routes)
  async generateCompletePackage(applicationId) {
    const db = require('../utils/db');
    const pdfService = require('./pdfService');
    
    // Get application details with student profile
    const appQuery = `
      SELECT 
        a.*,
        sp.full_name, sp.phone_number, sp.date_of_birth, sp.gender,
        sp.address, sp.profile_picture_url, sp.kyc_doc_type,
        u.email as student_email,
        COALESCE(SUM(fm.monthly_income), 0) as total_family_income
      FROM applications a
      JOIN student_profiles sp ON a.student_user_id = sp.user_id
      JOIN users u ON sp.user_id = u.id
      LEFT JOIN family_members fm ON a.id = fm.application_id
      WHERE a.id = $1
      GROUP BY a.id, sp.full_name, sp.phone_number, sp.date_of_birth, 
               sp.gender, sp.address, sp.profile_picture_url, sp.kyc_doc_type, u.email
    `;
    const appResult = await db.query(appQuery, [applicationId]);
    
    if (appResult.rows.length === 0) {
      throw new Error('Application not found');
    }

    const application = appResult.rows[0];
    const studentUserId = application.student_user_id;

    // Get education history
    const educationHistory = (await db.query(
      `SELECT * FROM education_history WHERE application_id=$1 ORDER BY year_of_passing DESC`,
      [applicationId]
    )).rows;

    // Get family members
    const familyMembers = (await db.query(
      `SELECT * FROM family_members WHERE application_id=$1 ORDER BY created_at`,
      [applicationId]
    )).rows;

    // Get current expenses
    const currentExpenses = (await db.query(
      `SELECT * FROM current_expenses WHERE application_id=$1 ORDER BY created_at`,
      [applicationId]
    )).rows;

    // Get all documents for this application
    const docsQuery = `
      SELECT d.*, 'application' as source_type
      FROM documents d 
      WHERE d.owner_id = $1 AND d.owner_type = 'application'
      UNION ALL
      SELECT d.*, 'kyc' as source_type
      FROM documents d 
      WHERE d.owner_id = $2 AND d.owner_type = 'student' AND d.doc_type = 'kyc_document'
      ORDER BY created_at
    `;
    const docsResult = await db.query(docsQuery, [applicationId, studentUserId]);

    // Get trust payments
    const trustPayments = (await db.query(
      `SELECT * FROM trust_payments WHERE application_id=$1 ORDER BY payment_date DESC`,
      [applicationId]
    )).rows;

    // Prepare data for PDF generation (normalize to match student route structure)
    const profile = {
      full_name: application.full_name || application.student_full_name || null,
      phone_number: application.phone_number || application.student_phone || null,
      date_of_birth: application.date_of_birth || application.student_dob || null,
      gender: application.gender || application.student_gender || null,
      address: application.address,
      profile_picture_url: application.profile_picture_url || application.student_profile_picture_url || null,
      kyc_doc_type: application.kyc_doc_type || null,
      email: application.student_email,
      user_id: studentUserId
    };

    // Build safe mapped data for PDF (handle old/new field names)
    const safeEducationHistory = (educationHistory || []).map(edu => ({
      institution: edu.institution || edu.institution_name || 'N/A',
      course: edu.course || edu.qualification || 'N/A',
      year: edu.year || edu.year_of_passing || 'N/A',
      percentage: edu.percentage || edu.grade || 'N/A'
    }));

    const safeFamilyMembers = (familyMembers || []).map(member => ({
      name: member.name || member.member_name || 'N/A',
      relation: member.relation || 'N/A',
      occupation: member.occupation || 'N/A',
      income: member.income !== undefined && member.income !== null ? member.income : (member.monthly_income !== undefined && member.monthly_income !== null ? member.monthly_income : 'N/A')
    }));

    const totalFamilyIncome = safeFamilyMembers.reduce((sum, m) => sum + (Number(m.income) || 0), 0);

    const safeCurrentExpenses = (currentExpenses || []).map(expense => ({
      expense_type: expense.expense_type || expense.expense_name || 'N/A',
      amount: expense.amount !== undefined && expense.amount !== null ? expense.amount : 'N/A',
      description: expense.description || 'N/A'
    }));

    // Ensure profile address is string
    if (profile && typeof profile.address === 'object' && profile.address !== null) {
      profile.address = [profile.address.line1, profile.address.line2, profile.address.city, profile.address.state, profile.address.pincode].filter(Boolean).join(', ');
    }

    // Normalise some application top-level fields used by the template
    application.school_college_name = application.school_college_name || application.college_school || application.college_name || application.school_name || application.institution_name || '';
    application.current_course_name = application.current_course_name || application.current_course || application.course_name || application.program_name || '';
    application.total_amount_requested = application.total_amount_requested || application.amount_requested || application.amount || application.total_amount || 0;

    // Compute received amount: prefer stored received_amount, else sum of trustPayments
    let receivedAmount = 0;
    if (application.received_amount && !isNaN(parseFloat(application.received_amount)) && parseFloat(application.received_amount) > 0) {
      receivedAmount = parseFloat(application.received_amount);
    } else if (Array.isArray(trustPayments)) {
      receivedAmount = trustPayments.reduce((total, payment) => total + parseFloat(payment.amount || 0), 0);
    }
    application.received_amount = receivedAmount;

    const applicationData = {
      application,
      profile,
      educationHistory: safeEducationHistory,
      familyMembers: safeFamilyMembers,
      totalFamilyIncome,
      currentExpenses: safeCurrentExpenses,
      documents: docsResult.rows.filter(d => d.source_type === 'application'),
      kycDocuments: docsResult.rows.filter(d => d.source_type === 'kyc'),
      trustPayments
    };

    // Generate PDF
    const pdfBuffer = await pdfService.generateApplicationPDF(applicationData);

    // Create complete package zip
    return await this.createCompletePackageZip(pdfBuffer, docsResult.rows, applicationId);
  }
}

module.exports = new ZipService();