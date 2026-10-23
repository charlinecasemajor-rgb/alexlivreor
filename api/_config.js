// ─────────────────────────────────────────────────────────────
//  RÉGLAGES DU LIVRE D'OR
// ─────────────────────────────────────────────────────────────

module.exports = {
  // Les personnes qui doivent écrire. Le livre se ferme et s'affiche
  // pour Alex dès que tout le monde a écrit.
  noms: [
    "Axel", "Dino", "Lea", "Mathilde", "Marie", "Maxence", "Arnaud",
    "Marc", "Jules", "Kelyan", "Pauline L", "Pauline A", "Charline",
  ],

  // Date limite (optionnelle). Passé cette date, le livre se ferme
  // même s'il manque des messages. Mettre null pour la désactiver.
  // Format : "2026-11-06T18:00:00+01:00"
  dateLimite: "2026-10-23T20:20:00+02:00",

  // Longueur max d'un message
  maxCaracteres: 2000,
};
