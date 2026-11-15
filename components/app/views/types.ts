import type { ReactNode } from 'react';
import type { TPageDataOf, TPageKind } from '@/types/pageData';

/**
 * Props of a page view. `extras` is server-rendered content (JSON-LD) that
 * belongs to the initially loaded page only.
 */
export type TViewProps<K extends TPageKind> = {
  extras?: ReactNode;
  page: TPageDataOf<K>;
};
