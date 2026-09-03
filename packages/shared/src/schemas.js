import { z } from 'zod';

/**
 * Validates a POST /certificates request body — the request shape from
 * docs/api/certificate-endpoints.md made enforceable. Shared between the API
 * (server-side validation) and the web app (client-side form validation),
 * so the two can never silently drift apart.
 */
export const issuanceRequestSchema = z.object({
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
});
