import { describe, test, expect } from "@jest/globals"
import { BreedTree, breedTreeToBreeds, childAlleles, findBreedParents, findBreedTree, findBreedTreesOfGoals, FlowerAllele, flowerColor, FlowerKind, flowerKinds, forEachChildGenes, geneFromAlleles, geneToAlleles, getAllele, getChildGenes, hasDuplicatedChildColor, showAllele, showGene, _00, _01, _11, _u } from "../src/flower"
import * as q from "qcheck"
import type { unreachable, kind, cast } from "../src/type-level/helpers"
import { addN, Nat, NatKind, toNumberN } from "../src/type-level/nat"
import { error } from "../src/helpers"

const flowerKind = q.elements(...flowerKinds.concat().reverse() as readonly string[] as readonly [FlowerKind, ...FlowerKind[]])
const allele: q.Checker<FlowerAllele> = q.elements(_00, _01, _11).withPrinter(x => showAllele(x) ?? "??")
const gene4 = q.tuple(allele, allele, allele, allele).map(as => geneFromAlleles(...as), x => [...geneToAlleles(x)]).withPrinter(showGene)

const Root = <G>(gene: G) => ["Root", gene] as const
const Breed = <G>(child: G, parent1: BreedTree<G>, parent2: BreedTree<G>) => ["Breed", child, parent1, parent2] as const
const mapBreedTree = <G1, G2>(tree: BreedTree<G1>, mapping: (gene: G1) => G2): BreedTree<G2> => {
    switch (tree[0]) {
        case "Root": return ["Root", mapping(tree[1])]
        case "Breed": return ["Breed", mapping(tree[1]), mapBreedTree(tree[2], mapping), mapBreedTree(tree[3], mapping)]
    }
}
const showBreedTreeGenes = (tree: BreedTree) => mapBreedTree(tree, showGene)
const defaultOptions = {
    distinguishedOnlyByColor: true,
    yieldStrategy: () => () => undefined,
}

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
            findBreedParents("ヒヤシンス", geneFromAlleles(_00, _00, _00, _u), { ...defaultOptions, distinguishedOnlyByColor: true })
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
        q.tuple(flowerKind, gene4).check(([kind, gene]) => {
            const childGene = kind === "バラ" ? gene : geneFromAlleles(getAllele(gene, 1), getAllele(gene, 2), getAllele(gene, 3), _u)
            const childColor = flowerColor(kind, childGene)
            const pairs = findBreedParents(kind, childGene, { ...defaultOptions, distinguishedOnlyByColor: true })

            pairs.forEach(([p1, p2]) => {
                expect(
                    getChildGenes(p1, p2)
                        .filter(([g]) => flowerColor(kind, g) === childColor)
                ).toHaveLength(1)
            })
        })
    })
    type TextSpanKind = {
        start: number
        end: number
    }
    type TextSpan<start extends TextSpanKind["start"], end extends TextSpanKind["end"]> = {
        start: start
        end: end
    }
    type DiagnosticKind = {
        message: string
        span: TextSpanKind
    }
    type Diagnostic<message extends string, span extends TextSpanKind> = {
        message: message
        span: span
    }
    type CharStreamKind = {
        remaining: string
        consumed: string
        diagnostics: DiagnosticKind[]
    }
    type streamFromSource<source extends string> = kind<CharStreamKind, {
        remaining: source
        consumed: ""
        diagnostics: []
    }>
    type stringLengthAsNat<s extends string, result extends NatKind = Nat<0>> =
        s extends `${infer _}${infer rest}`
        ? stringLengthAsNat<rest, addN<result, Nat<1>>>
        : result

    type stringLength<s extends string> =
        toNumberN<stringLengthAsNat<s>>

    type stringJoinTail<elements extends readonly string[], separator extends string> =
        elements extends readonly [kind<string, infer head>, ...kind<readonly string[], infer rest>]
        ? `${separator}${head}${stringJoinTail<rest, separator>}`
        : ``

    type stringJoin<elements extends readonly string[], separator extends string = ","> =
        elements extends readonly [kind<string, infer head>, ...kind<readonly string[], infer rest>]
        ? `${head}${stringJoinTail<rest, separator>}`
        : ``

    type streamPositionAsNat<stream extends CharStreamKind> = stringLengthAsNat<stream["consumed"]>
    type streamPosition<stream extends CharStreamKind> = toNumberN<streamPositionAsNat<stream>>
    type streamSpan<start extends CharStreamKind, end extends CharStreamKind> = kind<TextSpanKind, {
        start: stringLength<start["consumed"]>
        end: stringLength<end["consumed"]>
    }>
    type report<stream extends CharStreamKind, message extends string, span extends TextSpanKind = streamSpan<stream, stream>> = kind<CharStreamKind, {
        remaining: stream["remaining"]
        consumed: stream["consumed"]
        diagnostics: [...stream["diagnostics"], Diagnostic<message, span>]
    }>
    type parseEos<stream extends CharStreamKind> =
        stream["remaining"] extends ""
        ? stream
        : report<stream, "予期しない文字です", TextSpan<streamPosition<stream>, toNumberN<addN<streamPositionAsNat<stream>, Nat<1>>>>>

    /** `00 | 01 | 11` */
    type parseAllele<stream extends CharStreamKind> =
        stream["remaining"] extends `${infer c0}${infer c1}${infer remaining}`
        ? (
            `${c0}${c1}` extends "00" | "01" | "11"
            ? kind<CharStreamKind, {
                remaining: remaining
                consumed: `${stream["consumed"]}${c0}${c1}`
                diagnostics: stream["diagnostics"]
            }>
            : report<stream, "対立遺伝子 (00・01・11) が必要です">
        )
        : report<stream, "対立遺伝子 (00・01・11) が必要です">

    /** `\k<alleleAndQuote>{2, 3} \k<lastAllele>` */
    type parseGeneView<stream extends CharStreamKind> =
        parseAllele<stream> extends infer result
        ? (
            result extends kind<CharStreamKind, infer stream>
            ? (
                parseAllele<stream> extends infer result
                ? (
                    result extends kind<CharStreamKind, infer stream>
                    ? (
                        parseAllele<stream> extends infer result
                        ? (
                            result extends kind<CharStreamKind, infer stream>
                            ? (
                                parseAllele<stream> extends kind<CharStreamKind, infer stream>
                                ? parseEos<stream>
                                : parseEos<stream>
                            )
                            : result
                        )
                        : unreachable
                    )
                    : result
                )
                : unreachable
            )
            : result
        )
        : unreachable

    type GeneViewParseResult = {
        diagnostics: DiagnosticKind[]
    }
    type ParseGeneView<source extends string> =
        parseGeneView<streamFromSource<source>> extends kind<CharStreamKind, infer stream>
        ? kind<GeneViewParseResult, {
            diagnostics: stream["diagnostics"]
        }>
        : unreachable

    type showDiagnostic<diagnostic extends DiagnosticKind> =
        `(0,${diagnostic["span"]["start"]}-0,${diagnostic["span"]["end"]}):${diagnostic["message"]}`

    type showDiagnostics<diagnostics extends DiagnosticKind[]> =
        stringJoin<{ [i in keyof diagnostics]: showDiagnostic<cast<DiagnosticKind, diagnostics[i]>> }, "\r\n">

    type CheckGeneView<source extends string> =
        ParseGeneView<source> extends kind<GeneViewParseResult, infer result>
        ? (
            result["diagnostics"] extends []
            ? source
            : showDiagnostics<result["diagnostics"]>
        )
        : unreachable

    const parseAlleleView = (s: string | undefined) => {
        switch (s) {
            case "00": return _00
            case "01": return _01
            case "11": return _11
            case undefined: return _u
            default: return error`不明な対立遺伝子 ${s}`
        }
    }
    const fg = <T extends string>(s: CheckGeneView<T>) => {
        const r = /^(00|01|11)(00|01|11)(00|01|11)(00|01|11)?$/.exec(s)
        if (r == null) { return error`` }
        return geneFromAlleles(parseAlleleView(r[1]), parseAlleleView(r[2]), parseAlleleView(r[3]), parseAlleleView(r[4]))
    }
    test("バラ-01-00-00-00 と 00-00-00-00 の子", () => {
        const children = new Set()
        forEachChildGenes(fg("01000000"), fg("00000000"), gene => void children.add(gene))
        expect(children)
            .toStrictEqual(new Set([fg("01000000"), fg("00000000")]))
    })
    test("バラ-01-00-00-00 と 00-00-00-00 の白い子は重複している", () => {
        // 00-00-00-00 → 白
        // 01-00-00-00 → 白
        expect(hasDuplicatedChildColor("バラ",
            fg("01000000"),
            fg("00000000"),
            "白"
        )).toBe(true)
    })
    test("見分けられる交配のみを対象としているか ( バラ-00-00-00-00 )", () => {
        const kind = "バラ"
        const gene = geneFromAlleles(_00, _00, _00, _00)

        const childGene = kind === "バラ" ? gene : geneFromAlleles(getAllele(gene, 1), getAllele(gene, 2), getAllele(gene, 3), _u)
        const childColor = flowerColor(kind, childGene)
        const pairs = findBreedParents(kind, childGene, { ...defaultOptions, distinguishedOnlyByColor: true })

        pairs.forEach(([p1, p2]) => {
            expect(
                getChildGenes(p1, p2)
                    .filter(([g]) => flowerColor(kind, g) === childColor)
                    .map(([g]) => ({
                        parents: [showGene(p1), showGene(p2)],
                        gene: showGene(g),
                        color: flowerColor(kind, g),
                    }))
            ).toHaveLength(1)
        })
    })
    test("見分けられる交配のみを対象としているか ( コスモス-11-01-01 )", () => {
        const kind = "コスモス"
        const childGene = geneFromAlleles(_11, _01, _01, _u)

        const childColor = flowerColor(kind, childGene)
        const pairs = findBreedParents(kind, childGene, { ...defaultOptions, distinguishedOnlyByColor: true })

        pairs.forEach(([p1, p2]) => {
            expect(
                getChildGenes(p1, p2)
                    .filter(([g]) => flowerColor(kind, g) === childColor)
            ).toHaveLength(1)
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
    test("キク-{01-00-00,00-11-00,00-00-11} から キク-00-11-11 への交配木", async () => {
        const tree = await findBreedTree(
            "キク",
            [
                geneFromAlleles(_01, _00, _00, _u), // 白種
                geneFromAlleles(_00, _11, _00, _u), // 黄種
                geneFromAlleles(_00, _00, _11, _u), // 赤種
            ],
            geneFromAlleles(_00, _11, _11, _u) // 緑
        )
        expect(tree ? showBreedTreeGenes(tree) : undefined).toStrictEqual(
            ["Breed",
                "00-11-11",
                ["Breed",
                    "00-01-01",
                    ["Root", "00-11-00"],
                    ["Root", "00-00-11"],
                ],
                ["Breed",
                    "00-01-01",
                    ["Root", "00-11-00"],
                    ["Root", "00-00-11"],
                ],
            ]
        )
    })
})
describe("flower.findBreedTreesOfGoals", () => {
    test("ヒヤシンス-{01-00-11, 01-00-00} から ヒヤシンス-01-00-01", async () => {
        const trees = await findBreedTreesOfGoals(
            "ヒヤシンス",
            [
                geneFromAlleles(_01, _00, _11, _u), // 赤種
                geneFromAlleles(_01, _00, _00, _u), // 白種
            ],
            [
                geneFromAlleles(_01, _00, _01, _u), // 桃
            ]
        )

        expect(showBreedTreeGenes(trees[0] as BreedTree)).toStrictEqual(
            Breed(
                "01-00-01",
                Breed(
                    "00-00-00",
                    Breed(
                        "00-00-01",
                        Root("01-00-11"),
                        Root("01-00-00"),
                    ),
                    Breed(
                        "00-00-01",
                        Root("01-00-11"),
                        Root("01-00-00"),
                    ),
                ),
                Root("01-00-11"),
            )
        )
        expect(
            breedTreeToBreeds(trees[0] as BreedTree, new Set()).map(breed => {
                return {
                    ...breed,
                    parent1: showGene(breed.parent1),
                    parent2: showGene(breed.parent2),
                    children: breed.children.map(showGene),
                }
            })
        ).toStrictEqual([
            {
                children: ["00-00-01"],
                parent1: "01-00-11",
                parent2: "01-00-00",
            },
            {
                children: ["00-00-00"],
                parent1: "00-00-01",
                parent2: "00-00-01",
            },
            {
                children: ["01-00-01"],
                parent1: "00-00-00",
                parent2: "01-00-11",
            }
        ])
    })
})
