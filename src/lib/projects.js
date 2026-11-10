// Project data: src/data/projects.json is the single source of truth.
// Image paths in the JSON ("assets/projects/P-004/img1.jpg") point to files in src/assets/projects/,
// which Astro optimizes at build time. 3D files (.mview) live in public/assets/projects/.
import fs from 'node:fs';
import path from 'node:path';
import data from '../data/projects.json';

const images = import.meta.glob('/src/assets/projects/**/*.{jpg,jpeg,png,webp}', {
  eager: true,
  import: 'default',
});

/** Returns the optimizable image for a JSON path, or null if the file is missing. */
export function img(p) {
  if (!p) return null;
  return images['/src/' + p.replace(/^\/+/, '')] ?? null;
}

function bytes(dir, p) {
  try {
    return fs.statSync(path.join(process.cwd(), dir, p)).size;
  } catch {
    return null;
  }
}

function typeLabel(type) {
  const last = (type.split('/').pop() || type).trim().toLowerCase();
  return last.charAt(0).toUpperCase() + last.slice(1);
}

const all = data.projects.map((p) => {
  const gallery = (p.images || [])
    .map((src) => ({ src, image: img(src) }))
    .filter((g) => g.image);
  const keySize = bytes('src', p.thumbnail);
  const modelBytes = p.model3d ? bytes('public', p.model3d) : null;

  return {
    ...p,
    typeLabel: typeLabel(p.type),
    key: img(p.thumbnail) ?? gallery[0]?.image ?? null,
    coverImage: img(p.cover) ?? img(p.thumbnail) ?? gallery[0]?.image ?? null,
    // The thumbnail is shown as key art at the top of the page, so skip its exact duplicate in the gallery.
    gallery: gallery.filter((g) => bytes('src', g.src) !== keySize),
    inspectLit: img(p.inspect?.lit),
    inspectWire: img(p.inspect?.wireframe),
    modelUrl: modelBytes ? '/' + p.model3d : null,
    modelMB: modelBytes ? Math.round(modelBytes / 1048576) : null,
  };
});

/** Projects with at least one image on disk. A project without images (EOTech for now) stays hidden. */
export const projects = all.filter((p) => p.gallery.length > 0 || p.key);

/** Home page hero: the project that has a "hero" image in the JSON, otherwise the most recent one. */
export const heroProject = projects.find((p) => img(p.hero)) ?? projects[0];
export const heroImage = img(heroProject.hero) ?? heroProject.key;
export const heroAlt = heroProject.heroAlt ?? `${heroProject.name}, render`;

export const site = {
  name: 'Valentin Lothe',
  role: 'Game Artist',
  focus: 'Environments & Props',
  email: 'valentin.lothe.art@gmail.com',
  artstation: 'https://www.artstation.com/swiftshepard',
  linkedin: 'https://www.linkedin.com/in/valentin-lothe/',
  cv: '/assets/cv.pdf',
  availability: 'Open to full-time roles and freelance',
};
