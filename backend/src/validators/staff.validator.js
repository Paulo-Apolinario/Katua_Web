const { z } = require('zod');

// Store Staff Schema
const storeStaffSchema = z.object({
  vehicle_id: z
    .string()
    .transform((val) => (val ? Number(val) : null))
    .refine((val) => val === null || (!isNaN(val) && val > 0), {
      message: 'Vehicle ID must be a valid positive number or empty',
    })
    .nullable()
    .optional(),

  name: z
    .string()
    .min(1, { message: 'Name is required' })
    .max(100, { message: 'Name must not exceed 100 characters' }),
    
  email: z
    .string()
    .email({ message: 'Invalid email format' })
    .max(255, { message: 'Email must not exceed 255 characters' })
    .nullable()
    .optional(),

  phone: z
    .string()
    .min(1, { message: 'Phone number is required' })
    .max(20, { message: 'Phone number must not exceed 20 characters' })
    .regex(/^\+?[1-9]\d{1,18}$/, { message: 'Invalid phone number format' }),

  gender: z.enum(['male', 'female', 'other'], {
    required_error: 'Gender is required',
    invalid_type_error: 'Gender must be male, female, or other',
  }),

  date_of_birth: z
    .string()
    .refine((val) => !val || !isNaN(new Date(val).getTime()), {
      message: 'Date of birth must be a valid date',
    })
    .nullable()
    .optional(),

  nid_or_passport: z
    .string()
    .max(50, { message: 'NID or passport must not exceed 50 characters' })
    .nullable()
    .optional(),

  address: z
    .string()
    .max(1000, { message: 'Address must not exceed 1000 characters' })
    .nullable()
    .optional(),
  file: z.string().nullable().optional(),
  role: z
    .string()
    .min(1, { message: 'Role is required' })
    .max(100, { message: 'Role must not exceed 100 characters' }),

  joining_date: z
    .string()
    .min(1, { message: 'Joining date is required' })
    .refine(
      (val) => {
        const date = new Date(val);
        return !isNaN(date.getTime()) && date <= new Date();
      },
      { message: 'Joining date must be a valid date and not in the future' },
    ),

  status: z.enum(['active', 'inactive', 'suspended'], {
    required_error: 'Status is required',
    invalid_type_error: 'Status must be active, inactive, or suspended',
  }),
});

// Update Staff Schema
const updateStaffSchema = z.object({
  vehicle_id: z
    .string()
    .transform((val) => (val ? Number(val) : null))
    .refine((val) => val === null || (!isNaN(val) && val > 0), {
      message: 'Vehicle ID must be a valid positive number or empty',
    })
    .nullable()
    .optional(),

  name: z
    .string()
    .min(1, { message: 'Name is required' })
    .max(100, { message: 'Name must not exceed 100 characters' })
    .optional(),

  email: z
    .string()
    .email({ message: 'Invalid email format' })
    .max(255, { message: 'Email must not exceed 255 characters' })
    .nullable()
    .optional(),

  phone: z
    .string()
    .min(1, { message: 'Phone number is required' })
    .max(20, { message: 'Phone number must not exceed 20 characters' })
    .optional(),

  gender: z.enum(['male', 'female', 'other'], {
    invalid_type_error: 'Gender must be male, female, or other',
  }).optional(),

  date_of_birth: z
    .string()
    .refine((val) => !val || !isNaN(new Date(val).getTime()), {
      message: 'Date of birth must be a valid date',
    })
    .nullable()
    .optional(),

  nid_or_passport: z
    .string()
    .max(50, { message: 'NID or passport must not exceed 50 characters' })
    .nullable()
    .optional(),

  address: z
    .string()
    .max(1000, { message: 'Address must not exceed 1000 characters' })
    .nullable()
    .optional(),

  file: z.string().nullable().optional(),
  
  role: z.enum(['manager', 'driver', 'collector', 'admin'], {
    invalid_type_error: 'Role must be manager, driver, collector, or admin',
  }).optional(),

  joining_date: z
    .string()
    .refine((val) => !val || !isNaN(new Date(val).getTime()), {
      message: 'Joining date must be a valid date',
    })
    .optional(),

  status: z.enum(['active', 'inactive', 'suspended'], {
    invalid_type_error: 'Status must be active, inactive, or suspended',
  }).optional(),
});

module.exports = {
  storeStaffSchema,
  updateStaffSchema
};
