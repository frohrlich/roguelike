export class MapService {
  static position = 0;

  static forest_adjectives = [
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
  ];

  static forest_nouns = [
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
  ];

  static getRandomForestName = () => {
    return (
      this.forest_adjectives[
        Phaser.Math.Between(0, this.forest_adjectives.length - 1)
      ] +
      " " +
      MapService.forest_nouns[
        Phaser.Math.Between(0, this.forest_nouns.length - 1)
      ]
    );
  };

  static incrementPosition() {
    this.position = ++this.position % 3;
  }
}
