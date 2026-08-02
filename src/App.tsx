import { Emargement } from "./components/Emargement.js";
import { Engagement } from "./components/Engagement.js";
import { QrDemo } from "./components/QrDemo.js";
import { useMarque } from "./useMarque.js";

const FEATURES = [
  {
    title: "QR signé, infalsifiable",
    body: "Chaque membre porte un QR code unique signé en Ed25519. Son contenu ne peut être ni modifié ni falsifié, et il se vérifie hors-ligne.",
  },
  {
    title: "Pointage en moins d'une seconde",
    body: "À l'entrée, le contrôleur scanne, la fiche et la photo s'affichent, il confirme. La présence est rattachée à l'événement du jour.",
  },
  {
    title: "Hors-ligne par conception",
    body: "Le scan fonctionne sans réseau. Les pointages sont mis en file locale puis synchronisés sans doublon dès le retour du réseau.",
  },
  {
    title: "Temps réel et historique",
    body: "Les tableaux de bord se mettent à jour en quelques secondes. Le parcours de chaque membre est reconstituable et exportable.",
  },
  {
    title: "Données minimisées",
    body: "La photo sert à la vérification visuelle, pas à une reconnaissance automatique. Aucune pièce d'identité n'est archivée.",
  },
  {
    title: "Autonome et portable",
    body: "Base PostgreSQL dédiée, standard et portable. Chaque service externe passe par une passerelle interne, sans verrouillage fournisseur.",
  },
];

const NUMBERS = [
  { value: "10 000+", label: "membres cibles" },
  { value: "< 1 s", label: "scan vers confirmation" },
  { value: "Ed25519", label: "signature du QR" },
  { value: "0", label: "donnée fictive" },
];

export function App(): JSX.Element {
  const marque = useMarque();
  // The external check-in link carries the event id: /?e=<evenement_id>. When
  // present, the whole page becomes the lightweight attendance flow.
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  // Engagement QR: /?engage=<evenement_id> (event id optional). It opens the public
  // "I want to engage" form, distinct from the attendance flow below.
  if (params.has("engage")) {
    return <Engagement evenementId={params.get("engage") || null} />;
  }
  // The external check-in link carries the event id: /?e=<evenement_id>.
  const evenementId = params.get("e");
  if (evenementId) {
    return <Emargement evenementId={evenementId} />;
  }

  return (
    <div className="page">
      <header className="nav">
        <span className="brand">{marque.marque}</span>
        <span className="nav-tag">Présence des membres</span>
      </header>

      <main>
        <section className="hero">
          <p className="eyebrow">Plateforme de présence et de comptage</p>
          <h1>
            Le suivi des présences, <span className="accent">fiable à cent pour cent</span>, même hors-ligne.
          </h1>
          <p className="lede">
            ADSUM remplace les fichiers Excel par une plateforme numérique. Un QR code signé par membre, un scan
            qui fonctionne sans réseau, des statistiques en temps réel pour la direction.
          </p>
          <div className="hero-numbers">
            {NUMBERS.map((n) => (
              <div key={n.label} className="stat">
                <strong>{n.value}</strong>
                <span>{n.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="demo-section" id="demo">
          <div className="section-head">
            <h2>Le QR signé, démontré en direct</h2>
            <p>Émettez un QR, vérifiez sa signature, puis falsifiez un octet et constatez le rejet. Tout se passe dans votre navigateur.</p>
          </div>
          <QrDemo />
        </section>

        <section className="features">
          <div className="section-head">
            <h2>Ce que fait ADSUM</h2>
          </div>
          <div className="grid">
            {FEATURES.map((f) => (
              <article key={f.title} className="card">
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="footer">
        <span>{marque.marque}</span>
        <span>Données réelles, zéro mock. Signature et validation côté serveur.</span>
      </footer>
    </div>
  );
}
