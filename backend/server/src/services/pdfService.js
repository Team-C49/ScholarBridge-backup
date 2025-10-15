const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class PDFService {
  async generateApplicationPDF(applicationData) {
    let browser;
    try {
      browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      
      // Generate HTML content for the application
      const htmlContent = this.generateHTMLTemplate(applicationData);
      
      await page.setContent(htmlContent, { 
        waitUntil: 'networkidle0' 
      });
      
      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '1cm',
          right: '1cm',
          bottom: '1cm',
          left: '1cm'
        }
      });
      
      return pdfBuffer;
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate PDF');
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  generateHTMLTemplate(data) {
    const { application, profile, educationHistory, familyMembers, currentExpenses, documents, kycDocuments, trustPayments } = data;
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Scholarship Application - ${application.academic_year}</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                margin: 0; 
                padding: 20px; 
                color: #333;
                line-height: 1.4;
            }
            .header { 
                text-align: center; 
                margin-bottom: 30px; 
                border-bottom: 2px solid #2563eb;
                padding-bottom: 20px;
            }
            .header h1 { 
                color: #2563eb; 
                margin: 0;
                font-size: 24px;
            }
            .section { 
                margin-bottom: 25px; 
                page-break-inside: avoid;
            }
            .section-title { 
                background: #f3f4f6; 
                padding: 10px; 
                border-left: 4px solid #2563eb;
                font-weight: bold;
                font-size: 16px;
                margin-bottom: 15px;
            }
            .info-grid { 
                display: grid; 
                grid-template-columns: 1fr 1fr; 
                gap: 20px; 
                margin-bottom: 15px;
            }
            .info-item { 
                margin-bottom: 10px; 
            }
            .info-label { 
                font-weight: bold; 
                color: #4b5563;
                display: block;
                margin-bottom: 3px;
            }
            .info-value { 
                color: #1f2937; 
            }
            .table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-top: 10px;
            }
            .table th, .table td { 
                border: 1px solid #d1d5db; 
                padding: 8px; 
                text-align: left; 
                font-size: 12px;
            }
            .table th { 
                background: #f9fafb; 
                font-weight: bold;
            }
            .document-list {
                list-style: none;
                padding: 0;
            }
            .document-item {
                padding: 8px;
                border: 1px solid #e5e7eb;
                margin-bottom: 5px;
                background: #f9fafb;
                border-radius: 4px;
            }
            .trust-payment {
                background: #ecfdf5;
                border: 1px solid #10b981;
                padding: 10px;
                margin-bottom: 10px;
                border-radius: 4px;
            }
            .amount {
                font-weight: bold;
                color: #059669;
            }
            .profile-pic {
                width: 100px;
                height: 100px;
                border-radius: 50%;
                object-fit: cover;
                margin: 0 auto 15px;
                display: block;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Scholarship Application</h1>
            <p>Academic Year: ${application.academic_year} | Status: ${application.status}</p>
            <p>Submitted on: ${new Date(application.created_at).toLocaleDateString()}</p>
        </div>

        <div class="section">
            <div class="section-title">Personal Information</div>
            ${profile.profile_picture_url ? `<img src="${profile.profile_picture_url}" class="profile-pic" alt="Profile Picture">` : ''}
            <div class="info-grid">
                <div>
                    <div class="info-item">
                        <span class="info-label">Full Name:</span>
                        <span class="info-value">${profile.full_name || 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Email:</span>
                        <span class="info-value">${profile.email || 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Date of Birth:</span>
                        <span class="info-value">${profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Gender:</span>
                        <span class="info-value">${profile.gender || 'N/A'}</span>
                    </div>
                </div>
                <div>
                    <div class="info-item">
                        <span class="info-label">Phone Number:</span>
                        <span class="info-value">${profile.phone_number || 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Address:</span>
                        <span class="info-value">${profile.address || 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Annual Income:</span>
                        <span class="info-value">₹${profile.annual_income || 'N/A'}</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Current Education</div>
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">College/School:</span>
                    <span class="info-value">${application.school_college_name}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Current Course:</span>
                    <span class="info-value">${application.current_course_name}</span>
                </div>
            </div>
        </div>

        ${educationHistory.length > 0 ? `
        <div class="section">
            <div class="section-title">Education History</div>
            <table class="table">
                <thead>
                    <tr>
                        <th>Institution</th>
                        <th>Course</th>
                        <th>Year</th>
                        <th>Percentage</th>
                    </tr>
                </thead>
                <tbody>
                    ${educationHistory.map(edu => `
                    <tr>
                        <td>${edu.institution_name}</td>
                        <td>${edu.course_name}</td>
                        <td>${edu.year_of_passing}</td>
                        <td>${edu.percentage}%</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}

        ${familyMembers.length > 0 ? `
        <div class="section">
            <div class="section-title">Family Members</div>
            <table class="table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Relation</th>
                        <th>Occupation</th>
                        <th>Income</th>
                    </tr>
                </thead>
                <tbody>
                    ${familyMembers.map(member => `
                    <tr>
                        <td>${member.name}</td>
                        <td>${member.relation}</td>
                        <td>${member.occupation}</td>
                        <td>₹${member.income}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
            <div style="margin-top: 10px;">
                <span class="info-label">Total Family Income: </span>
                <span class="amount">₹${familyMembers.reduce((total, member) => total + parseFloat(member.income || 0), 0)}</span>
            </div>
        </div>
        ` : ''}

        ${currentExpenses.length > 0 ? `
        <div class="section">
            <div class="section-title">Current Expenses</div>
            <table class="table">
                <thead>
                    <tr>
                        <th>Expense Type</th>
                        <th>Amount</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody>
                    ${currentExpenses.map(expense => `
                    <tr>
                        <td>${expense.expense_type}</td>
                        <td>₹${expense.amount}</td>
                        <td>${expense.description || 'N/A'}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}

        <div class="section">
            <div class="section-title">Bank Details</div>
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">Account Holder Name:</span>
                    <span class="info-value">${profile.bank_account_holder_name || 'N/A'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Account Number:</span>
                    <span class="info-value">${profile.bank_account_number || 'N/A'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Bank Name:</span>
                    <span class="info-value">${profile.bank_name || 'N/A'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">IFSC Code:</span>
                    <span class="info-value">${profile.bank_ifsc_code || 'N/A'}</span>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Financial Summary</div>
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">Total Amount Requested:</span>
                    <span class="amount">₹${application.total_amount_requested}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Total Amount Received:</span>
                    <span class="amount">₹${application.received_amount || 0}</span>
                </div>
            </div>
        </div>

        ${documents.length > 0 ? `
        <div class="section">
            <div class="section-title">Application Documents</div>
            <ul class="document-list">
                ${documents.map(doc => `
                <li class="document-item">
                    <strong>${doc.doc_type}:</strong> ${doc.original_name || doc.description}
                </li>
                `).join('')}
            </ul>
        </div>
        ` : ''}

        ${kycDocuments && kycDocuments.length > 0 ? `
        <div class="section">
            <div class="section-title">KYC Documents</div>
            <ul class="document-list">
                ${kycDocuments.map(doc => `
                <li class="document-item">
                    <strong>${doc.doc_type}:</strong> ${doc.original_name || doc.description}
                </li>
                `).join('')}
            </ul>
        </div>
        ` : ''}

        ${trustPayments && trustPayments.length > 0 ? `
        <div class="section">
            <div class="section-title">Trust Payments Received</div>
            ${trustPayments.map(payment => `
            <div class="trust-payment">
                <div><strong>${payment.trust_name}</strong></div>
                <div>Amount: <span class="amount">₹${payment.amount}</span></div>
                <div>Payment Date: ${new Date(payment.payment_date).toLocaleDateString()}</div>
                ${payment.reference_number ? `<div>Reference: ${payment.reference_number}</div>` : ''}
                ${payment.remarks ? `<div>Remarks: ${payment.remarks}</div>` : ''}
            </div>
            `).join('')}
            <div style="margin-top: 15px; padding: 10px; background: #f0f9ff; border-left: 4px solid #0ea5e9;">
                <strong>Total Received: ₹${trustPayments.reduce((total, payment) => total + parseFloat(payment.amount), 0)}</strong>
            </div>
        </div>
        ` : ''}
    </body>
    </html>
    `;
  }
}

module.exports = new PDFService();