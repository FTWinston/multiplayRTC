import { IServerEntity } from './IServerEntity';

export function partialCopy<T extends IServerEntity>(
    object: T,
    keysToCopy: Set<string>
): Partial<T> {
    return Object.entries(object).reduce((accum, [key, val]) => {
        if (keysToCopy.has(key) && typeof val !== 'function') {
            accum[key as keyof T] = val;
        }
        return accum;
    }, {} as Partial<T>);
}

export function partialCopyAll<T extends IServerEntity>(object: T): Partial<T> {
    return Object.entries(object).reduce((accum, [key, val]) => {
        if (typeof val !== 'function') {
            accum[key as keyof T] = val;
        }
        return accum;
    }, {} as Partial<T>);
}
