/* eslint-disable @next/next/no-img-element */
import './Loader.scss';
import { PATH } from '@/other/constants';

/**
 *
 */
function Loader() {
  return (
    <div className="Loader">
      <div className="Loader__container">
        <img className="Loader__image" src={PATH.IMG.LOGO} alt="" />
      </div>
    </div>
  );
}

/**/
export default Loader;
