# Gate 8 exact model and presentation contract

Version `gate8-model-v1`. `fixture.json` is the public model; `independent-predictions.json` gives independently authored audit expectations. All source coordinates, transforms and admissible menus are known. Use exact rational arithmetic for equality and finite certificates, with floating-point values only for drawing and a separately labeled closeness diagnostic.

## Exact observations

A rational is a canonical reduced string `n` or `n/d`, with integer n, positive integer d, no leading plus, and zero always `0`. Parse numerator/denominator as integers of adequate precision, preferably BigInt. Normalize after arithmetic. Equality must compare normalized rational values, never rounded decimal strings or a numerical tolerance. Canonical observation JSON uses the field/order conventions below or a documented stable serializer. Source-world ID and property answer are **not** part of the observation used to determine compatibility.

Point observations are `{kind:"point",pointId:"P",xyz:[rational,rational,rational]}`. There is exactly one corresponding point P per world in each case; cross-case IDs do not imply a shared source. For a source `(x,y,z,w[,v])`:

- `project`: `(x,y,z)`.
- `xw90`: `(−w,y,z)`, from the column-vector rotation x′=−w, w′=x followed by dropping hidden coordinates.
- `yv90`: `(x,−v,z)`, from y′=−v, v′=y followed by dropping hidden coordinates.

Every query acts on the original source. Query selection does not accumulate rotations. In C02 the two separate observations provide complementary coordinates; no query combines both turns. Camera state never enters these raw formulas.

Ball observations have center `["0","0","0"]` and exact radiusSquared. Projection is `{kind:"ball",center:[...],radiusSquared:"1"}`. A slice at w=s of a unit ball with hidden center c has `q=1−(s−c)²`. For q>0 return `{kind:"ball",center:[...],radiusSquared:q}`; for q=0 return `{kind:"point",center:[...],radiusSquared:"0"}`; for q<0 return `{kind:"empty"}`. Negative radius-squared values are derivation data, not an empty object's radius. Nonempty radius is sqrt(q) for drawing only. Closed ball, boundary point and empty set are distinct kinds. The derived slice kind is decided exactly, without epsilon boundary rules.

An observation bundle is an ordered list of `{queryId,observation}` sorted by fixture query order. The baseline and an added subset determine this order, independent of the user's click order. Retain click order separately in events. Never compare different query IDs as if their outputs came from the same known intervention.

## Finite identification and certificates

For case candidate set W, property f and query subset S, define the exact signature as the ordered bundle of every baseline query and every query in S. Worlds u,v are compatible iff their exact signatures equal. A property is determined for a reference world iff all compatible candidates share its property value. The software shows that local statement separately from the stronger family-wide certificate.

A subset S is family-wide property-determining iff no unequal-property pair retains equal exact signatures. Enumerate subsets by cardinality and then lexicographic query-ID order; preserve every minimal subset, not only the first found. If no subset works, emit `status:"none-in-menu"`, minimum size null, minimal subsets empty, and the surviving pair IDs under the full menu. For a baseline-sufficient case use `status:"determined"`, minimum size 0, minimal subsets `[[]]`. Record subset counts examined; this is exhaustive search over the frozen finite menus only. Adaptive query trees, unknown measurement errors, unknown correspondences and arbitrary world classes are outside scope.

The certificate panel lists baseline collision pairs with different properties, each additional query's separating pairs, exhaustive subset results and any full-menu survivor. For C03, show the outside-menu `slicePlusHalf` values only inside a clearly labeled explanatory block, never as a selectable allowed observation, as evidence obtained in the allowed experiment, or as a way to convert its failure status to success. Its public definition prevents a universal impossibility reading.

## Exact, near, and rounded are separate

Report three comparison fields for each candidate pair:

1. `exactEqual`: exact normalized rational observations, including kind and correspondence, agree at every supplied query.
2. `withinTolerance`: kinds/correspondences match and each corresponding numerical coordinate or radius-squared differs by at most 10⁻¹⁰. This is a **pairwise diagnostic**, not a candidate partition or proof of equality; closeness need not be transitive in other data.
3. `roundedLabelsEqual`: corresponding numeric fields round to the same fixed two-decimal labels and kinds/correspondences match. Normalize negative zero to `0.00`; the complete structured label records must match. Pixel identity is not claimed. A ball's label uses radius-squared explicitly; the drawn radius is a separate approximation.

