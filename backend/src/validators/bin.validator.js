const { z } = require('zod');

const binSchema = z.object({
  bin_id: z
    .string()
    .min(1, "Bin is required")
    .max(50, "Bin ID must be less than 50 characters"),

  location: z
    .string("Location is required")
    .min(1)
    .max(255, "Location must be less than 255 characters"),

  zone_id: z.preprocess(
    (val) => {
      if (val === null || val === undefined) return '';
      return String(val); 
    },
    z
      .string()
      .min(1, { message: 'Zone is required' })
      .transform((val) => Number(val))
      .refine((val) => !isNaN(val) && val > 0, {
        message: 'Zone ID must be a valid positive number',
      })
  ),

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

  status: z.enum(["active", "inactive","full"], {
    errorMap: () => ({ message: "Status must be active,inactive,full" }),
  }),

  bin_type: z
    .string()
    .max(50, "Bin type must be less than 50 characters")
    .nullable()
    .optional(),

  last_collection_date: z
    .string()
    .transform((val) => (val ? new Date(val) : null)) 
    .refine(
      (val) => val === null || !isNaN(val.getTime()),
      { message: "Last collection date must be a valid date" }
    )
    .nullable()
    .optional(),
});

module.exports = { binSchema };



