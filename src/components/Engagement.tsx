import { useEffect, useState } from "react";

import { PAYS } from "../countries.js";
import { useMarque } from "../useMarque.js";
import { InfoTip } from "./InfoTip.js";
import { PaysIndicatifCombo } from "./PaysIndicatifCombo.js";

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "https://adsum-api.vercel.app";

type Etat = "saisie" | "envoi" | "succes" | "deja" | "erreur";

// Capitalise the first letter of each name part, keeping hyphens and apostrophes so a
// composed first name such as "Marie-France" or "N'Guessan" reads correctly. Applied on
// blur, never on each keystroke, so it does not fight the person while they type.
function capitaliserPrenom(valeur: string): string {
  return valeur
    .toLocaleLowerCase("fr-FR")
    .replace(/(^|[\s\-'])([\p{L}])/gu, (_m, sep: string, ch: string) => sep + ch.toLocaleUpperCase("fr-FR"));
}

function Brandbar(): JSX.Element {
  const marque = useMarque();
  return (
    <div className="eng-brand">
      <div className="eng-logo">{marque.initiale}</div>
      <div className="eng-brand-text">
        <span className="eng-brand-name">{marque.marque}</span>
        <span className="eng-brand-sub">{marque.organisation}</span>
      </div>
    </div>
  );
}

/**
 * Public "I want to engage" form, opened by scanning the engagement QR at a public
 * event. Rendered on the ADSUM Design System (light theme, blue accent, Space
 * Grotesk / IBM Plex Sans): a white card on a soft light background, a clear
 * hierarchy and a premium form. Very short: e-mail (required), first name, uppercase
 * family name, one phone with a searchable country dialling code. When the QR is tied
 * to an activity, the form shows that activity as a discreet context.
 */
export function Engagement({ evenementId }: { evenementId: string | null }): JSX.Element {
  const marque = useMarque();
  const [email, setEmail] = useState("");
  const [premierPrenom, setPremierPrenom] = useState("");
  const [autresPrenoms, setAutresPrenoms] = useState("");
  const [nom, setNom] = useState("");
  const [indicatif, setIndicatif] = useState("");
  const [telephone, setTelephone] = useState("");
  const [souhaiteTelegram, setSouhaiteTelegram] = useState(false);
  const [etat, setEtat] = useState<Etat>("saisie");
  const [erreur, setErreur] = useState<string | null>(null);
  const [activite, setActivite] = useState<string | null>(null);

  useEffect(() => {
    if (!evenementId) return;
    let cancelled = false;
    void fetch(`${BASE}/api/v1/public/engagement/contexte?evenement_id=${encodeURIComponent(evenementId)}`)
      .then((r) => (r.ok ? r.json() : { titre: null }))
      .then((d: { titre: string | null }) => {
        if (!cancelled) setActivite(d.titre);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [evenementId]);

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!email.includes("@")) {
      setErreur("Veuillez saisir une adresse e-mail valide.");
      return;
    }
    if (telephone.trim() && !indicatif) {
      setErreur("Sélectionnez l'indicatif du pays correspondant à votre numéro.");
      return;
    }
    setEtat("envoi");
    setErreur(null);
    const pays_code = PAYS.find((p) => p.indicatif === indicatif)?.code ?? null;
    const prenoms = [premierPrenom.trim(), autresPrenoms.trim()].filter(Boolean).join(" ");
    try {
      const res = await fetch(`${BASE}/api/v1/public/engagement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          prenoms: prenoms || null,
          nom: nom.trim().toUpperCase() || null,
          telephone: telephone.trim() ? `${indicatif} ${telephone.trim()}`.trim() : null,
          pays_indicatif: indicatif || null,
          pays_code,
          evenement_id: evenementId,
          souhaite_telegram: souhaiteTelegram,
        }),
      });
      if (res.status === 201) setEtat("succes");
      else if (res.status === 409) setEtat("deja");
      else {
        setEtat("erreur");
        setErreur("Envoi impossible pour le moment. Veuillez réessayer dans un instant.");
      }
    } catch {
      setEtat("erreur");
      setErreur("Connexion au serveur impossible. Vérifiez votre réseau.");
    }
  }

  if (etat === "succes" || etat === "deja") {
    return (
      <div className="eng-shell">
        <div className="eng-card eng-done">
          <Brandbar />
          <div className="eng-done-icon" aria-hidden="true">✓</div>
          <h1 className="eng-title">{etat === "deja" ? "Vous êtes déjà enregistré" : "Merci pour votre engagement"}</h1>
          <p className="eng-intro" style={{ textAlign: "center" }}>
            {etat === "deja"
              ? "Cette adresse e-mail a déjà exprimé le souhait de s'engager. Nous reviendrons vers vous très prochainement."
              : `Merci d'avoir fait ce beau choix et d'avoir exprimé votre souhait de vous engager au sein de ${marque.organisation}. Votre demande a bien été reçue ; un membre de l'équipe vous recontactera avec les prochaines étapes.`}
          </p>
          <p className="eng-sign">Bien fraternellement, l&apos;équipe de {marque.organisation}</p>
        </div>
      </div>
    );
  }

  const busy = etat === "envoi";

  return (
    <div className="eng-shell">
      <form className="eng-card" onSubmit={submit}>
        <Brandbar />
        <div className="eng-head">
          <h1 className="eng-title">Je souhaite m'engager</h1>
          <p className="eng-intro">
            Laissez vos coordonnées pour rejoindre {marque.organisation}. Un membre de l&apos;équipe vous
            recontactera avec les prochaines étapes.
          </p>
          {activite && (
            <span className="eng-context">
              <span className="eng-context-dot" aria-hidden="true" />
              Dans le cadre de : {activite}
            </span>
          )}
        </div>

        <div className="eng-form">
          <label className="eng-field">
            <span>Adresse e-mail *</span>
            <input className="eng-input" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" required />
          </label>
          <div className="eng-row">
            <label className="eng-field">
              <span>
                Premier prénom
                <InfoTip text="Votre prénom principal. Un prénom composé, par exemple Marie-France, s'écrit avec un trait d'union et compte pour un seul prénom." />
              </span>
              <input
                className="eng-input"
                autoComplete="given-name"
                value={premierPrenom}
                onChange={(e) => setPremierPrenom(e.target.value)}
                onBlur={() => setPremierPrenom((v) => capitaliserPrenom(v.trim()))}
                placeholder="Par exemple Jean"
              />
            </label>
            <label className="eng-field">
              <span>Nom de famille</span>
              <input
                className="eng-input"
                autoComplete="family-name"
                value={nom}
                onChange={(e) => setNom(e.target.value.toUpperCase())}
                placeholder="NOM"
                style={{ textTransform: "uppercase" }}
              />
            </label>
          </div>
          <label className="eng-field">
            <span>
              Autres prénoms et compléments
              <InfoTip text="Vos éventuels autres prénoms, séparés par un espace. Laissez vide si vous n'en avez qu'un. Facultatif." />
            </span>
            <input
              className="eng-input"
              value={autresPrenoms}
              onChange={(e) => setAutresPrenoms(e.target.value)}
              onBlur={() => setAutresPrenoms((v) => capitaliserPrenom(v.trim()))}
              placeholder="Facultatif"
            />
          </label>
          <label className="eng-field">
            <span>Indicatif du pays{telephone.trim() ? " *" : ""}</span>
            <PaysIndicatifCombo indicatif={indicatif} onChange={setIndicatif} placeholder="Sélectionnez le pays et l'indicatif" />
          </label>
          <label className="eng-field">
            <span>Téléphone</span>
            <input className="eng-input" type="tel" inputMode="tel" autoComplete="tel-national" value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="Numéro sans l'indicatif" />
          </label>

          <label className="eng-check">
            <input type="checkbox" checked={souhaiteTelegram} onChange={(e) => setSouhaiteTelegram(e.target.checked)} />
            <span>Je souhaite aussi être tenu informé via Telegram (facultatif).</span>
          </label>

          {erreur && <p className="eng-error">{erreur}</p>}
          <button type="submit" className="eng-cta" disabled={busy || !email}>
            {busy ? "Envoi en cours..." : "Valider mon engagement"}
          </button>
          <p className="eng-note">Vos données servent uniquement à vous recontacter. Elles ne sont jamais partagées.</p>
        </div>
      </form>
    </div>
  );
}
