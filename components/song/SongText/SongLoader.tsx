import 'react-loading-skeleton/dist/skeleton.css';
import Skeleton  from 'react-loading-skeleton';

import './SongLoader.scss';

/**
 *
 */
function SongLoader() {
  return (
    <div className="SongLoader">
      <header className="SongLoader__header">
        <Skeleton
          circle
          containerClassName="SongLoader__avatar"
          height={36}
          width={36}
        />

        <Skeleton
          containerClassName="SongLoader__title"
          width={200}
        />
      </header>

      <div className="SongLoader__main">
        <Skeleton containerClassName="SongLoader__span" height={20} />
        <Skeleton containerClassName="SongLoader__span" height={20} />

        <div className="SongLoader__block">
          <Skeleton count={3} />
        </div>
      </div>
    </div>
  );
}

/**/
export default SongLoader;
