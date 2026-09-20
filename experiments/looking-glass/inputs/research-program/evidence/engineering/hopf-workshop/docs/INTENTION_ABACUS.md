# Intention Abacus

Optional 3D / 2D instrument for this workshop. **Python remains normative.** This page is a view. Topology does not authorize.

- Live page: [`intention-abacus.html`](../intention-abacus.html)
- 2D overlay helper: [`visualizer_geometry.js`](../visualizer_geometry.js)
- Design map: the rest of this file plus the original harmonic notes below.

## What it is

Hoops = intention-spaces. The platonic solid in the middle = a discrete constitutional lattice on \(S^2\) (tetrahedron default). Beads = current-version intentions. Worldviews stay on home fibers. Alignment is not fusion.

## Discipline that must survive

- Geometry is not permission.
- People are not fibers.
- Ready is not Yes.
- A new draft does not inherit an old agreement.
- Withdrawal pauses action; repair does not restore consent.
- RETURN is not a reset.
- A GPU is not a prerequisite for the main workshop. This instrument is optional.
- Clustering is a picture, not a signature.

## Mapping (short)

| Object | Meaning |
|---|---|
| Shared goal | a point on \(S^2\); the gold hoop is its fiber |
| Home hoop | a worldview / seat. It does not have to move. |
| Bead | an intention. Yes on the current version may approach the goal fiber. |
| Tetrahedron | 4 seats, 4 faces (Generate / Maintain / Release / HITL), 6 pairwise links = \(C(4,2)\) |
| Commit | explicit command after current-version Yes + recorded reviews |

Full harmonic notes follow.

---

# Intention Abacus — harmonic map between Metacanon and the Hopf visualizer

Prepared 16 September 2026 for Paul Cooper.
Sources inspected: live Hopf Workshop (`hopf-workshop.vercel.app`), `jedisherpa/hopf-workshop` at `dd0ab5ea`, `metacanon_hopf_updated` (`genesis.rs`, `torus.rs`, `sub_sphere_torus.rs`, `lens_library.rs`), visualizer/workshop review packages, `openclaw-constitution-as-code/constitution.json`.

This is a design interpretation grounded in the exact Hopf model already in the workshop. It is not a proof that the constitution *is* the Hopf fibration. The workshop README already treats the March 2026 “literal isomorphism” claim as an open conjecture. Keep that honesty.

---

## 1. What you asked for

- Hoops as a way to **align intentions**.
- Constitution as a way to **structure reality**.
- Points on the hoops as **intentions**.
- As decision-making and agreement clarify, those points come into alignment around a **shared goal**.
- People may keep different worldviews and still make a clear agreement in a shared moment.
- The instrument should feel like a **3D relationship abacus**.
- Keep the current visualizer’s structure and appearance.
- Add a **3D platonic solid in the middle**, with **facets**.

That request already has a precise mathematical home. It does not require throwing away Bundle map, Process map, or the workshop protocol.

---

## 2. The exact geometry already in the workshop

Normative model: `hopf_model.py` / `hopf.js`.

Hopf map \(\pi: S^3 \to S^2\):

\[
z=(z_1,z_2)\in S^3\subset\mathbb{C}^2,\qquad |z_1|^2+|z_2|^2=1
\]

\[
\pi(z)=\bigl(2\operatorname{Re}(z_1\overline{z_2}),\; 2\operatorname{Im}(z_1\overline{z_2}),\; |z_1|^2-|z_2|^2\bigr)
\]

Common phase cancels:

\[
\pi(e^{i\gamma}z)=\pi(z)
\]

So each base point on \(S^2\) has a circle fiber \(S^1\) in \(S^3\). Those fibers are pairwise linked. Stereographic projection of the fibers is the family of loops already drawn on the live site.

Coordinates used by the workshop:

\[
z_1=\cos(\theta/2)\,e^{i\gamma},\qquad z_2=\sin(\theta/2)\,e^{i(\gamma-\varphi)}
\]

