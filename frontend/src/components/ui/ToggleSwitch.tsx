import { cn } from '../../lib/utils';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export function ToggleSwitch({ checked, onChange, label, disabled, size = 'md' }: ToggleSwitchProps) {
  const trackSize = size === 'sm' ? 'w-8 h-[18px]' : 'w-10 h-[22px]';
  const thumbSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const thumbTranslate = size === 'sm' ? 'translate-x-[14px]' : 'translate-x-[18px]';

  return (
    <label className={cn('inline-flex items-center gap-3 cursor-pointer', disabled && 'opacity-40 pointer-events-none')}>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={cn(
          'relative inline-flex items-center rounded-full transition-all duration-500 ease-out',
          trackSize,
          checked ? 'bg-emerald shadow-glow-emerald/30' : 'bg-white/[0.06]',
        )}
      >
        <span
          className={cn(
            'absolute left-[3px] rounded-full bg-white shadow-sm transition-transform duration-500 ease-out',
            thumbSize,
            checked && thumbTranslate,
          )}
        />
      </button>
      {label && <span className="text-sm text-label">{label}</span>}
    </label>
  );
}

export default ToggleSwitch;
