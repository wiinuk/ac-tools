import React from "react"
import { FlowerColor, FlowerKind, FlowerGene, flowerColor, BreedTree, FlowerGeneKey, geneKey } from "../flower"
import { showColor, showGene } from "../flower-view"
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
    return <span style={{ color: flowerColorToCssColor(color) }}>
        <span>{showColor(color)}</span>
        <span>{showGene(gene)}</span>
    </span>
}

type Breed = {
    parent1: FlowerGene
    parent2: FlowerGene
    child: FlowerGene
}
const BreedDetailView = ({ kind, breed: { parent1, parent2, child } }: Readonly<{ kind: FlowerKind, breed: Breed }>) => {
    return <div className="breed-detail">
        <div>
            <FlowerInfo kind={kind} gene={parent1} />×<FlowerInfo kind={kind} gene={parent2} />
        </div>
        <div>
            →<FlowerInfo kind={kind} gene={child} />
        </div>
    </div>
}

const breedTreeToBreeds = (tree: BreedTree, geneSet: Set<FlowerGeneKey>): Breed[] => {
    switch (tree[0]) {
        case "Root": return []
        case "Breed": {
            const [, child, tree1, tree2] = tree
            const key = geneKey(child)
            const breed =
                geneSet.has(key)
                    ? []
                    : (geneSet.add(key), [{
                        parent1: tree1[1],
                        parent2: tree2[1],
                        child,
                    }])

            return [
                ...breedTreeToBreeds(tree1, geneSet),
                ...breedTreeToBreeds(tree2, geneSet),
                ...breed,
            ]
        }
    }
}
export const BreedTreeView = ({ kind, tree }: Readonly<{ kind: FlowerKind, tree: BreedTree }>) => {
    const breeds = breedTreeToBreeds(tree, new Set())
    log`tree: ${JSON.stringify(tree)}`
    log`breeds: ${JSON.stringify(breeds)}`
    const breedViews = breeds.map((breed, index) => <BreedDetailView key={index} kind={kind} breed={breed} />)
    return <div className="breed-tree">
        {...breedViews}
    </div>
}
