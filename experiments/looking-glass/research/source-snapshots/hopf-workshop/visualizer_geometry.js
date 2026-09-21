/**
 * Intention-abacus overlays for the Hopf Workshop canvas.
 *
 * Path 1 drop-in: call after drawBundleMap / drawProcessMap with the same ctx
 * and camera. Reads a VisualizerView-shaped object, never raw consent maps.
 *
 * Geometry is not permission. People are not fibres. A bead is an intention
 * point. Ready does not move a bead. v1 Yes does not ride onto v2.
 */
"use strict";

const VisualizerGeometry = (() => {
  const INV_SQRT3 = 1 / Math.sqrt(3);
  const TETRA_VERTS = Object.freeze([
    Object.freeze([INV_SQRT3, INV_SQRT3, INV_SQRT3]),
    Object.freeze([INV_SQRT3, -INV_SQRT3, -INV_SQRT3]),
    Object.freeze([-INV_SQRT3, INV_SQRT3, -INV_SQRT3]),
    Object.freeze([-INV_SQRT3, -INV_SQRT3, INV_SQRT3]),
  ]);
  const TETRA_FACES = Object.freeze([
    Object.freeze([0, 1, 2]),
    Object.freeze([0, 2, 3]),
    Object.freeze([0, 3, 1]),
    Object.freeze([1, 3, 2]),
  ]);
  const FACE_LABELS = Object.freeze([
    "Generate · possibilities",
    "Maintain · versioned agreement",
    "Release · withdrawal, repair, retire",
    "HITL · Art. VI interpretive boundary",
  ]);

  function sph(v) {
    const x = v[0];
    const y = v[1];
    const z = v[2];
    return {
      theta: Math.acos(Math.max(-1, Math.min(1, z))),
      phi: Math.atan2(y, x),
    };
  }

  function tetraVertexSpheres() {
    return TETRA_VERTS.map((v, i) => ({ index: i, xyz: v, ...sph(v) }));
  }

  function project3(p, camera, box) {
    const yaw = camera.yaw || 0;
    const pitch = camera.pitch || 0.35;
    const scale = camera.scale || Math.min(box.w, box.h) * 0.22;
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    const x1 = p[0] * cy - p[2] * sy;
    const z1 = p[0] * sy + p[2] * cy;
    const y1 = p[1] * cp - z1 * sp;
    const z2 = p[1] * sp + z1 * cp;
    const depth = 2.6 + z2;
    const k = scale / Math.max(0.55, depth);
    return {
      x: box.w / 2 + x1 * k,
      y: box.h / 2 - y1 * k,
      z: z2,
      k,
    };
  }

  function solidStyle(view) {
    const status = (view && view.agreement && view.agreement.status) || "empty";
    if (status === "active") {
      return { edge: "#C49214", fill: "rgba(240, 201, 58, 0.28)", width: 2.4 };
    }
    if (status === "paused") {
      return { edge: "#C47A14", fill: "rgba(255, 202, 128, 0.18)", width: 2.2 };
    }
    if (status === "retired") {
      return { edge: "rgba(30, 58, 95, 0.45)", fill: "rgba(30, 58, 95, 0.06)", width: 1.4 };
    }
    if (view && view.readyToCommit) {
      return { edge: "#E8B84A", fill: "rgba(240, 201, 58, 0.10)", width: 2 };
    }
    return { edge: "rgba(196, 146, 20, 0.85)", fill: "rgba(255, 255, 255, 0.12)", width: 1.6 };
  }

  function drawConstitutionSolid(ctx, camera, view, box) {
    const style = solidStyle(view);
    const projected = TETRA_VERTS.map((v) => project3(v, camera, box));
    const faces = TETRA_FACES.map((face, fi) => {
      const pts = face.map((i) => projected[i]);
      const z = (pts[0].z + pts[1].z + pts[2].z) / 3;
      return { fi, pts, z };
    }).sort((a, b) => a.z - b.z);

    faces.forEach((face) => {
      ctx.beginPath();
      ctx.moveTo(face.pts[0].x, face.pts[0].y);
      ctx.lineTo(face.pts[1].x, face.pts[1].y);
      ctx.lineTo(face.pts[2].x, face.pts[2].y);
      ctx.closePath();
      ctx.fillStyle = view && view.selectedFacet === face.fi ? "rgba(26, 212, 234, 0.22)" : style.fill;
      ctx.fill();
      ctx.strokeStyle = view && view.selectedFacet === face.fi ? "#1AD4EA" : style.edge;
      ctx.lineWidth = style.width;
      ctx.stroke();
    });
  }

  function beadTarget(participant, view) {
    const home = tetraVertexSpheres()[participant.seatIndex % 4];
    const goal = (view && view.goal) || home;
    const version = view && view.proposal && view.proposal.version;
    const response = participant.response;
    const responseVersion = participant.responseVersion;
    if (response === "yes" && responseVersion === version) {
      return { theta: goal.theta, phi: goal.phi, gamma: participant.lockGamma || 0, lock: true };
    }
    if (response === "no" && responseVersion === version) {
      return { theta: home.theta, phi: home.phi, gamma: Math.PI / 2, lock: false };
    }
    if (response === "withdrawn") {
      return { theta: home.theta, phi: home.phi, gamma: Math.PI, lock: false };
    }
    return { theta: home.theta, phi: home.phi, gamma: participant.restGamma || 0.4, lock: false };
  }

  function drawIntentionBeads(ctx, camera, view, box, Hopf) {
    if (!view || !Array.isArray(view.participants) || !Hopf) return;
    view.participants.forEach((person) => {
      const target = beadTarget(person, view);
      const t = person.display || target;
      let p;
      try {
        p = Hopf.stereographic(Hopf.state(t.theta, t.phi, t.gamma));
      } catch (err) {
        return;
      }
      const q = project3(p, camera, box);
      const color = person.color || "#1AD4EA";
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.strokeStyle = target.lock ? "#1E3A5F" : "rgba(30, 58, 95, 0.65)";
      ctx.lineWidth = target.lock ? 2.5 : 1.4;
      ctx.arc(q.x, q.y, target.lock ? 7 : 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  }

  return {
    TETRA_VERTS,
    TETRA_FACES,
    FACE_LABELS,
    tetraVertexSpheres,
    project3,
    drawConstitutionSolid,
    drawIntentionBeads,
    beadTarget,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = VisualizerGeometry;
}
