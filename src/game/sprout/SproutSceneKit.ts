import Phaser from 'phaser';

export type NovaPose = 'idle' | 'talk' | 'happy' | 'excited' | 'thinking' | 'pointing';
export type LumiPose = 'idle' | 'sleeping' | 'happy' | 'run';

export type CharacterActor<Pose extends string> = {
  view: Phaser.GameObjects.Container;
  setPose: (pose: Pose) => void;
  moveTo: (x: number, y: number, duration?: number) => void;
};

export function addSoftLeaf(
  scene: Phaser.Scene,
  x: number,
  y: number,
  scale: number,
  color: number,
  rotation = 0,
) {
  const leaf = scene.add.ellipse(x, y, 18 * scale, 52 * scale, color, 0.96).setRotation(rotation);
  scene.tweens.add({
    targets: leaf,
    rotation: rotation + 0.07,
    duration: 1700 + Math.random() * 900,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.InOut',
  });
  return leaf;
}

export function addSparkleField(
  scene: Phaser.Scene,
  x: number,
  y: number,
  radius: number,
  count: number,
  color = 0xdfffd8,
) {
  const container = scene.add.container(x, y);
  for (let index = 0; index < count; index += 1) {
    const angle = (Math.PI * 2 * index) / count + (index % 3) * 0.28;
    const distance = radius * (0.35 + ((index * 29) % 60) / 100);
    const dot = scene.add.circle(
      Math.cos(angle) * distance,
      Math.sin(angle) * distance * 0.62,
      index % 5 === 0 ? 2.4 : 1.4,
      color,
      0.18 + (index % 4) * 0.12,
    );
    container.add(dot);
    scene.tweens.add({
      targets: dot,
      y: dot.y - 12 - (index % 3) * 5,
      alpha: { from: 0.12, to: 0.78 },
      duration: 1800 + (index % 5) * 260,
      delay: index * 90,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }
  return container;
}

export function createNovaActor(scene: Phaser.Scene, x: number, y: number): CharacterActor<NovaPose> {
  const view = scene.add.container(x, y);
  const glow = scene.add.circle(0, 4, 58, 0x9b8cff, 0.13).setBlendMode(Phaser.BlendModes.ADD);
  const shadow = scene.add.ellipse(0, 58, 68, 17, 0x132535, 0.22);
  const tail = scene.add.ellipse(43, 24, 20, 54, 0x635bc8, 1).setRotation(-0.7);
  const body = scene.add.ellipse(0, 18, 63, 78, 0x7369db, 1);
  const belly = scene.add.ellipse(0, 28, 40, 45, 0xa9a3f2, 0.72);
  const head = scene.add.circle(0, -20, 39, 0x8077e8, 1);
  const earL = scene.add.triangle(-27, -48, 0, 27, 18, 3, 31, 29, 0x746add, 1).setRotation(-0.2);
  const earR = scene.add.triangle(27, -48, 0, 30, 13, 2, 31, 28, 0x746add, 1).setRotation(0.2);
  const eyeL = scene.add.ellipse(-13, -22, 9, 12, 0x122238, 1);
  const eyeR = scene.add.ellipse(13, -22, 9, 12, 0x122238, 1);
  const eyeDotL = scene.add.circle(-11, -24, 1.8, 0xffffff, 0.92);
  const eyeDotR = scene.add.circle(15, -24, 1.8, 0xffffff, 0.92);
  const mouth = scene.add.ellipse(0, -8, 10, 4, 0x25304c, 0.86);
  const antenna = scene.add.rectangle(0, -66, 4, 18, 0x685fd0, 1);
  const antennaGlow = scene.add.circle(0, -78, 7, 0xe4d6ff, 0.95).setBlendMode(Phaser.BlendModes.ADD);
  const handL = scene.add.circle(-37, 15, 8, 0x8a82ed, 1);
  const handR = scene.add.circle(37, 15, 8, 0x8a82ed, 1);
  view.add([
    shadow,
    glow,
    tail,
    body,
    belly,
    head,
    earL,
    earR,
    eyeL,
    eyeR,
    eyeDotL,
    eyeDotR,
    mouth,
    antenna,
    antennaGlow,
    handL,
    handR,
  ]);

  scene.tweens.add({
    targets: view,
    y: y - 7,
    duration: 1800,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.InOut',
  });
  scene.tweens.add({
    targets: antennaGlow,
    alpha: { from: 0.45, to: 1 },
    scale: { from: 0.85, to: 1.18 },
    duration: 1200,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.InOut',
  });

  const settle = () => {
    handL.setPosition(-37, 15);
    handR.setPosition(37, 15);
    head.setRotation(0);
    mouth.setScale(1, 1);
    view.setScale(1);
  };

  const setPose = (pose: NovaPose) => {
    scene.tweens.killTweensOf([handL, handR, head, mouth]);
    settle();
    if (pose === 'talk') {
      scene.tweens.add({ targets: mouth, scaleY: 2.4, duration: 160, yoyo: true, repeat: 5 });
    } else if (pose === 'happy') {
      scene.tweens.add({ targets: [handL, handR], y: 2, duration: 280, yoyo: true, repeat: 1, ease: 'Back.Out' });
    } else if (pose === 'excited') {
      scene.tweens.add({ targets: view, scale: 1.08, duration: 170, yoyo: true, repeat: 2, ease: 'Back.Out' });
      scene.tweens.add({ targets: [handL, handR], y: -8, duration: 220, yoyo: true, repeat: 2 });
    } else if (pose === 'thinking') {
      handR.setPosition(23, -12);
      head.setRotation(-0.12);
    } else if (pose === 'pointing') {
      scene.tweens.add({ targets: handR, x: 67, y: -4, duration: 260, ease: 'Back.Out' });
      head.setRotation(0.08);
    }
  };

  return {
    view,
    setPose,
    moveTo(targetX, targetY, duration = 900) {
      scene.tweens.add({ targets: view, x: targetX, y: targetY, duration, ease: 'Sine.InOut' });
    },
  };
}

export function createLumiActor(scene: Phaser.Scene, x: number, y: number): CharacterActor<LumiPose> {
  const view = scene.add.container(x, y);
  const glow = scene.add.circle(0, 0, 38, 0xffe7a1, 0.12).setBlendMode(Phaser.BlendModes.ADD);
  const body = scene.add.ellipse(0, 5, 42, 48, 0xf0cb73, 1);
  const belly = scene.add.ellipse(0, 10, 25, 27, 0xffe8a7, 0.72);
  const earL = scene.add.ellipse(-15, -21, 10, 22, 0xe4b95d, 1).setRotation(-0.4);
  const earR = scene.add.ellipse(15, -21, 10, 22, 0xe4b95d, 1).setRotation(0.4);
  const eyeL = scene.add.circle(-8, -3, 3.2, 0x493d34, 1);
  const eyeR = scene.add.circle(8, -3, 3.2, 0x493d34, 1);
  const feetL = scene.add.ellipse(-10, 28, 13, 7, 0xd7a94f, 1);
  const feetR = scene.add.ellipse(10, 28, 13, 7, 0xd7a94f, 1);
  view.add([glow, feetL, feetR, body, belly, earL, earR, eyeL, eyeR]);

  scene.tweens.add({
    targets: body,
    scaleY: { from: 0.98, to: 1.03 },
    duration: 1250,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.InOut',
  });

  const setPose = (pose: LumiPose) => {
    scene.tweens.killTweensOf(view);
    view.setRotation(0).setScale(1);
    eyeL.setScale(1, 1);
    eyeR.setScale(1, 1);
    if (pose === 'sleeping') {
      eyeL.setScale(1.35, 0.18);
      eyeR.setScale(1.35, 0.18);
      view.setRotation(-0.12);
    } else if (pose === 'happy') {
      scene.tweens.add({ targets: view, y: view.y - 12, duration: 260, yoyo: true, repeat: 1, ease: 'Quad.Out' });
    } else if (pose === 'run') {
      scene.tweens.add({ targets: view, rotation: 0.08, duration: 110, yoyo: true, repeat: 5 });
    }
  };

  return {
    view,
    setPose,
    moveTo(targetX, targetY, duration = 720) {
      scene.tweens.add({ targets: view, x: targetX, y: targetY, duration, ease: 'Sine.InOut' });
    },
  };
}

export function addRoundedButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  onPress: () => void,
  options: { fill?: number; textColor?: string; fontSize?: number } = {},
) {
  const root = scene.add.container(x, y);
  const bg = scene.add.graphics();
  bg.fillStyle(options.fill ?? 0x203d45, 0.96).fillRoundedRect(0, 0, width, height, 18);
  bg.lineStyle(1, 0xffffff, 0.08).strokeRoundedRect(0, 0, width, height, 18);
  const text = scene.add
    .text(width / 2, height / 2, label, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: `${options.fontSize ?? 16}px`,
      fontStyle: 'bold',
      color: options.textColor ?? '#f8fbf8',
      align: 'center',
    })
    .setOrigin(0.5);
  const hit = scene.add.zone(width / 2, height / 2, width, height).setInteractive({ useHandCursor: true });
  hit.on('pointerdown', onPress);
  root.add([bg, text, hit]);
  return root;
}
