import { ReactNode } from 'react';
import classNames from 'classnames';
import './FormField.scss';

/**/
type Props = {
  children: ReactNode;
  className?: string;
  inputClassName?: string;
  label?: string;
  name: string;
  zodError: Object;
};

/**
 *
 */
function FormField({
  children,
  className,
  inputClassName,
  label,
  name,
  zodError
}: Props) {
  const msg = zodError[name]?.message;
  const cls = classNames('FormField', className);

  const inputCls = classNames(
    'FormField__input',
    inputClassName,
    msg && 'FormField__input--error'
  );

  return (
    <div className={cls}>
      <label htmlFor={name} className="FormField__label">
        {label && <span className="FormField__text">{label}</span>}

        {msg && (
          <>
            <span>&nbsp;</span>
            <span className="FormField__message">{msg}</span>
          </>
        )}
      </label>

      <div className={inputCls}>{children}</div>
    </div>
  );
}

/**/
export default FormField;