\[
\pi(z)=(\sin\theta\cos\varphi,\;\sin\theta\sin\varphi,\;\cos\theta)
\]

Other facts already implemented and tested:

| Quantity | Workshop value | Meaning in the instrument |
|---|---|---|
| Fiber | \(\gamma\mapsto e^{i\gamma}z\) | One hoop. A closed abacus wire. |
| Holonomy at latitude \(\theta\) | \(\pi(1-\cos\theta)\) | Returning to the same public answer is not a reset. The lift remembers the journey. |
| Chern number | \(\lvert c_1\rvert=1\) | There is no single global chart that makes every intention look the same. |
| Linking of \(N\) fibers | \(N(N-1)/2\) | Four featured fibers produce six pairwise links. A tetrahedron has six edges. |
| Gauge / reframe | multiply by \(e^{i\alpha}\) | Change representation without changing the public goal. |
| Explore | change \((\theta,\varphi,\gamma)\) | Move the picture. Does not grant consent. |

Discipline that must survive every visual addition:

- Geometry is not permission.
- People are not fibers.
- Display coordinates are not protocol coordinates.
- Ready is not Yes.
- A new draft does not silently inherit an old agreement.
- Withdrawal pauses action; repair does not restore consent.
- RETURN applies a pending outcome once. It is not a phase and not a reset.
- A beautiful shape never signs for you.

---

## 3. How Metacanon already encodes the same split

From `genesis.rs` and `torus.rs`:

| Hopf object | Metacanon object | Role |
|---|---|---|
| \(S^3\) total space | `ActionSpace.quaternion` | Possible actions / representations |
| \(S^2\) base | `WillVector` | Sovereign intent, “this IS the base space” |
| Fiber \(S^1\) | compute execution after validation | Doing a thing consistent with intent |
| \(\pi: S^3\to S^2\) | `SoulFile.validate_action` | Projection before compute (runtime Art. 8) |
| Gauge group | `Ratchet` \(H\ltimes N\) | Permissions and delegations |
| Multi-chart cover | specialist lenses + `will_vector_scope` | Local charts, not one universal mind |
| Convergence + HITL | `SubSphereTorus` | Lenses may converge; a human still approves |

The cosine-\(0.8\) WillVector gate is an **analogy implemented as embedding similarity**. It is not the same function as \(\pi\). Do not collapse them in the UI.

Numbering collision to keep explicit:

- Constitution text: **Article VI** (AI Agent Governance) in Metacanon v3.0.
- Runtime comments: **Article 8** pre-validation, **Article 10** key locality.

Facet labels should name the source. They are not one eight-article document.

---

## 4. The harmonic relationship

The one mapping that is both mathematically honest and matches the spoken metaphor:

### 4.1 Shared goal = a point on \(S^2\)

The public decision — this versioned proposal, in this moment — is a base point \(p\in S^2\). The bright hoop over \(p\) is the **goal fiber**.

### 4.2 Worldview ≠ intention

A person’s overall worldview can stay on its own home fiber (their WillVector, their seat, their long-running aim). That hoop does not have to move.

A person’s **current intention toward this proposal** is a point on a fiber: a pair \((q,\gamma)\) where \(q\in S^2\) is “what I am aiming at right now” and \(\gamma\in S^1\) is “how I am holding that aim.”

Because \(\pi(e^{i\gamma}z)=\pi(z)\), two people can share a goal without sharing a worldview. That is the whole point of a fiber. Alignment of intention is **not** identity of persons.

### 4.3 Points on hoops = beads

Each bead is one intention. Sliding a bead along its hoop is a **reframe**: same public goal, different phase / wording / stance. Moving the hoop’s base point is a **different aim**. Only an explicit Propose command changes the public goal.

### 4.4 Agreement = coordinated beads + sealed constitution, not a score

As review, correction, and Yes accumulate for the current version, working beads ease toward lock marks on (or near) the goal fiber. The picture can show proximity. The constitution still has to seal it:

