import Phaser from "phaser";

export class Card extends Phaser.GameObjects.Container {
  cardWidth = 200;
  cardHeight = 300;
  outlineWidth = 8;
  outlineColor = 0xffffff;
  fillColor = 0x191430;
  illustrationTint = 0x333333;
  fontSize = 16;
  caracFontSize = 32;

  // if card on right of screen, character description will go to the left
  isOnRight: boolean;
  isInChooseCardScene: boolean;
  descriptionText: string;
  name: string;
  illustrationName: string;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    isOnRight: boolean,
    isInChooseCardScene: boolean
  ) {
    super(scene, x, y);

    this.isOnRight = isOnRight;
    this.isInChooseCardScene = isInChooseCardScene;
    this.makeCardOutline();

    // uncomment this if you want character description to appear alongside card
    // this.makeDescription();
    this.setSize(this.cardWidth, this.cardHeight);
    if (isInChooseCardScene) {
      this.setInteractive();
      this.on("pointerup", () => {
        this.toggleCardView();
      });
    }
  }

  toggleCardView() {
    this.getAll("name", "toggle").forEach((child) => {
      const myChild = child as Phaser.GameObjects.Image;
      myChild.setVisible(!myChild.visible);
    });
    const illustration = this.getByName(
      "illustration"
    ) as Phaser.GameObjects.Image;
    illustration.setTint(
      illustration.tint === this.illustrationTint
        ? 0xffffff
        : this.illustrationTint
    );
  }

  makeDescription() {
    const descriptionMargin = 2;
    const descriptionText = new Phaser.GameObjects.BitmapText(
      this.scene,
      this.cardWidth / 2 + this.outlineWidth + descriptionMargin,
      0,
      "dogicapixel",
      this.descriptionText,
      this.fontSize
    )
      .setVisible(false)
      .setName("toggle");
    if (this.isOnRight) {
      descriptionText.x = -descriptionText.x - descriptionText.displayWidth;
    }
    // text
    this.add(descriptionText);
    const descriptionOutline = new Phaser.GameObjects.Rectangle(
      this.scene,
      descriptionText.x - descriptionMargin,
      descriptionText.y - descriptionMargin,
      descriptionText.displayWidth + descriptionMargin * 2,
      descriptionText.displayHeight + descriptionMargin * 2,
      0,
      0.7
    )
      .setStrokeStyle(1, this.outlineColor)
      .setOrigin(0, 0)
      .setVisible(false)
      .setName("toggle");
    // outline
    this.add(descriptionOutline);
    this.sendToBack(descriptionOutline);
  }

  makeName(name: string) {
    this.add(
      new Phaser.GameObjects.BitmapText(
        this.scene,
        0,
        -this.cardHeight / 2 + 10,
        "dogicapixelbold",
        name,
        this.fontSize
      )
        .setScale(1.2)
        .setOrigin(0.5, 0)
        .setName("toggle")
    );
  }

  makeIllustration() {
    this.add(
      new Phaser.GameObjects.Image(
        this.scene,
        0,
        0,
        this.illustrationName + "Illus"
      )
        .setTint(this.illustrationTint)
        .setName("illustration")
    );
  }

  makeCardOutline() {
    this.add(
      new Phaser.GameObjects.Rectangle(
        this.scene,
        0,
        0,
        this.cardWidth,
        this.cardHeight
      ).setStrokeStyle(this.outlineWidth, this.outlineColor)
    );
  }
}
