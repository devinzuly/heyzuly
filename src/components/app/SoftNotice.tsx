/**
 * Warm loading / error inline notices shared across Talk, Today, Plan, You.
 */

interface SoftNoticeProps {
  tone: 'loading' | 'error' | 'hint';
  children: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function SoftNotice({
  tone,
  children,
  onRetry,
  retryLabel = 'Try again',
  className = '',
}: SoftNoticeProps) {
  const base =
    tone === 'loading'
      ? 'soft-notice soft-notice--loading'
      : tone === 'error'
        ? 'soft-notice soft-notice--error'
        : 'soft-notice soft-notice--hint';

  return (
    <div
      className={`${base}${className ? ` ${className}` : ''}`}
      role={tone === 'error' ? 'alert' : 'status'}
      aria-live={tone === 'loading' ? 'polite' : undefined}
      aria-busy={tone === 'loading' ? true : undefined}
    >
      <p className="soft-notice-text">{children}</p>
      {tone === 'error' && onRetry ? (
        <button
          type="button"
          className="soft-notice-retry"
          onClick={onRetry}
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}
