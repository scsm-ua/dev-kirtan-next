type Props = { className?: string };

/**/
function Svg({ className, children }: Props & { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      focusable="false"
      height="1em"
      viewBox="0 0 24 24"
      width="1em"
    >
      {children}
    </svg>
  );
}

/**/
export function PlayIcon(props: Props) {
  return (
    <Svg {...props}>
      <path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l10.6-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14z" />
    </Svg>
  );
}

/**/
export function PauseIcon(props: Props) {
  return (
    <Svg {...props}>
      <rect height="14" rx="1.5" width="4" x="6" y="5" />
      <rect height="14" rx="1.5" width="4" x="14" y="5" />
    </Svg>
  );
}

/**/
export function DownloadIcon(props: Props) {
  return (
    <Svg {...props}>
      <path d="M11 4a1 1 0 1 1 2 0v9.59l3.3-3.3a1 1 0 1 1 1.4 1.42l-5 5a1 1 0 0 1-1.4 0l-5-5a1 1 0 1 1 1.4-1.42l3.3 3.3V4z" />
      <path d="M5 19a1 1 0 0 0 0 2h14a1 1 0 1 0 0-2H5z" />
    </Svg>
  );
}

/**/
export function ExternalLinkIcon(props: Props) {
  return (
    <Svg {...props}>
      <path d="M14 4a1 1 0 1 0 0 2h2.59l-6.3 6.3a1 1 0 1 0 1.42 1.4L18 7.42V10a1 1 0 1 0 2 0V5a1 1 0 0 0-1-1h-5z" />
      <path d="M6 7a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-4a1 1 0 1 1 2 0v4a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3h4a1 1 0 1 1 0 2H6z" />
    </Svg>
  );
}

const MIRROR = 'matrix(-1 0 0 1 24 0)';
const PREV_PATH =
  'M6 5a1 1 0 0 1 1 1v12a1 1 0 1 1-2 0V6a1 1 0 0 1 1-1zM19 5.9v12.2a1 1 0 0 1-1.55.83L8.6 12.83a1 1 0 0 1 0-1.66l8.85-6.1A1 1 0 0 1 19 5.9z';
const REPLAY_PATH = 'M12 5V2L7 6l5 4V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z';

/**/
export function PrevTrackIcon(props: Props) {
  return (
    <Svg {...props}>
      <path d={PREV_PATH} />
    </Svg>
  );
}

/**/
export function NextTrackIcon(props: Props) {
  return (
    <Svg {...props}>
      <path d={PREV_PATH} transform={MIRROR} />
    </Svg>
  );
}

/**/
function SkipIcon({ forward, ...props }: Props & { forward?: boolean }) {
  return (
    <Svg {...props}>
      <path d={REPLAY_PATH} transform={forward ? MIRROR : undefined} />
      <text fontSize="8" fontWeight="700" textAnchor="middle" x="12" y="16">
        5
      </text>
    </Svg>
  );
}

/**/
export function Replay5Icon(props: Props) {
  return <SkipIcon {...props} />;
}

/**/
export function Forward5Icon(props: Props) {
  return <SkipIcon {...props} forward />;
}

/**/
export function CloseIcon(props: Props) {
  return (
    <Svg {...props}>
      <path d="M6.7 5.3a1 1 0 0 0-1.4 1.4L10.58 12l-5.3 5.3a1 1 0 1 0 1.42 1.4L12 13.42l5.3 5.3a1 1 0 0 0 1.4-1.42L13.42 12l5.3-5.3a1 1 0 0 0-1.42-1.4L12 10.58 6.7 5.3z" />
    </Svg>
  );
}
