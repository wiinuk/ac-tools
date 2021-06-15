export const log = (template: TemplateStringsArray, ...values: unknown[]) => {
    let result = template[0]
    for (let i = 1; i < template.length; i++) {
        const vi = i - 1
        result += vi < values.length ? JSON.stringify(values[vi]) : ""
        result += template[i]!
    }
    console.log(result)
}
export function error(message: TemplateStringsArray, ...args: unknown[]): never
export function error(message: string): never
export function error(message: string | TemplateStringsArray, ...args: unknown[]) {
    throw new Error(typeof message === "string" ? message : String.raw(message, ...args))
}
export const exhaustiveCheck = (_: never) => error`exhaustiveCheck`
