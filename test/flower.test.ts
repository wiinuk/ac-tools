import { describe, test, expect } from "@jest/globals"
import { childAlleles, findBreedParents, flowerColor, FlowerKind, getChildGenes, _00, _01, _11, _u } from "../src/flower"
import * as q from "qcheck"
import flowerSpec from "../src/flower-spec"

const kind = q.elements(...Object.keys(flowerSpec).reverse() as readonly string[] as readonly [FlowerKind, ...FlowerKind[]])
const allele = q.elements(_00, _01, _11)
const gene4 = q.tuple(allele, allele, allele, allele)

describe("flower.*", () => {
    test("childAlleles の戻り値型は Allele", () => {
        q.tuple(allele, allele).check(([a1, a2]) => {
            childAlleles(a1, a2).forEach(a => {
                expect(a === _00 || a === _01 || a === _11 || a === _u).toBeTruthy()
            })
        })
    })
    test("11 × 11", () => {
        expect(childAlleles(_11, _11))
            .toStrictEqual([_11, _11, _11, _11])
    })
    test("01 × 01", () => {
        expect(childAlleles(_01, _01))
            .toStrictEqual([_00, _01, _01, _11])
    })
    test("01-00-00 × 01-11-01", () => {
        expect(getChildGenes(
            [_01, _00, _00, _u],
            [_01, _11, _01, _u]
        )).toStrictEqual([
            [[_00, _01, _00, _u], 8],
            [[_00, _01, _01, _u], 8],
            [[_01, _01, _00, _u], 16],
            [[_01, _01, _01, _u], 16],
            [[_11, _01, _00, _u], 8],
            [[_11, _01, _01, _u], 8]
        ])
    })
    test("コスモス-11-01-01 の色はピンク", () => {
        const kind = "コスモス"
        const childGene = [_11, _01, _01, _u] as const

        const childColor = flowerColor(kind, childGene)
        expect(childColor).toBe("ピンク")

    })
})
describe("flower.findBreedParents", () => {
    test("ヒヤシンス-00-00-00 を生成する親の確認", () => {
        expect(findBreedParents("ヒヤシンス", [_00, _00, _00, _u], { distinguishedOnlyByColor: true })).toEqual([
            [[0, 0, 0, 2], [0, 0, 0, 2]],
            [[0, 0, 0, 2], [0, 0, 1, 2]],
            [[0, 0, 1, 2], [0, 0, 0, 2]],
            [[0, 0, 1, 2], [0, 0, 1, 2]],
            [[0, 0, 0, 2], [0, 1, 0, 2]],
            [[0, 0, 0, 2], [0, 1, 1, 2]],
            [[0, 0, 1, 2], [0, 1, 0, 2]],
            [[0, 0, 1, 2], [0, 1, 1, 2]],
            [[0, 1, 0, 2], [0, 0, 0, 2]],
            [[0, 1, 0, 2], [0, 0, 1, 2]],
            [[0, 1, 1, 2], [0, 0, 0, 2]],
            [[0, 1, 1, 2], [0, 0, 1, 2]],
            [[0, 1, 0, 2], [0, 1, 0, 2]],
            [[0, 1, 0, 2], [0, 1, 1, 2]],
            [[0, 1, 1, 2], [0, 1, 0, 2]],
            [[0, 1, 1, 2], [0, 1, 1, 2]],
        ])
    })
    test("見分けられる交配のみを対象としているか", () => {
        q.tuple(kind, gene4).check(([kind, gene]) => {
            const childGene = kind === "バラ" ? gene : [gene[0], gene[1], gene[2], _u] as const
            const childColor = flowerColor(kind, childGene)
            const pairs = findBreedParents(kind, childGene, { distinguishedOnlyByColor: true })

            pairs.forEach(([p1, p2]) => {
                expect(
                    getChildGenes(p1, p2)
                        .filter(([g]) => flowerColor(kind, g) === childColor)
                        .length
                ).toEqual(1)
            })
        })
    })
    test("見分けられる交配のみを対象としているか ( コスモス-11-01-01 )", () => {
        const kind = "コスモス"
        const childGene = [_11, _01, _01, _u] as const

        const childColor = flowerColor(kind, childGene)
        const pairs = findBreedParents(kind, childGene, { distinguishedOnlyByColor: true })

        pairs.forEach(([p1, p2]) => {
            expect(
                getChildGenes(p1, p2)
                    .filter(([g]) => flowerColor(kind, g) === childColor)
                    .length
            ).toEqual(1)
        })
    })
})
