import '@/components/song/SongText/SongText.scss';
import './PageView.scss';

/**/
type Props = {
  bodyHtml: string;  // Rendered at build time by `renderMarkdownBody`.
};

/**
 * Renders a markdown `page` item inside the same white panel songs use
 * (`.SongText`), so pages sit visually in the song body column.
 */
function PageView({ bodyHtml }: Props) {
  return (
    <section className="SongText PageView">
      <div
        className="PageMarkdown"
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />
    </section>
  );
}

/**/
export default PageView;
