// represents effects in battle such as poison, etc
export class EffectOverTime {
  name: string;
  frame: number;
  duration: number;
  damage: number;
  malusAP: number;
  malusMP: number;
  heal: number;
  bonusAP: number;
  bonusMP: number;

  constructor(
    name: string,
    frame: number,
    duration: number,
    damage: number,
    malusAP: number,
    malusMP: number,
    heal: number,
    bonusAP: number,
    bonusMP: number
  ) {
    this.name = name;
    this.frame = frame;
    this.duration = duration;
    this.damage = damage;
    this.malusAP = malusAP;
    this.malusMP = malusMP;
    this.heal = heal;
    this.bonusAP = bonusAP;
    this.bonusMP = bonusMP;
  }
}
