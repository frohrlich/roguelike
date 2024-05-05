import { BattleScene } from "../scenes/BattleScene";

export class MapService {
  static readonly zoneSize = 3;
  static readonly zoneCount = 3;

  static position = 0;
  static zone = 0;

  static zoneNames = ["forest", "corrupt_forest", "dungeon"];

  static enemyTypes = ["Pig", "Wasp", "Snowman"];

  static zoneDescriptions = [
    "Your journey begins in a beautiful forest...",
    "There's something wrong with this place.",
    "You've reached the source of all evil.",
  ];

  static places_adjectives = [
    [
      "Peaceful",
      "Tranquil",
      "Calm",
      "Lush",
      "Overgrown",
      "Serene",
      "Verdant",
      "Beautiful",
      "Idyllic",
      "Enchanted",
      "Primordial",
      "Majestic",
    ],
    [
      "Corrupt",
      "Sorrowful",
      "Sad",
      "Weary",
      "Desolate",
      "Barren",
      "Windswept",
      "Sterile",
      "Bleak",
      "Deserted",
      "Sick",
      "Wild",
    ],
    [
      "Dark",
      "Sinister",
      "Somber",
      "Black",
      "Starless",
      "Terrible",
      "Dreadful",
      "Ghastly",
      "Dire",
      "Gloomy",
      "Tenebrous",
      "Cold",
    ],
  ];
  static currentAdjectives: string[] = this.places_adjectives[0];

  static places_nouns = [
    [
      "Forest",
      "Bush",
      "Grove",
      "Arbor",
      "Woods",
      "Woodland",
      "Canopy",
      "Clearing",
      "Covert",
      "Park",
      "Thicket",
      "Greenwood",
    ],
    [
      "Forest",
      "Bush",
      "Woods",
      "Meadow",
      "Canopy",
      "Clearing",
      "Covert",
      "Plain",
      "Thicket",
      "Lands",
      "Moor",
      "Marsh",
    ],
    [
      "Dungeon",
      "Cell",
      "Oubliette",
      "Hole",
      "Keep",
      "Castle",
      "Prison",
      "Citadel",
      "Lair",
      "Hideout",
      "Den",
      "Fortress",
    ],
  ];
  static currentNouns: string[] = this.places_nouns[0];

  static getRandomPlaceName = () => {
    let randIndex = Phaser.Math.Between(0, this.currentAdjectives.length - 1);
    const randAdjective = this.currentAdjectives[randIndex];
    // we don't want to use the same adjective twice so remove it from list
    this.currentAdjectives.splice(randIndex, 1);

    // same for nouns
    randIndex = Phaser.Math.Between(0, this.currentNouns.length - 1);
    const randNoun = this.currentNouns[randIndex];
    this.currentNouns.splice(randIndex, 1);

    return randAdjective + " " + randNoun;
  };

  static incrementPosition() {
    this.position++;
    // reached end of zone, go to next zone
    if (this.position >= MapService.zoneSize) {
      this.position = 0;
      this.zone++;
      this.currentAdjectives = this.places_adjectives[this.zone];
      this.currentNouns = this.places_nouns[this.zone];
      BattleScene.refreshBattleMapsNumbers();
    }
  }

  static resetMap() {
    this.position = 0;
    this.zone = 0;
    this.currentAdjectives = this.places_adjectives[0];
    this.currentNouns = this.places_nouns[0];
  }

  static getCurrentZoneName() {
    return this.zoneNames[this.zone];
  }

  static getCurrentZoneDescription() {
    return this.zoneDescriptions[this.zone];
  }

  static getCurrentEnemy() {
    return this.enemyTypes[this.zone];
  }
}
