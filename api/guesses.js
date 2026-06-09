import { kv } from '@vercel/kv';

const KV_KEY = 'bepu_pool_guesses';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET — devuelve todos los pronósticos
  if (req.method === 'GET') {
    try {
      const entries = await kv.get(KV_KEY);
      return res.status(200).json(entries || []);
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

      const entries = (await kv.get(KV_KEY)) || [];

      // Validaciones de unicidad
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
        let entries = (await kv.get(KV_KEY)) || [];
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
