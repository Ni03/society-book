import React from 'react';

interface FileViewLinkProps {
    /** URL of the currently uploaded file */
    fileUrl: string | null | undefined;
    /** Text shown for the anchor link */
    linkText?: string;
    /** When true, shows a small "Upload a new file below to replace" hint */
    showReplaceHint?: boolean;
    /** Text shown when no file is uploaded yet */
    emptyText?: string;
    /** Whether to show the empty-state text at all (default: true) */
    showEmpty?: boolean;
}

/**
 * Renders a styled box with a link to view an uploaded file.
 * Optionally shows a replace-hint (used in MemberProfilePage).
 * Optionally shows an empty-state message (used in EditMemberPage).
 *
 * Used by: EditMemberPage · MemberProfilePage
 */
const FileViewLink: React.FC<FileViewLinkProps> = ({
    fileUrl,
    linkText = '📄 View Uploaded File',
    showReplaceHint = false,
    emptyText = 'No file uploaded.',
    showEmpty = true,
}) => {
    if (!fileUrl) {
        return showEmpty ? (
            <div style={{ color: 'var(--text-muted)' }}>{emptyText}</div>
        ) : null;
    }

    return (
        <div
            style={{
                padding: '0.75rem 1rem',
                background: 'var(--gray-50)',
                borderRadius: 'var(--border-radius-md)',
                marginBottom: showReplaceHint ? '0.75rem' : 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}
        >
            <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--primary-600)', fontWeight: 600, textDecoration: 'none' }}
            >
                {linkText}
            </a>
            {showReplaceHint && (
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Upload a new file below to replace
                </span>
            )}
        </div>
    );
};

export default FileViewLink;
