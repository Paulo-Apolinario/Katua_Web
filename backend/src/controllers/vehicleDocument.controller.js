const { VehicleDocumentService } = require('../services/vehicleDocument.service');

class VehicleDocumentController {
  /**
   * Get all vehicle documents
   */
  static async index(req, res) {
    try {
      const documents = await VehicleDocumentService.getAllDocuments();
      return res.status(200).json({ success: true, data: documents });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve vehicle documents',
      });
    }
  }

  /**
   * Create new vehicle document
   */
  static async store(req, res) {
    try {
      const data = req.body;
      if (req.file) {
        data.file = req.file.filename;
      }
      
      const document = await VehicleDocumentService.createDocument(data);
      return res.status(201).json({
        success: true,
        message: 'Created successfully',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create vehicle document',
      });
    }
  }

  /**
   * Get vehicle document by ID
   */
  static async show(req, res) {
    try {
      const { id } = req.params;
      const document = await VehicleDocumentService.getDocumentById(id);
      return res.status(200).json({ success: true, data: document });
    } catch (error) {
      return res.status(error.message === 'Document not found' ? 404 : 500).json({
        success: false,
        message: error.message === 'Document not found' ? 'Document not found' : 'Failed to retrieve vehicle document',
      });
    }
  }

  /**
   * Update vehicle document
   */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const data = req.body;
      if (req.file) {
        data.file = req.file.filename;
      }

      console.log(data);

      const document = await VehicleDocumentService.updateDocument(id, data);
      return res.status(200).json({
        success: true,
        data: document,
        message: 'Updated successfully',
      });
    } catch (error) {
      return res.status(error.message === 'Document not found' ? 404 : 500).json({
        success: false,
        message: error.message === 'Document not found' ? 'Document not found' : 'Failed to update vehicle document',
      });
    }
  }

  /**
   * Delete vehicle document
   */
  static async destroy(req, res) {
    try {
      const { id } = req.params;
      await VehicleDocumentService.deleteDocument(id);
      return res.status(200).json({
        success: true,
        message: 'Deleted successfully',
      });
    } catch (error) {
      return res.status(error.message === 'Document not found' ? 404 : 500).json({
        success: false,
        message: error.message === 'Document not found' ? 'Document not found' : 'Failed to delete vehicle document',
      });
    }
  }
}

module.exports = { VehicleDocumentController };