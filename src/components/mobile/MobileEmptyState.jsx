import { memo } from 'react';

// Pre-built empty state templates
const EMPTY_TEMPLATES = {
  search: {
    icon: '🔍',
    title: 'No results found',
    description: 'We couldn\'t find any vehicles matching your search. Try adjusting your filters or search terms.',
    actionLabel: 'Clear Filters',
  },
  favorites: {
    icon: '❤️',
    title: 'No saved vehicles',
    description: 'Tap the heart icon on any vehicle to save it here for later.',
    actionLabel: 'Browse Vehicles',
  },
  auctions: {
    icon: '⚡',
    title: 'No live auctions',
    description: 'There are no live auctions at the moment. Check back soon or browse our inventory.',
    actionLabel: 'Browse Inventory',
  },
  savedSearches: {
    icon: '🔔',
    title: 'No saved searches',
    description: 'Save a search to get notified when new vehicles match your criteria.',
    actionLabel: 'Create Search Alert',
  },
  notifications: {
    icon: '🔔',
    title: 'All caught up!',
    description: 'You have no new notifications. We\'ll let you know when something important happens.',
    actionLabel: null,
  },
  chat: {
    icon: '💬',
    title: 'No messages yet',
    description: 'Start a conversation with a dealer to learn more about their vehicles.',
    actionLabel: 'Find Dealers',
  },
  network: {
    icon: '📡',
    title: 'No connection',
    description: 'Please check your internet connection and try again.',
    actionLabel: 'Retry',
  },
  error: {
    icon: '⚠️',
    title: 'Something went wrong',
    description: 'We encountered an error loading this content. Please try again.',
    actionLabel: 'Try Again',
  },
};

function MobileEmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  template,
  className = '',
}) {
  // Use template if provided
  const templateData = template ? EMPTY_TEMPLATES[template] : null;

  const displayIcon = icon || templateData?.icon || '📭';
  const displayTitle = title || templateData?.title || 'Nothing here yet';
  const displayDescription = description || templateData?.description;
  const displayActionLabel = actionLabel || templateData?.actionLabel;

  return (
    <div className={`mobile-empty ${className}`} role="status" aria-live="polite">
      <div className="mobile-empty__icon" aria-hidden="true">
        {displayIcon}
      </div>
      <h3 className="mobile-empty__title">{displayTitle}</h3>
      {displayDescription && (
        <p className="mobile-empty__description">{displayDescription}</p>
      )}
      {displayActionLabel && onAction && (
        <button
          className="mobile-btn mobile-btn--primary mobile-empty__action"
          onClick={onAction}
        >
          {displayActionLabel}
        </button>
      )}
    </div>
  );
}

export default memo(MobileEmptyState);
