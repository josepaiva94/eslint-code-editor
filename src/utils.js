
/**
 * Ensure that a given value is a positive value.
 * @param {number|undefined} value The value to check.
 * @param {number} defaultValue The default value which is used if the `value` is undefined.
 * @returns {number} The positive value as the result.
 */
export function ensurePositiveInt(value, defaultValue) {
    return Math.max(1, (value !== undefined ? value : defaultValue) | 0)
}

/**
 * Computes the key string from the given marker.
 * @param {import('monaco-editor').editor.IMarkerData} marker marker
 * @returns {string} the key string
 */
export function computeKey(marker) {
    const code =
        (typeof marker.code === 'string'
            ? marker.code
            : marker.code && marker.code.value) || ''
    return `[${marker.startLineNumber},${marker.startColumn},${marker.endLineNumber},${marker.endColumn}]-${code}`
}

/**
 * Create quickfix code action.
 * @param {string} title title
 * @param {import('monaco-editor').editor.IMarkerData} marker marker
 * @param {import('monaco-editor').editor.ITextModel} model model
 * @param { { range: [number, number], text: string } } fix fix data
 * @returns {import('monaco-editor').languages.CodeAction} CodeAction
 */
export function createQuickfixCodeAction(title, marker, model, fix) {
    const start = model.getPositionAt(fix.range[0]);
    const end = model.getPositionAt(fix.range[1]);
    /**
     * @type {import('monaco-editor').IRange}
     */
    const editRange = {
        startLineNumber: start.lineNumber,
        startColumn: start.column,
        endLineNumber: end.lineNumber,
        endColumn: end.column,
    };
    return {
        title,
        diagnostics: [marker],
        kind: 'quickfix',
        edit: {
            edits: [
                {
                    resource: model.uri,
                    edit: {
                        range: editRange,
                        text: fix.text,
                    },
                },
            ],
        },
    };
}
