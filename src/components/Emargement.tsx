import { useEffect, useState } from "react";

import {
  ApiError,
  type EventCard,
  type Identite,
  emarger,
  getEventCard,
  identifier,
} from "../emargement.js";
import { PaysIndicatifCombo } from "./PaysIndicatifCombo.js";

type Etape = "accueil" | "identite" | "questionnaire" | "confirme";

function formatDate(iso: string | null): { jour: string; heure: string } | null {
  if (!iso) return null;
  const d = new Date(iso);
  return {
    jour: d.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" }),
    heure: d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
  };
}

// Human country label for the viewer's time zone, so times read as "heure de
// France", never a UTC offset that people re-add by mistake.
const PAYS_PAR_ZONE: Record<string, string> = {
  "Africa/Abidjan": "Côte d'Ivoire", "Europe/Paris": "France", "America/New_York": "États-Unis (Est)",
  "America/Chicago": "États-Unis (Centre)", "America/Los_Angeles": "États-Unis (Ouest)",
  "America/Toronto": "Canada", "America/Montreal": "Canada", "Europe/London": "Royaume-Uni",
  "Europe/Brussels": "Belgique", "Europe/Zurich": "Suisse", "Europe/Madrid": "Espagne",
  "Europe/Rome": "Italie", "Europe/Berlin": "Allemagne", "Africa/Dakar": "Sénégal",
  "Africa/Accra": "Ghana", "Africa/Lagos": "Nigéria", "Africa/Douala": "Cameroun",
  "Africa/Libreville": "Gabon", "Africa/Cotonou": "Bénin", "Africa/Lome": "Togo",
  "Africa/Niamey": "Niger", "Africa/Ouagadougou": "Burkina Faso", "Africa/Bamako": "Mali",
  "Africa/Conakry": "Guinée", "Africa/Kinshasa": "RD Congo", "Africa/Casablanca": "Maroc",
  "Africa/Nairobi": "Kenya", "Africa/Johannesburg": "Afrique du Sud",
};

// A member matricule is ADS-XX-NNNNNN-Y (3-letter prefix, 2 letters, 6 digits, 1
// letter). Members should only have to type the characters; the dashes are inserted
// as they go, so a valid code is never rejected for a missing or misplaced dash.
// Works for paste too (existing dashes/spaces are stripped, then re-inserted).
function formatMatricule(raw: string): string {
  const s = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  let out = s.slice(0, 3);
  if (s.length > 3) out += "-" + s.slice(3, 5);
  if (s.length > 5) out += "-" + s.slice(5, 11);
  if (s.length > 11) out += "-" + s.slice(11, 12);
  return out;
}

function paysLocal(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return "";
    return PAYS_PAR_ZONE[tz] ?? tz.split("/").pop()?.replace(/_/g, " ") ?? "";
  } catch {
    return "";
  }
}

function BrandBar(): JSX.Element {
  return (
    <header className="em-brandbar">
      <div className="em-logo">A</div>
      <div className="em-brandtext">
        <span className="em-b1">ADSUM</span>
        <span className="em-b2">Sacerdoce Royal</span>
      </div>
    </header>
  );
}

export function Emargement({ evenementId }: { evenementId: string }): JSX.Element {
  const [event, setEvent] = useState<EventCard | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreurEvent, setErreurEvent] = useState<string | null>(null);

  useEffect(() => {
    let vivant = true;
    getEventCard(evenementId)
      .then((e) => vivant && setEvent(e))
      .catch((e: unknown) => vivant && setErreurEvent(e instanceof ApiError ? e.message : "Lien indisponible."))
      .finally(() => vivant && setChargement(false));
    return () => {
      vivant = false;
    };
  }, [evenementId]);

  return (
    <div className="emargement">
      <BrandBar />
      <main className="em-main">
        {chargement && <p className="em-muted em-center">Chargement...</p>}
        {!chargement && erreurEvent && (
          <div className="em-card em-pad">
            <h1 className="em-h1">Lien indisponible</h1>
            <p className="em-muted">{erreurEvent}</p>
          </div>
        )}
        {!chargement && event && <Flux event={event} evenementId={evenementId} />}
      </main>
      <footer className="em-footer">
        Sondage de présence <strong>ADSUM</strong>, Sacerdoce Royal. Un seul enregistrement par personne et par activité, tous canaux confondus.
      </footer>
    </div>
  );
}

