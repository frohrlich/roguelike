export interface UnitData {
  HP: number;
  MP: number;
  AP: number;
  spells: string;
  frame: number;
  type: string;
  description: string;
}

/** This service contains the data for all available unit types in the game. */
export class UnitService {
  static units: { [key: string]: UnitData } = {
    Amazon: {
      HP: 100,
      MP: 4,
      AP: 6,
      spells: "Deadly javelin, Herbal medicine, Sting",
      frame: 8,
      type: "Amazon",
      description: "A fearsome warrior. Always angry about something.",
    },
    Renegade: {
      HP: 120,
      MP: 4,
      AP: 6,
      spells: "Weighted net, Trident, Punch",
      frame: 84,
      type: "Renegade",
      description: "In his dreams, he's still in the Colosseum.",
    },
    Stranger: {
      HP: 80,
      MP: 4,
      AP: 6,
      spells: "Stargazing, Revelation, Plague",
      frame: 88,
      type: "Stranger",
      description: "...",
    },
    Ghost: {
      HP: 150,
      MP: 6,
      AP: 6,
      spells: "Biting",
      frame: 40,
      type: "Ghost",
      description: "Boo.",
    },
    Pig: {
      HP: 120,
      MP: 5,
      AP: 6,
      spells: "Biting",
      frame: 0,
      type: "Pig",
      description: "Just some pig.",
    },
    Wasp: {
      HP: 100,
      MP: 8,
      AP: 6,
      spells: "Wasp sting",
      frame: 4,
      type: "Wasp",
      description: "A really big wasp.",
    },
    Princess: {
      HP: 50,
      MP: 3,
      AP: 6,
      spells: "Sting",
      frame: 4,
      type: "Princess",
      description: "A typical princess.",
    },
  };
}
