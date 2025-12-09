export interface ControlPanelProps {
  isScraping: boolean;
  canDownload: boolean;
  onStart: () => void;
  onStop: () => void;
  onDownload: () => void;
}

export function ControlPanel({ isScraping, canDownload, onStart, onStop, onDownload }: ControlPanelProps) {
  return (
    <div className="controls">
      <button className="btn primary" onClick={onStart} disabled={isScraping}>
        Start Scraping
      </button>
      <button className="btn danger" onClick={onStop} disabled={!isScraping}>
        Stop
      </button>
      <button className="btn secondary" onClick={onDownload} disabled={!canDownload && isScraping}>
        Download JSON
      </button>
    </div>
  );
}
