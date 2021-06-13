export const log = (template: TemplateStringsArray, ...values: unknown[]) => {
    let result = template[0]
    for (let i = 1; i < template.length; i++) {
        const vi = i - 1
        result += vi < values.length ? JSON.stringify(values[vi]) : ""
        result += template[i]!
    }
    console.log(result)
}
