import './FileItem.scss';

/**/
interface Props {
  file: File;
  onRemove: () => void;
}

/**
 *
 */
export function FileItem({ file, onRemove }: Props) {
  if (!file) return null;

  return (
    <div className="FileItem" key={file.name}>
      <div className="FileItem__box">
        <button
          aria-label={`Remove ${file.name}`}
          className="NoBorderButton FileItem__remove"
          onClick={onRemove}
          type="button"
        >
          <span className="icon-xmark-large" />
        </button>

        <span className="FileItem__name">{file.name}</span>
        <span className="FileItem__size">
          {Math.round(file.size / 1024)} KB
        </span>
      </div>
    </div>
  );
}
