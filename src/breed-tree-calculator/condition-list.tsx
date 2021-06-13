import React from "react"
import { showColor, showGene } from "../flower-view"
import { AndCondition, Condition, LeafCondition } from "./condition"

const showAnd = ({ color, seed }: AndCondition) => {
    return `${showColor(color.value)}${showSeed(seed.value)}`
}
const showSeed = (isSeed: boolean) => {
    return isSeed ? "種" : "種以外"
}
const showLeaf = (condition: LeafCondition) => {
    switch (condition.key) {
        case "color": return showColor(condition.value)
        case "gene": return showGene(condition.value)
        case "seed": return showSeed(condition.value)
    }
}
const showCondition = (condition: Condition): string => {
    switch (condition.kind) {
        case "Leaf": return showLeaf(condition)
        case "And": return showAnd(condition)
    }
}

export const ConditionList = (props: Readonly<{
    list?: readonly Condition[]
}>) => {
    const items = (props.list ?? []).map((condition, index) => {
        const view = showCondition(condition)
        return <li key={index}>
            <a>{view}</a>
        </li>
    })
    return <ul>
        {...items}
    </ul>
}
