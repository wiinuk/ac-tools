
type sign<n extends number> =
    number extends n ? (-1 | 0 | 1) :
    n extends 0 ? 0 :
    `${n}` extends `-${string}` ? -1 :
    1