- exact versioned consent from the people who must answer,
- recorded reviews for that version,
- no open repair blocker,
- an explicit Commit.

Topology does not authorize. Beads clustering is display. A No does not get gravity-pulled into Yes. Withdrawal slides the bead off the lock; the person and their home hoop remain.

### 4.5 Constitution = the discrete structure of the base

The platonic solid is not another fiber. It is a **finite sampling of \(S^2\)** — the unique finite rotation groups of the sphere (\(A_4\), \(S_4\), \(A_5\)).

That is the harmonic click:

- Hopf gives a continuous \(U(1)\) oscillator over every direction on the sphere.
- A platonic solid picks a discrete lattice of directions the group is willing to treat as structure.
- The constitution names those directions as articles, lenses, seats, and gates.
- Intentions can lock onto that lattice without the people becoming the lattice.

Holonomy is why history is append-only. After a loop you can return to the same public answer with a changed lift. RETURN is that fact in protocol language.

Chern \(\neq 0\) is why there is no universal “we all agree” scalar. Consent stays versioned and local.

### 4.6 The tetrahedron identity

Default solid: **tetrahedron**.

| Tetrahedron | Workshop / Metacanon | Hopf |
|---|---|---|
| 4 vertices | four-person sphere / four seats | 4 featured base points |
| 4 faces | generate / maintain / release / HITL | 4 constitutional charts |
| 6 edges | pairwise relations among four seats | linking of 4 fibers \(= C(4,2)=6\) |
| self-dual | Constitutional Mirror | the same lattice can be read as seats or as articles |

That last row is why the tetrahedron belongs in the middle of *this* instrument rather than a cube or an icosahedron as the default. Other solids remain available as **finer or dual charts of the same constitution**, not as a second authority.

Optional charts:

- Octahedron (6 vertices) or cube (6 faces) → 6-lens orchestrator.
- Dodecahedron / icosahedron → 12-profile sampling. Sampling, not a tiling of \(S^3\).
- Star tetrahedron only as a labeled contemplative overlay.

### 4.7 What “harmonic” actually means here

A Hopf fiber is a \(U(1)\) circle — one oscillator degree of freedom. Alignment is **phase coherence relative to a shared base point** (mode-locking onto a constitutional facet), not fusion of worldviews.

The abacus is the right mechanical picture:

- Frame = platonic solid (constitution).
- Wires = fibers (intention spaces). Wires never merge.
- Beads = intention points.
- Lock marks = coordinated phase on this version.
- You calculate a relationship by moving beads. You do not fuse wires.

---

## 5. What to keep from the current visualizer

Do not replace the live language. The current drawing is already the right fiber field: linked loops, pick-a-dot, “a loop is not a person,” Bundle map vs Hourglass.

Keep:

1. The two drawings as two drawings. Hourglass = process metaphor (generate / maintain / release). Bundle map = exact topology.
2. Decision as the product entrance; Bundle map as the Geometry default.
3. The five-layer stage from the visualizer design review: Possibilities / Agreement / People / Consequences / History.
4. All protocol invariants listed in §2.
5. Existing tokens can be used in either the live light field or the dark instrument treatment. The *structure* that must survive is the family of linked loops plus named people plus versioned agreement, not a particular CSS background.
6. Python remains normative. A new renderer is not a new permission engine.
7. Designed 2D fallback. GPU must not become a prerequisite (visualizer prompt VZ26).

---

## 6. What to add, without changing the meaning of the picture

Add these as layers on the existing Bundle/Decision stage.

### A. Center platonic solid

- Small, faceted, sitting in the visual center of the existing torus / fiber cluster.
- Unsealed wire when there is no agreement.
- Gold-filled / sealed only after an accepted commit.
- Amber when paused by withdrawal.
- Dim / settled when retired.
- Click a face → inspector shows that article / lens. Does not move fibers. Does not grant consent.
- Click a vertex → inspector shows that seat / requirement.

