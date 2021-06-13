import { FlowerGene, FlowerColor, FlowerKind, geneEquals, flowerColor, flowerIsSeed } from "../flower"

type LeafConditionKind<Key extends string, Leaf> = {
    kind: "Leaf"
    key: Key
    value: Leaf
}
export type GeneCondition = LeafConditionKind<"gene", FlowerGene>
export type ColorCondition = LeafConditionKind<"color", FlowerColor>
export type SeedCondition = LeafConditionKind<"seed", boolean>
export type AndCondition = {
    kind: "And"
    color: ColorCondition
    seed: SeedCondition
}
export type LeafCondition =
    | GeneCondition
    | ColorCondition
    | SeedCondition

export type Condition =
    | LeafCondition
    | AndCondition

export const colorCondition = (value: ColorCondition["value"]): ColorCondition => ({ kind: "Leaf", key: "color", value })
export const seedCondition = (value: SeedCondition["value"]): SeedCondition => ({ kind: "Leaf", key: "seed", value })
export const andCondition = (color: AndCondition["color"], seed: AndCondition["seed"]): AndCondition => ({ kind: "And", color, seed, })

const evaluateLeaf = (kind: FlowerKind, gene: FlowerGene, condition: LeafCondition) => {
    switch (condition.key) {
        case "gene": return geneEquals(gene, condition.value)
        case "color": return flowerColor(kind, gene) === condition.value
        case "seed": return flowerIsSeed(kind, gene)
    }
}
const evaluateCondition = (kind: FlowerKind, gene: FlowerGene, condition: Condition): boolean => {
    switch (condition.kind) {
        case "Leaf": return evaluateLeaf(kind, gene, condition)
        case "And": return evaluateLeaf(kind, gene, condition.color) && evaluateLeaf(kind, gene, condition.seed)
    }
}
export const evaluateOrCondition = (kind: FlowerKind, gene: FlowerGene, conditions: readonly Condition[]) => {
    for (const c of conditions) {
        if (evaluateCondition(kind, gene, c)) { return true }
    }
    return false
}
