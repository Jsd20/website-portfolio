(() => {
  "use strict";

  const object = document.querySelector("#pizza-object");
  const canvas = object?.querySelector("#pizza-canvas");
  const poster = object?.querySelector("img.photo-fallback");
  if (!canvas || !poster) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const fullTurn = 2 * Math.PI;
  const turnStep = Math.PI / 5;
  const perspective = 0.31;
  const introDuration = 1.12;
  const spokes = 256;
  const sliceStart = 209;
  const sliceEnd = 242;
  const sliceDirection = (sliceStart + sliceEnd) * Math.PI / spokes;
  const slicePull = [0.37 * Math.cos(sliceDirection), 0.37 * Math.sin(sliceDirection), 0.049];
  const sliceControls = document.querySelectorAll("[data-slice-pizza]");
  const clamp = (value, min, max) => Math.max(min, Math.min(value, max));
  const mix = (from, to, amount) => from + (to - from) * amount;

  const vertexSource = `
    attribute vec3 a_position;
    attribute vec2 a_uv;
    attribute vec3 a_normal;
    attribute float a_bake;
    uniform vec2 u_tilt;
    uniform vec2 u_lean;
    uniform vec2 u_turn;
    uniform vec2 u_scale;
    uniform float u_perspective;
    uniform vec3 u_sliceOffset;
    uniform vec2 u_sliceCenter;
    varying vec2 v_uv;
    varying vec3 v_position;
    varying vec3 v_normal;
    varying float v_bake;

    vec3 orient(vec3 point) {
      vec3 turned = vec3(
        u_turn.x * point.x - u_turn.y * point.y,
        u_turn.y * point.x + u_turn.x * point.y, point.z
      );
      vec3 tilted = vec3(turned.x, u_tilt.x * turned.y - u_tilt.y * turned.z,
        u_tilt.y * turned.y + u_tilt.x * turned.z);
      return vec3(u_lean.x * tilted.x + u_lean.y * tilted.z, tilted.y,
        -u_lean.y * tilted.x + u_lean.x * tilted.z);
    }

    void main() {
      vec3 local = a_position + u_sliceOffset * (a_bake >= 4.0 ? a_uv.x : 1.0);
      if (a_bake >= 4.0) {
        local.z -= u_sliceOffset.z * 0.52 * sin(a_uv.x * 3.14159);
      }
      local.xy -= u_sliceCenter;
      vec3 position = orient(local);
      gl_Position = vec4(position.xy * u_scale, -position.z * 0.47,
        1.0 - position.z * u_perspective);
      v_uv = a_uv;
      v_position = a_position;
      v_normal = orient(a_normal);
      v_bake = a_bake;
    }
  `;

  const fragmentSource = `
    precision mediump float;
    uniform sampler2D u_photo;
    varying vec2 v_uv;
    varying vec3 v_position;
    varying vec3 v_normal;
    varying float v_bake;

    float randomValue(vec2 point) {
      vec3 value = fract(vec3(point.xyx) * vec3(0.1031, 0.1939, 0.1397));
      value += dot(value, value.yzx + 19.19);
      return fract((value.x + value.y) * value.z);
    }

    float noise(vec2 point) {
      vec2 cell = floor(point);
      vec2 frac = fract(point);
      vec2 weight = frac * frac * (3.0 - 2.0 * frac);
      return mix(mix(randomValue(cell), randomValue(cell + vec2(1.0, 0.0)), weight.x),
        mix(randomValue(cell + vec2(0.0, 1.0)), randomValue(cell + vec2(1.0, 1.0)),
        weight.x), weight.y);
    }

    void main() {
      float diffuse = max(0.0, dot(normalize(v_normal), vec3(-0.31, 0.52, 0.80)));
      if (v_bake > 3.7) {
        vec3 mozzarella = mix(vec3(0.70, 0.45, 0.18), vec3(1.0, 0.91, 0.70),
          0.50 + diffuse * 0.49);
        gl_FragColor = vec4(mozzarella, 1.0);
        return;
      }
      vec4 photo = texture2D(u_photo, v_uv);
      vec3 photographed = photo.rgb / max(photo.a, 0.015);
      if (v_bake < 0.01) {
        if (photo.a < 0.015) discard;
        gl_FragColor = photo;
        return;
      }

      vec2 grainPoint = v_position.xy + v_position.z * vec2(2.21, -1.78);
      float grain = noise(grainPoint * 115.0);
      float browning = noise(grainPoint * 26.0) * 0.75 + grain * 0.25;
      float char = smoothstep(0.68, 0.89, browning);
      if (v_bake > 2.6) {
        float pores = smoothstep(0.48, 0.78, noise(grainPoint * 68.0));
        float crumb = smoothstep(3.04, 3.19, v_bake);
        vec3 interior = mix(vec3(0.42, 0.20, 0.074), vec3(0.90, 0.68, 0.38), crumb);
        interior *= 0.88 + grain * 0.24 - pores * 0.54;
        vec3 topping = mix(vec3(0.66, 0.19, 0.065), photographed, 0.76);
        interior = mix(interior, topping, smoothstep(3.36, 3.40, v_bake));
        gl_FragColor = vec4(interior * (0.77 + diffuse * 0.23), 1.0);
        return;
      }
      vec3 crust = mix(vec3(0.53, 0.27, 0.105), photographed, 0.74);
      crust *= vec3(0.89, 0.77, 0.65) * (0.86 + grain * 0.30);
      crust = mix(crust, vec3(0.083, 0.041, 0.023), 0.73 * char);

      vec3 base = mix(vec3(0.42, 0.18, 0.057), vec3(0.70, 0.45, 0.24),
        smoothstep(0.15, 0.87, browning));
      base *= (0.83 + 0.25 * grain);
      base = mix(base, vec3(0.09, 0.042, 0.022), 0.63 * char);
      vec3 dough = mix(crust, base, smoothstep(1.0, 2.0, v_bake));
      dough *= 0.71 + diffuse * 0.32;

      float rim = min(1.0, v_bake);
      float alpha = mix(photo.a, 1.0, rim);
      gl_FragColor = vec4(mix(photographed, dough, rim) * alpha, alpha);
    }
  `;

  function readOutline() {
    const width = Math.min(640, poster.naturalWidth);
    const height = Math.round(width * poster.naturalHeight / poster.naturalWidth);
    const mask = document.createElement("canvas");
    mask.width = width;
    mask.height = height;
    const ctx = mask.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(poster, 0, 0, width, height);
    const pixels = ctx.getImageData(0, 0, width, height).data;

    function alphaAt(x, y) {
      const column = Math.floor(x);
      const row = Math.floor(y);
      if (column < 0 || column >= width || row < 0 || row >= height) return 0;
      return pixels[(row * width + column) * 4 + 3];
    }

    const corners = [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]];
    if (corners.every(([x, y]) => alphaAt(x, y) > 127)) {
      throw new Error("The pizza image needs a transparent background.");
    }

    let left = width;
    let right = 0;
    let top = height;
    let bottom = 0;
    for (let row = 0; row < height; row++) {
      for (let column = 0; column < width; column++) {
        if (pixels[(row * width + column) * 4 + 3] < 145) continue;
        left = Math.min(left, column);
        right = Math.max(right, column + 1);
        top = Math.min(top, row);
        bottom = Math.max(bottom, row + 1);
      }
    }
    const centerX = (left + right) / 2;
    const centerY = (top + bottom) / 2;
    if (right - left < width * 0.4 || bottom - top < height * 0.4
      || alphaAt(centerX, centerY) < 127) {
      throw new Error("The pizza silhouette is too small to trace.");
    }

    const farEdge = Math.hypot(width, height);
    const outline = Array.from({ length: spokes }, (_, index) => {
      const angle = index * fullTurn / spokes;
      const x = Math.cos(angle);
      const y = Math.sin(angle);
      let opaqueRun = 0;
      let firstOpaque = 0;
      for (let radius = farEdge; radius >= 0; radius -= 0.7) {
        if (alphaAt(centerX + x * radius, centerY - y * radius) > 113) {
          if (opaqueRun === 0) firstOpaque = radius;
          if (++opaqueRun === 3) break;
        } else {
          opaqueRun = 0;
        }
      }
      return { angle, x, y, radius: firstOpaque };
    });

    // Average neighboring samples over roughly one millimeter of crust.
    // Larger irregularities stay in the silhouette while pixel steps disappear.
    const smooth = outline.map((point, index) => (
      point.radius * 0.64
      + outline[(index + spokes - 1) % spokes].radius * 0.18
      + outline[(index + 1) % spokes].radius * 0.18
    ));
    outline.forEach((point, index) => { point.radius = smooth[index]; });
    return { outline, centerX, centerY, width, height };
  }

  function makeMesh(shape, uvScale) {
    const vertices = [];
    const body = [];
    const wedge = [];
    const bodyCuts = [];
    const wedgeCuts = [];
    const strands = [];
    const boundary = [];
    const radialSegments = 34;
    const { outline, centerX, centerY, width, height } = shape;

    function topHeight(radius, angle) {
      const rimPosition = 0.867 + 0.022 * Math.sin(angle * 4.0 + 0.5)
        + 0.014 * Math.sin(angle * 7.0 - 1.1);
      const rimAmplitude = 0.067 + 0.011 * Math.sin(angle * 5.0 + 1.8)
        + 0.007 * Math.sin(angle * 13.0 + 0.4);
      const rim = Math.exp(-Math.pow((radius - rimPosition) / 0.116, 2));
      const filling = radius * radius * (1 - radius) * 0.023 * Math.sin(3 * angle);
      return 0.018 + rimAmplitude * rim + filling;
    }

    function vertex(point, radius, uvRadius, z, normalZ, normalRadial, bake) {
      const extent = point.radius * 2 / width;
      const x = point.x * extent * radius;
      const y = point.y * extent * radius;
      const u = (centerX + point.x * point.radius * uvRadius) / width;
      const v = (centerY - point.y * point.radius * uvRadius) / height;
      vertices.push(x, y, z, u * uvScale[0], v * uvScale[1],
        point.x * normalRadial, point.y * normalRadial, normalZ, bake);
      return [x, y, z];
    }

    for (let ring = 0; ring <= radialSegments; ring++) {
      const radius = ring / radialSegments;
      outline.forEach((point, index) => {
        const nextHeight = topHeight(radius + 0.006, point.angle);
        const previousHeight = topHeight(radius - 0.006, point.angle);
        const slope = -(nextHeight - previousHeight) / 0.012;
        const position = vertex(point, radius, radius, topHeight(radius, point.angle),
          1, slope, 0);
        if (ring === radialSegments) addBoundary(position, index, 2);
      });
    }

    const side = [
      { radius: 1.002, z: 0.014, uv: 0.991, normalZ: 0.10, radial: 1, bake: 0.47 },
      { radius: 0.996, z: -0.018, uv: 0.975, normalZ: -0.24, radial: 1, bake: 0.95 },
      { radius: 0.977, z: -0.048, uv: 0.950, normalZ: -0.53, radial: 0.85, bake: 1.05 },
      { radius: 0.945, z: -0.061, uv: 0.921, normalZ: -0.91, radial: 0.38, bake: 1.22 },
      { radius: 0.855, z: -0.065, uv: 0.890, normalZ: -1.0, radial: 0.04, bake: 1.95 },
      { radius: 0.680, z: -0.055, uv: 0.810, normalZ: -1.0, radial: 0, bake: 2.0 },
      { radius: 0.350, z: -0.053, uv: 0.680, normalZ: -1.0, radial: 0, bake: 2.0 },
      { radius: 0.000, z: -0.057, uv: 0.000, normalZ: -1.0, radial: 0, bake: 2.0 }
    ];
    side.forEach((ring, ringIndex) => {
      outline.forEach((point, index) => {
        const variation = ring.radius * (0.004 * Math.sin(point.angle * 17)
          + 0.006 * Math.sin(point.angle * 7 + 0.9));
        const position = vertex(point, ring.radius, ring.uv, ring.z + variation,
          ring.normalZ, ring.radial, ring.bake);
        if (ringIndex === 2) addBoundary(position, index, 4);
      });
    });

    function addBoundary(position, index, sampleEvery) {
      const seam = index === sliceStart || index === sliceEnd;
      if (!seam && index % sampleEvery !== 0) return;
      const onSlice = index >= sliceStart && index <= sliceEnd;
      boundary.push([...position, onSlice]);
      if (seam) boundary.push([...position, false]);
    }

    for (let ring = 0; ring < radialSegments + side.length; ring++) {
      for (let spoke = 0; spoke < spokes; spoke++) {
        const indices = spoke >= sliceStart && spoke < sliceEnd ? wedge : body;
        const next = (spoke + 1) % spokes;
        const lower = ring * spokes;
        const upper = lower + spokes;
        if (ring > 0) indices.push(lower + spoke, upper + next, lower + next);
        if (ring < radialSegments + side.length - 1) {
          indices.push(lower + spoke, upper + spoke, upper + next);
        }
      }
    }

    function makeCut(spoke, positive, indices) {
      const point = outline[spoke];
      const tangent = positive ? 1 : -1;
      const nx = -point.y * tangent;
      const ny = point.x * tangent;
      const pivot = vertices.length / 9;
      const extent = point.radius * 2 / width;
      const u = (centerX + point.x * point.radius * 0.46) / width * uvScale[0];
      const v = (centerY - point.y * point.radius * 0.46) / height * uvScale[1];
      vertices.push(point.x * extent * 0.46, point.y * extent * 0.46, -0.012,
        u, v, nx, ny, 0, 3.18);
      const rim = [3.39, 3.21, 3.095, 3.01, 3.0, 3.0, 3.0, 3.0];
      const rings = radialSegments + side.length + 1;
      for (let ring = 0; ring < rings; ring++) {
        const offset = (ring * spokes + spoke) * 9;
        const bake = ring <= radialSegments ? 3.4 : rim[ring - radialSegments - 1];
        vertices.push(...vertices.slice(offset, offset + 5), nx, ny, 0, bake);
      }
      for (let ring = 0; ring < rings; ring++) {
        const edge = pivot + ring + 1;
        const next = pivot + (ring + 1) % rings + 1;
        if (positive) indices.push(pivot, edge, next);
        else indices.push(pivot, next, edge);
      }
    }

    makeCut(sliceStart, true, bodyCuts);
    makeCut(sliceEnd, false, bodyCuts);
    makeCut(sliceStart, false, wedgeCuts);
    makeCut(sliceEnd, true, wedgeCuts);

    function makeStrand(spoke, radius, thickness, bend) {
      const point = outline[spoke];
      const extent = point.radius * 2 / width;
      const acrossX = -Math.sin(sliceDirection);
      const acrossY = Math.cos(sliceDirection);
      const start = vertices.length / 9;
      const links = 14;
      const sides = 6;
      for (let link = 0; link <= links; link++) {
        const t = link / links;
        const bendAtLink = Math.sin(Math.PI * t) * bend;
        const along = (radius + t * 0.043) * extent;
        const size = thickness * (0.48 + 0.52 * Math.pow(Math.abs(2 * t - 1), 1.3));
        for (let strandSide = 0; strandSide < sides; strandSide++) {
          const angle = fullTurn * strandSide / sides;
          const nx = Math.cos(angle);
          const nz = Math.sin(angle);
          const sideOffset = bendAtLink + size * nx;
          vertices.push(point.x * along + acrossX * sideOffset,
            point.y * along + acrossY * sideOffset,
            topHeight(radius, point.angle) - 0.003 + nz * size,
            t, 0, acrossX * nx, acrossY * nx, nz, 4);
        }
      }
      for (let link = 0; link < links; link++) {
        for (let strandSide = 0; strandSide < sides; strandSide++) {
          const near = start + link * sides;
          const far = near + sides;
          const next = (strandSide + 1) % sides;
          strands.push(near + strandSide, far + next, far + strandSide,
            near + strandSide, near + next, far + next);
        }
      }
    }

    makeStrand(sliceStart, 0.36, 0.0090, 0.022);
    makeStrand(sliceStart, 0.57, 0.0100, -0.036);
    makeStrand(sliceStart, 0.64, 0.0055, 0.015);
    makeStrand(sliceEnd, 0.49, 0.0085, 0.030);
    makeStrand(sliceEnd, 0.72, 0.0105, -0.009);
    makeStrand(sliceEnd, 0.80, 0.0060, 0.033);

    const groups = [body, wedge, bodyCuts, wedgeCuts, strands];
    const indices = new Uint16Array(groups.reduce((total, group) => total + group.length, 0));
    const ranges = [];
    let offset = 0;
    for (const group of groups) {
      indices.set(group, offset);
      ranges.push({ count: group.length, bytes: offset * Uint16Array.BYTES_PER_ELEMENT });
      offset += group.length;
    }
    return {
      vertices: new Float32Array(vertices),
      indices,
      ranges,
      boundary
    };
  }

  function createRenderer() {
    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
      powerPreference: "low-power"
    });
    if (!gl || gl.isContextLost()) return null;
    const shape = readOutline();

    function compile(type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(message);
      }
      return shader;
    }

    const vertexShader = compile(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = compile(gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const message = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(message);
    }
    gl.useProgram(program);

    // Power-of-two padding gives WebGL 1 mipmaps without resizing the photo.
    const maxTextureSize = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE), 2048);
    const sourceScale = Math.min(1, maxTextureSize / Math.max(poster.naturalWidth, poster.naturalHeight));
    const photoWidth = Math.round(poster.naturalWidth * sourceScale);
    const photoHeight = Math.round(poster.naturalHeight * sourceScale);
    const photo = document.createElement("canvas");
    photo.width = 2 ** Math.ceil(Math.log2(photoWidth));
    photo.height = 2 ** Math.ceil(Math.log2(photoHeight));
    photo.getContext("2d").drawImage(poster, 0, 0, photoWidth, photoHeight);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, photo);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.generateMipmap(gl.TEXTURE_2D);
    const anisotropic = gl.getExtension("EXT_texture_filter_anisotropic");
    if (anisotropic) {
      gl.texParameterf(gl.TEXTURE_2D, anisotropic.TEXTURE_MAX_ANISOTROPY_EXT,
        Math.min(8, gl.getParameter(anisotropic.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
    }

    const mesh = makeMesh(shape, [photoWidth / photo.width, photoHeight / photo.height]);
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW);
    const elementBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elementBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);

    const attributes = [["a_position", 3, 0], ["a_uv", 2, 3], ["a_normal", 3, 5], ["a_bake", 1, 8]];
    attributes.forEach(([name, count, offset]) => {
      const location = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, count, gl.FLOAT, false, 9 * 4, offset * 4);
    });
    const tiltUniform = gl.getUniformLocation(program, "u_tilt");
    const leanUniform = gl.getUniformLocation(program, "u_lean");
    const turnUniform = gl.getUniformLocation(program, "u_turn");
    const scaleUniform = gl.getUniformLocation(program, "u_scale");
    const offsetUniform = gl.getUniformLocation(program, "u_sliceOffset");
    const centerUniform = gl.getUniformLocation(program, "u_sliceCenter");
    gl.uniform1i(gl.getUniformLocation(program, "u_photo"), 0);
    gl.uniform1f(gl.getUniformLocation(program, "u_perspective"), perspective);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.clearColor(0, 0, 0, 0);
    if (gl.getError() !== gl.NO_ERROR) return null;

    const [body, wedge, bodyCuts, wedgeCuts, strands] = mesh.ranges;
    const drawRange = ({ count, bytes }) => gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, bytes);

    return function draw(tilt, lean, turn, zoom, gap) {
      const width = object.clientWidth;
      const height = object.clientHeight;
      if (!width || !height || gl.isContextLost()) return false;
      const pixelRatio = Math.min(2, window.devicePixelRatio || 1, 1800 / Math.max(width, height));
      const pixelWidth = Math.round(width * pixelRatio);
      const pixelHeight = Math.round(height * pixelRatio);
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
        gl.viewport(0, 0, pixelWidth, pixelHeight);
      }

      const tiltCos = Math.cos(tilt);
      const tiltSin = Math.sin(tilt);
      const leanCos = Math.cos(lean);
      const leanSin = Math.sin(lean);
      const turnCos = Math.cos(turn);
      const turnSin = Math.sin(turn);
      const offsetX = slicePull[0] * gap;
      const offsetY = slicePull[1] * gap;
      const offsetZ = slicePull[2] * gap;
      const centerX = offsetX * 0.44;
      const centerY = offsetY * 0.44;
      let edgeX = 0;
      let edgeY = 0;
      for (const [startX, startY, startZ, cut] of mesh.boundary) {
        const x = startX - centerX + (cut ? offsetX : 0);
        const y = startY - centerY + (cut ? offsetY : 0);
        const z = startZ + (cut ? offsetZ : 0);
        const turnedX = turnCos * x - turnSin * y;
        const turnedY = turnSin * x + turnCos * y;
        const tiltedZ = tiltSin * turnedY + tiltCos * z;
        const projectedZ = -leanSin * turnedX + leanCos * tiltedZ;
        const distance = 1 - projectedZ * perspective;
        edgeX = Math.max(edgeX, Math.abs(leanCos * turnedX + leanSin * tiltedZ) / distance);
        edgeY = Math.max(edgeY, Math.abs(tiltCos * turnedY - tiltSin * z) / distance);
      }
      const aspect = width / height;
      const fitted = Math.min(aspect * 1.04, 0.971 * aspect / edgeX, 0.966 / edgeY) * zoom;

      gl.uniform2f(tiltUniform, tiltCos, tiltSin);
      gl.uniform2f(leanUniform, leanCos, leanSin);
      gl.uniform2f(turnUniform, turnCos, turnSin);
      gl.uniform2f(scaleUniform, fitted / aspect, fitted);
      gl.uniform2f(centerUniform, centerX, centerY);
      gl.uniform3f(offsetUniform, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      if (gap <= 0.002) {
        gl.drawElements(gl.TRIANGLES, body.count + wedge.count, gl.UNSIGNED_SHORT, 0);
      } else {
        drawRange(body);
        drawRange(bodyCuts);
        gl.uniform3f(offsetUniform, offsetX, offsetY, offsetZ);
        drawRange(wedge);
        drawRange(wedgeCuts);
        drawRange(strands);
      }
      return true;
    };
  }

  let renderer = null;
  let revealed = false;
  let visible = true;
  let pendingFrame = 0;
  let lastFrame = 0;
  let intro = 0;
  let turn = 0;
  let turnTarget = 0;
  let inertia = 0;
  let lean = 0;
  let pitch = 0;
  let leanTarget = 0;
  let pitchTarget = 0;
  let drag = null;
  let sliceOpen = false;
  let separation = 0;
  let fallbackTurn = 0;
  let fallbackGap = 0;
  let fallbackWedge = null;

  function clearFallbackSlice() {
    poster.style.clipPath = "";
    poster.style.translate = "";
    poster.style.scale = "";
    if (fallbackWedge) fallbackWedge.style.display = "none";
  }

  function showFallback(gap) {
    if (turn === fallbackTurn && gap === fallbackGap) return;
    fallbackTurn = turn;
    fallbackGap = gap;
    poster.style.rotate = turn ? `${turn}rad` : "";
    if (gap <= 0.002) {
      clearFallbackSlice();
      return;
    }

    const aspect = poster.naturalWidth / poster.naturalHeight || 1.24;
    if (!fallbackWedge) {
      fallbackWedge = poster.cloneNode();
      fallbackWedge.alt = "";
      fallbackWedge.setAttribute("aria-hidden", "true");
      fallbackWedge.removeAttribute("fetchpriority");
      poster.after(fallbackWedge);
    }
    const ray = spoke => {
      const angle = spoke * fullTurn / spokes;
      const x = Math.cos(angle);
      const y = -Math.sin(angle) * aspect;
      const distance = 50 / Math.max(x, y);
      return `${50 + x * distance}% ${50 + y * distance}%`;
    };
    const bottom = ray(sliceStart);
    const right = ray(sliceEnd);
    poster.style.clipPath = `polygon(0 0, 100% 0, ${right}, 50% 50%, ${bottom}, 0 100%)`;
    fallbackWedge.style.clipPath = `polygon(50% 50%, ${right}, 100% 100%, ${bottom})`;
    fallbackWedge.style.display = "";
    fallbackWedge.style.rotate = poster.style.rotate;
    poster.style.scale = fallbackWedge.style.scale = 1 - gap * 0.14;
    const dx = (Math.cos(turn) * slicePull[0] + Math.sin(turn) * slicePull[1]) * 50 * gap;
    const dy = (Math.sin(turn) * slicePull[0] - Math.cos(turn) * slicePull[1]) * 50 * gap * aspect;
    poster.style.translate = `${-dx * 0.44}% ${-dy * 0.44}%`;
    fallbackWedge.style.translate = `${dx * 0.56}% ${dy * 0.56}%`;
  }

  function requestFrame() {
    if (visible && !document.hidden && !pendingFrame) pendingFrame = requestAnimationFrame(render);
  }

  function ceaseFrames() {
    if (pendingFrame) cancelAnimationFrame(pendingFrame);
    pendingFrame = 0;
    lastFrame = 0;
  }

  function render(timestamp) {
    pendingFrame = 0;
    const elapsed = lastFrame ? (timestamp - lastFrame) / 1000 : 0;
    const delta = Math.min(elapsed || 1 / 60, 0.05);
    lastFrame = timestamp;
    const gentle = reducedMotion.matches;
    if (gentle) {
      inertia = 0;
      lean = pitch = leanTarget = pitchTarget = 0;
      turn = turnTarget;
      separation = Number(sliceOpen);
      if (renderer) intro = introDuration;
    } else {
      const approach = (from, to, rate) => {
        const change = to - from;
        return Math.abs(change) <= 0.0009 ? to : from + change * (1 - Math.exp(-rate * delta));
      };
      if (!drag?.active && inertia) {
        turnTarget += inertia * delta;
        inertia *= Math.exp(-6.5 * delta);
        if (Math.abs(inertia) < 0.018) inertia = 0;
      }
      turn = approach(turn, turnTarget, drag?.active ? 38 : 16);
      pitch = approach(pitch, pitchTarget, 11);
      lean = approach(lean, leanTarget, 11);
      separation = approach(separation, Number(sliceOpen), 15);
    }

    if (renderer) {
      const nextIntro = Math.min(intro + elapsed, introDuration);
      const progress = 1 - Math.pow(1 - nextIntro / introDuration, 3);
      const drawn = renderer(mix(1.46, 0.245 + pitch, progress),
        mix(-0.24, -0.092 + lean, progress),
        turn + mix(-0.29, 0, progress), mix(0.945, 1, progress), separation);
      if (drawn && !object.classList.contains("scene-ready")) {
        const gl = canvas.getContext("webgl");
        if (!gl || gl.isContextLost() || gl.getError() !== gl.NO_ERROR) {
          renderer = null;
        } else {
          object.classList.add("scene-ready");
          revealed = true;
          poster.style.rotate = "";
          fallbackTurn = 0;
          fallbackGap = 0;
          clearFallbackSlice();
        }
      }
      if (drawn) intro = nextIntro;
    } else {
      showFallback(separation);
    }

    const stillMoving = turn !== turnTarget || inertia || pitch !== pitchTarget
      || lean !== leanTarget || separation !== Number(sliceOpen);
    if ((renderer && intro < introDuration) || stillMoving) requestFrame();
    else lastFrame = 0;
  }

  function initialize() {
    if (!poster.naturalWidth) return;
    try {
      renderer = createRenderer();
    } catch {
      // Cross-origin uploads and local file previews can still use the photograph.
      renderer = null;
    }
    if (renderer) {
      intro = revealed || reducedMotion.matches ? introDuration : 0;
      requestFrame();
    }
  }

  function turnPizza(direction) {
    if (renderer && intro < introDuration) intro = introDuration;
    inertia = 0;
    turnTarget += direction * turnStep;
    requestFrame();
  }

  object.style.touchAction = "pan-y";
  object.addEventListener("pointerdown", event => {
    if (drag || !event.isPrimary || event.button !== 0
      || event.target.closest("a, button, input, select, textarea")) return;
    const rect = object.getBoundingClientRect();
    drag = {
      id: event.pointerId,
      target: event.target,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastTime: event.timeStamp,
      velocity: 0,
      rate: 4.8 / Math.max(rect.width, 1),
      heading: turn,
      active: false
    };
    inertia = 0;
  });

  object.addEventListener("pointermove", event => {
    if (drag?.id === event.pointerId) {
      const offsetX = event.clientX - drag.startX;
      const offsetY = event.clientY - drag.startY;
      if (!drag.active && Math.abs(offsetX) > 5 && Math.abs(offsetX) >= Math.abs(offsetY)) {
        drag.active = true;
        if (!drag.target.hasPointerCapture(event.pointerId)) {
          drag.target.setPointerCapture(event.pointerId);
        }
        object.classList.add("is-dragging");
        if (renderer) intro = introDuration;
      }
      if (!drag.active) return;
      const duration = Math.max(8, event.timeStamp - drag.lastTime) / 1000;
      const velocity = clamp((event.clientX - drag.lastX) * drag.rate / duration, -9.5, 9.5);
      drag.velocity = mix(drag.velocity, velocity, 0.55);
      drag.lastX = event.clientX;
      drag.lastTime = event.timeStamp;
      turnTarget = drag.heading + offsetX * drag.rate;
      requestFrame();
      return;
    }

    if (!renderer || reducedMotion.matches || event.pointerType !== "mouse") return;
    const rect = object.getBoundingClientRect();
    const x = clamp(2 * (event.clientX - rect.left) / rect.width - 1, -1, 1);
    const y = clamp(2 * (event.clientY - rect.top) / rect.height - 1, -1, 1);
    leanTarget = x * 0.143;
    pitchTarget = -y * 0.115;
    requestFrame();
  });

  function stopDrag(event) {
    if (drag?.id !== event.pointerId) return;
    if (drag.active && event.type === "pointerup" && !reducedMotion.matches
      && event.timeStamp - drag.lastTime < 105) {
      inertia = drag.velocity * 0.68;
    }
    const target = drag.target;
    drag = null;
    object.classList.remove("is-dragging");
    if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
    requestFrame();
  }

  object.addEventListener("pointerup", stopDrag);
  object.addEventListener("pointercancel", stopDrag);
  object.addEventListener("lostpointercapture", stopDrag);
  object.addEventListener("pointerleave", event => {
    if (drag && !drag.active) stopDrag(event);
    leanTarget = pitchTarget = 0;
    requestFrame();
  });
  object.addEventListener("dragstart", event => event.preventDefault());

  if (!canvas.hasAttribute("tabindex")) canvas.tabIndex = 0;
  canvas.addEventListener("keydown", event => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      turnPizza(event.key === "ArrowLeft" ? -1 : 1);
    }
  });
  document.querySelectorAll("[data-turn-pizza]").forEach(button => {
    button.addEventListener("click", () => turnPizza(1));
  });
  const sliceLabels = Array.from(sliceControls, button => {
    const label = button.querySelector("[data-slice-label]");
    return { button, label, closed: label?.textContent || "Stacca uno spicchio" };
  });
  for (const { button } of sliceLabels) {
    button.addEventListener("click", () => {
      if (renderer && intro < introDuration) intro = introDuration;
      sliceOpen = !sliceOpen;
      for (const { button: control, label, closed } of sliceLabels) {
        control.setAttribute("aria-pressed", String(sliceOpen));
        if (label) label.textContent = sliceOpen ? "Ricomponi la pizza" : closed;
      }
      requestFrame();
    });
  }

  canvas.addEventListener("webglcontextlost", event => {
    event.preventDefault();
    renderer = null;
    object.classList.remove("scene-ready");
    requestFrame();
  });
  canvas.addEventListener("webglcontextrestored", initialize);
  reducedMotion.addEventListener("change", requestFrame);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) ceaseFrames();
    else requestFrame();
  });
  if (typeof ResizeObserver === "function") {
    new ResizeObserver(requestFrame).observe(object);
  } else {
    window.addEventListener("resize", requestFrame);
  }
  if (typeof IntersectionObserver === "function") {
    const rect = object.getBoundingClientRect();
    visible = rect.top < window.innerHeight && rect.bottom > 0;
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) requestFrame();
      else ceaseFrames();
    }).observe(object);
  }

  if (poster.complete) initialize();
  else poster.addEventListener("load", initialize, { once: true });
})();
