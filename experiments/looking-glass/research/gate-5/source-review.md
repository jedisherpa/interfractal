# Gate 5 source review: a 5D hypercube, controlled projections, and two-coordinate ball slices

Accessed 2026-09-20 (UTC) in the requested GPT-5.6 Luna primary-source pass.
This review is limited to the mathematical basis needed for Gate 5: the
5D hypercube count, orthogonal coordinate-plane rotations, a fixed 5D-to-3D
linear observation and its rank/identifiability meaning, and the closed 5D
ball slice at two fixed coordinates. No implementation, browser run, Gate 6
work, human study, deployment, or external communication was performed.

## Source basis

The verified Princeton lecture note by Sanjeev Arora defines the unit
`n`-cube as `{x in R^n : 0 <= x_i <= 1}` and the unit `n`-ball as
`B_n = {x : sum_i x_i^2 <= 1}` (PDF p. 1, fetched lines 26-44). It gives the
parallel 4D example `x_1=1/2`: the slice is a 3-ball of radius
`sqrt(1-(1/2)^2)`, and says every parallel slice is a ball (lines 45-53).
That source directly supports the dimension drop and square-root residual law;
the five-coordinate, two-constraint case below follows by substitution.

The 32-vertex and 80-edge result is derived directly from the Princeton
`n`-cube definition and the declared adjacency rule below: five independent
binary coordinates give `2^5` vertices, and each vertex has five neighbors,
with every undirected edge counted twice.

ETH Zürich's Ralf Hiptmair numerical-methods notes define an orthogonal matrix
by `Q^{-1}=Q^T` and state that the associated linear map preserves the
Euclidean 2-norm (PDF p. 25, fetched lines 2577-2586). The same notes state
that for an overdetermined system `Ax=b`, a trivial null space gives a unique
least-squares solution via the normal equations, and that this is equivalent
to `rank(A)=n` when `m >= n` (PDF p. 12, lines 1397-1408). Their rank-defect
remark explains that different parameter sets can produce the same outputs,
so parameters are not observable/identifiable (PDF p. 13, lines 1489-1492).
These statements support the conditional linear-observation interpretation;
they do not support recovery from arbitrary images or any physical claim.

## 5D hypercube and coordinate-plane rotations

Use the centered source object

```text
H^5 = {-1,+1}^5,
```

with an edge between vertices that differ in exactly one coordinate. There are
`2^5=32` vertices. Each vertex has five one-coordinate neighbors, so counting
incidences twice gives `5*2^5/2 = 5*2^4 = 80` undirected edges. The vertices
affinely span five dimensions: the five coordinate directions occur as
independent differences among vertices.

For column vectors `q=(x,y,z,w,v)^T`, define independent plane rotations by

```text
R_xw(a):  x' = cos(a)x - sin(a)w,   w' = sin(a)x + cos(a)w,
           y'=y, z'=z, v'=v;

R_yv(b):  y' = cos(b)y - sin(b)v,   v' = sin(b)y + cos(b)v,
           x'=x, z'=z, w'=w.
```

Each matrix has a 2-by-2 rotation block and three identity coordinates, so
direct multiplication gives `R_xw(a)^T R_xw(a)=I` and
`R_yv(b)^T R_yv(b)=I`. They preserve norms and pairwise distances by the ETH
orthogonality result. Because the two planes are disjoint, these two specific
rotations commute, although the implementation must still record and apply a
declared composition order. Inverses are obtained by negating the angles;
`R_xw(-a)R_yv(-b)R_yv(b)R_xw(a)=I` under the declared order.

Use the fixed coordinate observation

```text
P = [ I_3  0  0 ],       p = P R_yv(b) R_xw(a) q,
```

which keeps `(x',y',z')` and omits `w'` and `v'`. For known point
correspondence and known transforms, stack observations as

```text
A = [ P R_1
      P R_2
      ... ],       b = A q.
```

The matrix rank is the number of independent source-coordinate directions that
the declared observations constrain. A single 3D observation has rank at
most three. If all observations use only `x-w` rotations (`b=0`), the `v`
column remains zero and the stack has rank at most four: `v` is hidden. Adding
a known `y-v` rotation with nonzero sine supplies a row containing `v`; for
example, stacking the identity view with `a=b=pi/2` gives rows spanning
`e_x,e_y,e_z,-e_w,-e_v`, hence rank five. ETH’s full-column-rank result then
justifies a unique numerical least-squares solution under the declared exact
transforms and correspondences. This is model-level identifiability, not
arbitrary screenshot inversion or proof of a uniquely 5D physical cause.

## 5D closed-ball slice at `w=s, v=t`

Use the closed Euclidean ball

```text
B^5_R = {(x,y,z,w,v): x^2+y^2+z^2+w^2+v^2 <= R^2}.
```

Substituting `w=s` and `v=t` gives

```text
B^5_R ∩ {w=s,v=t}
 = {(x,y,z,s,t): x^2+y^2+z^2 <= R^2-s^2-t^2}.
```

Let `D=R^2-s^2-t^2`. If `D>0`, the slice is a 3D solid ball with

```text
rho(s,t) = sqrt(R^2-s^2-t^2),
```

and its displayed boundary is the ordinary 2-sphere
`x^2+y^2+z^2=D`. If `D=0`, the intersection is exactly the singleton
`(0,0,0,s,t)`: parameter pairs on the circle `s^2+t^2=R^2` produce a point,
which must be labeled as a point rather than rendered as an unlabeled ordinary
zero-radius ball. If `D<0`, the slice is empty. Thus the valid parameter
domain is the disk `s^2+t^2<R^2`, its boundary circle is the singleton case,
and points outside that circle are empty.

The source supports the one-coordinate unit-ball slice; the two-coordinate
formula, the point/empty classification, and the scaling by `R` are direct
substitution and inequality derivations under the declared closed-ball model.

## Same-radius ambiguity

The radius depends only on `s^2+t^2`. Therefore distinct parameter pairs on a
common circle produce exactly the same 3D slice geometry. For `R=1`, for
example, `(s,t)=(0.6,0)` and `(0,0.6)` both produce `rho=0.8`, even though
the fixed hidden-coordinate conditions differ. The displayed slice alone
therefore does not identify the ordered pair `(s,t)`; recorded parameter labels
or an independent intervention are needed to distinguish them. This is a
project-derived bounded ambiguity statement, not a claim made by the external
sources.

## Source boundaries and limits

The sources support mathematical definitions, a higher-dimensional ball slice
example, hypercube counts, orthogonality, and the full-rank meaning for a
known linear system. They do not support the project’s UI, rendering backend,
camera behavior, human comprehension, arbitrary shape reconstruction, or
physical extra dimensions. The rank-five result assumes exact known linear
transforms, known point correspondences, the fixed coordinate projection, and
numerical tolerance. The equal-radius result concerns the bounded family of
centered closed 5D balls and the 3D slice geometry; metadata can make the
conditions distinguishable even when the geometry is equal.
