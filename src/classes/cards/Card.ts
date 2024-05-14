import Phaser from "phaser";

export class Card extends Phaser.GameObjects.Container {
  cardWidth = 200;
  cardHeight = 300;
  outlineWidth = 8;
  outlineColor = 0xffffff;
  fillColor = 0x191430;
  illustrationTint = 0x666666;
  fontSize = 16;
  caracFontSize = 32;

  isInChooseCardScene: boolean;
  descriptionText: string;
  name: string;
  illustrationName: string;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    isInChooseCardScene: boolean
  ) {
    super(scene, x, y);

    this.isInChooseCardScene = isInChooseCardScene;
    this.makeCardOutline();

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

  makeName(name: string) {
    this.add(
      new Phaser.GameObjects.BitmapText(
        this.scene,
        0,
        -this.cardHeight / 2 + 10,
        "dogicapixelbold",
        name,
        this.fontSize,
        Phaser.GameObjects.BitmapText.ALIGN_CENTER
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
