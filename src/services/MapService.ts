export class MapService {
  private static readonly zoneSize = 3;
  private static readonly zoneCount = 2;

  static position = 0;
  static zone = 0;

  static zoneNames = ["forest", "corrupt_forest"];

  static zoneDescriptions = [
    "Your journey begins in a beautiful forest...",
    "There's something wrong with this place.",
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
  ];

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
  ];

  static getRandomPlaceName = () => {
    return (
      this.places_adjectives[this.zone][
        Phaser.Math.Between(0, this.places_adjectives[this.zone].length - 1)
      ] +
      " " +
      MapService.places_nouns[this.zone][
        Phaser.Math.Between(0, this.places_nouns[this.zone].length - 1)
      ]
    );
  };

  static incrementPosition() {
    this.position++;
    if (this.position >= MapService.zoneSize) {
      this.position = 0;
      this.zone++;
      if (this.zone >= this.zoneCount) {
        this.zone = 0;
      }
    }
  }

  static getCurrentZoneName() {
    return this.zoneNames[this.zone];
  }

  static getCurrentZoneDescription() {
    return this.zoneDescriptions[this.zone];
  }
}
