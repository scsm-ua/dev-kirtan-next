declare module '*.scss' {
  const content: Record<string, string>;
  export default content;
}

/** Ids of all songbooks, in site order; set at build time (next.config.ts). */
declare const __BOOK_IDS__: Array<string>;

declare const __BUILD_INFO__: {
  branch: string;
  commit: string;
  builtTime: string;
  version: string;
};
