// Approved 30-puzzle bank, shared by the daily game and the review pack.
const background = 'vec3(0.025, 0.04, 0.055)';
const paint = '__PUZZLE_PAINT__';
const colorOutput = '  gl_FragColor = vec4(color, 1.0);';
const h = (title, body) => ({ title, body });

// Prewritten color treatments keep the repair about the advertised GLSL idea.
// Most shapes use flat ink; a few use a split palette or a purposeful gradient.
const treatments = [
  { fill: 'vec3(0.98, 0.65, 0.24)' }, // 01: the repair itself creates the gradient.
  { fill: 'vec3(0.40, 0.93, 0.70)', background: 'vec3(0.025, 0.085, 0.075)' },
  { fill: 'vec3(1.0, 0.67, 0.10)', background: 'vec3(0.065, 0.055, 0.045)' },
  { fill: 'vec3(0.94, 0.92, 0.83)', background: 'vec3(0.055, 0.075, 0.12)' },
  { fill: 'vec3(0.85, 0.24, 0.22)', background: 'vec3(0.97, 0.92, 0.82)' },
  { fill: 'vec3(1.0, 0.78, 0.31)', background: 'vec3(0.15, 0.065, 0.20)' },
  { fill: 'vec3(0.83, 0.72, 1.0)', background: 'vec3(0.065, 0.045, 0.17)' },
  { fill: 'vec3(0.10, 0.20, 0.40)', background: 'vec3(0.96, 0.94, 0.85)' },
  { fill: 'vec3(0.34, 0.16, 0.64)', background: 'vec3(0.91, 0.87, 0.97)' },
  { fill: 'vec3(0.97, 0.68, 0.70)' }, // 10: quantized color is the lesson.
  { fill: 'vec3(0.26, 0.88, 0.95)', background: 'vec3(0.12, 0.045, 0.16)' },
  { fill: 'vec3(0.15, 0.75, 0.55)' }, // 12: the swizzle supplies the colors.
  { fill: 'vec3(1.0, 0.31, 0.58)', background: 'vec3(0.04, 0.07, 0.17)' },
  { fill: 'vec3(0.12, 0.30, 0.78)', background: 'vec3(0.97, 0.92, 0.78)' },
  { fill: 'vec3(1.0, 0.48, 0.20)', background: 'vec3(0.13, 0.055, 0.04)' },
  { fill: 'mix(vec3(0.30, 0.77, 0.96), vec3(0.91, 0.97, 0.98), step(0.0, p.y))', background: 'vec3(0.04, 0.10, 0.20)' },
  { fill: 'vec3(1.0, 0.95, 0.76)', background: 'vec3(0.04, 0.075, 0.20)' },
  { fill: 'mix(vec3(1.0, 0.87, 0.39), vec3(0.96, 0.33, 0.30), smoothstep(0.0, 0.46, length(p)))', background: 'vec3(0.15, 0.045, 0.09)' },
  { fill: 'vec3(0.73, 0.51, 0.97)', background: 'vec3(0.075, 0.045, 0.14)' },
  { fill: 'vec3(0.16, 0.60, 0.86)' }, // 20: normal-based lighting supplies the shading.
  { fill: 'vec3(1.0, 0.90, 0.29)', background: 'vec3(0.20, 0.07, 0.24)' },
  { fill: 'mix(vec3(1.0, 0.39, 0.52), vec3(0.34, 0.88, 0.93), step(0.0, p.x))', background: 'vec3(0.055, 0.065, 0.13)' },
  { fill: 'mix(vec3(0.96, 0.35, 0.77), vec3(0.98, 0.88, 0.68), step(0.0, p.y))', background: 'vec3(0.11, 0.055, 0.15)' },
  { fill: 'vec3(0.71, 0.27, 0.13)', background: 'vec3(0.96, 0.90, 0.77)' },
  { fill: 'mix(vec3(0.99, 0.49, 0.22), vec3(0.30, 0.85, 0.92), step(0.0, p.x))', background: 'vec3(0.045, 0.08, 0.15)' },
  { fill: 'vec3(0.78, 0.94, 0.32)', background: 'vec3(0.065, 0.14, 0.09)' },
  { fill: 'mix(vec3(0.29, 0.25, 0.79), vec3(0.73, 0.58, 0.94), clamp(uv.x * 0.65 + uv.y * 0.35, 0.0, 1.0))', background: 'vec3(0.94, 0.92, 0.98)' },
  { fill: 'vec3(0.94, 0.95, 0.98)', background: 'vec3(0.16, 0.07, 0.32)' },
  { fill: 'vec3(0.30, 0.91, 0.86)', background: 'vec3(0.035, 0.08, 0.15)' },
  { fill: 'mix(vec3(1.0, 0.83, 0.30), vec3(0.94, 0.23, 0.49), smoothstep(0.02, 0.36, length(p)))', background: 'vec3(0.99, 0.93, 0.84)' },
];

