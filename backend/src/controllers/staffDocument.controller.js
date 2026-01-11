const { StaffDocumentService } = require('../services/staffDocument.service');

class StaffDocumentController {
  /**
   * Get all staff documents
   */
  static async index(req, res) {
    try {
      const documents = await StaffDocumentService.getAllDocuments();
      return res.status(200).json({ success: true, data: documents });
    } catch (error) {
      console.error('Error fetching staff documents:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve staff documents',
      });
    }
  }

  /**
   * Create new staff document
   */
  static async store(req, res) {
    try {
      const data = req.body;
      if (req.file) {
        data.file = req.file.filename;
      }

      const document = await StaffDocumentService.createDocument(data);
      return res.status(201).json({
        success: true,
        message: 'Created successfully',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create staff document',
      });
    }
  }

  /**
   * Get staff document by ID
   */
  static async show(req, res) {
    try {
      const { id } = req.params;
      const document = await StaffDocumentService.getDocumentById(id);
      return res.status(200).json({ success: true, data: document });
    } catch (error) {
      if (error.message === 'Document not found') {
        return res.status(404).json({
          success: false,
          message: 'Document not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve staff document'
      });
    }
  }

  /**
   * Update staff document
   */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const data = req.body;
      if (req.file) {
        data.file = req.file.filename;
      }

      const document = await StaffDocumentService.updateDocument(id, data);
      return res.status(200).json({
        success: true,
        data: document,
        message: 'Updated successfully',
      });
    } catch (error) {
     if (error.message === 'Document not found') {
        return res.status(404).json({
          success: false,
          message: 'Document not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve staff document'
      });
    }
  }

  /**
   * Delete staff document
   */
  static async destroy(req, res) {
    try {
      const { id } = req.params;
      await StaffDocumentService.deleteDocument(id);
      return res.status(200).json({
        success: true,
        message: 'Deleted successfully',
      });
    } catch (error) {
      if (error.message === 'Document not found') {
        return res.status(404).json({
          success: false,
          message: 'Document not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve staff document'
      });
    }
  }
}

module.exports = { StaffDocumentController };