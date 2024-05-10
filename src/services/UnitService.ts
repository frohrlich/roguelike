export interface UnitData {
  HP: number;
  MP: number;
  AP: number;
  spells: string;
  frame: number;
  type: string;
  description: string;
  isPlayable?: boolean;
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
      isPlayable: true,
    },
    Renegade: {
      HP: 120,
      MP: 4,
      AP: 6,
      spells: "Weighted net, Trident, Punch",
      frame: 84,
      type: "Renegade",
      description: "In his dreams, he's still in the Colosseum.",
      isPlayable: true,
    },
    Stranger: {
      HP: 80,
      MP: 4,
      AP: 6,
      spells: "Stargazing, Revelation, Plague",
      frame: 88,
      type: "Stranger",
      description: "...",
      isPlayable: true,
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
    Archer: {
      HP: 100,
      MP: 4,
      AP: 6,
      spells: "Light arrow, Heavy arrow, Poisoned arrow",
      frame: 36,
      type: "Archer",
      description: "An elusive one, for sure.",
      isPlayable: true,
    },
    Dog: {
      HP: 100,
      MP: 6,
      AP: 6,
      spells: "Bone, Bite, Cheering",
      frame: 120,
      type: "Dog",
      description: "That's a dog.",
      isPlayable: true,
    },
  };

  static remainingUnits: { [key: string]: UnitData } = Object.fromEntries(
    Object.entries(this.units).filter(([key, value]) => value.isPlayable)
  );
}