function paintFor(index) {
  const treatment = treatments[index];
  if (!treatment) throw new Error(`Missing color treatment for puzzle ${index + 1}`);
  return `  vec3 shapeColor = ${treatment.fill};
  vec3 color = mix(${treatment.background || background}, shapeColor, mask);
${colorOutput}`;
}

const candidates = [
  {
    name: 'Color Bridge', focus: 'mix', level: 'Intro',
    idea: 'Use a coordinate as a color-blending weight.',
    goal: 'Blend smoothly from the supplied left color to the right color across the image.',
    setup: '  vec3 leftColor = vec3(0.12, 0.25, 0.68);\n  vec3 rightColor = vec3(0.98, 0.65, 0.24);',
    line: 'vec3 color = REPAIR;', initial: 'leftColor', answer: 'mix(leftColor, rightColor, uv.x)',
    body: colorOutput,
    hints: [h('Find the changing input', 'The endpoint colors are ready. What should vary as you move across the image?'), h('Check the endpoints', 'The blend should reach one endpoint at the left edge and the other at the right edge. Moving vertically should not change it.')],
  },
  {
    name: 'Circle From a Stripe', focus: 'length', level: 'Intro',
    idea: 'Turn two coordinates into one radial distance.',
    goal: 'Change the stripe into a circle centered in the image. Its radius and edge are already set.',
    line: 'float d = REPAIR;', initial: 'abs(p.x)', answer: 'length(p)',
    body: '  float mask = 1.0 - smoothstep(0.26, 0.28, d);\n' + paint,
    hints: [h('Look beyond one axis', 'The stripe ignores vertical movement. A circular boundary must respond to movement in both directions.'), h('Follow a circular contour', 'An axis point and a diagonal point equally far from the center should have the same distance value.')],
  },
  {
    name: 'Signal Stripes', focus: 'sin', level: 'Intro',
    idea: 'Use the sign of a repeating signal to create bands.',
    goal: 'Make repeating vertical bands using the supplied frequency.',
    setup: '  const float frequency = 24.0;',
    line: 'float wave = REPAIR;', initial: 'p.x', answer: 'sin(p.x * frequency)',
    body: '  float mask = smoothstep(-0.1, 0.1, wave);\n' + paint,
    hints: [h('One crossing is not enough', 'The starter changes sign only once. The target keeps switching between bright and dark.'), h('Think about zero crossings', 'The mask brightens positive values and darkens negative values. A repeating signal can supply many boundaries from one coordinate.')],
  },
  {
    name: 'Checker Logic', focus: 'mod', level: 'Intro',
    idea: 'Turn row and column parity into a two-dimensional pattern.',
    goal: 'Make neighboring grid cells alternate both horizontally and vertically.',
    setup: '  vec2 cell = floor(uv * 6.0);',
    line: 'float mask = REPAIR;', initial: 'mod(cell.x, 2.0)', answer: 'mod(cell.x + cell.y, 2.0)',
    hints: [h('The rows need a say', 'Alternating columns alone make stripes. Each successive row needs the opposite arrangement.'), h('Check a diagonal neighbor', 'A cell should differ from a direct neighbor, but match the cell one step diagonally away.')],
  },
  {
    name: 'Square Distance', focus: 'max / abs', level: 'Intro',
    idea: 'Changing the distance rule changes the shape of its contours.',
    goal: 'Turn the circular mask into an axis-aligned square with the existing edge size.',
    line: 'float d = REPAIR;', initial: 'length(p)', answer: 'max(abs(p.x), abs(p.y))',
    body: '  float mask = 1.0 - smoothstep(0.26, 0.28, d);\n' + paint,
    hints: [h('Think about the boundary', 'Every point on a straight side should have the same distance, even while its other coordinate changes.'), h('Compare a side and a corner', 'The middle of a side and the adjacent corner lie on the same square contour, despite having different straight-line distances from the center.')],
  },
  {
    name: 'Hollow Center', focus: 'abs / distance fields', level: 'Intro',
    idea: 'Measure distance from a contour instead of from a point.',
    goal: 'Draw a thin ring at the supplied radius, with matching inner and outer edges.',
    setup: '  const float radius = 0.27;',
    line: 'float d = REPAIR;', initial: 'length(p)', answer: 'abs(length(p) - radius)',
    body: '  float mask = 1.0 - smoothstep(0.012, 0.024, d);\n' + paint,
    hints: [h('Move the zero-distance region', 'The bright part appears where the distance is near zero. Here that should happen around the ring.'), h('Treat both sides alike', 'Points equally far inside and outside the ring should have the same small value. The center should be farther away.')],
  },
  {
    name: 'Soft Threshold', focus: 'smoothstep', level: 'Intro',
    idea: 'A transition can have a width instead of a single hard boundary.',
    goal: 'Replace the hard color split with a smooth transition between the two marked edges.',
    setup: '  const float edge0 = 0.22;\n  const float edge1 = 0.78;',
    line: 'float mask = REPAIR;', initial: 'step(0.5, uv.x)', answer: 'smoothstep(edge0, edge1, uv.x)',
    hints: [h('Give the boundary some room', 'A single threshold can only switch off or on. The target includes intermediate values over a region.'), h('Keep the outer regions flat', 'The left region stays fully dark and the right region fully bright. Only the interval between the supplied edges should change.')],
  },
  {
    name: 'Endless Dot Paper', focus: 'fract', level: 'Practice',
    idea: 'Repeat a shape by repeating the coordinates you draw it in.',
    goal: 'Fill the image with a 6 by 6 grid of dots, each centered in its own cell.',
    setup: '  const float gridSize = 6.0;',
    line: 'vec2 local = REPAIR;', initial: 'uv * gridSize - 0.5', answer: 'fract(uv * gridSize) - 0.5',
    body: '  float mask = 1.0 - smoothstep(0.23, 0.26, length(local));\n' + paint,
    hints: [h('Reuse the same little space', 'The circle code only needs a small coordinate region around one cell center.'), h('Watch a cell boundary', 'As you cross into the next cell, the local coordinate should restart while the original image coordinate keeps increasing.')],
  },
  {
    name: 'Turn the Plane', focus: 'mat2', level: 'Practice',
    idea: 'Rotate coordinates before evaluating an unchanged shape.',
    goal: 'Rotate the rectangle by the supplied angle. Keep its dimensions and center.',
    setup: '  const float angle = 0.52;\n  float c = cos(angle);\n  float s = sin(angle);',
    line: 'vec2 q = REPAIR;', initial: 'p', answer: 'mat2(c, -s, s, c) * p',
    body: '  vec2 outside = abs(q) - vec2(0.29, 0.11);\n  float mask = 1.0 - smoothstep(-0.003, 0.003, max(outside.x, outside.y));\n' + paint,
    hints: [h('Move the coordinate system', 'The rectangle test can stay unchanged if it receives coordinates from a turned plane.'), h('Track the two axes', 'A rotation mixes horizontal and vertical contributions while keeping distances unchanged. GLSL fills a matrix column by column.')],
  },
  {
    name: 'Posterized Color', focus: 'floor', level: 'Practice',
    idea: 'Quantize a continuous coordinate into a fixed number of levels.',
    goal: 'Turn the smooth gradient into six equally wide, flat-color bands, including both endpoint colors.',
    setup: '  const float levels = 6.0;',
    line: 'float blend = REPAIR;', initial: 'uv.x', answer: 'floor(uv.x * levels) / (levels - 1.0)',
    body: '  vec3 color = mix(vec3(0.38, 0.08, 0.38), vec3(0.99, 0.72, 0.58), blend);\n' + colorOutput,
    hints: [h('Replace motion with plateaus', 'Nearby positions inside a band should all produce exactly the same blend value.'), h('Count the intervals and values', 'There are six position intervals but the output values include both 0 and 1. The last band must reach the second endpoint color.')],
  },
  {
    name: 'A Split Decision', focus: 'if / comparisons', level: 'Practice',
    idea: 'Let a branch apply a different rule to one region of the image.',
    goal: 'Keep the left half at the base stripe frequency and double the frequency on the right half.',
    setup: '  float frequency = 18.0;',
    line: 'if (REPAIR) {', initial: 'false', answer: 'p.x > 0.0',
    body: '    frequency *= 2.0;\n  }\n  float mask = smoothstep(-0.08, 0.08, sin(p.y * frequency));\n' + paint,
    hints: [h('Choose where the branch runs', 'The frequency adjustment is already written inside the branch. The missing condition selects its region.'), h('Locate the dividing line', 'Both sides share the same vertical coordinate. Find a condition that stays consistent within each half and changes at the center.')],
  },
  {
    name: 'Channel Shuffle', focus: 'vector swizzles', level: 'Practice',
    idea: 'Reorder vector components without changing their values.',
    goal: 'Rearrange the supplied color channels: the constant channel becomes red, horizontal variation becomes green, and vertical variation becomes blue.',
    setup: '  vec3 baseColor = vec3(uv.x, uv.y, 0.15);',
    line: 'vec3 color = REPAIR;', initial: 'baseColor.rgb', answer: 'baseColor.brg',
    body: colorOutput,
    hints: [h('Track the source channels', 'Each source channel has a distinct behavior: horizontal, vertical, or constant.'), h('Follow one output at a time', 'The required colors already exist in the vector. Decide which existing component belongs in each output position.')],
  },
  {
    name: 'A Clipped Ramp', focus: 'clamp', level: 'Practice',
    idea: 'Limit an intermediate value to create flat regions in a shape.',
    goal: 'Make the diagonal line level out into horizontal plateaus above and below the center, using the supplied limit.',
    setup: '  const float limit = 0.18;',
    line: 'float height = REPAIR;', initial: 'p.x', answer: 'clamp(p.x, -limit, limit)',
    body: '  float d = abs(p.y - height);\n  float mask = 1.0 - smoothstep(0.012, 0.022, d);\n' + paint,
    hints: [h('Keep the middle section', 'Near the center, the starter already follows the target. The change is needed at the extremes.'), h('Stop the height from growing', 'Past either supplied limit, horizontal movement should no longer change the line height.')],
  },
  {
    name: 'A Moving Threshold', focus: 'step', level: 'Practice',
    idea: 'A threshold may vary per pixel instead of being a constant.',
    goal: 'Change the horizontal split into a diagonal dividing the square from bottom left to top right. The upper-left triangle should be lit.',
    line: 'float mask = REPAIR;', initial: 'step(0.5, uv.y)', answer: 'step(uv.x, uv.y)',
    hints: [h('Compare two changing values', 'A constant cutoff produces a straight horizontal boundary. The target boundary moves as you travel right.'), h('Test points beside the diagonal', 'A point on the diagonal has matching coordinates. Compare a point just above it with one just below it.')],
  },
  {
    name: 'Two Become One', focus: 'min / shape union', level: 'Practice',
    idea: 'Combine signed distance fields into a union.',
    goal: 'Keep every pixel inside either of the two overlapping discs.',
    setup: '  float dA = length(p - vec2(-0.15, -0.06)) - 0.23;\n  float dB = length(p - vec2(0.15, 0.06)) - 0.23;',
    line: 'float d = REPAIR;', initial: 'dA', answer: 'min(dA, dB)',
    body: '  float mask = 1.0 - smoothstep(-0.003, 0.003, d);\n' + paint,
    hints: [h('Inside is negative', 'Each distance is negative inside its own disc. The combined shape should accept either disc.'), h('Check an exclusive region', 'At a point inside only one disc, one distance is negative and the other positive. The combined distance must still count as inside.')],
  },
  {
    name: 'The Lens', focus: 'max / shape intersection', level: 'Practice',
    idea: 'Combine the same kind of fields to keep only their intersection.',
    goal: 'Keep only the lens-shaped area shared by both discs.',
    setup: '  float dA = length(p - vec2(-0.14, 0.0)) - 0.30;\n  float dB = length(p - vec2(0.14, 0.0)) - 0.30;',
    line: 'float d = REPAIR;', initial: 'min(dA, dB)', answer: 'max(dA, dB)',
    body: '  float mask = 1.0 - smoothstep(-0.003, 0.003, d);\n' + paint,
    hints: [h('Both shapes must agree', 'Being inside one disc is no longer enough. The target contains only pixels inside both.'), h('Reject a positive distance', 'If either field says a point is outside, the combined field must also say outside. Test a point near either outer edge.')],
  },
  {
    name: 'Moon Cutout', focus: 'unary minus / shape subtraction', level: 'Practice',
    idea: 'Invert one signed field to subtract a shape.',
    goal: 'Carve the smaller, offset disc out of the larger one to create a crescent.',
    setup: '  float dOuter = length(p) - 0.31;\n  float dCutout = length(p - vec2(0.15, 0.07)) - 0.27;',
    line: 'float d = REPAIR;', initial: 'max(dOuter, dCutout)', answer: 'max(dOuter, -dCutout)',
    body: '  float mask = 1.0 - smoothstep(-0.003, 0.003, d);\n' + paint,
    hints: [h('The cutout means the opposite', 'The large shape should accept its inside, while the smaller shape should accept its outside.'), h('Reverse one inside test', 'The cutout currently reports negative values in the region that should be removed. How could that field describe its outside instead?')],
  },
  {
    name: 'A Softer Join', focus: 'mix / smooth minimum', level: 'Stretch',
    idea: 'Blend signed fields near their intersection to round a sharp union.',
    goal: 'Use the supplied blend weight and smoothing amount to round the join between the two shapes.',
    setup: '  float dA = length(p - vec2(-0.20, 0.0)) - 0.20;\n  float dB = length(p - vec2(0.20, 0.0)) - 0.20;\n  const float k = 0.30;\n  float h = clamp(0.5 + 0.5 * (dB - dA) / k, 0.0, 1.0);',
    line: 'float d = REPAIR;', initial: 'min(dA, dB)', answer: 'mix(dB, dA, h) - k * h * (1.0 - h)',
    body: '  float mask = 1.0 - smoothstep(-0.003, 0.003, d);\n' + paint,
    hints: [h('Work near the handoff', 'The weight is 0 near one shape and 1 near the other. Around their meeting point, it sits between those extremes.'), h('Keep distant regions unchanged', 'The rounding adjustment should vanish at either endpoint of the weight and be strongest between them. The blended distance needs to expand the join.')],
  },
  {
    name: 'Compass Slices', focus: 'atan', level: 'Practice',
    idea: 'Use angle as a coordinate to make a radial pattern.',
    goal: 'Make eight bright wedges around the center using the supplied angular frequency.',
    setup: '  const float spokes = 8.0;',
    line: 'float angle = REPAIR;', initial: 'p.x', answer: 'atan(p.y, p.x)',
    body: '  float mask = smoothstep(-0.06, 0.06, sin(angle * spokes));\n' + paint,
    hints: [h('Travel around, not across', 'The pattern repeats while circling the center. Moving along a ray should keep you in the same wedge.'), h('Distinguish every direction', 'A useful angular coordinate must tell opposite quadrants apart. GLSL has a two-input form for that purpose.')],
  },
  {
    name: 'A Lit Marble', focus: 'dot / normalize', level: 'Stretch',
    idea: 'Shade a reconstructed sphere using the alignment of its normal and a light direction.',
    goal: 'Light the sphere from the supplied upper-left direction instead of lighting it straight on.',
    setup: '  const float radius = 0.31;\n  vec2 sphere = p / radius;\n  float z = sqrt(max(0.0, 1.0 - dot(sphere, sphere)));\n  vec3 normal = normalize(vec3(sphere, z));\n  vec3 lightDirection = normalize(vec3(-0.6, 0.8, 1.0));',
    line: 'float light = REPAIR;', initial: 'max(normal.z, 0.0)', answer: 'max(dot(normal, lightDirection), 0.0)',
    body: '  float mask = 1.0 - smoothstep(radius - 0.004, radius, length(p));\n  vec3 color = mix(' + background + ', vec3(0.16, 0.60, 0.86) * light + 0.045, mask);\n' + colorOutput,
    hints: [h('Follow the surface direction', 'The sphere shape is ready. Each visible pixel already has a normal telling you which way the surface faces.'), h('Compare two directions', 'Brightness should be strongest where the normal faces the light, weaker at right angles, and never negative on the unlit side.')],
  },
  {
    name: 'Sharp Starburst', focus: 'pow', level: 'Stretch',
    idea: 'Shape a signal nonlinearly to turn broad lobes into narrow spikes.',
    goal: 'Sharpen the radial lobes using the supplied exponent without changing their count or outer reach.',
    setup: '  float angle = atan(p.y, p.x);\n  float lobes = abs(cos(angle * 5.0));\n  const float sharpness = 5.0;',
    line: 'float rays = REPAIR;', initial: 'lobes', answer: 'pow(lobes, sharpness)',
    body: '  float radius = 0.11 + 0.26 * rays;\n  float mask = 1.0 - smoothstep(radius - 0.004, radius + 0.004, length(p));\n' + paint,
    hints: [h('Leave the endpoints alone', 'Values at 0 and 1 should stay there. The in-between values determine how wide each spike looks.'), h('Push middle values downward', 'The target spends more of each lobe near its small radius and reaches the outer radius only briefly. Think about how the supplied exponent affects numbers between 0 and 1.')],
  },
  {
    name: 'Six in Orbit', focus: 'for / float conversion', level: 'Stretch',
    idea: 'Use a loop index as a phase to place repeated shapes around a circle.',
    goal: 'Arrange the six loop-generated dots evenly around the supplied orbit radius.',
    setup: '  const float tau = 6.2831853;\n  const float orbitRadius = 0.29;\n  float d = 10.0;\n  for (int i = 0; i < 6; i++) {',
    line: 'float angle = REPAIR;', initial: '0.0', answer: 'tau * float(i) / 6.0',
    body: '    vec2 center = orbitRadius * vec2(cos(angle), sin(angle));\n    d = min(d, length(p - center) - 0.065);\n  }\n  float mask = 1.0 - smoothstep(-0.003, 0.003, d);\n' + paint,
    hints: [h('Let each iteration differ', 'The loop already draws six dots, but they currently land on the same position.'), h('Divide one revolution', 'The first iteration begins at the starting direction. Each following iteration should advance by the same fraction of a full turn. Watch the integer and floating-point types.')],
  },
  {
    name: 'Woven Windows', focus: 'bool / != / ternary operator', level: 'Stretch',
    idea: 'Combine masks with exclusive-or instead of their union.',
    goal: 'Light pixels covered by exactly one of the two band patterns. Leave their crossings dark.',
    setup: '  bool horizontal = abs(sin(p.y * 22.0)) < 0.38;\n  bool vertical = abs(sin(p.x * 22.0)) < 0.38;',
    line: 'bool lit = REPAIR;', initial: 'horizontal || vertical', answer: 'horizontal != vertical',
    body: '  float mask = lit ? 1.0 : 0.0;\n' + paint,
    hints: [h('Inspect the crossings', 'The starter accepts pixels in either band, including the places where both bands overlap.'), h('Make a truth table', 'The target accepts the two cases where only one input is true. Both matching cases should be dark.')],
  },
  {
    name: 'Staggered Tiles', focus: 'mod / coordinate offsets', level: 'Practice',
    idea: 'Offset alternate rows before repeating the domain.',
    goal: 'Stagger every other brick row by half a cell. Keep the existing brick dimensions and mortar.',
    setup: '  vec2 grid = uv * vec2(5.0, 7.0);\n  float row = floor(grid.y);',
    line: 'float shift = REPAIR;', initial: '0.0', answer: 'mod(row, 2.0) * 0.5',
    body: '  vec2 cell = fract(grid + vec2(shift, 0.0));\n  vec2 edge = min(cell, 1.0 - cell);\n  float mask = smoothstep(0.025, 0.055, min(edge.x, edge.y));\n' + paint,
    hints: [h('Shift a row before tiling', 'Changing the local shape of each brick is unnecessary. The offset belongs in the coordinates.'), h('Alternate two offsets', 'Consecutive rows need different offsets, while rows two apart need the same offset. The offset is measured in cell widths.')],
  },
  {
    name: 'Direction, Not Distance', focus: 'normalize', level: 'Practice',
    idea: 'Separate direction from magnitude before applying a directional mask.',
    goal: 'Create two opposing wedges inside the existing ring by making the direction test independent of distance from the center.',
    line: 'vec2 direction = REPAIR;', initial: 'p', answer: 'normalize(p)',
    body: '  float ring = smoothstep(0.08, 0.09, length(p)) * (1.0 - smoothstep(0.40, 0.41, length(p)));\n  float mask = ring * smoothstep(0.79, 0.81, abs(direction.x));\n' + paint,
    hints: [h('A ray has one direction', 'Points along a ray move farther away while still pointing the same way.'), h('Remove the changing magnitude', 'The direction test should receive the same vector for every point along a ray. The ring can still use the original distance.')],
  },
  {
    name: 'Reflected Letter', focus: 'reflect', level: 'Stretch',
    idea: 'Reflect the coordinate domain across a plane while preserving an asymmetric shape.',
    goal: 'Reflect the supplied F-shaped mask across the line whose normal is mirrorNormal.',
    setup: '  vec2 mirrorNormal = normalize(vec2(1.0, 2.0));',
    line: 'vec2 q = REPAIR;', initial: 'p', answer: 'reflect(p, mirrorNormal)',
    body: '  vec2 stem = abs(q - vec2(-0.13, 0.0)) - vec2(0.045, 0.27);\n  vec2 top = abs(q - vec2(0.015, 0.225)) - vec2(0.19, 0.045);\n  vec2 middle = abs(q - vec2(-0.025, 0.025)) - vec2(0.15, 0.04);\n  float d = min(max(stem.x, stem.y), min(max(top.x, top.y), max(middle.x, middle.y)));\n  float mask = 1.0 - smoothstep(-0.003, 0.003, d);\n' + paint,
    hints: [h('Preserve the letter, change the space', 'The asymmetry helps distinguish a reflection from a simple turn. The shape test can stay as written.'), h('Use the normal correctly', 'The normal points perpendicular to the mirror line. A point on that line should stay fixed, while points on either side exchange places.')],
  },
  {
    name: 'Round the Corners', focus: 'vector max / signed distance', level: 'Stretch',
    idea: 'Treat outside corners radially while preserving a signed interior.',
    goal: 'Round the corners of the box using the supplied radius, while retaining straight sides.',
    setup: '  vec2 q = abs(p) - vec2(0.22, 0.13);\n  const float radius = 0.08;',
    line: 'float d = REPAIR;', initial: 'max(q.x, q.y) - radius', answer: 'length(max(q, vec2(0.0))) + min(max(q.x, q.y), 0.0) - radius',
    body: '  float mask = 1.0 - smoothstep(-0.003, 0.003, d);\n' + paint,
    hints: [h('Separate corners from sides', 'Near a corner, both components can lie outside the inner box. Along a side, only one does.'), h('Use two distance rules', 'Outside the inner box, the positive excess should behave like a radial distance. Inside it, keep a negative distance so the shape remains filled.')],
  },
  {
    name: 'Liquid Grid', focus: 'sin / domain warping', level: 'Stretch',
    idea: 'Distort coordinates before drawing a familiar grid.',
    goal: 'Bend both families of grid lines using cross-axis waves, with the supplied strength and frequency.',
    setup: '  const float strength = 0.065;\n  const float frequency = 12.0;',
    line: 'vec2 q = REPAIR;', initial: 'p', answer: 'p + strength * vec2(sin(p.y * frequency), sin(p.x * frequency))',
    body: '  vec2 lines = abs(sin(q * 25.0));\n  float mask = 1.0 - smoothstep(0.10, 0.18, min(lines.x, lines.y));\n' + paint,
    hints: [h('Bend the paper first', 'The final grid code can stay unchanged. Its input coordinates need the distortion.'), h('Cross the axes', 'A vertical line bends when its horizontal position changes with height. Apply the corresponding idea to the horizontal lines as well.')],
  },
  {
    name: 'Spiral Arms', focus: 'atan / polar-coordinate warping', level: 'Stretch',
    idea: 'Twist an angular coordinate by an amount that changes with radius.',
    goal: 'Turn the straight radial sectors into a three-armed spiral using the supplied twist.',
    setup: '  const float twist = 12.0;\n  const float arms = 3.0;',
    line: 'float angle = REPAIR;', initial: 'atan(p.y, p.x)', answer: 'atan(p.y, p.x) + length(p) * twist',
    body: '  float mask = smoothstep(-0.06, 0.06, sin(angle * arms));\n' + paint,
    hints: [h('A fixed rotation is not a spiral', 'All radii currently share the same sector directions. The target changes orientation as you move outward.'), h('Let the turn grow with distance', 'Nearby circles should have slightly shifted angular patterns. Keep the angular repetition, but let radial position influence its phase.')],
  },
  {
    name: 'Petal Equation', focus: 'cos / polar shape construction', level: 'Stretch',
    idea: 'Let the boundary radius vary with angle to make a flower.',
    goal: 'Turn the circle into a five-petal flower using the supplied base radius and petal depth.',
    setup: '  float angle = atan(p.y, p.x);\n  const float petals = 5.0;\n  const float baseRadius = 0.25;\n  const float petalDepth = 0.09;',
    line: 'float radius = REPAIR;', initial: 'baseRadius', answer: 'baseRadius + petalDepth * cos(angle * petals)',
    body: '  float mask = 1.0 - smoothstep(radius - 0.004, radius + 0.004, length(p));\n' + paint,
    hints: [h('Change the boundary', 'The distance from the center is already available. The target needs a boundary that reaches farther in some directions than others.'), h('Repeat around one revolution', 'The radius should rise and fall five times during a full turn, staying centered around the supplied base size.')],
  },
];

const prefix = `precision highp float;
uniform vec2 u_resolution;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution)
         / min(u_resolution.x, u_resolution.y);`;

export const monthPuzzles = candidates.map((candidate, index) => {
  const id = String(index + 1).padStart(2, '0');
  const { name, focus, level, idea, goal, setup = '', line, initial, answer, hints } = candidate;
  const before = prefix + (setup ? '\n\n' + setup : '') + '\n\n';
  const after = '\n' + (candidate.body || paint).replaceAll(paint, paintFor(index)) + '\n}';
  const statement = line.replace('REPAIR', answer);
  return {
    id, name, focus, level, idea, goal,
    starterSource: before + '  // TODO: ' + goal + '\n  ' + line.replace('REPAIR', initial) + after,
    source: before + '  ' + statement + after,
    hints: [...hints, { title: 'Reference repair', body: 'Use this statement at the TODO. Other implementations that render the same image are valid.', code: statement }],
  };
});
