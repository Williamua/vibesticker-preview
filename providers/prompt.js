// Shared sticker prompt: style description + identity / composition / sticker-finish rules.
function buildPrompt(style) {
  return [
    `Redraw the main person (or pet) in the attached photo as a single die-cut sticker illustration in this style: ${style.prompt}.`,
    'Likeness: keep them clearly recognisable — same face shape, hairstyle and hair colour, skin tone, eye shape, glasses and accessories, expression and outfit colours. Do not change age, gender or ethnicity.',
    'Composition: exactly one subject, centred, head-and-shoulders to upper body, filling about 80% of a square canvas, nothing cut off at the edges.',
    'Sticker finish: a thick, smooth, even white die-cut border (about 4% of the image width) hugging the whole silhouette, with a very soft subtle shadow just outside it.',
    'Background: perfectly plain flat white (#FFFFFF) — no scenery, no gradient, no floor, no props outside the border.',
    'Do not add any text, letters, numbers, watermark, logo or signature.',
    style.avoid ? `Avoid: ${style.avoid}.` : '',
  ].filter(Boolean).join(' ');
}
module.exports = { buildPrompt };
