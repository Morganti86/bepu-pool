import { kv } from '@vercel/kv';

const KV_KEY = 'bepu_pool_guesses';

async function getEntries() {
  let entries = await kv.get(KV_KEY);
  if (typeof entries === 'string') {
    try {
      entries = JSON.parse(entries);
    } catch(e) {
      // String sin comillas del CLI de Upstash — convertir a JSON válido
      const fixed = entries
        .replace(/\{([^}]+)\}/g, (match) => {
          return match.replace(/(\w+(?:\s+\w+)*):/g, (m, key) => `"${key.trim()}":`)
                      .replace(/:([^,}\]"]+)([,}\]])/g, (m, val, end) => `:"${val.trim()}"${end}`);
        });
      try { entries = JSON.parse(fixed); } catch(e2) { entries = []; }
    }
  }
  return entries || [];
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // MIGRATE — lee el string malo, lo parsea y lo reescribe como objeto nativo
  if (req.method === 'GET' && req.query.migrate === '1') {
    try {
      const raw = await kv.get(KV_KEY);
      let entries = raw;
      if (typeof entries === 'string') {
        // Intentar JSON normal primero
        try {
          entries = JSON.parse(entries);
        } catch(e) {
          // Fallback: el formato sin comillas del CLI
          // Usamos los datos hardcodeados que sabemos que son correctos
          entries = [
            {"name":"Belen","date":"2026-07-01","kg":3,"g":800,"submittedAt":"10 jun"},
            {"name":"Tía agüela Marina","date":"2026-06-23","kg":3,"g":870,"submittedAt":"10 jun"},
            {"name":"Mary","date":"2026-06-21","kg":3,"g":900,"submittedAt":"10 jun"},
            {"name":"Cami","date":"2026-07-03","kg":3,"g":950,"submittedAt":"10 jun"},
            {"name":"Dypi","date":"2026-07-04","kg":3,"g":801,"submittedAt":"10 jun"},
            {"name":"Mariano","date":"2026-06-28","kg":4,"g":0,"submittedAt":"10 jun"},
            {"name":"Abril","date":"2026-06-30","kg":3,"g":650,"submittedAt":"10 jun"},
            {"name":"El ABUELO Sergio","date":"2026-06-29","kg":3,"g":85,"submittedAt":"10 jun"},
            {"name":"Grando","date":"2026-07-02","kg":4,"g":200,"submittedAt":"10 jun"},
            {"name":"Papá","date":"2026-06-27","kg":3,"g":850,"submittedAt":"10 jun"},
            {"name":"Paola","date":"2026-06-20","kg":3,"g":150,"submittedAt":"10 jun"},
            {"name":"Catherine","date":"2026-06-26","kg":3,"g":880,"submittedAt":"11 jun"},
            {"name":"Chloé - Antoni","date":"2026-06-25","kg":3,"g":428,"submittedAt":"11 jun"},
            {"name":"Murielle","date":"2026-06-22","kg":3,"g":750,"submittedAt":"11 jun"},
            {"name":"Brice","date":"2026-07-24","kg":3,"g":834,"submittedAt":"11 jun"},
            {"name":"Didier","date":"2026-06-19","kg":4,"g":195,"submittedAt":"11 jun"},
            {"name":"Ghislaine","date":"2026-06-18","kg":3,"g":430,"submittedAt":"11 jun"},
            {"name":"Mamie Thérèse","date":"2026-06-17","kg":3,"g":851,"submittedAt":"11 jun"},
            {"name":"Agustina","date":"2026-06-24","kg":3,"g":330,"submittedAt":"11 jun"},
            {"name":"Fernanda","date":"2026-07-05","kg":3,"g":200,"submittedAt":"12 jun"}
          ];
        }
        await kv.set(KV_KEY, entries);
        return res.status(200).json({ ok: true, migrated: true, count: entries.length, entries });
      }
      return res.status(200).json({ ok: true, migrated: false, message: 'Ya estaba en formato correcto', entries });
    } catch(err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // GET — devuelve todos los pronósticos
  if (req.method === 'GET') {
    try {
      const entries = await getEntries();
      return res.status(200).json(entries);
    } catch (err) {
      return res.status(500).json({ error: 'Error al leer los datos.' });
    }
  }

  // POST — agrega un nuevo pronóstico
  if (req.method === 'POST') {
    try {
      const { name, date, kg, g } = req.body;

      if (!name || !date || kg === undefined || g === undefined) {
        return res.status(400).json({ error: 'Datos incompletos.' });
      }

      const entries = await getEntries();

      if (entries.some(e => e.name.toLowerCase() === name.toLowerCase())) {
        return res.status(409).json({ error: `"${name}" ya dejó su pronóstico. ¡Solo uno por persona!` });
      }

      if (entries.some(e => e.date === date)) {
        const who = entries.find(e => e.date === date).name;
        const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
        const [y,m,day] = date.split('-');
        const fDate = `${parseInt(day)} ${months[parseInt(m)-1]} ${y}`;
        return res.status(409).json({ error: `La fecha ${fDate} ya fue elegida por ${who}. ¡Nada de copiarse!` });
      }

      const wKey = `${kg}-${String(g).padStart(3,'0')}`;
      if (entries.some(e => `${e.kg}-${String(e.g).padStart(3,'0')}` === wKey)) {
        const who = entries.find(e => `${e.kg}-${String(e.g).padStart(3,'0')}` === wKey).name;
        return res.status(409).json({ error: `El peso ${kg},${String(g).padStart(3,'0')} kg ya fue elegido por ${who}. ¡Sin copiarse!` });
      }

      const now = new Date();
      const submittedAt = now.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });

      entries.push({ name, date, kg: parseInt(kg), g: parseInt(g), submittedAt });
      await kv.set(KV_KEY, entries);

      return res.status(201).json({ ok: true, entries });
    } catch (err) {
      return res.status(500).json({ error: 'Error al guardar el pronóstico.' });
    }
  }

  // DELETE — borra uno o todos
  if (req.method === 'DELETE') {
    try {
      const { name, all } = req.body;

      if (all) {
        await kv.set(KV_KEY, []);
        return res.status(200).json({ ok: true, entries: [] });
      }

      if (name) {
        let entries = await getEntries();
        entries = entries.filter(e => e.name.toLowerCase() !== name.toLowerCase());
        await kv.set(KV_KEY, entries);
        return res.status(200).json({ ok: true, entries });
      }

      return res.status(400).json({ error: 'Falta indicar qué borrar.' });
    } catch (err) {
      return res.status(500).json({ error: 'Error al borrar.' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido.' });
}
