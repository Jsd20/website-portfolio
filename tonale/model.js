const TAU = Math.PI * 2;
const DISC = { x: -0.7, z: -0.13, radius: 1.484, top: 0.834 };
const PIVOT = { x: 1.76, z: -1.16, height: 1.075 };

function makeRandom(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function canvasTexture(THREE, width, height, paint, inColor = true) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = inColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function trackedText(ctx, value, x, y, tracking) {
  for (const character of value) {
    ctx.fillText(character, x, y);
    x += ctx.measureText(character).width + tracking;
  }
}

function woodGrain(THREE) {
  return canvasTexture(THREE, 2048, 128, (ctx, w, h) => {
    const random = makeRandom(48);
    const grain = ctx.createImageData(w, h);
    const fibers = Array.from({ length: 256 }, () => random());
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const wave = 2.4 * Math.sin(x / 284 + y * 0.037)
          + 1.05 * Math.sin(x / 75 + y * 0.085)
          + 0.38 * Math.sin(x / 27 - y * 0.14);
        const curve = y + wave;
        const row = Math.floor(curve) + 42;
        const fraction = curve - Math.floor(curve);
        const fiber = fibers[row] * (1 - fraction) + fibers[row + 1] * fraction;
        const bands = 6.8 * Math.sin(curve * 0.32) + 3.9 * Math.sin(curve * 0.81);
        const pores = -18 * Math.pow(fiber, 7);
        const light = bands + pores + 8 * (fiber - 0.42) + 4 * (random() - 0.5);
        const pixel = (y * w + x) * 4;
        grain.data[pixel] = 112 + light;
        grain.data[pixel + 1] = 68 + light * 0.81;
        grain.data[pixel + 2] = 44 + light * 0.65;
        grain.data[pixel + 3] = 255;
      }
    }
    ctx.putImageData(grain, 0, 0);
    for (let index = 0; index < 1400; index++) {
      const x = random() * w;
      const y = random() * h;
      const length = 4 + 310 * Math.pow(random(), 2.25);
      ctx.strokeStyle = index % 5 === 0 ? 'rgba(224,154,103,.12)' : 'rgba(43,23,14,.14)';
      ctx.lineWidth = 0.24 + 0.74 * random();
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + length * 0.25, y - 0.9, x + length * 0.73, y + 0.9, x + length, y + 0.1);
      ctx.stroke();
    }
  });
}

function brushedGrain(THREE) {
  return canvasTexture(THREE, 512, 512, (ctx, width, height) => {
    const random = makeRandom(17);
    const grain = ctx.createImageData(width, height);
    for (let y = 0; y < height; y++) {
      const line = 30 * (random() - 0.5);
      for (let x = 0; x < width; x++) {
        const pixel = (y * width + x) * 4;
        const value = 143 + line * (0.84 + 0.16 * Math.sin(x / 82)) + 5 * (random() - 0.5);
        grain.data[pixel] = value;
        grain.data[pixel + 1] = value;
        grain.data[pixel + 2] = value;
        grain.data[pixel + 3] = 255;
      }
    }
    ctx.putImageData(grain, 0, 0);
  }, false);
}