Default face binding for the tetrahedron:

| Face | Constitutional chart | Workshop process |
|---|---|---|
| A | Possibilities / proposal may be born | Generate / upper cone |
| B | Versioned agreement / maintain | Torus table |
| C | Withdrawal, repair, retire | Release / lower cone |
| D | Art. VI interpretive boundary / HITL | Human keeps the decision |

### B. Beads on featured fibers

- Use `Hopf.fibre(θ,φ)` and place a bead at `stereographic(state(θ,φ,γ))`.
- Each participant has a **home hoop** (worldview / seat) and a **working bead** (current intention).
- Home hoops stay put. Working beads slide toward the shared-goal lock as that person records Yes on the current version.
- Unset = bead free on the hoop. No = explicit hold mark. Withdraw = bead leaves the lock; hoop remains.
- People stay named in the inspector. “Maya’s hoop” is a teaching overlay, not an ontology.

### C. Shared-goal marker

- The current protocol base point \(\pi(z)\) drawn on or near the solid.
- Explore may move a *display* marker. Only explicit Explore copies it into protocol, and even then it does not create consent.

### D. Abacus reading mode

- Same fibers, slightly thicker wires, explicit beads and lock marks.
- Calculator strip (numbers are checks, never moral scores):

  - proposal version / applicable agreement version
  - who has answered, and how
  - blockers for commit and for act
  - holonomy of the last closed latitude
  - pairwise linking of the selected pair
  - Chern integral check
  - selected facet and selected seat

### E. Motion contract

- Ordinary state change: 180–450ms.
- Event flourish at most 400–700ms, and never waited on for permissions.
- A later withdrawal cancels an older commit glow.
- Reduced motion: jump to end state. No auto-orbit.

---

## 7. Implementation path

Two surfaces, one view-model.

**Path 1 — default, conservative.** Project the tetrahedron and beads into the existing 2D `drawBundleMap` canvas. Keeps the live look, needs no WebGL, satisfies VZ26.

**Path 2 — Geometry-lab enhancement.** Optional WebGL overlay (the pattern already exists in `metacanon-sphere` `HopfScene3D`) with the designed 2D view as fallback. Same adapter: scene, inspector, navigator, and eligibility all consume one canonical snapshot.

Do not start a third protocol engine inside the renderer.

The standalone prototype in this folder (`intention-abacus.html`) is Path 2 used as a *design instrument*: it shows the solid, the facets, the beads, and the alignment story on exact Hopf fibers. It is not a replacement for `workshop.html` and it does not authorize anything.

Suggested drop-in order for `jedisherpa/hopf-workshop`:

1. Pure adapter from `Workshop` snapshot → visualizer view-model (already specified in the visualizer implementation prompt).
2. Path 1 tetrahedron + beads in `drawBundleMap`.
3. Facet / vertex hit targets as HTML, not as canvas-only glyphs.
4. Path 2 overlay behind a “3D instrument” toggle, with the 2D view always available.
5. Four-loop verification per visualizer feature. This package does not claim those loops have been run.

---

## 8. What not to do

- Do not identify people as fibers in copy.
- Do not let bead motion, camera orbit, or solid rotation write consent.
- Do not treat cosine-0.8 as \(\pi\).
- Do not put 12 lenses on 12 fibers and call \(S^3\) tiled.
- Do not animate alignment as a gravity well that pulls No into Yes.
- Do not show a consensus percentage, safety meter, or blended completion score.
- Do not use star-tetrahedron / merkaba as a permission engine.
- Do not claim the constitution *is* the binary tetrahedral group \(2T\subset SU(2)\). The rhyme (24 default fibers, \(2T\) double-covering \(A_4\)) is real and can be shown. It is not a proof of governance.

---

## 9. One sentence for the instrument

**The hoops let different worldviews share a moment. The solid says what kind of moment it is. The beads show whether intentions have actually been placed. The constitution, not the picture, is what seals the agreement.**
