const { getDb } = require('../config/db');
const { staffDocuments } = require('../models/staffDocument.model');
const { staff } = require('../models/staff.model');
const { eq } = require('drizzle-orm');
const fs = require('fs').promises;
const path = require('path');

class StaffDocumentService {
  /**
   * Fetch all documents with related staff information
   */
  static async getAllDocuments() {
    const db = await getDb(); // Get db instance
    return await db.select({
      id: staffDocuments.id,
      staff_id: staffDocuments.staff_id,
      document_type: staffDocuments.document_type,
      document_number: staffDocuments.document_number,
      issue_date: staffDocuments.issue_date,
      expiry_date: staffDocuments.expiry_date,
      file: staffDocuments.file,
      notes: staffDocuments.notes,
      created_at: staffDocuments.created_at,
      updated_at: staffDocuments.updated_at,
      staff: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
      },
    })
      .from(staffDocuments)
      .leftJoin(staff, eq(staffDocuments.staff_id, staff.id)); // Join with staff table
  }

  /**
   * Fetch a single document by ID
   */
  static async getDocumentById(id) {
    const db = await getDb(); // Get db instance
    const [document] = await db.select().from(staffDocuments).where(eq(staffDocuments.id, id));
    if (!document) {
      throw new Error('Document not found');
    }
    return document;
  }

  /**
   * Create a new document record
   */
  static async createDocument(data) {
    const db = await getDb(); // Get db instance
    const [document] = await db.insert(staffDocuments).values({
      ...data,
      created_at: new Date(), 
      updated_at: new Date(),
    });
  }

  /**
   * Update an existing document record
   */
  static async updateDocument(id, data) {
    const db = await getDb(); // Get db instance
    // Check if document exists
    const [existingDocument] = await db.select().from(staffDocuments).where(eq(staffDocuments.id, id));
    if (!existingDocument) {
      throw new Error('Document not found');
    }

    // Delete old file if new file is uploaded
    if (data.file && existingDocument.file) {
      await fs.unlink(path.join('uploads/staff_documents/', existingDocument.file)).catch(() => { });
    }

    const updateData = { ...data, updated_at: new Date() };

    // Don't overwrite file path if no new file
    if (!updateData.file) {
      delete updateData.file;
    }

    await db.update(staffDocuments)
      .set({ ...updateData })
      .where(eq(staffDocuments.id, id));

    return await this.getDocumentById(id); // Return updated record
  }

  /**
   * Delete a document record
   */
  static async deleteDocument(id) {
    const db = await getDb(); // Get db instance
    // Check if document exists
    const [existingDocument] = await db.select().from(staffDocuments).where(eq(staffDocuments.id, id));
    if (!existingDocument) {
      throw new Error('Document not found');
    }

    // Delete associated file
    if (existingDocument.file) {
      await fs.unlink(path.join('uploads/staff_documents/', existingDocument.file)).catch(() => { });
    }

    await db.delete(staffDocuments).where(eq(staffDocuments.id, id)); // Delete record
    return true;
  }
}

module.exports = { StaffDocumentService };