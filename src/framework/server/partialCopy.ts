export function partialCopy<T extends Record<string, any>>(
    object: T,
    keysToCopy: Set<string> | null
): Partial<T> {
    if (keysToCopy === null) {
        return { ...object };
    }

    return Object.entries(object).reduce((accum, [key, val]) => {
        if (keysToCopy.has(key)) {
            accum[key as keyof T] = val;
        }
        return accum;
    }, {} as Partial<T>);
}
