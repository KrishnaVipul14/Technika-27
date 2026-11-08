import { createPageMetadata } from "@/lib/seo";
import { BreadcrumbsSchema } from "@/components/structured-data";
import Image from "next/image";
import { Droplets, LockKeyhole } from "lucide-react";
import { BackLink } from "@/components/coming-soon";
import { AlumniRegistry } from "@/components/alumni-registry";
import styles from "@/components/alumni-registry.module.css";
import { Divider, Eyebrow } from "@/components/ornaments";
import { Reveal } from "@/components/reveal";

export const metadata = createPageMetadata("/alumni");

const memories = [
  { title: "The Goblet of Silicon", type: "Ingenuity preserved", description: "The late nights. The first working prototype. The cheers that made it all worthwhile.", image: 1, color: "blue" },
  { title: "The Celestial Foundry", type: "Possibility remembered", description: "Ideas that took flight. Friendships that found their orbit. A little brilliance that never faded.", image: 2, color: "gold" },
  { title: "The Alchemical Spark", type: "Creativity immortalised", description: "The experiments, the breakthroughs, and the people who made every moment extraordinary.", image: 3, color: "crimson" },
];

export default function AlumniPage() {
  return <div className={`inner-page ${styles.page}`}><BreadcrumbsSchema path="/alumni" /><AlumniRegistry /><div className={`shell ${styles.archive}`}>
    <section id="memories" className="memories-section"><Reveal className="section-heading-row"><div><Eyebrow>Pensieve archives</Eyebrow><h2>Some memories <em>never lose their magic.</em></h2></div><p>A glimpse into our enchanted archive.<br />The real stories will be unveiled soon.</p></Reveal><div className="memory-grid">{memories.map((memory, i) => <Reveal key={memory.title} delay={i * .1}><article className={`memory-card accent-${memory.color}`}><div className="memory-image"><Image src={`/images/memory-${memory.image}.webp`} fill sizes="(max-width: 768px) 100vw, 33vw" alt={memory.title === "The Goblet of Silicon" ? "An enchanted blue chalice in a Gothic library" : memory.title === "The Celestial Foundry" ? "Golden celestial astrolabes in a vaulted observatory" : "Glowing potions and an ancient cauldron in an alchemy workshop"} /><span><Droplets size={11} /> MEMORY VIAL 0{i + 1}</span></div><div className="memory-copy"><span>{memory.type}</span><h3>{memory.title}</h3><p>{memory.description}</p><small><LockKeyhole size={11} />Archive sealed · coming soon</small></div></article></Reveal>)}</div></section>
    <Reveal className={`alumni-ledger parchment-sheet ${styles.legacyLedger}`}><span className="ledger-star">✧</span><Eyebrow>The tome of everlasting kinship</Eyebrow><h2>Old friends.<br /><em>New chapters.</em></h2><p>Alumni reunions, mentorship opportunities, and a celebration of the people who helped write the Technika story are being prepared. Your chapter is far from over.</p><Divider /><BackLink /><span className="coffee-ring" aria-hidden="true"/></Reveal>
  </div></div>;
}
