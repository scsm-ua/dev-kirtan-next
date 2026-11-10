import classNames from 'classnames';

import './IndexLink.scss';

/**/
type Props = {
  href: string;
  title: string;
  compact?: boolean;
  withSeparator?: boolean;
};

/**
 *
 */
function IndexLink({ href, title, compact, withSeparator }: Props) {
  return (
    <li className={classNames('IndexLink', compact && 'IndexLink--compact')}>
      {withSeparator && <header className="IndexLink__header" />}

      <div className="IndexLink__content">
        <a href={href} className="IndexLink__link">
          <h6 className="IndexLink__title">{title}</h6>

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