C04 must visibly state **raw values differ**, **within tolerance**, and **same rounded labels** together. Its exact baseline already determines the property; the minimum exact additional-query count is zero. Do not place C04 in an exact-indistinguishability list. Under the separate tolerance and rounded-label diagnostics, its quarter-turn produces a robust distinction, but do not silently swap that objective into the exact minimum.

## Minimal interface

Use a four-case selector, public reference-world selector, baseline/reset-observations action, one button per admissible additional query, camera yaw selector `−45° / 0° / +45°`, certificate reveal/hide, and saved-tour controls. Do not offer arbitrary source rotations, off-menu slices, drag manipulations with unclear semantics, participant answers or scoring. Additional-query buttons add one query to a set; repeating a query is an explicit no-op and does not add information. Selecting case or reference world resets that case to baseline, hides its certificate and resets camera to 0°. Selecting a camera changes only the display; query selections and exact information hash remain unchanged.

The current observations panel draws one simple point or ball/slice panel per observed query. Use a fixed documented camera and common scale, with no per-world or per-query autoscaling; default yaw0 and fixed pitch20° are suitable. A camera yaw convention and fixed scale must be declared in the implementation README. Show source coordinates/property values in a compact public candidate table, then raw exact observations with approximate two-decimal labels. An expandable raw-data/inspector block may avoid crowded fractions, but the C04 raw-difference warning must remain visible when collapsed. Expanding precision discloses more of an already supplied observation; it is not a new source observation and must not change selected queries or the information fingerprint. Empty observations have explicit text and no fake radius; points have a marker and point label. Do not require depth perception to read the raw result.

Show which candidates remain compatible with the public reference and whether their property answers agree. This calculated result is allowed before certificate reveal: the instrument teaches and checks a public finite model. The certificate is an optional detailed explanation, with no security, secrecy or assessment claim. Reset/reopen hides it. Public source includes candidate worlds and may include derivation functions. Serve only declared static assets/run files and closed review files; no generic filesystem route. `independent-predictions.json`, prespec files and audit-source files need not be browser assets, and no private-answer API is necessary.

## Saved tour

The canonical 32-second demonstration opens paused at0. Use eight discrete four-second intervals; no interpolation creates extra queries. At 0 initialize C01/reference W01/baseline; at4 add xw90. At8 select C02/W01/baseline; at12 add xw90; at16 add yv90. At20 select C03/W01/baseline; at24 add both allowed outer slices; at28 select C04/W01/baseline. At32 retain C04, add xw90, stop paused with `end-of-sequence` and cursor32. The paused time-0 state is an initial-state record, not an interaction event. Scheduled case/query changes have replay origin: at24 record separate `add-query` events for `sliceMinus2` then `slicePlus2` in fixture order; at32 record the replay-origin `add-query` for `xw90` before the automatic `tour-stop`. The record contract defines their ordering. Camera stays0, certificates stay closed. Checkpoints are 0,4,8,12,16,20,24,28,32; sampling an exact checkpoint means the state after all scheduled changes at that boundary, including the automatic stop at32. Tour queries operate on original sources exactly as manual queries do.

Manual controls enter `exploration`, pause the tour and preserve its cursor for provenance. Play/replay or a saved checkpoint restores deterministic saved state, never merges exploration into it. Reopen saved start and reload restore0, paused, baseline C01/W01, camera0, certificate hidden. Checkpoint restores are paused. Provide play/pause, replay-from-start, previous/next checkpoint and explicit checkpoint buttons or an equivalently labeled timeline. Do not use a second autonomous animation.

Recommended pure exports are `observe`, `compareObservations`, `enumerateCertificate`, `stateAt`, `deriveView`, `transition`, `semanticFingerprint` and `informationFingerprint`, with equivalent names allowed. The semantic fingerprint covers case/reference/selected queries/exact outputs/compatible IDs/property status/camera/certificate flag/cursor/mode/paused state; exclude timestamps, sessions and viewport. The information fingerprint covers case and ordered selected query outputs only, excluding reference ID, camera, layout, certificate visibility and cursor. Identical observed information is not separated just by a different source ID. Always compare equivalent paused states when checking checkpoint fingerprints.
