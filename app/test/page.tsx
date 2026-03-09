// @ts-nocheck
'use client';

import './TestPage.scss';
import FormField from '@/components/common/form/FormField/FormField';
import { FileDropzone } from '@/components/common/form/upload/FileDropzone/FileDropzone';
import { FileItem } from '@/components/common/form/upload/FileItem/FileItem';

/**
 *
 */
export default function TestPage() {
  const file = new File(["foo"], "a_file name-1234.png", {
    type: "image/png",
  });

  return (
    <html lang="en">
      <body>
        <div className="TestPage">
          <div className="TestPage__block">
            {/*<input*/}
            {/*  autoFocus*/}
            {/*  className="AppTextInput AppTextInput--gray"*/}
            {/*  placeholder="Enter your request"*/}
            {/*  type="text"*/}
            {/*/>*/}
            {/*<br/>*/}
            {/*<br/>*/}

            {/*<input*/}
            {/*  className="AppTextInput AppTextInput--gray"*/}
            {/*  placeholder="Enter your request"*/}
            {/*  type="text"*/}
            {/*/>*/}
            {/*<br/>*/}
            {/*<br/>*/}

            {/*<textarea*/}
            {/*  className="AppTextInput AppTextInput--area AppTextInput--gray"*/}
            {/*  placeholder="Enter your message"*/}
            {/*  rows="3"*/}
            {/*/>*/}
            {/*<br/>*/}
            {/*<br/>*/}

            <FormField
              label="Name"
              name="name"
              zodError={{ name: { message: 'Name can be at most 80 symbols.' } }}
            >
              <input
                className="AppTextInput AppTextInput--gray"
                placeholder="Enter your name"
                type="text"
              />
            </FormField>

            <FormField
              label="E-mail"
              name="email"
              // zodError={{ email: { message: 'Invalid email.' } }}
              zodError={{}}
            >
              <input
                className="AppTextInput AppTextInput--gray"
                placeholder="Enter your email"
                type="text"
              />
            </FormField>

            <FormField
              inputClassName="FormField__input--large"
              label="Message"
              name="message"
              // zodError={{ email: { message: 'Invalid email.' } }}
              zodError={{}}
            >
               <textarea
                 className="AppTextInput AppTextInput--area AppTextInput--gray"
                 placeholder="Enter your message"
                 rows={3}
               />
            </FormField>

            <FormField
              inputClassName="FormField__input--large"
              label="Message"
              name="message"
              zodError={{ message: { message: 'Message requires at least 5 symbols.' } }}
            >
               <textarea
                 className="AppTextInput AppTextInput--area AppTextInput--gray"
                 placeholder="Enter your message"
                 rows={3}
               />
            </FormField>

            <FormField
              inputClassName="FormField__input--dashed FormField__input--large"
              name="image"
              zodError={{ image: { message: 'Max image size is 5MB.' } }}
            >
              <FileDropzone></FileDropzone>
            </FormField>

            <FormField
              inputClassName="FormField__input--dashed FormField__input--large"
              name="image"
              zodError={{}}
            >
              <FileDropzone></FileDropzone>
            </FormField>

            <FileItem file={file} />
          </div>
        </div>
      </body>
    </html>
  );
}
