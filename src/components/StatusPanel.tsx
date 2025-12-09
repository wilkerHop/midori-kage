export interface StatusPanelProps {
  statusText: string;
  progressCount: number;
}

export function StatusPanel({ statusText, progressCount }: StatusPanelProps) {
  return (
    <div className="status-box">
      <div id="statusText">{statusText}</div>
      <div id="progress">{progressCount} chats scraped</div>
    </div>
  );
}
