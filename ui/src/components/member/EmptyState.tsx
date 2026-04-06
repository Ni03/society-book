import React from 'react';

interface EmptyStateProps {
    icon?: string;
    title?: string;
    message?: string;
}

/**
 * Centered empty-state display with an emoji icon and a title.
 *
 * Used by: EditMemberPage · MemberProfilePage
 */
const EmptyState: React.FC<EmptyStateProps> = ({
    icon = '❌',
    title = 'Not found',
    message,
}) => (
    <div className="page-wrapper">
        <div className="empty-state">
            <div className="empty-state__icon">{icon}</div>
            <h3 className="empty-state__title">{title}</h3>
            {message && <p className="empty-state__message">{message}</p>}
        </div>
    </div>
);

export default EmptyState;
