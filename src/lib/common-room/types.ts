import type { House } from "@/lib/houses";

export type AssignedHouse = Exclude<House, "default">;
export type RoomParticipant = {
  id: string;
  displayName: string;
  email: string;
  college: string | null;
  house: AssignedHouse;
};
export type RoomAccess =
  | { status: "ready"; participant: RoomParticipant }
  | { status: "signed-out" }
  | { status: "unassigned"; displayName: string }
  | { status: "unavailable" };

export type ObjectId = "archives" | "notices" | "members" | "profile" | "secret";
export type RoomMember = { name: string; house: AssignedHouse };
export type MembersResult =
  | { status: "ready"; house: AssignedHouse; members: RoomMember[]; nextPage: number | null }
  | { status: "unavailable"; message: string };
