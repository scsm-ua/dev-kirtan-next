import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import {
  FIELDS, getFormInit,
  MAX_IMAGE_SIZE,
  onFeedbackSubmit,
  type TSubmitFormData
} from '@/components/feedback/helpers';
import FileUpload from '@/components/common/form/upload/FileUpload/FileUpload';
import FormField from '@/components/common/form/FormField/FormField';

import type { TFeedbackTranslations } from '@/types/translations';

type Props = {
  onFinish: () => void;
  translations: TFeedbackTranslations;
};

/**
 *
 */
function FormInner({ onFinish, translations: t }: Props) {
  const [file, setFile] = useState<File>(null);

  useEffect(() => {
    // Forcing focus. Weird, but the attribute doesn't work.
    document.getElementById(FIELDS.NAME).focus();
  }, []);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors }
  } = useForm<TSubmitFormData>(getFormInit(t));

  const onFile = (file: File | null) => {
    setFile(file);
    file || setError(FIELDS.IMAGE, null);
  };

  const onSubmit = (data: TSubmitFormData) => {
    if (file && !file.type.startsWith('image/')) {
      return setError(FIELDS.IMAGE, {
        message: t.FIELDS.IMAGE.VALIDATION.TYPE
      });
    }
    if (file?.size > MAX_IMAGE_SIZE) {
      return setError(FIELDS.IMAGE, {
        message: t.FIELDS.IMAGE.VALIDATION.SIZE
      });
    }

    onFeedbackSubmit(data, file);
    onFinish();
  };

  return (
    <form
      className="FeedbackWidget__form"
      noValidate
      onSubmit={handleSubmit(onSubmit)}
    >
      <FormField
        label={t.FIELDS.NAME.LABEL}
        name={FIELDS.NAME}
        zodError={errors}
      >
        <input
          autoFocus
          className="AppTextInput AppTextInput--gray"
          id={FIELDS.NAME}
          type="text"
          // @ts-ignore
          {...register(FIELDS.NAME)}
        />
      </FormField>

      <FormField
        label={t.FIELDS.EMAIL.LABEL}
        name={FIELDS.EMAIL}
        zodError={errors}
      >
        <input
          className="AppTextInput AppTextInput--gray"
          id={FIELDS.EMAIL}
          type="email"
          // @ts-ignore
          {...register(FIELDS.EMAIL)}
        />
      </FormField>

      <FormField
        inputClassName="FormField__input--large"
        label={t.FIELDS.MESSAGE.LABEL}
        name={FIELDS.MESSAGE}
        zodError={errors}
      >
        <textarea
          className="AppTextInput AppTextInput--area AppTextInput--gray"
          id={FIELDS.MESSAGE}
          // @ts-ignore
          {...register(FIELDS.MESSAGE)}
          rows={3}
        />
      </FormField>

      <FileUpload
        errors={errors}
        file={file}
        onFile={onFile}
        subtext={t.FIELDS.IMAGE.SUBTEXT}
        text={t.FIELDS.IMAGE.TEXT}
      />

      <div className="FeedbackWidget__footer">
        <input
          className="AppButton FeedbackWidget__submit"
          type="submit"
          value={t.FIELDS.SUBMIT}
        />
      </div>
    </form>
  );
}

/**/
export default FormInner;
