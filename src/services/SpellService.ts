import { EffectOverTime } from "../classes/battle/EffectOverTime";
import { Spell } from "../classes/battle/Spell";
import { UnitService } from "./UnitService";

/** This service contains the data for all available spells in the game. */
export class SpellService {
  static effectsOverTime: { [key: string]: EffectOverTime } = {
    Poison: new EffectOverTime("Poison", 58, 2, 10, 1, 1, 0, 0, 0),
    "Wasp venom": new EffectOverTime("Wasp venom", 58, 2, 10, 1, 1, 0, 0, 0),
    Plague: new EffectOverTime("Plague", 59, 2, 25, 2, 2, 0, 0, 0),
  };

  static spells: { [key: string]: Spell } = {
    "Deadly javelin": new Spell(
      56,
      1,
      5,
      4,
      "Deadly javelin",
      true,
      true,
      25,
      0,
      2,
      0,
      0,
      0,
      "line",
      3,
      0,
      this.effectsOverTime["Poison"],
      null,
      3
    ),
    "Weighted net": new Spell(
      104,
      3,
      8,
      4,
      "Weighted net",
      true,
      false,
      15,
      2,
      0,
      0,
      0,
      0,
      "star",
      1
    ),
    Trident: new Spell(
      116,
      2,
      4,
      2,
      "Trident",
      true,
      true,
      20,
      0,
      0,
      0,
      0,
      0,
      "line",
      1,
      1,
      null,
      null,
      -3
    ),
    Stargazing: new Spell(
      128,
      0,
      0,
      0,
      "Stargazing",
      true,
      false,
      0,
      0,
      0,
      0,
      3,
      3,
      "monoTarget",
      0,
      2
    ),
    Revelation: new Spell(
      140,
      0,
      6,
      4,
      "Revelation",
      false,
      false,
      0,
      4,
      4,
      25,
      0,
      0,
      "monoTarget",
      0,
      1
    ),
    Plague: new Spell(
      152,
      0,
      5,
      3,
      "Plague",
      true,
      false,
      0,
      0,
      0,
      0,
      0,
      0,
      "monoTarget",
      0,
      0,
      this.effectsOverTime["Plague"],
      null,
      0
    ),
    Punch: new Spell(68, 1, 1, 4, "Punch", true, false, 50),
    // DEV
    Sting: new Spell(
      80,
      0,
      30,
      0,
      "Sting",
      false,
      false,
      100,
      0,
      1,
      0,
      0,
      0,
      "monoTarget",
      0,
      0,
      null
    ),
    // PROD
    // Sting:
    //new Spell(
    //   80,
    //   0,
    //   12,
    //   2,
    //   "Sting",
    //   true,
    //   false,
    //   15,
    //   0,
    //   1,
    //   0,
    //   0,
    //   0,
    //   "monoTarget",
    //   0,
    //   1
    // ),
    "Herbal medicine": new Spell(
      92,
      0,
      4,
      0,
      "Herbal medicine",
      true,
      false,
      0,
      0,
      0,
      20,
      1,
      1,
      "star",
      2,
      0,
      null,
      UnitService.units["Princess"]
    ),
    Biting: new Spell(
      0,
      1,
      1,
      4,
      "Biting",
      true,
      false,
      30,
      0,
      0,
      0,
      0,
      0,
      "monoTarget"
    ),
    "Wasp sting": new Spell(
      0,
      1,
      1,
      4,
      "Wasp sting",
      true,
      false,
      15,
      0,
      0,
      0,
      0,
      0,
      "monoTarget",
      1,
      0,
      this.effectsOverTime["Wasp venom"]
    ),
  };

  /** Transforms a list of spell names in a string into an array of Spell objects. */
  static decodeSpellString = (spellStr: string) => {
    let spellArray: Spell[] = [];
    spellStr.split(", ").forEach((spellName) => {
      spellArray.push(this.spells[spellName]);
    });
    return spellArray;
  };
}