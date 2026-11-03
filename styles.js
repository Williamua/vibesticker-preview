// Sticker styles. `prompt` = style description fed into providers/prompt.js (shared sticker rules are added there).
// `motion` = loop used for the animated GIF (lib/gif.js): breathe | sway | bounce | pixel | wobble | shimmer.
// `hidden: true` styles are never returned by /api/config (reserved for a later phase).
module.exports = [
 {id:'anime',name:'日漫',motion:'breathe',prompt:'modern Japanese anime key-visual style: crisp clean line art with tapered strokes, two-tone cel shading with one soft highlight layer, large expressive eyes with detailed catchlights, glossy hair with sharp highlight bands, bright clear saturated colours, light rim light',
  avoid:'photorealistic skin, painterly texture, muddy colours'},
 {id:'chibi',name:'Q版',motion:'bounce',prompt:'super-deformed chibi style: 2.5-head-tall proportions with an oversized head and tiny body, huge sparkling eyes, small blush marks on the cheeks, rounded simplified hands, bold even outlines, flat pastel colours with minimal soft shading, playful happy pose',
  avoid:'realistic proportions, harsh shadows, scary or sad expression'},
 {id:'toy3d',name:'3D潮玩',motion:'sway',prompt:'3D designer art-toy figurine (vinyl blind-box collectible): chibi proportions, smooth glossy vinyl material with subtle subsurface softness, rounded simplified features, soft three-point studio lighting, gentle ambient occlusion, rendered like a high-end Pixar/Pop Mart product shot standing on nothing',
  avoid:'flat 2D drawing, rough clay texture, cluttered base or packaging'},
 {id:'pixel',name:'像素',motion:'pixel',prompt:'authentic 16-bit pixel art game sprite: the whole character drawn on a coarse pixel grid (roughly 64×64 sprite upscaled with hard nearest-neighbour edges), limited palette of about 16–24 colours, 1-pixel dark outline, hand-placed dithering for shading, no anti-aliasing, no blur — it must look like real pixel art, not a pixelated or mosaic-filtered photo',
  avoid:'mosaic filter over the photo, smooth gradients, anti-aliased edges, photographic detail'},
 {id:'watercolor',name:'水彩',motion:'breathe',prompt:'delicate hand-painted watercolour illustration: loose wet-on-wet colour blooms, soft pigment granulation, light pencil under-drawing visible in places, gentle pastel palette, white of the paper used for highlights, crisp edge only where the sticker outline is',
  avoid:'digital flat fill, heavy black outlines, neon colours'},
 {id:'vaporwave',name:'Vaporwave',motion:'shimmer',prompt:'vaporwave aesthetic cartoon: pink-to-cyan neon gradients, chrome highlights, retro 80s glow accents on the character, soft bloom',avoid:'dull colours'},
 {id:'graffiti',name:'Street Graffiti',motion:'wobble',prompt:'street graffiti cartoon character: spray-paint texture, thick marker outlines, small paint drips, bold urban colours, confident pose',avoid:'clean vector look'},
 {id:'glitch',name:'Glitch Art',motion:'shimmer',prompt:'glitch art cartoon: RGB channel split offsets, digital scanlines and small pixel-sort streaks across the character, cyber colours',avoid:'unreadable face'},
 {id:'ink',name:'Ink Wash',motion:'breathe',prompt:'Chinese ink-wash (shuimo) painting: expressive black ink brush strokes of varying wetness, sparse light colour washes, one small red seal-stamp accent',avoid:'heavy colour, digital look'},
 {id:'retro',name:'Retro Illustration',motion:'sway',prompt:'1960s retro print illustration: halftone dot shading, slightly off-register muted warm inks, simple bold shapes',avoid:'modern gradients'},
 {id:'clay',name:'Claymation',motion:'bounce',prompt:'stop-motion claymation figure: soft plasticine material with faint fingerprints, rounded chunky shapes, warm studio lighting',avoid:'glossy plastic, flat 2D'},
 {id:'comic',name:'Comic Pop Art',motion:'wobble',prompt:'American pop-art comic: Ben-Day dots, thick black ink lines, bright primary colours, punchy contrast',avoid:'soft pastel'},
 {id:'kawaii',name:'Kawaii Pastel',motion:'bounce',prompt:'Japanese kawaii illustration: pastel colours, rosy blush cheeks, tiny sparkles around the character, soft rounded shapes',avoid:'dark tones'},
 // hidden: unlocked later by mini-game score/luck, daily cap = 3% of today's users
 {id:'aurora',name:'Aurora Spirit',hidden:true,motion:'shimmer',prompt:'ethereal aurora spirit: translucent glowing northern-lights body, tiny star particles'},
 {id:'stainedglass',name:'Stained Glass',hidden:true,motion:'shimmer',prompt:'gothic stained glass: lead outlines, jewel-tone glass panels, light shining through'},
 {id:'ukiyoe',name:'Ukiyo-e Neon',hidden:true,motion:'sway',prompt:'ukiyo-e woodblock print fused with neon cyberpunk accents'},
 {id:'papercut',name:'Paper Cut Layers',hidden:true,motion:'sway',prompt:'layered paper-cut diorama: stacked coloured paper depth, soft shadows'},
 {id:'hologram',name:'Holo Foil',hidden:true,motion:'shimmer',prompt:'holographic foil: iridescent rainbow chrome sheen, sparkles'},
];
