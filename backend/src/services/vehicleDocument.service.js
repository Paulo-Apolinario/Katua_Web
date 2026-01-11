const { getDb } = require('../config/db');
const { vehicleDocuments } = require('../models/vehicleDocument.model');
const { vehicles } = require('../models/vehicle.model');
const { eq } = require('drizzle-orm');
const fs = require('fs').promises;
const path = require('path');
const { logSystemAlert } = require('../utils/helpers');

class VehicleDocumentService {
  /**
   * Fetch all vehicle documents with related vehicle information
   */
  static async getAllDocuments() {
    try {
      const db = await getDb(); // Get db instance
      const allDocuments = await db.select({
        id: vehicleDocuments.id,
        vehicle_id: vehicleDocuments.vehicle_id,
        document_type: vehicleDocuments.document_type,
        document_number: vehicleDocuments.document_number,
        issue_date: vehicleDocuments.issue_date,
        expiry_date: vehicleDocuments.expiry_date,
        file: vehicleDocuments.file,
        created_at: vehicleDocuments.created_at,
        updated_at: vehicleDocuments.updated_at,
        vehicle: {
          id: vehicles.id,
          vehicle_number: vehicles.vehicle_number,
          vehicle_type: vehicles.vehicle_type,
        },
      })
        .from(vehicleDocuments)
        .leftJoin(vehicles, eq(vehicleDocuments.vehicle_id, vehicles.id)); // Join with vehicles table

      return allDocuments;
    } catch (error) {
      await logSystemAlert('error', 'Error fetching vehicle documents', error.message);
      throw new Error('Failed to retrieve vehicle documents');
    }
  }

  /**
   * Fetch a single vehicle document by ID
   */
  static async getDocumentById(id) {
    try {
      const db = await getDb(); // Get db instance
      const [document] = await db.select().from(vehicleDocuments).where(eq(vehicleDocuments.id, id));
      if (!document) {
        throw new Error('Document not found');
      }
      return document;
    } catch (error) {
      await logSystemAlert('error', 'Error fetching vehicle document', error.message);
      throw new Error('Failed to retrieve vehicle document');
    }
  }

  /**
   * Create a new vehicle document
  */
  static async createDocument(data) {
    try {
      const db = await getDb(); // Get db instance
      const [document] = await db.insert(vehicleDocuments).values({
        ...data,
        created_at: new Date(),
        updated_at: new Date(), 
      });
      return document;
    } catch (error) {
      await logSystemAlert('error', 'Error creating vehicle document', error.message);
      throw new Error('Failed to create vehicle document');
    }
  }

  /**
   * Update an existing vehicle document
  */
  static async updateDocument(id, data) {
    try {
      const db = await getDb(); // Get db instance
      const [existingDocument] = await db.select().from(vehicleDocuments).where(eq(vehicleDocuments.id, id));
      if (!existingDocument) {
        throw new Error('Document not found');
      }

      // Delete old file if new file is uploaded
      if (data.file && existingDocument.file) {
        await fs.unlink(path.join('uploads/vehicle_documents/', existingDocument.file)).catch(() => { });
      }

      const updateData = { ...data, updated_at: new Date() };

      // Prevent overwriting file path if no new file
      if (!updateData.file) {
        delete updateData.file;
      }

      await db.update(vehicleDocuments)
        .set(updateData)
        .where(eq(vehicleDocuments.id, id));

      return await this.getDocumentById(id); // Return updated document
    } catch (error) {
      await logSystemAlert('error', 'Error updating vehicle document', error.message);
      throw new Error('Failed to update vehicle document');
    }
  }

  /**
   * Delete a vehicle document
  */
  static async deleteDocument(id) {
    try {
      const db = await getDb(); // Get db instance
      const [existingDocument] = await db.select().from(vehicleDocuments).where(eq(vehicleDocuments.id, id));
      if (!existingDocument) {
        throw new Error('Document not found');
      }

      // Delete file
      if (existingDocument.file) {
        await fs.unlink(path.join('uploads/vehicle_documents/', existingDocument.file)).catch(() => { });
      }

      await db.delete(vehicleDocuments).where(eq(vehicleDocuments.id, id)); // Delete document record
      return true;
    } catch (error) {
      console.log(error);
      await logSystemAlert('error', 'Error deleting vehicle document', error.message);
      throw new Error('Failed to delete vehicle document');
    }
  }
}

module.exports = { VehicleDocumentService };