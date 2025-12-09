export interface SettingsPanelProps {
  limit: number;
  skipPinned: boolean;
  skipGroups: boolean;
  onLimitChange: (val: number) => void;
  onSkipPinnedChange: (val: boolean) => void;
  onSkipGroupsChange: (val: boolean) => void;
}

export function SettingsPanel({ 
  limit, skipPinned, skipGroups, 
  onLimitChange, onSkipPinnedChange, onSkipGroupsChange 
}: SettingsPanelProps) {
  return (
    <>
      <div className="control-group">
        <label>
          <input 
            type="checkbox" 
            checked={skipPinned} 
            onChange={(e) => onSkipPinnedChange(e.target.checked)} 
          /> Skip Pinned
        </label>
        <label>
          <input 
            type="checkbox" 
            checked={skipGroups} 
            onChange={(e) => onSkipGroupsChange(e.target.checked)} 
          /> Skip Groups
        </label>
      </div>

      <div className="settings">
        <label>
          Limit: 
          <input 
            type="number" 
            value={limit} 
            onChange={(e) => onLimitChange(parseInt(e.target.value) || 50)}
            style={{ width: '50px', marginLeft: '5px' }} 
          />
        </label>
      </div>
    </>
  );
}
