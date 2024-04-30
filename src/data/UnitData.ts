// this file contains the data for all available unit types in the game

export interface UnitData {
  HP: number;
  MP: number;
  AP: number;
  spells: string;
  frame: number;
  type: string;
  description: string;
}

export const amazon: UnitData = {
  HP: 100,
  MP: 5,
  AP: 6,
  spells: "Deadly javelin, Herbal medicine, Sting",
  frame: 8,
  type: "Amazon",
  description: "A fearsome warrior. Always angry about something.",
};

export const renegade: UnitData = {
  HP: 120,
  MP: 4,
  AP: 6,
  spells: "Weighted net, Trident, Punch",
  frame: 84,
  type: "Renegade",
  description: "In his dreams, he's still in the Colosseum.",
};

export const stranger: UnitData = {
  HP: 80,
  MP: 4,
  AP: 6,
  spells: "Stargazing, Revelation, Plague",
  frame: 88,
  type: "Stranger",
  description: "...",
};

export const snowman: UnitData = {
  HP: 100,
  MP: 6,
  AP: 6,
  spells: "Sting",
  frame: 40,
  type: "Snowman",
  description: "Snow !",
};

export const pig: UnitData = {
  HP: 100,
  MP: 6,
  AP: 6,
  spells: "Deadly javelin",
  frame: 0,
  type: "Pig",
  description: "Just some pig.",
};

export const princess: UnitData = {
  HP: 50,
  MP: 3,
  AP: 6,
  spells: "Sting",
  frame: 4,
  type: "Princess",
  description: "A typical princess.",
};

const availableUnits = [amazon, renegade, stranger, snowman, pig, princess];

export const findUnitDataByType = (type: string) => {
  return availableUnits.find((unitData) => unitData.type === type);
};
