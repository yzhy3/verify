import fs from 'node:fs';
import path from 'node:path';

const FILE = path.resolve('data/store.json');
const DEFAULT = { partners: [], settings: { autoAds: true, rotatePresence: true } };

let data;
try {
  data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
} catch {
  data = structuredClone(DEFAULT);
  persist();
}

function persist() {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, FILE);
}

export const store = {
  partners: () => data.partners,
  addPartner(entry) {
    data.partners.push(entry);
    persist();
  },
  removePartner(id) {
    data.partners = data.partners.filter(p => p.id !== id);
    persist();
  },
  get settings() { return data.settings; },
  setSetting(key, value) {
    data.settings[key] = value;
    persist();
  },
};