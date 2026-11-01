import { Hero } from "@/components/hero";
// import { Timeline } from "@/components/timeline";
import { About, Campus, Sponsors, Invitation } from "@/components/home-sections";
import { createPageMetadata } from "@/lib/seo";
import { RelicsSection } from "@/components/relics-section";

export const metadata = createPageMetadata("/");

export default function Home() {
  return <><Hero /><RelicsSection /><About /><Campus /><Sponsors /><Invitation /></>;
}