function recordLabel(THREE, side) {
  return canvasTexture(THREE, 768, 768, (ctx, w) => {
    const middle = w / 2;
    const random = makeRandom(156);
    ctx.fillStyle = '#ba522f';
    ctx.fillRect(0, 0, w, w);
    for (let i = 0; i < 22000; i++) {
      ctx.fillStyle = i % 3 === 0 ? 'rgba(255,201,165,.10)' : 'rgba(53,22,11,.07)';
      ctx.fillRect(random() * w, random() * w, 0.5 + random() * 1.5, 0.7 + random());
    }
    ctx.strokeStyle = '#e78f68';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(middle, middle, 339, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(middle, middle, 319, 0, TAU);
    ctx.stroke();

    ctx.fillStyle = '#fff1d7';
    ctx.font = 'bold 101px Arial, sans-serif';
    trackedText(ctx, 'TONALE', 149, 287, 7);
    ctx.font = '22px Arial, sans-serif';
    trackedText(ctx, 'STUDIO DI ASCOLTO', 222, 320, 4.6);
    ctx.font = '600 27px Arial, sans-serif';
    trackedText(ctx, '33⅓', 118, 444, 1.8);
    trackedText(ctx, 'STEREO', 533, 444, 1.5);
    ctx.font = 'bold 96px Arial, sans-serif';
    ctx.fillText(side, 350, 543);
    ctx.font = '21px Arial, sans-serif';
    trackedText(ctx, 'T–01  /  PRESSING 001', 228, 592, 3.2);
    ctx.fillRect(250, 561, 268, 2);
  });
}

function vinylAnisotropy(THREE) {
  return canvasTexture(THREE, 384, 384, (ctx, width, height) => {
    const field = ctx.createImageData(width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const u = (x + 0.5) / width - 0.5;
        const v = 0.5 - (y + 0.5) / height;
        const radius = Math.hypot(u, v);
        const pixel = (y * width + x) * 4;
        const bands = 0.92 + 0.035 * Math.sin(radius * 201) + 0.025 * Math.sin(radius * 370);
        // The roughness axis crosses the groove, so the reflections fan out from the spindle.
        field.data[pixel] = 127.5 * (1 + u / radius);
        field.data[pixel + 1] = 127.5 * (1 + v / radius);
        field.data[pixel + 2] = 255 * bands;
        field.data[pixel + 3] = 255;
      }
    }
    ctx.putImageData(field, 0, 0);
  }, false);
}

function roundedOutline(width, depth, corner, inset) {
  const points = [];
  const radius = Math.max(corner - inset, 0.001);
  for (let quarter = 0; quarter < 4; quarter++) {
    const centerX = (width / 2 - corner) * (quarter === 0 || quarter === 3 ? 1 : -1);
    const centerZ = (depth / 2 - corner) * (quarter < 2 ? 1 : -1);
    for (let sample = 0; sample <= 12; sample++) {
      const angle = Math.PI / 2 * (quarter + sample / 12);
      const nx = Math.cos(angle);
      const nz = Math.sin(angle);
      points.push({ x: centerX + radius * nx, z: centerZ + radius * nz, nx, nz });
    }
  }
  points.push(points[0]);
  return points;
}

