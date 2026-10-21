import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** A small aluminium notebook. Details share geometry to keep the prop cheap. */
export function createLaptop() {
  const laptop = new THREE.Group();
  const shell = new THREE.MeshStandardMaterial({
    color: '#aeb9b8',
    metalness: 0.55,
    roughness: 0.38,
  });
  const edge = new THREE.MeshStandardMaterial({
    color: '#748181',
    metalness: 0.45,
    roughness: 0.45,
  });
  const charcoal = new THREE.MeshStandardMaterial({
    color: '#293338',
    roughness: 0.7,
  });
  const screen = new THREE.MeshBasicMaterial({ color: '#1f3039' });
  function block(
    parent: THREE.Group,
    size: [number, number, number],
    at: [number, number, number],
    material: THREE.Material,
    radius = 0,
  ) {
    const geometry = radius
      ? new RoundedBoxGeometry(...size, 2, radius)
      : new THREE.BoxGeometry(...size);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...at);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  block(laptop, [0.49, 0.021, 0.31], [0, 0, 0], shell, 0.009);
  block(laptop, [0.46, 0.006, 0.285], [0, -0.012, 0], edge, 0.003);
  // Keyboard recessed in the rear half; a separate palm rest and trackpad below it.
  block(laptop, [0.407, 0.003, 0.132], [0, 0.011, 0.043], charcoal, 0.001);
  const keys: THREE.BufferGeometry[] = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 11; col++) {
      const key = new THREE.BoxGeometry(0.029, 0.003, 0.021);
      key.translate((col - 5) * 0.0355, 0.015, 0.09 - row * 0.028);
      keys.push(key);
    }
  }
  const space = new THREE.BoxGeometry(0.14, 0.003, 0.014);
  space.translate(0, 0.015, -0.018);
  keys.push(space);
  const keyboard = new THREE.Mesh(mergeGeometries(keys), edge);
  laptop.add(keyboard);
  keys.forEach((g) => g.dispose());
  block(laptop, [0.139, 0.002, 0.077], [0, 0.0115, -0.09], edge, 0.001);
  block(laptop, [0.131, 0.002, 0.069], [0, 0.0125, -0.09], shell, 0.001);
  // Dark port cutouts on the left edge and a front opening notch.
  for (const z of [-0.04, 0.035])
    block(laptop, [0.002, 0.007, 0.023], [-0.2455, 0, z], charcoal);
  block(laptop, [0.06, 0.005, 0.002], [0, 0.006, -0.1555], edge);
  const hinge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.4, 12),
    edge,
  );
  hinge.rotation.z = Math.PI / 2;
  hinge.position.set(0, 0.012, 0.14);
  laptop.add(hinge);
  const lid = new THREE.Group();
  lid.position.set(0, 0.014, 0.14);
  lid.rotation.x = 0.22;
  laptop.add(lid);
  block(lid, [0.49, 0.302, 0.014], [0, 0.151, 0], shell, 0.006);
  block(lid, [0.466, 0.279, 0.002], [0, 0.152, -0.008], charcoal, 0.001);
  block(lid, [0.438, 0.249, 0.001], [0, 0.151, -0.0095], screen);
  // Quiet editor layout: sidebar, code lines, status bar. No tiny fake text.
  const ui = new THREE.MeshBasicMaterial({ color: '#354a55' });
  const mint = new THREE.MeshBasicMaterial({ color: '#a6c6ba' });
  const warm = new THREE.MeshBasicMaterial({ color: '#d5b887' });
  block(lid, [0.082, 0.227, 0.001], [-0.171, 0.15, -0.0105], ui);
  block(lid, [0.438, 0.012, 0.001], [0, 0.033, -0.0105], ui);
  for (let row = 0; row < 7; row++) {
    const width = [0.17, 0.115, 0.19, 0.145, 0.09, 0.18, 0.12][row];
    block(
      lid,
      [width, 0.006, 0.001],
      [
        -0.105 + width / 2 + (row % 3 ? 0.018 : 0),
        0.234 - row * 0.023,
        -0.0105,
      ],
      row % 3 === 0 ? warm : mint,
    );
  }
  const webcam = new THREE.Mesh(new THREE.CircleGeometry(0.003, 8), charcoal);
  webcam.rotation.y = Math.PI;
  webcam.position.set(0, 0.286, -0.0095);
  lid.add(webcam);
  // A restrained embossed dash on the outer lid reads from the island camera.
  block(lid, [0.048, 0.006, 0.001], [0, 0.16, 0.0075], edge);
  // Bake static parts by material: keyboard and screen detail do not each
  // cost a separate draw call when both travellers carry a notebook.
  laptop.updateMatrixWorld(true);
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
  laptop.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    const geometry = node.geometry.index
      ? node.geometry.toNonIndexed()
      : node.geometry.clone();
    geometry.applyMatrix4(node.matrixWorld);
    const parts = batches.get(node.material) ?? [];
    parts.push(geometry);
    batches.set(node.material, parts);
    node.geometry.dispose();
  });
  const model = new THREE.Group();
  for (const [material, parts] of batches) {
    const mesh = new THREE.Mesh(mergeGeometries(parts), material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    model.add(mesh);
    parts.forEach((part) => part.dispose());
  }
  return model;
}

export function Laptop() {
  const object = useMemo(() => createLaptop(), []);
  useEffect(
    () => () => {
      const materials = new Set<THREE.Material>();
      object.traverse((node) => {
        if (node instanceof THREE.Mesh) {
          node.geometry.dispose();
          for (const material of Array.isArray(node.material)
            ? node.material
            : [node.material])
            materials.add(material);
        }
      });
      materials.forEach((material) => material.dispose());
    },
    [object],
  );
  return <primitive object={object} />;
}
