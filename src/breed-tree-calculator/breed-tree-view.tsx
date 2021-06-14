import React from "react"
import { FlowerColor, FlowerKind, FlowerGene, flowerColor, BreedTree, getChildRate, flowerIsSeed, BreedMulti, showGene, Breed, breedTreeToBreeds } from "../flower"
import { showColor } from "../flower-view"
import { log } from "../helpers"

const flowerColorToCssColor = (color: FlowerColor): NonNullable<React.CSSProperties["color"]> => {
    switch (color) {
        case "オレンジ": return "orange"
        case "ピンク": return "pink"
        case "白": return "white"
        case "紫": return "purple"
        case "緑": return "green"
        case "赤": return "red"
        case "青": return "blue"
        case "黄": return "yellow"
        case "黒": return "black"
    }
}
const FlowerInfo = ({ kind, gene }: Readonly<{ kind: FlowerKind, gene: FlowerGene }>) => {
    const color = flowerColor(kind, gene)
    const seed = flowerIsSeed(kind, gene)
    return <span style={{ color: flowerColorToCssColor(color) }}>
        <span>{showColor(color)}</span>
        {seed ? <span>種</span> : <></>}
        <span>{showGene(gene)}</span>
    </span>
}

const BreedDetailView = ({ kind, breed: { parent1, parent2, children } }: Readonly<{ kind: FlowerKind, breed: Breed }>) => {
    const childViews = children.map(child =>
        <div>
            →<FlowerInfo kind={kind} gene={child} /> <span>{`${getChildRate(parent1, parent2, child) * 100}%`}</span>
        </div>
    )
    return <div className="breed-detail">
        <div>
            <FlowerInfo kind={kind} gene={parent1} />×<FlowerInfo kind={kind} gene={parent2} />
        </div>
        {...childViews}
    </div>
}

const breedTopToBreeds = (tree: BreedMulti | BreedTree, set: Set<FlowerGene>) => {
    switch (tree[0]) {
        case "BreedMulti": return [
            ...breedTreeToBreeds(tree[2], set),
            ...breedTreeToBreeds(tree[3], set),
            {
                parent1: tree[2][1],
                parent2: tree[3][1],
                children: tree[1],
            }
        ]
        default: return breedTreeToBreeds(tree, set)
    }
}
export const BreedTreeView = ({ kind, tree }: Readonly<{
    kind: FlowerKind
    tree: BreedMulti | BreedTree
}>) => {
    const breeds = breedTopToBreeds(tree, new Set<FlowerGene>())
    log`tree: ${JSON.stringify(tree)}`
    log`breeds: ${JSON.stringify(breeds)}`
    const breedViews = breeds.map((breed, index) => <BreedDetailView key={index} kind={kind} breed={breed} />)
    return <div className="breed-tree">
        {...breedViews}
    </div>
}
