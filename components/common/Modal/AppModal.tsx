import { ReactNode } from 'react';
import { Modal } from 'react-responsive-modal';

import 'react-responsive-modal/styles.css';
import './AppModal.scss';
import { isMobile } from '@/other/utils';

/**/
type Props = {
  children: ReactNode | string;
  header?: ReactNode | string;
  isOpen: boolean;
  onClose: () => void;
};

/**/
const closeIcon = <span className="AppModal__close icon-xmark-large" />;

const MODAL_CLASS_NAMES = {
  modal: 'AppModal__container',
  overlay: 'AppModal__mask',
  closeButton: 'AppModal__button'
};

/**
 *
 */
function AppModal({ children, header, isOpen, onClose }: Props) {
  return (
    <Modal
      center
      classNames={MODAL_CLASS_NAMES}
      closeIcon={closeIcon}
      closeOnOverlayClick={!isMobile()}
      onClose={onClose}
      open={isOpen}
    >
      <div className="AppModal__content">
        <header className="AppModal__header">
          {header && (
            <h3 className="AppModal__title">{header}</h3>
          )}
        </header>

        <main className="AppModal__main">{children}</main>
      </div>
    </Modal>
  );
}

/**/
export default AppModal;
