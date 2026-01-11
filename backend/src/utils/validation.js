const { z, ZodError } = require('zod');

/**
 * Validation middleware factory
 * @param {Object} schema - Zod schema to validate against
 * @returns {Function} Express middleware function
 */
function validate(schema) {
  return async (req, res, next) => {  
    try {
      const validatedData = await schema.parseAsync(req.body); 
      req.body = validatedData;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = {};
        
        error.issues.forEach(issue => {
          const field = issue.path.join('.') || 'root';
          
          if (!errors[field]) {
            errors[field] = [];
          }
          
          errors[field].push(issue.message);
        });

        return res.status(422).json({
          message: 'The given data was invalid.',
          errors
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  };
}

/**
 * Validation middleware for query parameters
 * @param {Object} schema - Zod schema to validate against
 * @returns {Function} Express middleware function
 */
function validateQuery(schema) {
  return (req, res, next) => {
    try {
      const validatedData = schema.parse(req.query);
      req.query = validatedData;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = {};
        
        error.issues.forEach(issue => {
          const field = issue.path.join('.') || 'root';
          
          if (!errors[field]) {
            errors[field] = [];
          }
          
          errors[field].push(issue.message);
        });
        
        return res.status(422).json({
          message: 'The given data was invalid.',
          errors
        });
      }
      
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  };
}

/**
 * Validation middleware for URL parameters
 * @param {Object} schema - Zod schema to validate against
 * @returns {Function} Express middleware function
 */
function validateParams(schema) {
  return (req, res, next) => {
    try {
      const validatedData = schema.parse(req.params);
      req.params = validatedData;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = {};
        
        error.issues.forEach(issue => {
          const field = issue.path.join('.') || 'root';
          
          if (!errors[field]) {
            errors[field] = [];
          }
          
          errors[field].push(issue.message);
        });
        
        return res.status(422).json({
          message: 'The given data was invalid.',
          errors
        });
      }
      
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  };
}

/**
 * Common pagination query schema
 */
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

/**
 * ID parameter validation schema
 */
const idParamSchema = z.object({
  id: z.string().transform((val) => {
    const parsed = parseInt(val, 10);
    if (isNaN(parsed)) {
      throw new Error('Invalid ID format');
    }
    return parsed;
  })
});

module.exports = {
  validate,
  validateQuery,
  validateParams,
  paginationSchema,
  idParamSchema
};