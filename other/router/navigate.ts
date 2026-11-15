import { parsePath } from '@/other/router/routes';

/**/
export type TNavigateOptions = {
  replace?: boolean;
};

type THandler = (url: URL, options: TNavigateOptions) => void;

let handler: THandler | null = null;

/** Set by the mounted app root; `null` outside it (analyze, 404). */
export function setNavigationHandler(next: THandler | null): void {
  handler = next;
}

/**
 * Client-side navigation to an internal href. Anything the app can't render
 * from page data (other origins, analyze, export, files) is a full load.
 */
export function navigate(href: string, options: TNavigateOptions = {}): void {
  const url = new URL(href, window.location.href);

  if (!handler || url.origin !== window.location.origin || !parsePath(url.pathname)) {
    if (options.replace) window.location.replace(url.href);
    else window.location.assign(url.href);
    return;
  }

  handler(url, options);
}
