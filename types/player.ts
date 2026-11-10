export type TPlayerStatus =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'ended'
  | 'error';

/** `type` is a registered plugin id; detected from `url` when omitted. */
export type TPlayerSource = {
  type?: string;
  url: string;
};

export type TPlayerSnapshot = {
  status: TPlayerStatus;
  position: number;
  duration: number | null;
};

export type TPlayerAction = {
  kind: 'link' | 'download';
  href: string;
  label: string;
};

export type TPlayerAdapterEvents = {
  onStatus: (status: TPlayerStatus) => void;
  onProgress: (position: number, duration: number | null) => void;
  onEnded: () => void;
  onError: (error?: unknown) => void;
};

/** Adapters must not touch the network until the first `play()`. */
export type TPlayerAdapter = {
  play: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
  destroy: () => void;
};

export type TPlayerSourcePlugin = {
  type: string;
  match: (url: string) => boolean;
  createAdapter: (url: string, events: TPlayerAdapterEvents) => TPlayerAdapter;
  getAction?: (url: string) => TPlayerAction | null;
};
