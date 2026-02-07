export type NormalizedColumns = 'one' | 'two' | 'three' | 'four';

const ZERO_WIDTH_RE = /[\u200B-\u200F\uFEFF\u2060-\u206F\u202A-\u202E\u180E]/g;

export function normalizeColumns(value: unknown): NormalizedColumns | undefined {
    if (value == null) return undefined;

    const raw =
        typeof value === 'string'
            ? value.replace(ZERO_WIDTH_RE, '').trim().toLowerCase()
            : value;

    const numeric = typeof raw === 'string' ? Number.parseInt(raw, 10) : raw;

    if (raw === 'one' || numeric === 1) return 'one';
    if (raw === 'two' || numeric === 2) return 'two';
    if (raw === 'three' || numeric === 3) return 'three';
    if (raw === 'four' || numeric === 4) return 'four';

    return undefined;
}