function Flux({ event, evenementId }: { event: EventCard; evenementId: string }): JSX.Element {
  const [etape, setEtape] = useState<Etape>("accueil");
  const [identite, setIdentite] = useState<Identite | null>(null);
  const [statutFinal, setStatutFinal] = useState<string | null>(null);
  const [modaliteFinale, setModaliteFinale] = useState<string | null>(null);

  const debut = formatDate(event.debut);
  const fin = formatDate(event.fin);
  const pays = paysLocal();

  function onIdentifie(id: Identite): void {
    setIdentite(id);
    if (id.deja_enregistre) {
      setStatutFinal(id.statut);
      setEtape("confirme");
    } else {
      setEtape("questionnaire");
    }
  }

  if (etape === "confirme") {
    return (
      <div className="em-card em-pad">
        <Confirmation identite={identite} statut={statutFinal} modalite={modaliteFinale} dejaAvant={identite?.deja_enregistre ?? false} titre={event.titre} />
      </div>
    );
  }

  if (etape === "identite") {
    return (
      <div className="em-card em-pad">
        <button type="button" className="em-back" onClick={() => setEtape("accueil")}>&larr; Retour</button>
        <Identification evenementId={evenementId} onIdentifie={onIdentifie} />
      </div>
    );
  }

  if (etape === "questionnaire" && identite) {
    return (
      <div className="em-card em-pad">
        <Questionnaire
          evenementId={evenementId}
          identite={identite}
          titre={event.titre}
          onEmarge={(statut, modalite) => {
            setStatutFinal(statut);
            setModaliteFinale(modalite);
            setEtape("confirme");
          }}
        />
      </div>
    );
  }

  return (
    <div className="em-card">
      <div className="em-hero">
        {/* Only the survey STATUS is shown here. The activity mode (in person /
            online) is intentionally NOT displayed: this survey is for everyone,
            whatever their mode, and a mode badge made members think it was
            reserved to one audience. The member states their own mode inside the
            form itself. */}
        <div className="em-badges">
          <span className={`em-badge ${event.cloture ? "em-badge-off" : event.ouvert ? "em-badge-on" : ""}`}>
            <span className="em-dot" /> {event.cloture ? "Sondage clôturé" : event.ouvert ? "Sondage ouvert" : "Pas encore ouvert"}
          </span>
        </div>
        <h1 className="em-title">{event.titre}</h1>
      </div>

      <div className="em-info">
        {debut && (
          <div className="em-info-card">
            <span className="em-info-label">Début</span>
            <span className="em-info-value">{debut.jour}</span>
            <span className="em-info-time">{debut.heure}</span>
            {pays && <span className="em-info-tz">à votre heure, {pays}</span>}
          </div>
        )}
        {fin && (
          <div className="em-info-card">
            <span className="em-info-label">Fin</span>
            <span className="em-info-value">{fin.jour}</span>
            <span className="em-info-time">{fin.heure}</span>
          </div>
        )}
      </div>
      {event.lieu && (
        <div className="em-info-lieu">
          <span className="em-info-label">Lieu</span>
          <span className="em-info-value">{event.lieu}</span>
        </div>
      )}

      <div className="em-pad-btn">
        {event.cloture ? (
          <p className="em-banner em-banner-info">Le sondage de présence de cette activité est clôturé.</p>
        ) : !event.ouvert ? (
          <p className="em-banner em-banner-info">Le sondage de présence ouvrira au début de l&apos;activité.</p>
        ) : (
          <>
            <button type="button" className="em-cta" onClick={() => setEtape("identite")}>
              Participer au sondage de présence
            </button>
            <p className="em-hint">Identifiez-vous, puis indiquez votre présence. Rien n&apos;est enregistré tant que vous n&apos;avez pas validé.</p>
          </>
        )}
      </div>
    </div>
  );
}

