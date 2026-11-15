import { createContext } from 'react';

/**
 * Path of the page a component is rendered in. Provided by the app root, since
 * during a client navigation the new view renders before the URL changes.
 * `null` outside the app (e.g. the player test page).
 */
export const PagePathContext = createContext<string | null>(null);
