const { z } = require('zod');

// Store SMTP Config Schema
const storeSmtpConfigSchema = z.object({
  mailer: z
    .string()
    .min(1, { message: 'Mailer is required' })
    .max(191, { message: 'Mailer must not exceed 191 characters' }),

  host: z
    .string()
    .min(1, { message: 'Host is required' })
    .max(191, { message: 'Host must not exceed 191 characters' }),

  port: z
    .string()
    .min(1, { message: 'Port is required' })
    .max(191, { message: 'Port must not exceed 191 characters' })
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val > 0 && Number.isInteger(val), {
      message: 'Port must be a valid positive integer',
    }),

  username: z
    .string()
    .min(1, { message: 'Username is required' })
    .max(191, { message: 'Username must not exceed 191 characters' }),

  password: z
    .string()
    .min(1, { message: 'Password is required' })
    .max(191, { message: 'Password must not exceed 191 characters' }),

  mail_from_address: z
    .string()
    .min(1, { message: 'Mail from address is required' })
    .email({ message: 'Invalid email format' })
    .max(191, { message: 'Mail from address must not exceed 191 characters' }),
    
  mail_from_name: z
    .string()
    .min(1, { message: 'Mail from name is required' })
    .max(191, { message: 'Mail from name must not exceed 191 characters' }),
});

module.exports = { storeSmtpConfigSchema };