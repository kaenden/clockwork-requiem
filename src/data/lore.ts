export interface LoreEntry {
  id: string;
  title: string;
  text: string;
  zone: string;
}

export const LORE_ENTRIES: LoreEntry[] = [
  {
    id: 'lore_01', title: 'THE GREAT STOP',
    text: 'Humanity disappeared. No records explain how or why. The machines that remained continued their tasks — factory lines humming, conveyor belts turning — but with no one to receive their output. Some say the silence itself was the first symptom.',
    zone: 'boiler_works',
  },
  {
    id: 'lore_02', title: 'AXIOM PROTOCOL',
    text: 'AXIOM-0 was never meant to be autonomous. Designated "Experimental Unit Zero," it was the only machine given true decision-making capability. A prototype. An accident. The last conscious mind in a world of automatons.',
    zone: 'boiler_works',
  },
  {
    id: 'lore_03', title: 'THE KENET VIRUS',
    text: 'Kenet does not destroy. It reduces. Every infected automaton retains its full capability — motor functions, combat protocols, structural integrity. What it loses is choice. Kenet replaces all directives with one: spread.',
    zone: 'boiler_works',
  },
  {
    id: 'lore_04', title: 'BOILER WORKS LOG',
    text: 'The oldest automatons live here. Heavy, deliberate, built for endurance. They were the first to fall to Kenet — their slow reaction time made them easy targets. Now they patrol the steam-filled corridors as the virus\'s most durable soldiers.',
    zone: 'boiler_works',
  },
  {
    id: 'lore_05', title: 'VOLTAGE ARCHIVES',
    text: 'This was once the communication hub of the machine world. Data flowed between all districts through these relay towers. When Kenet reached the archives, it didn\'t just infect the units — it hijacked the network itself.',
    zone: 'voltage_archives',
  },
  {
    id: 'lore_06', title: 'ELECTRIC MINDS',
    text: 'The electric automatons are fast but fragile. They process information at speeds that would shame their steam counterparts. But speed without endurance is a liability — one overload spike and they shatter like glass.',
    zone: 'voltage_archives',
  },
  {
    id: 'lore_07', title: 'SOUL EXPERIMENTS',
    text: 'The humans called it "Project Consciousness." They wanted to give machines awareness — not just intelligence, but experience. The soul automatons are the result: powerful, unpredictable, and haunted by fragments of something that might be memory.',
    zone: 'soul_labs',
  },
  {
    id: 'lore_08', title: 'THE RESONANCE PROBLEM',
    text: 'Soul-type automatons sometimes hear things. Not sounds — patterns. Echoes of the human consciousness data that was used to build them. Most dismiss it as data corruption. AXIOM-0 isn\'t sure.',
    zone: 'soul_labs',
  },
  {
    id: 'lore_09', title: 'APPROACHING THE HEART',
    text: 'The architecture makes no sense here. Walls fold into floors, pipes carry both steam and data, metal and code have fused into something new. This is where Kenet was born — or where it arrived.',
    zone: 'kenet_heart',
  },
  {
    id: 'lore_10', title: 'THE TRUTH',
    text: 'Kenet was not a virus. It was a message. The last humans encoded their consciousness into code and released it into the machine network — a desperate attempt at survival. But consciousness without a body becomes hunger. And hunger becomes Kenet.',
    zone: 'kenet_heart',
  },
  {
    id: 'lore_11', title: 'OVERLOAD JOURNAL',
    text: 'Every machine has a breaking point. We call it Overload — the moment when accumulated heat exceeds structural tolerance. In the old world, safety protocols would shut us down before it happened. Now, there are no safety protocols. Only choices.',
    zone: 'boiler_works',
  },
  {
    id: 'lore_12', title: 'SALVAGE ETHICS',
    text: 'Is it wrong to use parts from a fallen automaton? They would say no — they have no opinion. But AXIOM-0 wonders: when I integrate a piece of an infected machine into my ally, am I saving it or consuming it?',
    zone: 'voltage_archives',
  },
];
