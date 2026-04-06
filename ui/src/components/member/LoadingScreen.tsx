import React from 'react';

interface LoadingScreenProps {
    message?: string;
}

/**
 * Full-page loading overlay with spinner and message.
 *
 * Used by: EditMemberPage · MemberProfilePage
 */
const LoadingScreen: React.FC<LoadingScreenProps> = ({
    message = 'Loading...',
}) => (
    <div className="loading-overlay">
        <div className="loading-spinner" />
        <span className="loading-text">{message}</span>
    </div>
);

export default LoadingScreen;
