const f = n => n.toFixed(3);
const rgb = hue => 'vec3(' + [0, 0.18, 0.36].map(offset => f(0.55 + 0.4 * Math.cos(6.2831853 * (hue + offset)))).join(', ') + ')';

const currentNames = new Map([['ink', 'shapeColor'], ['left', 'leftColor'], ['right', 'rightColor']]);
const previousNames = new Map([...currentNames].map(([oldName, newName]) => [newName, oldName]));
const renameIdentifiers = (source, names) => source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*|\b[A-Za-z_]\w*\b/g, token => names.get(token) || token);
const compactSource = source => source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '').replace(/\s+/g, '');

// Update recognized built-in programs while preserving edits and comments.
export function migrateGeneratedShader(source, puzzle) {
  const previousTemplates = [puzzle.starterSource, puzzle.source].map(template => compactSource(renameIdentifiers(template, previousNames)));
  return previousTemplates.includes(compactSource(source)) ? renameIdentifiers(source, currentNames) : source;
}

export function shaderPuzzle(number, random) {
  const hue = random();
  const colors = `  vec3 shapeColor = mix(${rgb(hue)},\n                 ${rgb(hue + 0.2)}, uv.y);`;
  const paint = `\n${colors}\n  vec3 color = mix(vec3(0.025, 0.04, 0.03), shapeColor, mask);\n  gl_FragColor = vec4(color, 1.0);`;
  const programs = [
    {
      name: 'Linear Gradient', technique: 'BEGINNER / LINEAR INTERPOLATION',
      brief: 'Make a smooth horizontal gradient from the two colors already in the shader.',
      goal: 'Use the normalized x coordinate as the interpolation factor.',
      line: 'float blend = REPAIR;', answer: 'uv.x', initial: '0.0',
      todo: 'Use the normalized horizontal coordinate for the blend.',
      body: `  vec3 leftColor = ${rgb(hue)};\n  vec3 rightColor = ${rgb(hue + 0.2)};\n  vec3 color = mix(leftColor, rightColor, blend);\n  gl_FragColor = vec4(color, 1.0);`,
      hints: [
        { title: 'Start with the coordinates', body: 'uv stores normalized coordinates from 0 to 1. One component changes from left to right.' },
        { title: 'Compare the two edges', body: 'The blend should reach 0 at one edge and 1 at the opposite edge. Moving up or down should leave it unchanged. Which coordinate behaves that way?' },
        { title: 'Corrected statement', body: 'Use the x coordinate as the interpolation factor.', code: 'float blend = uv.x;' },
      ],
    },
    {
      name: 'Soft Circle', technique: 'BEGINNER / RADIAL DISTANCE',
      brief: 'Turn a stripe into a soft circle. The color and soft edge are already written.',
      goal: 'Use radial distance to create a circular mask.',
      line: 'float d = REPAIR;', answer: 'length(p)', initial: 'abs(p.x)',
      todo: 'Find the distance from the center, in both directions.',
      body: '  float mask = 1.0 - smoothstep(0.26, 0.28, d);' + paint,
      hints: [
        { title: 'Horizontal distance', body: 'abs(p.x) only measures horizontal distance. A circle needs the horizontal and vertical distances together.' },
        { title: 'Follow a circular contour', body: 'Pick two points equally far from the center, one on an axis and one on a diagonal. They should produce the same distance even though their coordinate values differ.' },
        { title: 'Corrected statement', body: 'Replace the one-axis distance with the length of the full position vector.', code: 'float d = length(p);' },
      ],
    },
    {
      name: 'Sine Stripes', technique: 'BEGINNER / SINE WAVES',
      brief: 'Make repeating bands from a wave. The shader already converts the wave into a mask.',
      goal: 'Replace the constant with a wave that repeats across the image.',
      line: 'float wave = REPAIR;', answer: 'sin(p.x * 24.0)', initial: '1.0',
      todo: 'Use a sine wave that repeats across x, at frequency 24.0.',
      body: '  float mask = smoothstep(-0.1, 0.1, wave);' + paint,
      hints: [
        { title: 'Vary the value across pixels', body: 'A constant makes the whole image the same. A repeating function of the pixel position creates bands.' },
        { title: 'Think about the band boundaries', body: 'The mask brightens positive values and darkens negative values. Look for a smooth, repeating signal whose zero crossings separate the bands.' },
        { title: 'Corrected statement', body: 'This makes the horizontal coordinate repeat as a wave.', code: 'float wave = sin(p.x * 24.0);' },
      ],
    },
    {
      name: 'Checkerboard', technique: 'BEGINNER / TILING',
      brief: 'Turn columns into a checkerboard. Each square already has an x and y cell number.',
      goal: 'Make the checker pattern depend on both cell coordinates.',
      setup: '  vec2 cell = floor(uv * 6.0);\n',
      line: 'float mask = REPAIR;', answer: 'mod(cell.x + cell.y, 2.0)', initial: 'mod(cell.x, 2.0)',
      todo: 'Alternate cells using the sum of the x and y cell numbers.',
      body: paint.trimStart(),
      hints: [
        { title: 'Alternate the rows too', body: 'Using only cell.x gives alternating columns. The pattern also needs to shift on each new row.' },
        { title: 'Check neighboring cells', body: 'A cell should differ from its neighbor in either direction, but match the cell one step diagonally away. How could the row number affect which columns are lit?' },
        { title: 'Corrected statement', body: 'The cell positions combine to make alternating squares.', code: 'float mask = mod(cell.x + cell.y, 2.0);' },
      ],
    },
    {
      name: 'Square Mask', technique: 'BEGINNER / DISTANCE FUNCTIONS',
      brief: 'Turn a circle into a square by changing how distance is measured.',
      goal: 'Use a distance function that produces a square outline.',
      line: 'float d = REPAIR;', answer: 'max(abs(p.x), abs(p.y))', initial: 'length(p)',
      todo: 'Use the larger of the two absolute coordinates.',
      body: '  float mask = 1.0 - smoothstep(0.26, 0.28, d);' + paint,
      hints: [
        { title: 'A different kind of distance', body: 'length(p) gives a round outline. For a square, a point is inside when both absolute coordinates are small.' },
        { title: 'Compare a side with a corner', body: 'The middle of a side and its adjacent corner belong to the same square outline. Your distance should give them the same value, even though the corner is farther from the center in a straight line.' },
        { title: 'Corrected statement', body: 'This distance creates square contours around the center.', code: 'float d = max(abs(p.x), abs(p.y));' },
      ],
    },
    {
      name: 'Ring Mask', technique: 'BEGINNER / RINGS',
      brief: 'Change a point mask into a ring mask. The radius to aim for is 0.27.',
      goal: 'Measure distance from a ring instead of from the center.',
      line: 'float d = REPAIR;', answer: 'abs(length(p) - 0.27)', initial: 'length(p)',
      todo: 'Measure how far the center distance is from radius 0.27.',
      body: '  float mask = 1.0 - smoothstep(0.012, 0.024, d);' + paint,
      hints: [
        { title: 'Choose where distance is zero', body: 'length(p) is zero at the center. For a ring, the distance should be zero at radius 0.27.' },
        { title: 'Treat both sides of the ring alike', body: 'A point just inside the ring and one equally far outside it should have the same small distance. Moving toward the center should increase that distance again.' },
        { title: 'Corrected statement', body: 'Pixels near radius 0.27 receive a mask value close to 1.', code: 'float d = abs(length(p) - 0.27);' },
      ],
    },
    {
      name: 'Sine Wave', technique: 'BEGINNER / WAVE FUNCTIONS',
      brief: 'Bend the straight line into a wave. Its color and thickness are already set.',
      goal: 'Use a sine function for the vertical position of the line.',
      line: 'float wave = REPAIR;', answer: 'sin(p.x * 9.0) * 0.11', initial: '0.0',
      todo: 'Use sin with frequency 9.0 and height 0.11.',
      body: '  float d = abs(p.y - wave);\n  float mask = 1.0 - smoothstep(0.012, 0.024, d);' + paint,
      hints: [
        { title: 'A line can have a changing height', body: 'wave is the vertical position of the line. Right now it stays at zero, so the line is straight.' },
        { title: 'Separate repetition from height', body: 'One control changes the number of crests across the image; another changes how far the line moves above and below the center. Try adjusting them independently.' },
        { title: 'Corrected statement', body: 'The line now follows a sine wave across the image.', code: 'float wave = sin(p.x * 9.0) * 0.11;' },
      ],
    },
    {
      name: 'Circle Mask', technique: 'BEGINNER / CIRCLE MASK',
      brief: 'Complete one distance expression to produce a circular mask.',
      goal: 'Find the TODO. Make the distance use both coordinates to draw a circle.',
      line: 'float d = REPAIR;', answer: 'length(p)', initial: 'abs(p.x)',
      todo: 'Measure distance from the center using the whole vector p.',
      body: '  float mask = 1.0 - smoothstep(0.27, 0.29, d);' + paint,
      hints: [
        { title: 'Compare the shapes', body: 'The stripe uses only the x coordinate. A circular mask needs distance calculated from both x and y.' },
        { title: 'Rotate around the center', body: 'Imagine moving a point around the center without moving closer or farther away. Its distance value should stay unchanged. Use that to check whether your calculation treats every direction equally.' },
        { title: 'Corrected statement', body: 'Replace the TODO statement with the expression shown below.', code: 'float d = length(p);' },
      ],
    },
  ];
  const chosen = programs[((number - 1) % programs.length + programs.length) % programs.length];
  const prefix = `precision highp float;
uniform vec2 u_resolution;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution)
         / min(u_resolution.x, u_resolution.y);

${chosen.setup || ''}`;
  const suffix = '\n' + chosen.body + '\n}';
  return {
    name: chosen.name, technique: chosen.technique, brief: chosen.brief, goal: chosen.goal,
    repairCount: 1, hints: chosen.hints,
    source: prefix + '  ' + chosen.line.replace('REPAIR', chosen.answer) + suffix,
    starterSource: prefix + '  // TODO: ' + chosen.todo + '\n  ' + chosen.line.replace('REPAIR', chosen.initial) + suffix,
  };
}
