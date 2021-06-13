import { FlowerColor, FlowerAllele, _00, _01, _11, _u, FlowerGene } from "./flower"

export const showColor = (color: FlowerColor) =>
    // TODO: ローカライズ
    color

const showAllele = (allele: FlowerAllele) => {
    switch (allele) {
        case _00: return "00"
        case _01: return "01"
        case _11: return "11"
        case _u: return null
    }
}
export const showGene = (gene: FlowerGene) => {
    const alleles = gene.map(showAllele)
    while (0 !== alleles.length && alleles[alleles.length - 1] === null) {
        alleles.pop()
    }
    return alleles.map(a => a === null ? "??" : a).join("-")
}
