'use client';
import { DragEvent, useRef } from 'react';

import { FileDropzone } from '@/components/common/form/upload/FileDropzone/FileDropzone';
import { FileItem } from '@/components/common/form/upload/FileItem/FileItem';
import FormField from '@/components/common/form/FormField/FormField';

/**/
type Props = {
  errors: Partial<Record<string, { message?: string }>>;
  file: File | null;
  onFile: (file: File | null) => void;
  subtext: string;
  text: string;
};

/**
 *
 */
export default function FileUpload({ errors, file, onFile, subtext, text }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (files: FileList) => files && onFile(files[0]);
  const handleRemoveFile = () => onFile(null);

  const handleBoxClick = () => fileInputRef.current?.click();
  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    handleFileSelect(e.dataTransfer.files);
  };

  return (
    <>
      <FormField
        inputClassName="FormField__input--dashed FormField__input--large"
        name="image"
        zodError={errors}
      >
        <FileDropzone
          fileInputRef={fileInputRef}
          onBoxClick={handleBoxClick}
          onDrop={handleDrop}
          onFileSelect={handleFileSelect}
          subtext={subtext}
          text={text}
        />
      </FormField>

      <FileItem file={file} onRemove={handleRemoveFile} />
    </>
  );
}
