import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Feather, ScrollText } from "lucide-react";
import { CoreTeamGallery } from "@/components/core-team-gallery";
import { SoonBadge } from "@/components/coming-soon";
import { Divider, Eyebrow, SnitchArtwork } from "@/components/ornaments";
import { BreadcrumbsSchema } from "@/components/structured-data";
import { createPageMetadata } from "@/lib/seo";
import styles from "@/components/core-team-gallery.module.css";

export const metadata = createPageMetadata("/core");

function FloatingCandle({ className }: { className: string }) {
  return (
    <div className={`${styles.candle} ${className}`} aria-hidden="true">
      <span className={styles.flame} />
      <span className={styles.candleWax} />
    </div>
  );
}

export default function CorePage() {
  return (
    <div className={`inner-page ${styles.page}`}>
      <BreadcrumbsSchema path="/core" />

      <div className={styles.backdrop} aria-hidden="true">
        <Image src="/images/hogwarts.jpg" alt="" fill sizes="100vw" loading="eager" />
        <div className={styles.archLines} />
        <div className={styles.stars}>
          {Array.from({ length: 12 }, (_, index) => (
            <span
              key={index}
              style={{
                left: `${(index * 43 + 9) % 100}%`,
                top: `${(index * 29 + 12) % 85}%`,
                animationDelay: `${index * -0.7}s`,
              }}
            >
              ✦
            </span>
          ))}
        </div>
      </div>

      <div className={`shell ${styles.content}`}>
        <div className={styles.masthead}>
          <Link href="/members" className={styles.backLink}>
            <ArrowLeft size={14} /> Back to the Order
          </Link>
          <span className={styles.archiveMark}>COUNCIL ARCHIVE <i>✦</i> VOL. XXVII</span>
        </div>

        <header className={`inner-hero centered ${styles.hero}`}>
          <Eyebrow className={styles.heroKicker}>Technika ’27 · The core team · BIT Patna</Eyebrow>
          <h1><span>The Order</span><em>of Technika.</em></h1>
          <p className={styles.heroCopy}>
            The keepers, dreamers, and a little mischief behind Technika ’27.
          </p>
          <SoonBadge>Council roster unveiling soon</SoonBadge>
          <FloatingCandle className={styles.candleLeft} />
          <FloatingCandle className={styles.candleLeftSmall} />
          <FloatingCandle className={styles.candleRight} />
          <FloatingCandle className={styles.candleRightSmall} />
          <SnitchArtwork className={styles.heroSnitch} />
          <Divider className={styles.heroDivider} />
        </header>

        <aside className={styles.ministryNote} aria-label="Council announcement">
          <span className={styles.noteIcon}><ScrollText size={23} strokeWidth={1.2} /></span>
          <div>
            <span className={styles.noteKicker}>A note from the Festival Ministry</span>
            <h2>The portraits are ready. Their keepers are still under seal.</h2>
            <p>These enchanted placeholders await the official council’s names, portraits, and stories.</p>
          </div>
          <span className={styles.noteStamp} aria-hidden="true">DECREE<br /><b>XXVII</b></span>
        </aside>

        <CoreTeamGallery />

        <section className={styles.closing} aria-labelledby="council-closing-title">
          <Feather size={26} strokeWidth={1.1} aria-hidden="true" />
          <Eyebrow>Behind every bit of magic</Eyebrow>
          <h2 id="council-closing-title">Many talents. <em>One extraordinary Order.</em></h2>
          <p>Dreamers, organisers, and a little well-managed mischief.<br />Together, they write the next chapter of Technika.</p>
          <Link href="/devs" className={styles.sorcerersLink}>
            Discover the web sorcerers <ArrowUpRight size={15} />
          </Link>
          <span className={styles.signoff}>Mischief, managed together.</span>
        </section>
      </div>
    </div>
  );
}
