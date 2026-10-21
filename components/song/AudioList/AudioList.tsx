'use client';
import { PureComponent } from 'react';

import './AudioList.scss';
import AudioListItem from '@/components/song/AudioList/AudioListItem';
import type { TAudio } from '@/types/resources';

/**/
type Props = {
  audio: Array<TAudio>;
  caption: string;
  language: string;
};

type State = {
  hasLibLoaded: boolean;
};

/**
 *
 */
class AudioList extends PureComponent<Props, State> {
  private static readonly LIB_URL = 'https://w.soundcloud.com/player/api.js';
  state: State = { hasLibLoaded: false };

  /**/
  handleOpen = (isOpen: boolean) => {
    if (!isOpen || this.state.hasLibLoaded) return;

    const script = document.createElement('script');
    script.src = AudioList.LIB_URL;
    script.onload = (e) => this.onLibLoad(e);
    script.onerror = window.console.error;
    document.body.appendChild(script);
  };

  /**/
  onLibLoad = (e) => this.setState({ hasLibLoaded: true });

  /**/
  render() {
    const { audio, caption, language } = this.props;

    return (
      <section className="AudioList">
        {caption && <h2 className="AudioList__caption">{caption}</h2>}

        <ul className="AudioList__list">
          {audio.map((a: TAudio) => {
            const title = a.title[language] || a.title.en;

            return (
              <AudioListItem
                hasLibLoaded={this.state.hasLibLoaded}
                key={a.embed_url}
                onOpenChange={this.handleOpen}
                title={title}
                url={a.embed_url}
              />
            );
          })}
        </ul>
      </section>
    );
  }
}

/**/
export default AudioList;
