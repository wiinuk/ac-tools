
export type kind<Kind, T extends Kind> = T
export type cast<Kind, T> = T extends Kind ? T : Kind

export type equals<a, b> =
    (<_>() => _ extends a ? 1 : 2) extends
    (<_>() => _ extends b ? 1 : 2) ? true : false

export type eq<a, b> = [a] extends [b] ? ([b] extends [a] ? true : false) : false

export type Identity<T> = (x: T) => T
export const identity = <T>(x: T) => x

export type unreachable = never
