import { EventTalk } from "@rtc/packages";

export type RoomEvents = {
  talk: [EventTalk["talking"]];
};
