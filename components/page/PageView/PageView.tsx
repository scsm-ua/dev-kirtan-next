import '@/components/song/SongText/SongText.scss';
import './PageView.scss';

import { renderMarkdownBody } from '@/other/markdown';

import type { TPage } from '@/types/page';

/**/
type Props = {
  page: TPage;
};

/**
 * Renders a markdown `page` item inside the same white panel songs use
 * (`.SongText`), so pages sit visually in the song body column.
 */
function PageView({ page }: Props) {
  return (
    <main className="SongText PageView">
      <div
        className="PageMarkdown"
        dangerouslySetInnerHTML={{ __html: renderMarkdownBody(page.body) }}
      />
    </main>
  );
}

/**/
export default PageView;
