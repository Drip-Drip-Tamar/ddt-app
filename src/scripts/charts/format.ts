/**
 * Shared date/duration formatting for chart panels.
 * All formatting uses the 'en-GB' locale to match the rest of the site.
 */

/** e.g. "5 Jul, 14:30" — used for status displays and event tables. */
export function formatShortDateTime(input: string | number | Date): string {
    return new Date(input).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/** e.g. "5 Jul, 14" — used for chart axis labels (hour precision). */
export function formatDayHour(input: string | number | Date): string {
    return new Date(input).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit'
    });
}

/** Escape a string for safe interpolation into HTML markup. */
export function escapeHtml(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** "3h 25m" / "45m" from a duration in minutes. */
export function formatDurationMinutes(durationMin: number): string {
    const hours = Math.floor(durationMin / 60);
    const mins = durationMin % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}
