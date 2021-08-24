import { IServerEntity } from './IServerEntity';

export function partialCopy<T extends IServerEntity>(
    object: T,
    keysToCopy: Set<string> | null
): Partial<T> {
    const copyAll = keysToCopy === null;

    return Object.entries(object).reduce((accum, [key, val]) => {
        if ((copyAll || keysToCopy!.has(key)) && typeof val !== 'function') {
            accum[key as keyof T] = val;
        }
        return accum;
    }, {} as Partial<T>);
}
