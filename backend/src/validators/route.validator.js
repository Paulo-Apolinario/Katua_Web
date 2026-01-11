const { z } = require('zod');

// Store Route Schema
const storeRouteSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'Route Name is required' })
    .max(100, { message: 'Name must not exceed 100 characters' }),
    
  zone_id: z
    .string()
    .min(1, { message: 'Zone is required' })
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val > 0, {
      message: 'Zone ID must be a valid positive number',
    }),
    
  vehicle_id: z
    .string()
    .transform((val) => (val ? Number(val) : null))
    .refine((val) => val === null || (!isNaN(val) && val > 0), {
      message: 'Vehicle ID must be a valid positive number or empty',
    })
    .nullable()
    .optional(),

  staff_id: z
    .string()
    .transform((val) => (val ? Number(val) : null))
    .refine((val) => val === null || (!isNaN(val) && val > 0), {
      message: 'Staff ID must be a valid positive number or empty',
    })
    .nullable()
    .optional(),

  start_location: z
    .string()
    .max(255, { message: 'Start location must not exceed 255 characters' })
    .nullable()
    .optional(),

  end_location: z
    .string()
    .max(255, { message: 'End location must not exceed 255 characters' })
    .nullable()
    .optional(),

  waypoints: z
    .string()
    .max(1000, { message: 'Waypoints must not exceed 1000 characters' })
    .nullable()
    .optional(),

  estimated_distance: z
    .string()
    .transform((val) => (val ? Number(val) : null))
    .refine((val) => val === null || (!isNaN(val) && val >= 0 && val <= 999999.99), {
      message: 'Estimated distance must be a number between 0 and 999999.99',
    })
    .nullable()
    .optional(),

  estimated_time: z
    .string()
    .max(50, { message: 'Estimated time must not exceed 50 characters' })
    .nullable()
    .optional(), 

  special_instructions: z
    .string()
    .max(1000, { message: 'Special instructions must not exceed 1000 characters' })
    .nullable()
    .optional(),

  status: z.enum(['active', 'inactive'], {
    required_error: 'Status is required',
    invalid_type_error: 'Status must be either active or inactive',
  }),
});

// Update Route Schema
const updateRouteSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'Route Name is required' })
    .max(100, { message: 'Name must not exceed 100 characters' })
    .optional(),

  zone_id: z
    .union([z.string(), z.number()])
    .transform((val) => {
      if (val === '' || val === null || val === undefined || val === 'null') {
        throw new z.ZodError([{
          code: 'custom',
          message: 'Zone is required',
          path: ['zone_id']
        }]);
      }
      const num = Number(val);
      return isNaN(num) ? val : num;
    })
    .refine((val) => !isNaN(Number(val)), { message: 'Zone is required' })
    .refine((val) => Number(val) > 0, {
      message: 'Zone ID must be a valid positive number',
    })
    .transform((val) => Number(val))
    .optional(),

  vehicle_id: z
    .union([z.string(), z.number(), z.null()])
    .transform((val) => {
      if (val === null || val === '' || val === undefined) return null;
      return Number(val);
    })
    .refine((val) => val === null || (!isNaN(val) && val > 0), {
      message: 'Vehicle ID must be a valid number or empty',
    })
    .nullable()
    .optional(),

  staff_id: z
    .union([z.string(), z.number(), z.null()])
    .transform((val) => {
      if (val === null || val === '' || val === undefined) return null;
      return Number(val);
    })
    .refine((val) => val === null || (!isNaN(val) && val > 0), {
      message: 'Staff ID must be a valid number or empty',
    })
    .nullable()
    .optional(),
    

  start_location: z
    .string()
    .max(255, { message: 'Start location must not exceed 255 characters' })
    .nullable()
    .optional(),

  end_location: z
    .string()
    .max(255, { message: 'End location must not exceed 255 characters' })
    .nullable()
    .optional(),

  waypoints: z
    .string()
    .max(1000, { message: 'Waypoints must not exceed 1000 characters' })
    .nullable()
    .optional(),

  estimated_distance: z
    .string()
    .transform((val) => (val ? Number(val) : null))
    .refine((val) => val === null || (!isNaN(val) && val >= 0 && val <= 999999.99), {
      message: 'Estimated distance must be a number between 0 and 999999.99',
    })
    .nullable()
    .optional(),

  estimated_time: z
    .string()
    .max(50, { message: 'Estimated time must not exceed 50 characters' })
    .nullable()
    .optional(), 

  special_instructions: z
    .string()
    .max(1000, { message: 'Special instructions must not exceed 1000 characters' })
    .nullable()
    .optional(),

  status: z.enum(['active', 'inactive'], {
    invalid_type_error: 'Status must be either active or inactive',
  }).optional(),
});

module.exports = {
  storeRouteSchema,
  updateRouteSchema
};
