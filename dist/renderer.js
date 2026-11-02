import { SAMPLE_SIZE } from './game.js';

const vertexSource = `attribute vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }`;
export class ShaderError extends Error { constructor(message) { super(message); this.name = 'ShaderError'; } }

export function createRenderer(canvas) {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, preserveDrawingBuffer: true });
  if (!gl) throw new Error('WebGL is unavailable. Enable graphics acceleration in your browser to play Shadle.');
  function compileShader(type, source) {
    const shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader); gl.deleteShader(shader); throw new ShaderError(message || 'Shader compilation failed.');
    }
    return shader;
  }
  const vertex = compileShader(gl.VERTEX_SHADER, vertexSource);
  const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, SAMPLE_SIZE, SAMPLE_SIZE, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const framebuffer = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('Unable to create the image comparison buffer.');
  gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.bindTexture(gl.TEXTURE_2D, null);
  let program = null, fragment = null, source = '', locations = {}, position = -1, lost = false;
  function onContextLost(event) { event.preventDefault(); lost = true; }
  canvas.addEventListener('webglcontextlost', onContextLost);
  function assertReady() { if (lost || gl.isContextLost()) throw new Error('Graphics context lost. Reload to restore your saved shader.'); }
  function setSource(next) {
    assertReady(); if (next === source && program) return;
    const nextFragment = compileShader(gl.FRAGMENT_SHADER, next);
    const nextProgram = gl.createProgram(); gl.attachShader(nextProgram, vertex); gl.attachShader(nextProgram, nextFragment); gl.linkProgram(nextProgram);
    if (!gl.getProgramParameter(nextProgram, gl.LINK_STATUS)) {
      const message = gl.getProgramInfoLog(nextProgram); gl.deleteShader(nextFragment); gl.deleteProgram(nextProgram); throw new ShaderError(message || 'Shader linking failed.');
    }
    const types = { u_resolution: gl.FLOAT_VEC2, u_time: gl.FLOAT, iResolution: gl.FLOAT_VEC3, iTime: gl.FLOAT };
    for (let i = 0; i < gl.getProgramParameter(nextProgram, gl.ACTIVE_UNIFORMS); i++) {
      const uniform = gl.getActiveUniform(nextProgram, i);
      if (types[uniform.name] && uniform.type !== types[uniform.name]) {
        gl.deleteShader(nextFragment); gl.deleteProgram(nextProgram);
        throw new ShaderError(`Uniform ${uniform.name} has the wrong type. Use vec2 u_resolution, float u_time, vec3 iResolution, or float iTime.`);
      }
    }
    if (program) gl.deleteProgram(program); if (fragment) gl.deleteShader(fragment);
    program = nextProgram; fragment = nextFragment; source = next;
    locations = Object.fromEntries(Object.keys(types).map(key => [key, gl.getUniformLocation(program, key)]));
    position = gl.getAttribLocation(program, 'a_position');
  }
  function draw(width, height) {
    assertReady(); if (!program) throw new ShaderError('Write a fragment shader before rendering.');
    gl.viewport(0, 0, width, height); gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(locations.u_resolution, width, height); gl.uniform1f(locations.u_time, 0);
    gl.uniform3f(locations.iResolution, width, height, 1); gl.uniform1f(locations.iTime, 0);
    gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  return {
    render(next = source) { setSource(next); gl.bindFramebuffer(gl.FRAMEBUFFER, null); draw(canvas.width, canvas.height); },
    pixels() {
      assertReady(); gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      try { draw(SAMPLE_SIZE, SAMPLE_SIZE); const pixels = new Uint8Array(SAMPLE_SIZE * SAMPLE_SIZE * 4); gl.readPixels(0, 0, SAMPLE_SIZE, SAMPLE_SIZE, gl.RGBA, gl.UNSIGNED_BYTE, pixels); return pixels; }
      finally { gl.bindFramebuffer(gl.FRAMEBUFFER, null); draw(canvas.width, canvas.height); }
    },
    get source() { return source; },
    dispose() {
      canvas.removeEventListener('webglcontextlost', onContextLost); gl.deleteBuffer(buffer); gl.deleteTexture(texture); gl.deleteFramebuffer(framebuffer);
      if (program) gl.deleteProgram(program); if (fragment) gl.deleteShader(fragment); gl.deleteShader(vertex);
    },
  };
}
