import { z } from 'zod';

/**
 * Per-certificateType attribute shapes for the `attributes` JSONB column
 * (db/migrations/005_create_certificate.sql). Each type only accepts the
 * keys relevant to it — an institution can't slip an arbitrary attribute
 * bag into what eventually enters the hashed certificate content.
 */
const degreeAttributesSchema = z
  .object({
    cgpa: z.number().min(0).max(10).optional(),
    honours: z.boolean().optional(),
  })
  .strict()
  .optional();

const diplomaAttributesSchema = z
  .object({
    grade: z.string().trim().min(1).max(20).optional(),
  })
  .strict()
  .optional();

const courseCompletionAttributesSchema = z
  .object({
    durationHours: z.number().positive().optional(),
  })
  .strict()
  .optional();

const ATTRIBUTES_SCHEMA_BY_TYPE = {
  DEGREE: degreeAttributesSchema,
  DIPLOMA: diplomaAttributesSchema,
  COURSE_COMPLETION: courseCompletionAttributesSchema,
};

/**
 * Validates a POST /certificates request body — the request shape from
 * docs/api/certificate-endpoints.md made enforceable. Shared between the API
 * (server-side validation) and the web app (client-side form validation),
 * so the two can never silently drift apart.
 */
export const issuanceRequestSchema = z
  .object({
    holderName: z.string().trim().min(2).max(120),
    holderEmail: z.string().trim().email(),
    enrollmentNumber: z.string().trim().min(1).max(64),
    title: z.string().trim().min(1).max(200),
    certificateType: z.enum(['DEGREE', 'DIPLOMA', 'COURSE_COMPLETION']),
    course: z.string().trim().min(1).max(200),
    gradeOrResult: z.string().trim().max(120).optional(),
    issueDate: z
      .string()
      .refine((value) => !Number.isNaN(Date.parse(value)), 'Enter a valid issue date.')
      .refine((value) => new Date(value).getTime() <= Date.now(), 'The issue date cannot be in the future.'),
    attributes: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((value, ctx) => {
    const attributesSchema = ATTRIBUTES_SCHEMA_BY_TYPE[value.certificateType];
    const result = attributesSchema.safeParse(value.attributes);
    if (!result.success) {
      for (const issue of result.error.issues) {
        ctx.addIssue({
          ...issue,
          path: ['attributes', ...issue.path],
        });
      }
    }
  });

/** Validates the `:id` route param on GET /certificates/:id. */
export const certificateIdParamSchema = z.object({
  id: z.string().uuid(),
});

/** Certificate number format: <INSTITUTION_CODE>-<YYYY>-<12-char Crockford Base32> (DP-01). */
export const certificateNumberSchema = z
  .string()
  .regex(
    /^[A-Z0-9]{3,8}-\d{4}-[0-9A-HJKMNP-TV-Z]{12}$/,
    'This does not look like a SecureCred certificate identifier.',
  );

/** Validates the `:certificateNumber` route param on GET /certificates/verify/:certificateNumber. */
export const certificateNumberParamSchema = z.object({
  certificateNumber: certificateNumberSchema,
});

/** Validates POST /certificates/:id/revoke's request body. */
export const revocationRequestSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, 'Explain why this credential is being revoked (10-160 characters).')
    .max(160, 'Explain why this credential is being revoked (10-160 characters).'),
});
