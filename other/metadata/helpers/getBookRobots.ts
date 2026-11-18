import { getBookDescriptionById } from '@/lib/books';
import { ROBOTS } from '@/other/metadata/helpers/constants';

export function getBookRobots(bookId: string) {
  const index = ROBOTS.index && !getBookDescriptionById(bookId).hidden;

  return {
    ...ROBOTS,
    index,
    googleBot: { ...ROBOTS.googleBot, index }
  };
}