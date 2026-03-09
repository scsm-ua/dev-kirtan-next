'use client';
import { lazy } from 'react';
import { useState } from 'react';

import './FeedbackWidget.scss';

import AppModal from '@/components/common/Modal/AppModal';
import { translate } from '@/other/i18n';
import type { TFeedbackTranslations } from '@/types/translations';

/**/
type Props = {
  bookId: string;
};

const Form = lazy(() => import('./FeedbackForm'));

/**
 *
 */
function FeedbackWidget({ bookId }: Props) {
  const [isOpen, setOpen] = useState<boolean>(false);
  const t = (translate(bookId, 'FEEDBACK') as any) as TFeedbackTranslations;

  const handleOpen = () => setOpen(!isOpen);
  const header = (
    <div className="FeedbackWidget__header">{t.TITLE}</div>
  );

  return (
    <div className="FeedbackWidget">
      <button className="AppButton FeedbackWidget__button" onClick={handleOpen}>
        {t.TRIGGER_TEXT}
      </button>

      <AppModal header={header} isOpen={isOpen} onClose={handleOpen}>
        <Form translations={t} />
      </AppModal>
    </div>
  );
}

/**/
export default FeedbackWidget;
