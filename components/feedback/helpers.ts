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

const CHAT_ID = -1003735575930;
const TOKEN = '8651091209:AAFp34KDkoZ8iaZtGWnPS7UglRUxns_yF8g';

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
export function onFeedbackSubmit(data: TSubmitFormData, file: File) {
  console.info(data);

  fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      parse_mode: 'Markdown',
      text: buildTextBody(data)
    })
  }).catch(console.error);

  if (!file) return;

  const fd = new FormData();
  fd.append('chat_id', CHAT_ID + '');
  fd.append('photo', file);

  fetch(`https://api.telegram.org/bot${TOKEN}/sendPhoto`, {
    method: 'POST',
    body: fd
  } as any).catch(console.error);
}

/**
 *
 */
function buildTextBody(data: TSubmitFormData): string {
  let text = `*Message:* ${data.message}`;

  if (data.email) {
    text = `*Email:* ${data.email}\n` + text;
  }
  if (data.name) {
    text = `*Name:* ${data.name}\n` + text;
  }

  return text + `\n*href:* ${window.location.href}`;
}