function slabGeometry(THREE, width, depth, height, corner, bevel) {
  const positions = [];
  const normals = [];
  const texcoords = [];
  const indices = [];
  const ringAngles = [0, Math.PI / 6, Math.PI / 3, Math.PI / 2];
  const layers = [];

  for (const angle of ringAngles) layers.push({
    inset: bevel * (1 - Math.sin(angle)), y: -height / 2 + bevel * (1 - Math.cos(angle)),
    nxz: Math.sin(angle), ny: -Math.cos(angle),
  });
  for (const angle of ringAngles.slice().reverse()) layers.push({
    inset: bevel * (1 - Math.sin(angle)), y: height / 2 - bevel * (1 - Math.cos(angle)),
    nxz: Math.sin(angle), ny: Math.cos(angle),
  });

  const outline = roundedOutline(width, depth, corner, 0);
  const vertexCount = outline.length;
  const perimeter = [0];
  for (let i = 1; i < vertexCount; i++) {
    const prev = outline[i - 1];
    const next = outline[i];
    perimeter.push(perimeter[i - 1] + Math.hypot(next.x - prev.x, next.z - prev.z));
  }

  for (const layer of layers) {
    const points = roundedOutline(width, depth, corner, layer.inset);
    points.forEach(({ x, z, nx, nz }, index) => {
      positions.push(x, layer.y, z);
      normals.push(nx * layer.nxz, layer.ny, nz * layer.nxz);
      texcoords.push(perimeter[index] / perimeter[vertexCount - 1], 0.5 + layer.y / height);
    });
  }

  for (let row = 0; row < layers.length - 1; row++) {
    for (let i = 0; i < vertexCount - 1; i++) {
      const a = row * vertexCount + i;
      const b = a + vertexCount;
      indices.push(a, b, b + 1, a, b + 1, a + 1);
    }
  }

  const sideCount = indices.length;
  const caps = roundedOutline(width, depth, corner, bevel);
  for (const normalY of [-1, 1]) {
    const center = positions.length / 3;
    const y = normalY * height / 2;
    positions.push(0, y, 0);
    normals.push(0, normalY, 0);
    texcoords.push(0.5, 0.5);
    for (const { x, z } of caps) {
      positions.push(x, y, z);
      normals.push(0, normalY, 0);
      texcoords.push(0.5 + x / width, 0.5 + z / depth);
    }
    for (let i = 1; i < vertexCount; i++) {
      if (normalY === 1) indices.push(center, center + i + 1, center + i);
      else indices.push(center, center + i, center + i + 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(texcoords, 2));
  geometry.setIndex(indices);
  geometry.addGroup(0, sideCount, 0);
  geometry.addGroup(sideCount, indices.length - sideCount, 1);
  return geometry;
}

function makeGrooves(THREE) {
  const positions = [];
  const normals = [];
  const texcoords = [];
  const indices = [];
  const random = makeRandom(36);
  const segments = 128;
  const circles = Array.from({ length: segments }, (_, segment) => {
    const azimuth = TAU * segment / segments;
    return [Math.cos(azimuth), Math.sin(azimuth)];
  });
  const recordingBands = [[0.555, 0.746], [0.757, 0.943], [0.953, 1.15], [1.16, 1.306], [1.318, 1.45]];

  function addRing(radius, width, slope) {
    const start = positions.length / 3;
    for (const [x, z] of circles) {
      positions.push((radius - width) * x, 0, (radius - width) * z, radius * x, 0, radius * z);
      normals.push(slope * x, 0.997, slope * z, slope * x, 0.997, slope * z);
      const inner = (radius - width) / (DISC.radius * 2);
      const outer = radius / (DISC.radius * 2);
      texcoords.push(0.5 + inner * x, 0.5 - inner * z, 0.5 + outer * x, 0.5 - outer * z);
    }
    for (let step = 0; step < segments; step++) {
      const left = start + step * 2;
      const right = start + ((step + 1) % segments) * 2;
      indices.push(left, right, left + 1, left + 1, right, right + 1);
    }
  }

  for (const [start, end] of recordingBands) {
    for (let radius = start; radius < end; radius += 0.003 + random() * 0.0029) {
      addRing(radius, 0.0005 + random() * 0.001, (random() - 0.5) * 0.075);
    }
    addRing(start, 0.0018, 0.06);
  }
  for (const radius of [0.533, 0.539, 1.456, 1.465, 1.477]) addRing(radius, 0.0011, 0.02);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(texcoords, 2));
  geometry.setIndex(indices);
  return geometry;
}

export function buildTurntable(THREE) {
  const group = new THREE.Group();
  group.name = 'TONALE T–01';

  const brushed = brushedGrain(THREE);
  const walnut = woodGrain(THREE);
  const champagne = new THREE.MeshPhysicalMaterial({
    color: 0xbeb0a1, metalness: 0.72, roughness: 0.31,
    anisotropy: 0.48, bumpMap: brushed, bumpScale: 0.0035,
  });
  const champagneEdge = new THREE.MeshStandardMaterial({ color: 0xb6a79b, metalness: 0.77, roughness: 0.27 });
  const polished = new THREE.MeshStandardMaterial({ color: 0xcad0cd, metalness: 0.9, roughness: 0.17 });
  const machined = new THREE.MeshPhysicalMaterial({ color: 0xa8a29b, metalness: 0.83, roughness: 0.27, anisotropy: 0.35 });
  const graphite = new THREE.MeshStandardMaterial({ color: 0x333334, metalness: 0.54, roughness: 0.35 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x1c1918, roughness: 0.83 });
  const black = new THREE.MeshStandardMaterial({ color: 0x171819, metalness: 0.22, roughness: 0.37 });
  const oak = new THREE.MeshPhysicalMaterial({ map: walnut, roughness: 0.57, bumpMap: walnut, bumpScale: 0.009, clearcoat: 0.14, clearcoatRoughness: 0.5 });
  const endGrain = new THREE.MeshStandardMaterial({ color: 0x5d3826, roughness: 0.62 });
  const orange = new THREE.MeshStandardMaterial({ color: 0xbd4f2c, roughness: 0.39, metalness: 0.23 });
  const cream = new THREE.MeshStandardMaterial({ color: 0xf4e8d7, roughness: 0.46 });

  function assembly(name, parent = group) {
    const part = new THREE.Group();
    part.name = name;
    parent.add(part);
    return part;
  }

  function mesh(parent, geometry, material, x = 0, y = 0, z = 0) {
    const part = new THREE.Mesh(geometry, material);
    part.position.set(x, y, z);
    part.castShadow = true;
    part.receiveShadow = true;
    parent.add(part);
    return part;
  }

  function slab(parent, width, depth, height, corner, bevel, side, face, x, y, z) {
    return mesh(parent, slabGeometry(THREE, width, depth, height, corner, bevel), [side, face], x, y, z);
  }

  function cylinder(parent, top, bottom, height, material, x, y, z, segments = 64) {
    return mesh(parent, new THREE.CylinderGeometry(top, bottom, height, segments), material, x, y, z);
  }

  function ring(parent, radius, tube, material, x, y, z, radial = 8) {
    const part = mesh(parent, new THREE.TorusGeometry(radius, tube, radial, 96), material, x, y, z);
    part.rotation.x = -Math.PI / 2;
    return part;
  }

  function box(parent, dimensions, material, x, y, z) {
    return mesh(parent, new THREE.BoxGeometry(...dimensions), material, x, y, z);
  }

  function instanced(parent, geometry, material, transforms) {
    const part = new THREE.InstancedMesh(geometry, material, transforms.length);
    const transform = new THREE.Object3D();
    transforms.forEach(({ x, y, z, angle = 0 }, index) => {
      transform.position.set(x, y, z);
      transform.rotation.y = angle;
      transform.updateMatrix();
      part.setMatrixAt(index, transform.matrix);
    });
    part.instanceMatrix.needsUpdate = true;
    part.computeBoundingSphere();
    part.receiveShadow = true;
    parent.add(part);
    return part;
  }

  function print(parent, dimensions, resolution, x, y, z, paint) {
    const ink = new THREE.MeshStandardMaterial({
      map: canvasTexture(THREE, ...resolution, paint), roughness: 0.83, transparent: true,
      alphaTest: 0.22, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
    });
    const part = mesh(parent, new THREE.PlaneGeometry(...dimensions), ink, x, y, z);
    part.rotation.x = -Math.PI / 2;
    part.castShadow = false;
    return part;
  }

  const feet = assembly('Isolation feet');
  const footPositions = [-2.19, 2.19].flatMap((x) => [-1.38, 1.38].map((z) => ({ x, z })));
  instanced(feet, new THREE.CylinderGeometry(0.22, 0.23, 0.031, 48), rubber,
    footPositions.map(({ x, z }) => ({ x, y: 0.0155, z })));
  instanced(feet, new THREE.CylinderGeometry(0.235, 0.235, 0.109, 48), graphite,
    footPositions.map(({ x, z }) => ({ x, y: 0.086, z })));
  instanced(feet, new THREE.CylinderGeometry(0.228, 0.235, 0.028, 48), polished,
    footPositions.map(({ x, z }) => ({ x, y: 0.152, z })));
  instanced(feet, new THREE.CylinderGeometry(0.221, 0.226, 0.029, 48), black,
    footPositions.map(({ x, z }) => ({ x, y: 0.178, z })));

  const base = assembly('Solid walnut plinth');
  slab(base, 5.29, 3.66, 0.055, 0.214, 0.018, graphite, black, 0, 0.209, 0);
  slab(base, 5.36, 3.72, 0.235, 0.214, 0.026, oak, endGrain, 0, 0.347, 0);
  slab(base, 5.32, 3.68, 0.021, 0.208, 0.006, black, black, 0, 0.474, 0);

  const deck = assembly('Brushed aluminum top plate');
  slab(deck, 5.36, 3.72, 0.102, 0.211, 0.025, champagneEdge, champagne, 0, 0.527, 0);
  const hardware = [{ x: -2.445, z: -1.625 }, { x: 2.445, z: -1.625 }, { x: -2.445, z: 1.625 }, { x: 2.445, z: 1.625 }];
  instanced(deck, new THREE.CylinderGeometry(0.038, 0.043, 0.008, 24), graphite,
    hardware.map(({ x, z }) => ({ x, y: 0.582, z })));
  instanced(deck, new THREE.CylinderGeometry(0.028, 0.029, 0.004, 24), machined,
    hardware.map(({ x, z }) => ({ x, y: 0.586, z })));
  instanced(deck, new THREE.BoxGeometry(0.039, 0.0015, 0.005), black,
    hardware.map(({ x, z }, index) => ({ x, y: 0.589, z, angle: index * 0.822 + 0.32 })));

  print(deck, [1.31, 0.32], [1048, 256], -1.678, 0.5791, 1.491, (ctx) => {
    ctx.fillStyle = '#302d2a';
    ctx.font = 'bold 122px Arial, sans-serif';
    ctx.scale(1.21, 1);
    trackedText(ctx, 'TONALE', 8, 129, 17);
    ctx.font = '31px Arial, sans-serif';
    trackedText(ctx, 'T–01  /  GIRADISCHI', 12, 193, 6.7);
  });

  const controls = assembly('Transport and speed controls', deck);
  print(controls, [1.2, 0.223], [960, 178], 1.795, 0.5792, 1.671, (ctx) => {
    ctx.fillStyle = '#423a33';
    ctx.font = '600 35px Arial, sans-serif';
    trackedText(ctx, 'START / STOP', 88, 82, 7);
    trackedText(ctx, '33', 683, 82, 6);
    trackedText(ctx, '45', 809, 82, 6);
    ctx.fillRect(693, 25, 15, 2);
    ctx.fillRect(825, 25, 15, 2);
  });
  cylinder(controls, 0.244, 0.25, 0.02, black, 1.55, 0.587, 1.335);
  cylinder(controls, 0.222, 0.244, 0.052, machined, 1.55, 0.623, 1.335);
  cylinder(controls, 0.206, 0.222, 0.012, champagne, 1.55, 0.655, 1.335);
  ring(controls, 0.211, 0.0032, polished, 1.55, 0.656, 1.335);
  cylinder(controls, 0.028, 0.03, 0.007, graphite, 1.55, 0.664, 1.335, 24);
  const indicator = new THREE.MeshStandardMaterial({ color: 0xc36f4c, emissive: 0xc04a28, emissiveIntensity: 0.13, roughness: 0.48 });
  cylinder(controls, 0.014, 0.015, 0.007, indicator, 1.55, 0.671, 1.335, 24);
  slab(controls, 0.395, 0.182, 0.02, 0.089, 0.007, graphite, black, 2.144, 0.589, 1.397);
  const speedSwitch = slab(controls, 0.155, 0.146, 0.035, 0.066, 0.011, orange, orange, 2.068, 0.615, 1.397);
  const speedMark = box(controls, [0.008, 0.006, 0.061], cream, 2.066, 0.635, 1.396);

  const bearing = assembly('Spindle bearing', deck);
  bearing.position.set(DISC.x, 0, DISC.z);
  cylinder(bearing, 0.72, 0.76, 0.025, black, 0, 0.591, 0);
  cylinder(bearing, 0.418, 0.447, 0.043, machined, 0, 0.617, 0);
  ring(bearing, 0.356, 0.011, polished, 0, 0.640, 0);
  cylinder(bearing, 0.179, 0.189, 0.04, graphite, 0, 0.651, 0);

  const platter = assembly('Machined aluminum platter');
  platter.position.set(DISC.x, 0, DISC.z);
  cylinder(platter, 1.493, 1.493, 0.028, black, 0, 0.608, 0, 128);
  cylinder(platter, 1.526, 1.489, 0.032, polished, 0, 0.636, 0, 128);
  cylinder(platter, 1.526, 1.526, 0.114, machined, 0, 0.707, 0, 160);
  cylinder(platter, 1.505, 1.526, 0.026, polished, 0, 0.777, 0, 160);
  cylinder(platter, 1.467, 1.487, 0.034, rubber, 0, 0.798, 0, 128);
  ring(platter, 1.526, 0.004, graphite, 0, 0.655, 0);
  ring(platter, 1.526, 0.0032, polished, 0, 0.749, 0);
  ring(platter, 1.519, 0.004, graphite, 0, 0.772, 0);
  ring(platter, 1.439, 0.004, graphite, 0, 0.814, 0);
  ring(platter, 1.388, 0.003, graphite, 0, 0.814, 0);

  function strobePositions(count, height, phase) {
    return Array.from({ length: count }, (_, i) => {
      const angle = i * TAU / count + phase;
      return { x: Math.sin(angle) * 1.526, y: height, z: Math.cos(angle) * 1.526, angle };
    });
  }

  instanced(platter, new THREE.BoxGeometry(0.0185, 0.027, 0.0039), graphite, strobePositions(165, 0.709, 0));
  instanced(platter, new THREE.BoxGeometry(0.0105, 0.013, 0.0039), graphite, strobePositions(220, 0.679, 0.011));

  const record = assembly('12-inch vinyl record');
  record.position.set(DISC.x, 0, DISC.z);
  const radialFinish = vinylAnisotropy(THREE);
  const vinylEdge = new THREE.MeshStandardMaterial({ color: 0x121315, metalness: 0.29, roughness: 0.31 });
  const vinyl = new THREE.MeshPhysicalMaterial({
    color: 0x131518, metalness: 0.27, roughness: 0.235, clearcoat: 0.12, clearcoatRoughness: 0.32,
    anisotropy: 0.94, anisotropyMap: radialFinish, envMapIntensity: 1.35,
  });
  const groove = new THREE.MeshPhysicalMaterial({
    color: 0x25262b, metalness: 0.36, roughness: 0.28, anisotropy: 0.87, anisotropyMap: radialFinish, envMapIntensity: 1.25,
  });
  cylinder(record, DISC.radius, 1.477, 0.019, vinylEdge, 0, DISC.top - 0.0095, 0, 192);
  const playingSurface = mesh(record, new THREE.CircleGeometry(DISC.radius, 192), vinyl, 0, DISC.top + 0.00018, 0);
  playingSurface.rotation.x = -Math.PI / 2;
  playingSurface.castShadow = false;
  mesh(record, makeGrooves(THREE), groove, 0, DISC.top + 0.0007, 0).castShadow = false;
  const sides = ['A', 'B'].map((side) => new THREE.MeshStandardMaterial({ map: recordLabel(THREE, side), roughness: 0.77 }));
  const label = mesh(record, new THREE.CircleGeometry(0.505, 112), sides[0], 0, DISC.top + 0.0027, 0);
  label.rotation.x = -Math.PI / 2;
  label.castShadow = false;
  ring(record, 0.508, 0.0022, black, 0, DISC.top + 0.0018, 0);
  cylinder(record, 0.045, 0.051, 0.012, graphite, 0, DISC.top + 0.0062, 0, 40);
  cylinder(record, 0.027, 0.031, 0.031, polished, 0, DISC.top + 0.020, 0, 40);
  cylinder(record, 0.019, 0.027, 0.012, polished, 0, DISC.top + 0.041, 0, 40);

  const tonearm = assembly('Gimbal and tonearm');
  tonearm.position.set(PIVOT.x, 0, PIVOT.z);
  cylinder(tonearm, 0.311, 0.34, 0.026, graphite, 0, 0.591, 0);
  cylinder(tonearm, 0.277, 0.304, 0.055, machined, 0, 0.632, 0);
  ring(tonearm, 0.279, 0.006, polished, 0, 0.66, 0);
  cylinder(tonearm, 0.217, 0.217, 0.167, black, 0, 0.743, 0);
  cylinder(tonearm, 0.221, 0.226, 0.081, machined, 0, 0.825, 0);
  ring(tonearm, 0.223, 0.005, polished, 0, 0.862, 0);
  cylinder(tonearm, 0.171, 0.185, 0.104, graphite, 0, 0.916, 0);
  cylinder(tonearm, 0.149, 0.169, 0.074, polished, 0, 0.989, 0);

  const cue = cylinder(tonearm, 0.023, 0.028, 0.567, machined, 0.29, 0.81, 0.171, 20);
  cue.rotation.set(1.08, 0.0, -0.28);
  const cueGrip = slab(tonearm, 0.188, 0.085, 0.035, 0.04, 0.015, graphite, black, 0.335, 0.916, 0.394);
  cueGrip.rotation.y = -0.08;

  const dock = assembly('Tonearm rest', deck);
  cylinder(dock, 0.083, 0.1, 0.035, graphite, 1.783, 0.595, 0.417, 32);
  cylinder(dock, 0.034, 0.058, 0.294, machined, 1.783, 0.751, 0.417, 32);
  slab(dock, 0.198, 0.108, 0.051, 0.033, 0.011, graphite, black, 1.783, 0.914, 0.417);
  slab(dock, 0.047, 0.11, 0.075, 0.023, 0.009, graphite, graphite, 1.704, 0.954, 0.417);
  slab(dock, 0.046, 0.11, 0.062, 0.023, 0.009, graphite, graphite, 1.862, 0.95, 0.417);

  const swivel = assembly('Tonearm swivel', tonearm);
  swivel.position.y = PIVOT.height;
  const horizontalBearing = cylinder(swivel, 0.134, 0.134, 0.337, graphite, 0, -0.037, 0, 48);
  horizontalBearing.rotation.z = -Math.PI / 2;
  for (const side of [-1, 1]) {
    const cap = cylinder(swivel, 0.092, 0.108, 0.025, polished, side * 0.176, -0.037, 0, 40);
    cap.rotation.z = -side * Math.PI / 2;
    const center = cylinder(swivel, 0.038, 0.042, 0.008, graphite, side * 0.192, -0.037, 0, 32);
    center.rotation.z = -side * Math.PI / 2;
  }

  const beam = assembly('Balanced aluminum arm', swivel);
  const armGuide = new THREE.CatmullRomCurve3([
    [0, 0, -0.238], [0, 0, 0.18], [0.063, 0, 0.55], [0.047, 0, 0.8],
    [-0.087, -0.004, 1.13], [-0.342, -0.02, 1.43], [-0.567, -0.053, 1.718], [-0.684, -0.088, 1.89],
  ].map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  mesh(beam, new THREE.TubeGeometry(armGuide, 74, 0.044, 12, false), polished);
  const counterweight = assembly('Adjustable counterweight', beam);
  counterweight.position.set(0, 0, -0.386);
  counterweight.rotation.x = Math.PI / 2;
  cylinder(counterweight, 0.158, 0.147, 0.225, graphite, 0, 0, 0);
  cylinder(counterweight, 0.149, 0.15, 0.028, machined, 0, -0.106, 0);
  cylinder(counterweight, 0.133, 0.155, 0.041, polished, 0, 0.121, 0);
  ring(counterweight, 0.151, 0.008, machined, 0, 0.071, 0);
  instanced(counterweight, new THREE.BoxGeometry(0.0055, 0.086, 0.0046), machined,
    Array.from({ length: 54 }, (_, i) => {
      const angle = i * TAU / 54;
      return { x: Math.sin(angle) * 0.154, y: 0.004, z: Math.cos(angle) * 0.154, angle };
    }));

  const shell = assembly('Headshell, cartridge and stylus', beam);
  shell.position.set(-0.74, -0.116, 1.993);
  shell.rotation.y = -0.458;
  const collar = cylinder(shell, 0.068, 0.056, 0.119, machined, 0, 0.018, -0.12, 40);
  collar.rotation.x = Math.PI / 2;
  const connector = cylinder(shell, 0.055, 0.058, 0.023, black, 0, 0.018, -0.058, 40);
  connector.rotation.x = Math.PI / 2;
  slab(shell, 0.197, 0.277, 0.046, 0.045, 0.014, graphite, machined, 0, 0, 0.043);
  slab(shell, 0.136, 0.188, 0.064, 0.035, 0.013, black, black, 0, -0.049, 0.085);
  slab(shell, 0.116, 0.107, 0.04, 0.031, 0.012, orange, orange, 0, -0.092, 0.118);
  const cantilever = cylinder(shell, 0.004, 0.006, 0.047, polished, 0, -0.117, 0.146, 10);
  cantilever.rotation.x = -0.56;
  cylinder(shell, 0.0, 0.006, 0.011, graphite, 0, -0.139, 0.164, 10);
  for (const side of [-1, 1]) cylinder(shell, 0.018, 0.02, 0.005, graphite, side * 0.046, 0.025, 0.066, 20);
  const fingerLift = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.072, 0.013, 0.107), new THREE.Vector3(0.155, 0.027, 0.123),
    new THREE.Vector3(0.224, 0.046, 0.103), new THREE.Vector3(0.254, 0.063, 0.072),
  ]);
  mesh(shell, new THREE.TubeGeometry(fingerLift, 16, 0.015, 8, false), polished);

  const stylus = new THREE.Vector3(0, -0.1445, 0.164).applyAxisAngle(new THREE.Vector3(0, 1, 0), shell.rotation.y).add(shell.position);
  const stylusHeading = Math.atan2(stylus.x, stylus.z);
  const spindleDistance = Math.hypot(DISC.x - PIVOT.x, DISC.z - PIVOT.z);
  const spindleHeading = Math.atan2(DISC.x - PIVOT.x, DISC.z - PIVOT.z);
  const armLength = Math.hypot(stylus.x, stylus.z);
  const parked = 0.318;

  function update({ explosion = 0, spin = 0, playing = false, lift = 0, side = 0, fast = false, position = 0 } = {}) {
    base.position.y = explosion * 0.097;
    deck.position.y = explosion * 0.385;
    platter.position.y = explosion * 0.798;
    record.position.y = explosion * 1.275;
    tonearm.position.y = explosion * 0.423;
    platter.rotation.y = spin;
    record.rotation.y = spin;
    label.material = sides[side === 1 ? 1 : 0];
    indicator.emissiveIntensity = playing ? 1.08 : 0.13;

    speedSwitch.position.x = fast ? 2.22 : 2.068;
    speedMark.position.x = speedSwitch.position.x - .002;
    const travel = THREE.MathUtils.clamp(position, 0, 1);
    const grooveRadius = THREE.MathUtils.lerp(1.436, 0.558, travel);
    const angle = Math.acos(THREE.MathUtils.clamp(
      (spindleDistance ** 2 + armLength ** 2 - grooveRadius ** 2) / (2 * spindleDistance * armLength), -1, 1,
    ));
    const playingHeading = spindleHeading + angle - stylusHeading;
    const transfer = THREE.MathUtils.smoothstep(lift, 0.03, 0.72);
    const descent = THREE.MathUtils.smoothstep(lift, 0.63, 1);
    swivel.rotation.y = THREE.MathUtils.lerp(parked, playingHeading, transfer * (1 - explosion));
    beam.rotation.x = -0.039 * Math.sin(transfer * Math.PI * 0.5) * (1 - descent) - 0.009 * descent;
  }

  update();
  return { group, update };
}