function Identification({
  evenementId,
  onIdentifie,
}: {
  evenementId: string;
  onIdentifie: (id: Identite) => void;
}): JSX.Element {
  const [mode, setMode] = useState<"choix" | "matricule" | "code_membre" | "telephone">("choix");
  const [matricule, setMatricule] = useState("");
  const [codeMembre, setCodeMembre] = useState("");
  const [indicatif, setIndicatif] = useState("+225");
  const [telephone, setTelephone] = useState("");
  const [nom, setNom] = useState("");
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function soumettre(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setErreur(null);
    if (mode === "matricule") {
      if (!matricule.trim()) {
        setErreur("Saisissez votre matricule.");
        return;
      }
    } else if (mode === "code_membre") {
      if (!codeMembre.trim()) {
        setErreur("Saisissez votre code membre.");
        return;
      }
    } else if (!telephone.trim() || !nom.trim()) {
      setErreur("Indiquez votre numéro et votre nom de famille.");
      return;
    }
    setBusy(true);
    try {
      let id;
      if (mode === "matricule") id = await identifier(evenementId, { matricule: matricule.trim() });
      else if (mode === "code_membre") id = await identifier(evenementId, { code_membre: codeMembre.trim() });
      else id = await identifier(evenementId, { indicatif: indicatif.trim(), telephone: telephone.trim(), nom: nom.trim() });
      onIdentifie(id);
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : "Erreur réseau.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="em-form" onSubmit={soumettre}>
      {mode === "choix" && (
        <>
          <h2 className="em-h2">Identifiez-vous</h2>
          <p className="em-muted em-center">Choisissez votre méthode d&apos;identification pour marquer votre présence.</p>
          <button type="button" className="em-choice-cta" onClick={() => { setMode("matricule"); setErreur(null); }}>
            <span className="em-choice-cta-t">Avec mon matricule ADSUM</span>
            <span className="em-choice-cta-s">Le code ADS-…-…-… de cette application</span>
          </button>
          <button type="button" className="em-choice-cta" onClick={() => { setMode("code_membre"); setErreur(null); }}>
            <span className="em-choice-cta-t">Avec mon code membre</span>
            <span className="em-choice-cta-s">Le code qui vous a été attribué dans l&apos;organisation</span>
          </button>
          <button type="button" className="em-link" onClick={() => { setMode("telephone"); setErreur(null); }}>
            Je ne connais aucun des deux : utiliser mon numéro de téléphone
          </button>
        </>
      )}
      {mode === "matricule" && (
        <>
          <button type="button" className="em-back" onClick={() => { setMode("choix"); setErreur(null); }}>&larr; Changer de méthode</button>
          <h2 className="em-h2">Avec mon matricule ADSUM</h2>
          <p className="em-muted em-center">
            Saisissez le matricule membre qui vous a été attribué et communiqué. Si vous ne l&apos;avez pas,
            rapprochez-vous d&apos;un berger.
          </p>
          <label className="em-field">
            <span>Matricule ADSUM</span>
            <input
              value={matricule}
              onChange={(e) => setMatricule(formatMatricule(e.target.value))}
              placeholder="ADS-AM-000123-Q"
              inputMode="text"
              autoComplete="off"
              maxLength={15}
              style={{ textTransform: "uppercase" }}
            />
          </label>
          {erreur && <p className="em-banner em-banner-ko">{erreur}</p>}
          <button type="submit" className="em-cta" disabled={busy}>
            {busy ? "Vérification..." : "Continuer"}
          </button>
        </>
      )}
      {mode === "code_membre" && (
        <>
          <button type="button" className="em-back" onClick={() => { setMode("choix"); setErreur(null); }}>&larr; Changer de méthode</button>
          <h2 className="em-h2">Avec mon code membre</h2>
          <p className="em-muted em-center">
            Saisissez votre code membre. Il est distinct du matricule de cette application.
          </p>
          <label className="em-field">
            <span>Code membre</span>
            <input
              value={codeMembre}
              onChange={(e) => setCodeMembre(e.target.value.toUpperCase())}
              placeholder="Votre code membre"
              autoComplete="off"
              style={{ textTransform: "uppercase" }}
            />
          </label>
          {erreur && <p className="em-banner em-banner-ko">{erreur}</p>}
          <button type="submit" className="em-cta" disabled={busy}>
            {busy ? "Vérification..." : "Continuer"}
          </button>
        </>
      )}
      {mode === "telephone" && (
        <>
          <button type="button" className="em-back" onClick={() => { setMode("choix"); setErreur(null); }}>&larr; Changer de méthode</button>
          <h2 className="em-h2">Avec mon numéro de téléphone</h2>
          <p className="em-muted em-center">Sélectionnez votre pays, puis saisissez votre numéro et votre nom de famille.</p>
          <label className="em-field">
            <span>Pays (indicatif)</span>
            <PaysIndicatifCombo indicatif={indicatif} onChange={setIndicatif} />
          </label>
          <label className="em-field">
            <span>Numéro de téléphone</span>
            <input value={telephone} onChange={(e) => setTelephone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="06 12 34 56 78" />
          </label>
          <label className="em-field">
            <span>Nom de famille</span>
            <input
              value={nom}
              onChange={(e) => setNom(e.target.value.toUpperCase())}
              autoComplete="family-name"
              placeholder="VOTRE NOM"
              style={{ textTransform: "uppercase" }}
            />
          </label>
          {erreur && <p className="em-banner em-banner-ko">{erreur}</p>}
          <button type="submit" className="em-cta" disabled={busy}>
            {busy ? "Vérification..." : "Continuer"}
          </button>
        </>
      )}
    </form>
  );
}

function Questionnaire({
  evenementId,
  identite,
  titre,
  onEmarge,
}: {
  evenementId: string;
  identite: Identite;
  titre: string;
  onEmarge: (statut: string, modalite: string | null) => void;
}): JSX.Element {
  const [statut, setStatut] = useState("present");
  const [modalite, setModalite] = useState("presentiel");
  const [avis, setAvis] = useState("");
  const [note, setNote] = useState(0);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const nomAffiche = [identite.prenom, identite.nom].filter(Boolean).join(" ");

  async function soumettre(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setErreur(null);
    try {
      const finalModalite = statut === "absent" ? null : modalite;
      const res = await emarger(evenementId, {
        token: identite.token,
        statut,
        modalite: finalModalite,
        avis: avis.trim() || null,
        note: note > 0 ? note : null,
      });
      onEmarge(res.statut, res.modalite ?? finalModalite);
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : "Erreur réseau.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="em-form" onSubmit={soumettre}>
      <div className="em-ident">
        <span className="em-ident-check" aria-hidden="true">✓</span>
        <div>
          <div className="em-ident-nom">{nomAffiche}</div>
          <p className="em-recognized">Nous vous avons reconnu - {identite.matricule}</p>
        </div>
      </div>
      <p className="em-step-note">Activité « {titre} ». Indiquez votre présence, puis validez au bas de l&apos;écran.</p>

      <fieldset className="em-fieldset">
        <legend>Avez-vous participé à cette activité ?</legend>
        <div className="em-choices">
          {[
            ["present", "Oui, présent"],
            ["partiel", "En partie"],
            ["absent", "Non, absent"],
          ].map(([v, l]) => (
            <label key={v} className={`em-choice ${statut === v ? "em-choice-on" : ""}`}>
              <input type="radio" name="statut" value={v} checked={statut === v} onChange={() => setStatut(v as string)} />
              {l}
            </label>
          ))}
        </div>
      </fieldset>
      {statut !== "absent" && (
        <fieldset className="em-fieldset">
          <legend>Comment avez-vous suivi l&apos;activité ?</legend>
          <div className="em-choices">
            {[
              ["presentiel", "J'étais sur place"],
              ["en_ligne", "J'ai suivi en ligne"],
            ].map(([v, l]) => (
              <label key={v} className={`em-choice ${modalite === v ? "em-choice-on" : ""}`}>
                <input type="radio" name="modalite" value={v} checked={modalite === v} onChange={() => setModalite(v as string)} />
                {l}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <p style={{ fontSize: 12, color: "#1c6b3f", background: "#e6f3ec", border: "1px solid #bfe0cd", borderRadius: 9, padding: "8px 10px", margin: "4px 0 10px", lineHeight: 1.5 }}>
        🔒 Votre note et votre commentaire sont <strong>anonymes</strong>. Votre présence peut être enregistrée, mais votre évaluation n&apos;est reliée à personne : ni l&apos;administration, ni les responsables ne peuvent savoir que c&apos;est vous.
      </p>
      <label className="em-field">
        <span>Un mot (facultatif)</span>
        <textarea value={avis} onChange={(e) => setAvis(e.target.value)} rows={2} maxLength={2000} placeholder="Votre ressenti sur l'activité..." />
      </label>
      <div className="em-field">
        <span>Note (facultatif)</span>
        <div className="em-notes">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={`em-note ${note >= n ? "em-note-on" : ""}`}
              onClick={() => setNote(note === n ? 0 : n)}
              aria-label={`${n} sur 5`}
            >
              ★
            </button>
          ))}
        </div>
      </div>
      {erreur && <p className="em-banner em-banner-ko">{erreur}</p>}
      <button type="submit" className="em-cta" disabled={busy}>
        {busy ? "Enregistrement..." : "Valider ma participation"}
      </button>
      <p className="em-hint">C&apos;est cette validation qui enregistre votre présence. Tant que vous ne validez pas, rien n&apos;est pris en compte.</p>
    </form>
  );
}

function Confirmation({
  identite,
  statut,
  modalite,
  dejaAvant,
  titre,
}: {
  identite: Identite | null;
  statut: string | null;
  modalite: string | null;
  dejaAvant: boolean;
  titre: string;
}): JSX.Element {
  const statutLabel = statut === "absent" ? "Absent" : statut === "partiel" ? "Présence partielle" : "Présent";
  const modaliteLabel =
    statut === "absent" ? null : modalite === "en_ligne" ? "En ligne" : modalite === "presentiel" ? "Sur place" : null;
  const titrePrincipal = dejaAvant ? "Présence déjà enregistrée" : "Présence enregistrée, merci";
  return (
    <div className="em-done">
      <div className={`em-done-icon ${dejaAvant ? "em-done-info" : "em-done-ok"}`} aria-hidden="true">
        {dejaAvant ? "i" : "✓"}
      </div>
      <h2 className="em-h2">{titrePrincipal}</h2>
      <p className="em-muted em-center">
        {dejaAvant
          ? "Votre participation à cette activité a déjà été prise en compte. Aucune nouvelle validation n'est nécessaire."
          : "Votre participation est bien prise en compte. Que le Seigneur vous garde."}
      </p>
      <div className="em-recap">
        <div className="em-recap-row"><span>Activité</span><span>{titre}</span></div>
        {identite && <div className="em-recap-row"><span>Membre</span><span>{[identite.prenom, identite.nom].filter(Boolean).join(" ")}</span></div>}
        {identite && <div className="em-recap-row"><span>Matricule</span><span>{identite.matricule}</span></div>}
        <div className="em-recap-row"><span>Statut</span><span>{statutLabel}{modaliteLabel ? ` - ${modaliteLabel}` : ""}</span></div>
      </div>
      <p className="em-muted em-center" style={{ fontSize: 12 }}>
        Un seul enregistrement par personne et par activité, tous canaux confondus (espace membre, Telegram, e-mail, lien).
      </p>
    </div>
  );
}
