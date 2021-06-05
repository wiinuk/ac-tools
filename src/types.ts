export type Identity<T> = (x: T) => T
export const identity = <T>(x: T) => x
export type kind<Kind, T extends Kind> = T
