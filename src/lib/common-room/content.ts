import type { AssignedHouse, ObjectId } from "./types";

export const roomObjects: { id: ObjectId; label: string; object: string; hint: string }[] = [
  { id: "archives", label: "House Archives", object: "The grand fireplace", hint: "Discover the story behind your colours." },
  { id: "notices", label: "Notice Board", object: "The parchment board", hint: "Letters and news from the festival." },
  { id: "members", label: "House Community", object: "The enchanted bookshelf", hint: "Meet the people who share your house." },
  { id: "profile", label: "Your Belongings", object: "Your travelling chest", hint: "Your identity, kept close." },
  { id: "secret", label: "Hidden Passage", object: "The door without a handle", hint: "Some doors open only to curiosity." },
];
export const houseLore: Record<AssignedHouse, { title: string; location: string; description: string; history: string; riddle: string; answers: string[]; secretMessage: string }> = {
  gryffindor: {
    title: "The Lion’s Hearth", location: "The west tower · Above the clouds",
    description: "A home for brave makers and those who begin before the path is certain. Here, courage is not the absence of doubt; it is the decision to build together anyway.",
    history: "In this imagined tower, generations of restless inventors gathered around the same fire. The sword above the hearth honours conviction, while an empty chair is always kept for the next person willing to try.",
    riddle: "Feed me and I live. Give me a drink and I die. What am I?", answers: ["fire", "a fire", "flame"],
    secretMessage: "The passage remembers every small act of courage. Your next beginning need not be a grand one.",
  },
  slytherin: {
    title: "The Serpent’s Den", location: "Beneath the black lake · The lower dungeons",
    description: "Beyond the green water lies a sanctuary for ambitious thinkers, resourceful builders and quiet strategists. Greatness begins with knowing what matters—and having the resolve to pursue it.",
    history: "This imagined chamber was carved beneath the lake, where the water softens every sound. Its serpents stand for renewal, and its deep windows remind every resident that much of the world remains unseen.",
    riddle: "I speak without a mouth and hear without ears. A whisper wakes me, but I have no body. What am I?", answers: ["echo", "an echo"],
    secretMessage: "The passage remembers the words you choose. Ambition is most powerful when it leaves room for someone else to rise.",
  },
  ravenclaw: {
    title: "The Celestial Observatory", location: "The eastern spire · Where the stars linger",
    description: "A circular refuge for questions without easy answers. Between the books and the constellations, curiosity finds its companions: wit, wisdom and a willingness to be surprised.",
    history: "In this imagined observatory, no bookshelf is considered finished. Scholars once traced their questions among the stars, leaving room in every atlas for discoveries they could not yet name.",
    riddle: "I have cities, but no houses; forests, but no trees; and water, but no fish. What am I?", answers: ["map", "a map"],
    secretMessage: "The passage remembers every question. The wisest map still has an unexplored edge.",
  },
  hufflepuff: {
    title: "The Hearth Garden", location: "Below the sunlit courtyard · The living earth",
    description: "Warm light, patient hands and a place at the table. This is a house for generous collaborators: those who understand that the strongest work grows from trust and care.",
    history: "This imagined garden began with a single cutting passed between friends. Its winding roots now shelter a room where patient work is cherished and every arrival is offered a warm seat.",
    riddle: "The more you take, the more you leave behind. What are they?", answers: ["footsteps", "steps", "footprints"],
    secretMessage: "The passage remembers those who walked beside you. Leave this little corner of the world kinder than you found it.",
  },
};
export const unavailableSources = {
  announcements: { status: "unavailable", message: "No announcement source is connected yet. Published notices will appear here when the organisers provide them." },
  schedule: { status: "unavailable", message: "The official Technika ’27 schedule has not been connected. No dates here should be treated as confirmed." },
  workshops: { status: "unavailable", message: "Workshop information and event updates are awaiting an official source." },
  registrations: { status: "unavailable", message: "Registration records are not connected. This is not a statement that you have no registrations." },
  history: { status: "unavailable", message: "Participation history is not available from the current account service." },
  prefects: { status: "unavailable", message: "House prefect information has not been published." },
  achievements: { status: "unavailable", message: "Public achievements and profile photographs are not provided by the current directory." },
} as const;
