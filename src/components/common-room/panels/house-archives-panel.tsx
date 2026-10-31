import Image from "next/image";
import { houseLogoFor, houseThemes } from "@/lib/houses";
import { houseLore, unavailableSources } from "@/lib/common-room/content";
import type { AssignedHouse } from "@/lib/common-room/types";
import styles from "../common-room.module.css";

export function HouseArchivesPanel({ house }: { house: AssignedHouse }) {
  const theme = houseThemes[house];
  const lore = houseLore[house];
  return <article>
    <Image className={styles.crest} src={houseLogoFor(house)} width={84} height={104} alt={`${theme.name} emblem`} />
    <p className={styles.motto}>“{theme.motto}”</p>
    <h3>{theme.name}</h3><p>{lore.description}</p>
    <ul className={styles.values}>{theme.quality.split(" · ").map((value) => <li key={value}>{value}</li>)}</ul>
    <h3>A room with a story</h3><p>{lore.history}</p><small>Original fictional room lore, inspired by the wizarding houses.</small>
    <div className={styles.notice}><h4>The house prefects</h4><p>{unavailableSources.prefects.message}</p></div>
  </article>;
}
