'use client';
import { PureComponent } from 'react';

import './SearchModule.scss';
import { lookFor } from '@/components/search/SearchModule/helpers';
import { navigate } from '@/other/router/navigate';
import PageList from '@/components/search/PageList/PageList';
import SearchControls from '@/components/search/SearchControls/SearchControls';
import SearchResults from '@/components/search/SearchResults/SearchResults';
import { translate } from '@/other/i18n';

import type { TSearchResult, TSearchResultItem } from '@/components/search/SearchModule/types';
import type { TPage } from '@/types/search';

const SINGLE_MATCH_DELAY_MS = 1000;
const EXACT_MATCH_DELAY_MS = 2000;

/**/
type Props = {
  bookId: string;
  pages: TPage[];
};

type State = {
  hasMore?: boolean;
  hasNotFound?: boolean;
  isLoading?: boolean;
  page?: number;
  pendingPage?: string;
  pendingPageDurationMs?: number;
  query?: string;
  results?: Array<TSearchResultItem>;
  resultsForQuery?: string;
};

/**
 *
 */
class SearchModule extends PureComponent<Props, State> {
  redirectTimer: ReturnType<typeof setTimeout> | null = null;

  findExactPageMatch = (query: string) => this.props.pages.find((p) => p.page === query);

  startPendingNavigation = (match: { page: string; path: string }, delayMs: number) => {
    this.setState({ pendingPage: match.page, pendingPageDurationMs: delayMs });
    this.redirectTimer = setTimeout(() => {
      navigate(match.path);
    }, delayMs);
  };

  state: State = {
    hasMore: false,
    hasNotFound: false,
    isLoading: false,
    page: 1,
    pendingPage: '',
    pendingPageDurationMs: SINGLE_MATCH_DELAY_MS,
    query: '',
    results: [],
    resultsForQuery: ''
  };

  /**/
  handleClear = () => {
    if (this.redirectTimer) clearTimeout(this.redirectTimer);
    this.setState({
      hasNotFound: false,
      pendingPage: '',
      query: '',
      results: []
    });
  };

  /**/
  componentWillUnmount() {
    if (this.redirectTimer) clearTimeout(this.redirectTimer);
  }

  /**/
  handleInput = (query: string) => {
    this.setState({ query });

    if (this.redirectTimer) clearTimeout(this.redirectTimer);

    if (/^\d+$/.test(query)) {
      const { pages } = this.props;
      const filtered = pages.filter((p) => p.page.startsWith(query));

      if (filtered.length === 1) {
        this.startPendingNavigation(filtered[0], SINGLE_MATCH_DELAY_MS);
      } else {
        const exactMatch = filtered.find((p) => p.page === query);

        if (exactMatch) {
          this.startPendingNavigation(exactMatch, EXACT_MATCH_DELAY_MS);
        } else {
          this.setState({ pendingPage: '' });
        }
      }
    } else {
      this.setState({ pendingPage: '' });
    }
  };

  /**/
  handleMore = () => this.startSearch();

  /**/
  handleSubmit = () => {
    const { query } = this.state;

    if (!query) return;

    if (/^\d+$/.test(query)) {
      const exactMatch = this.findExactPageMatch(query);

      if (exactMatch) {
        navigate(exactMatch.path);
        return;
      }
    }

    this.startSearch();
  };

  /**/
  startSearch() {
    const { page, query, results, resultsForQuery } = this.state;
    if (!query) return;

    this.setState({
      isLoading: true,
      ...(page === 1 && {
        hasNotFound: false,
        results: []
      })
    });

    lookFor(query, page)
      .then(({ items, itemsTotal }: TSearchResult) => {
        let update: State = {};

        if (!items || itemsTotal === 0) {
          update = page === 1 ? { hasNotFound: true } : { hasMore: false };
        } else {
          update.results = resultsForQuery === query
            ? [...results, ...items]
            : items;

          if (update.results.length < itemsTotal) {
            update = {
              ...update,
              hasMore: true,
              page: page + 1
            };
          } else {
            update.hasMore = false;
          }
        }

        update.isLoading = false;
        update.resultsForQuery = query;

        this.setState(update);
      })
      .catch((e) => {
        this.setState({ isLoading: false });
        console.error(e);
      });
  }

  /**/
  render() {
    const { bookId, pages } = this.props;
    const { hasMore, hasNotFound, isLoading, pendingPage, pendingPageDurationMs, query, results } = this.state;

    const isNumericQuery = /^\d+$/.test(query);
    const filteredPages = isNumericQuery
      ? pages.filter((p) => p.page.startsWith(query))
      : pages;

    return (
      <div className="SearchModule">
        <header className="SearchModule__header">
          <SearchControls
            bookId={bookId}
            value={query}
            onInput={this.handleInput}
            onClear={this.handleClear}
            onSubmit={this.handleSubmit}
          />
        </header>

        <div className="SearchModule__content">
          {hasNotFound || isLoading || results.length > 0 || <PageList bookId={bookId} pages={filteredPages} pendingPage={pendingPage} pendingPageDurationMs={pendingPageDurationMs} />}

          {hasNotFound && (
            <div className="SearchModule__nothing">
              {translate(bookId, 'SEARCH_PAGE.NO_RESULTS')}
            </div>
          )}

          <SearchResults results={results} />

          {hasMore && (
            <div className="SearchModule__more">
              <button
                className="RoundButton RoundButton--dark"
                onClick={this.handleMore}
              >
                {translate(bookId, 'SEARCH_PAGE.LOAD_MORE')}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
}

/**/
export default SearchModule;
