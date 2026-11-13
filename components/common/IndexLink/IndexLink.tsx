import classNames from 'classnames';

import './IndexLink.scss';

/**/
export type TIndexLinkIcon = 'aa' | 'az' | 'play';

type Props = {
  href: string;
  title: string;
  compact?: boolean;
  icon?: TIndexLinkIcon;
  withSeparator?: boolean;
};

/**/
const ICON_TEXT: Record<TIndexLinkIcon, string> = { aa: 'Aa', az: 'a-z', play: '' };

/**
 *
 */
function IndexLink({ href, title, compact, icon, withSeparator }: Props) {
  return (
    <li className={classNames('IndexLink', compact && 'IndexLink--compact')}>
      {withSeparator && <header className="IndexLink__header" />}

      <div className="IndexLink__content">
        <a href={href} className="IndexLink__link">
          <h6 className="IndexLink__title">
            {icon && (
              <span aria-hidden className={classNames('IndexLink__prefix', `IndexLink__prefix--${icon}`)}>
                {ICON_TEXT[icon]}
              </span>
            )}
            {title}
          </h6>

          <div className="IndexLink__suffix">
            <span className="IndexLink__icon icon-chevron-right" />
          </div>
        </a>
      </div>
    </li>
  );
}

/**/
export default IndexLink;
