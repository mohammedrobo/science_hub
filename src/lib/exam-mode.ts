const TRUTHY_VALUES = new Set(['1', 'true', 'yes', 'on']);

function parseBooleanFlag(value: string | undefined): boolean {
    if (!value) return false;
    return TRUTHY_VALUES.has(value.trim().toLowerCase());
}

/**
 * Exam mode is controlled by NEXT_PUBLIC_EXAM_MODE so both server and client
 * paths can switch to lower-background-traffic behavior.
 */
export const EXAM_MODE_ENABLED = parseBooleanFlag(process.env.NEXT_PUBLIC_EXAM_MODE);

export function examModeValue<T>(normalValue: T, examModeValue_: T): T {
    return EXAM_MODE_ENABLED ? examModeValue_ : normalValue;
}
