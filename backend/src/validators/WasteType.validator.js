const { z } = require('zod');

const wasteTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(191, 'Name must be less than 191 characters'),
  status: z.string().max(32).default('active')
});

module.exports = { wasteTypeSchema };
