import AudioPage from '@/components/audio/AudioPage';
import BookDescription from '@/components/common/BookDescription/BookDescription';

import type { TViewProps } from '@/components/app/views/types';

/** Audio index and singer playlist share one view. */
function AudioView({ extras, page }: TViewProps<'audio'> | TViewProps<'audio-singer'>) {
  const { book, singers, tracks } = page.data;
  const selected = page.kind === 'audio-singer' ? page.data.selected : undefined;

  return (
    <div className="Main__container AudioPage">
      <div className="IndexPage__title">
        <BookDescription bookDescription={book} />
      </div>

      <div className="Main__content">
        <AudioPage
          bookId={page.route.bookId}
          selected={selected}
          singers={singers}
          tracks={tracks}
        />
      </div>

      {extras}
    </div>
  );
}

/**/
export default AudioView;
