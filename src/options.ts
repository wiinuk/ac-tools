import { identity, Identity } from "./types"

type TypeDescriptionKind = string
type typeDescToType<d extends TypeDescriptionKind> =
    d extends "boolean" ? boolean :
    d extends "number" ? number :
    d extends "string" ? string :
    never

class OptionSpec<T, V extends T> {
    private readonly _phantom_type: Identity<T> = identity
    private constructor(readonly defaultValue: V) { }
    static create<Type extends TypeDescriptionKind, V extends typeDescToType<Type>>(_type: Type, defaultValue: V) {
        return new OptionSpec<typeDescToType<Type>, V>(defaultValue)
    }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OptionSpecKind = OptionSpec<any, any>
export const optionSpec = <typeDesc extends TypeDescriptionKind, defaultValue extends typeDescToType<typeDesc>>(type: typeDesc, defaultValue: defaultValue) => {
    return OptionSpec.create(type, defaultValue)
}

export type OptionsSpecKind = { [key: string]: OptionSpecKind | undefined }
export type OptionsSpecToOptions<spec> = undefined | {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readonly [k in keyof spec]?: spec[k] extends OptionSpec<infer optionType, any> ? optionType : never
}

type MutableFilledOptions<spec> = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    -readonly [k in keyof spec]-?: spec[k] extends OptionSpec<infer optionType, any> ? optionType : never
}
export type FilledOptions<spec> = NonNullable<Readonly<MutableFilledOptions<spec>>>

export const fill = <spec extends OptionsSpecKind>(spec: spec, options: OptionsSpecToOptions<spec>): FilledOptions<spec> => {
    const result: MutableFilledOptions<spec> = Object.create(null)
    for (const key in spec) {
        const optionSpec = spec[key]
        if (optionSpec === undefined) { continue }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result[key] = (options !== undefined && key in options) ? options[key] : optionSpec.defaultValue as any
    }
    return result
}
