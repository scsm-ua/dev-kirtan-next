/**/
export type TAudio = {
  embed_url: string;
  iframe_url: string;
  title: TI18n;
};

/**/
export type TI18n = {
  en?: string;
  es?: string;
  lv?: string;
  pt?: string;
  ru?: string;
  ua?: string;
};

/**/
export type TImage = {
  src: string;
  type: string;
  width: number;
  height: number;
  length: number;
};

/**/
export type TResource = {
  audio?: Array<TAudio>;
  image?: TImage;
};
