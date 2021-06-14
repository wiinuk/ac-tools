import { describe, test, expect } from "@jest/globals"
import { childAlleles, findBreedParents, findBreedTree, FlowerAllele, flowerColor, FlowerGene, FlowerKind, flowerKinds, geneFromAlleles, geneToAlleles, getAllele, getChildGenes, showAllele, showGene, _00, _01, _11, _u } from "../src/flower"
import * as q from "qcheck"

const kind = q.elements(...flowerKinds.concat().reverse() as readonly string[] as readonly [FlowerKind, ...FlowerKind[]])
const allele: q.Checker<FlowerAllele> = q.elements(_00, _01, _11).withPrinter(x => showAllele(x) ?? "??")
const gene4 = q.tuple(allele, allele, allele, allele).map(as => geneFromAlleles(...as), x => [...geneToAlleles(x)]).withPrinter(showGene)

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
        expect(
            getChildGenes(
                geneFromAlleles(_01, _00, _00, _u),
                geneFromAlleles(_01, _11, _01, _u)
            )
                .map(([g, n]) => [geneToAlleles(g), n] as const)
        ).toStrictEqual([
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
        const childGene = geneFromAlleles(_11, _01, _01, _u)

        const childColor = flowerColor(kind, childGene)
        expect(childColor).toBe("ピンク")

    })
    test("geneToAlleles(geneFromAlleles(alleles)) === alleles", () => {
        q.tuple(allele, allele, allele, allele).check(alleles =>
            expect(geneToAlleles(geneFromAlleles(...alleles))).toStrictEqual(alleles)
        )
    })
    test("geneFromAlleles と getAllele", () => {
        q.tuple(allele, allele, allele, allele).check(alleles => {
            const gene = geneFromAlleles(...alleles)
            expect([getAllele(gene, 1), getAllele(gene, 2), getAllele(gene, 3), getAllele(gene, 4)]).toStrictEqual(alleles)
        })
    })
})
describe("flower.findBreedParents", () => {
    test("ヒヤシンス-00-00-00 を生成する親の確認", () => {
        expect(
            findBreedParents("ヒヤシンス", geneFromAlleles(_00, _00, _00, _u), { distinguishedOnlyByColor: true })
                .map(([p1, p2]) => [geneToAlleles(p1), geneToAlleles(p2)] as const)
        ).toEqual([
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
            const childGene = kind === "バラ" ? gene : geneFromAlleles(getAllele(gene, 1), getAllele(gene, 2), getAllele(gene, 3), _u)
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
        const childGene = geneFromAlleles(_11, _01, _01, _u)

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

describe("flower.findBreedTree", () => {
    test("バラ-00-00-00-01 から バラ-00-00-00-11 への交配木", () => {
        expect(findBreedTree(
            "バラ",
            [geneFromAlleles(_00, _00, _00, _01)],
            geneFromAlleles(_00, _00, _00, _11), {
            distinguishedOnlyByColor: false
        })).toStrictEqual(
            ["Breed",
                geneFromAlleles(_00, _00, _00, _11),
                ["Root", geneFromAlleles(_00, _00, _00, _01)],
                ["Root", geneFromAlleles(_00, _00, _00, _01)],
            ]
        )
    })
    test("キク-{01-00-00,00-11-00,00-00-11} から キク-00-11-11 への交配木", () => {
        expect(
            findBreedTree(
                "キク",
                [
                    geneFromAlleles(_01, _00, _00, _u), // 白種
                    geneFromAlleles(_00, _11, _00, _u), // 黄種
                    geneFromAlleles(_00, _00, _11, _u), // 赤種
                ],
                geneFromAlleles(_00, _11, _11, _u) // 緑
            )
        ).toStrictEqual(
            ["Breed",
                geneFromAlleles(_00, _11, _11, _u),
                ["Breed",
                    geneFromAlleles(_00, _01, _01, _u),
                    ["Root", geneFromAlleles(_00, _11, _00, _u)],
                    ["Root", geneFromAlleles(_00, _00, _11, _u)],
                ],
                ["Breed",
                    geneFromAlleles(_00, _01, _01, _u),
                    ["Root", geneFromAlleles(_00, _11, _00, _u)],
                    ["Root", geneFromAlleles(_00, _00, _11, _u)],
                ],
            ]
        )
    })
})
