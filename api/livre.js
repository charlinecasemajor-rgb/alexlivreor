// GET  /api/livre  → état du livre (messages visibles seulement une fois fermé)
// POST /api/livre  → { nom, message } : ajoute un message (une seule fois par nom)

const config = require("./_config.js");

const URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const CLE = "livre-alex";

async function redis(cmd) {
  const r = await fetch(URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
  });
  const data = await r.json();
  if (!r.ok || data.error) throw new Error(data.error || `Redis ${r.status}`);
  return data.result;
}

async function lireTout() {
  const plat = (await redis(["HGETALL", CLE])) || [];
  const messages = {};
  for (let i = 0; i < plat.length; i += 2) {
    try { messages[plat[i]] = JSON.parse(plat[i + 1]); } catch { /* ignore */ }
  }
  return messages;
}

function etat(messages) {
  const ecrits = config.noms.filter((n) => messages[n]);
  const dateDepassee = config.dateLimite && Date.now() >= new Date(config.dateLimite).getTime();
  const ferme = ecrits.length === config.noms.length || Boolean(dateDepassee);
  return {
    noms: config.noms,
    ecrits,
    ferme,
    dateLimite: config.dateLimite,
    maxCaracteres: config.maxCaracteres,
    // Les messages ne quittent le serveur qu'une fois le livre fermé
    messages: ferme
      ? config.noms.filter((n) => messages[n]).map((n) => ({ nom: n, ...messages[n] }))
      : [],
  };
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!URL || !TOKEN) {
    return res.status(500).json({
      erreur: "La base de données n'est pas branchée. Ajoute Upstash Redis au projet dans Vercel (onglet Storage), puis redéploie.",
    });
  }

  try {
    if (req.method === "GET") {
      return res.status(200).json(etat(await lireTout()));
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      const nom = String(body.nom || "");
      const message = String(body.message || "").trim();

      const avant = etat(await lireTout());
      if (avant.ferme) return res.status(409).json({ erreur: "Le livre est fermé, Alex est en train de le lire." });
      if (!config.noms.includes(nom)) return res.status(400).json({ erreur: "Choisis ton prénom dans la liste." });
      if (message.length < 2) return res.status(400).json({ erreur: "Ton message est vide." });
      if (message.length > config.maxCaracteres) {
        return res.status(400).json({ erreur: `Ton message dépasse ${config.maxCaracteres} caractères.` });
      }

      // HSETNX : n'écrit que si ce prénom n'a pas encore de message
      const ok = await redis(["HSETNX", CLE, nom, JSON.stringify({ message, date: new Date().toISOString() })]);
      if (!ok) return res.status(409).json({ erreur: `${nom} a déjà écrit son message.` });

      return res.status(200).json(etat(await lireTout()));
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ erreur: "Méthode non autorisée." });
  } catch (e) {
    return res.status(500).json({ erreur: "La base de données ne répond pas. Réessaie dans un instant." });
  }
};
