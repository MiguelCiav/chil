import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '../../../../components/Button';
import { BatchReportBucket, ReportBucketKey } from '../../api';

export interface ScopedExportSplitButtonProps {
  buckets: BatchReportBucket[];
  onSelectAll: () => void;
  onSelectBucket: (bucketKey: ReportBucketKey) => void;
  primaryLabel: string;
  loadingLabel: string;
  loading: boolean;
  disabled: boolean;
  disabledTitle?: string;
  chevronAriaLabel: string;
  menuAriaLabel: string;
  variant?: 'primary' | 'outline';
  primaryClassName?: string;
  chevronClassName?: string;
  icon?: React.ReactNode;
}

/**
 * Renders a primary export button optionally joined with a chevron popover trigger
 * when multiple territorial buckets are available for scoped downloads.
 */
export const ScopedExportSplitButton: React.FC<ScopedExportSplitButtonProps> = ({
  buckets,
  onSelectAll,
  onSelectBucket,
  primaryLabel,
  loadingLabel,
  loading,
  disabled,
  disabledTitle,
  chevronAriaLabel,
  menuAriaLabel,
  variant = 'outline',
  primaryClassName = '',
  chevronClassName = '',
  icon
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isInteractionDisabled = loading || disabled;
  const hasMultipleBuckets = buckets.length > 1;
  const menuOpen = isOpen && hasMultipleBuckets && !isInteractionDisabled;

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const hasGroupBuckets = buckets.some((b) => b.kind === 'group');
  const firstSpecialIndex = buckets.findIndex((b) => b.kind !== 'group');

  return (
    <div ref={containerRef} className="relative inline-flex items-stretch">
      <Button
        variant={variant}
        onClick={onSelectAll}
        disabled={isInteractionDisabled}
        title={disabled ? disabledTitle : undefined}
        icon={icon}
        className={
          hasMultipleBuckets
            ? `rounded-l-xl !rounded-r-none focus:z-10 ${primaryClassName}`
            : primaryClassName
        }
      >
        {loading ? loadingLabel : primaryLabel}
      </Button>

      {hasMultipleBuckets && (
        <Button
          variant={variant}
          onClick={() => setIsOpen((prev) => !prev)}
          disabled={isInteractionDisabled}
          aria-label={chevronAriaLabel}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          icon={
            <ChevronDown
              size={16}
              className={`transition-transform ${menuOpen ? 'rotate-180' : ''}`}
            />
          }
          className={`!rounded-l-none rounded-r-xl !px-2.5 focus:z-10 ${chevronClassName}`}
        />
      )}

      {menuOpen && (
        <div
          role="menu"
          aria-label={menuAriaLabel}
          className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-2rem)] max-h-80 overflow-y-auto bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-40"
        >
          {buckets.map((bucket, index) => {
            const showDivider = hasGroupBuckets && index === firstSpecialIndex;
            const showDistrict =
              bucket.districtName !== null && bucket.districtName !== 'No aplica';

            return (
              <React.Fragment key={bucket.key}>
                {showDivider && <hr className="my-1 border-t border-gray-100" />}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsOpen(false);
                    onSelectBucket(bucket.key);
                  }}
                  className="w-full px-3.5 py-2 flex items-center justify-between gap-2 text-left hover:bg-gray-50 transition-colors focus:outline-none focus:bg-gray-50"
                >
                  <div className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-neutral truncate">
                      {bucket.label}
                    </span>
                    {showDistrict && (
                      <span className="block text-xs text-neutral/75 truncate">
                        {bucket.districtName}
                      </span>
                    )}
                  </div>
                  <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold rounded-full bg-primary/10 text-primary shrink-0">
                    {bucket.members.length}
                  </span>
                </button>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};
