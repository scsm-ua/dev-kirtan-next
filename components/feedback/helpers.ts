import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import type { TFeedbackTranslations } from '@/types/translations';

/**/
export const MAX_IMAGE_SIZE = 2097152; // 2MB

export const FIELDS = {
  EMAIL: 'email',
  IMAGE: 'image',
  MESSAGE: 'message',
  NAME: 'name'
} as any;

/**/
export function getFormInit(t: TFeedbackTranslations) {
  return {
    defaultValues: {
      email: '',
      message: '',
      name: ''
    },
    resolver: zodResolver(
      z.object({
        email: z
          .email(t.FIELDS.EMAIL.VALIDATION.INVALID)
          .optional()
          .or(z.literal('')),
        message: z
          .string()
          .min(5, t.FIELDS.MESSAGE.VALIDATION.MIN_LENGTH)
          .max(1000, t.FIELDS.MESSAGE.VALIDATION.MAX_LENGTH),
        name: z.string().max(80, t.FIELDS.NAME.VALIDATION.MAX_LENGTH)
      }) as any
    )
  } as any;
}

/**/
export type TSubmitFormData = {
  email: string;
  message: string;
  name: string;
};

/**
 *
 */
export async function onFeedbackSubmit(data: TSubmitFormData, file: File) {
  const endpoint = process.env.NEXT_PUBLIC_FEEDBACK_URL;
  if (!endpoint) throw new Error('Feedback endpoint is not configured');
  const fd = new FormData();
  fd.append('name', data.name);
  fd.append('email', data.email);
  fd.append('message', data.message);
  fd.append('href', window.location.href);
  if (file) fd.append('image', file);

  const response = await fetch(endpoint, {
    method: 'POST',
    body: fd
  });
  if (!response.ok) throw new Error('Feedback delivery failed');
}
