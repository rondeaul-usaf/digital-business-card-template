import { EMPTY_CARD } from './render.js';

// Sample cards created the first time the app starts. Edit them in /admin/, or delete them.
// Everything here is placeholder text; your real details live only in your own Cloudflare storage.
export function workSeed() {
  return {
    ...EMPTY_CARD(),
    slug: 'work', label: 'Work', published: true,
    name: 'Alex Example', title: 'Your job title', department: 'Your department',
    company: 'Example Company', location: 'City, State',
    bio: 'Replace this with a sentence or two about what you do.',
    phones: [{ label: 'Work', value: '+1 (555) 010-0100', show: true, inVcard: true }],
    emails: [{ label: 'Work', value: 'alex@example.com', show: true, inVcard: true }],
    links: [
      { label: 'Website', url: 'https://example.com', icon: 'globe', show: true, inVcard: true },
      { label: 'LinkedIn', url: 'https://www.linkedin.com/in/your-profile', icon: 'linkedin', show: true, inVcard: true },
    ],
    sections: [{
      v: 2, id: 'highlights', title: 'Highlights', layout: 'list', show: true, text: '', url: '', image: '', fields: [],
      items: [{ label: 'Sample item', text: 'Add credentials, projects, or anything else.', url: '', image: '', fields: [] }],
    }],
    theme: { accent: '#0176D3', accent2: '#032D60', cloud: '#00A1E0', mode: 'light' },
    banner: { type: 'preset', preset: 'sky', image: '' },
  };
}

export function personalSeed() {
  return {
    ...EMPTY_CARD(),
    slug: 'personal', label: 'Personal', published: true,
    name: 'Alex Example', title: 'Short tagline', department: '', company: '',
    location: 'City, State',
    phones: [{ label: 'Mobile', value: '+1 (555) 010-0101', show: true, inVcard: true }],
    emails: [{ label: 'Personal', value: 'alex.personal@example.com', show: true, inVcard: true }],
    links: [{ label: 'Website', url: 'https://example.com', icon: 'globe', show: true, inVcard: true }],
    sections: [],
    theme: { accent: '#1E40AF', accent2: '#0A1F5C', cloud: '#4F7DF3', mode: 'light' },
    banner: { type: 'preset', preset: 'royal', image: '' },
  };
}

export const SEEDS = [workSeed, personalSeed];
export const LEGACY_SEEDED = [];
