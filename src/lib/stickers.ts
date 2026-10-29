// The Smug Para sticker pack. List stickers newest first: the six newest show in the pack,
// older ones move down into "More graphics".
// Full-colour PNGs live in public/stickers, with small previews in public/stickers/thumbs.
export interface Sticker { name: string; src: string; thumb: string; aspect: number }

const pack = (name: string, file: string, w: number, h: number): Sticker =>
  ({ name, src: `/stickers/${file}.png`, thumb: `/stickers/thumbs/${file}.webp`, aspect: h / w })

export const STICKERS: Sticker[] = [
  pack('SP Tropical Blue', 'tropicalblue', 1016, 953),
  pack('Faith Rewards The Brave (gold)', 'frtbbonusprint', 878, 939),
  pack('Faith Rewards The Brave script', 'frtbscript', 674, 755),
  pack('Original seal', 'originalseal', 966, 769),
  pack('Handmade by the Brave stamp', 'handmadestamp', 822, 815),
  pack('SP logo, black gradient', 'newlogoblackgradient', 945, 934),
  pack('SP logo, gold gradient', 'newlogogoldgradient', 945, 934),
  pack('Smugglers in flames', 'flamessmugglers', 986, 532),
  pack('Smugglers, gold', 'esotericksmugglers', 734, 219),
  pack('Smugglers Mutha Fuckin Paradise', 'flamesmfp', 706, 835),
  pack('Trinidad map', 'trinidad-posoperation', 788, 570),
  pack('Goat head', 'goathead', 687, 916),
  pack('Survivor', 'survivor', 996, 418),
  pack('Classic logo, coral and pink', 'classiclogocoral-pink', 933, 740),
  pack('Faith Rewards The Brave in flames', 'flamingfrtb', 694, 862),
  pack('Fully Sovereign in flames', 'scorchesfullysovereign', 843, 834),
  pack('Scorched Smugglers', 'scorchedsmugglers', 853, 720),
  pack('Smugglers Paradise arch, sand', 'spfrtbarchsand', 964, 445),
  pack('Smugglers Paradise arch, pink', 'spfrtbarchidk', 944, 445),
  pack('Smugglers Paradise arch, magenta', 'spfrtbarchpink', 944, 452),
  pack('Classic logo, white', 'classiclogowhite', 943, 537),
  pack('Classic logo, gold gradient', 'classiclogoyellowgradient', 978, 539),
  pack('Classic logo, coral gradient', 'classiclogocoralgradient', 922, 508),
  pack('Classic logo, coral', 'classiclogocoral', 1012, 558),
  pack('Smugglers Paradise diamond', 'diamondtext1', 986, 596),
  pack('SP logo, gold', 'newlogoyellow', 786, 776),
  pack('Rifles and skull', 'oldlogonowords', 979, 540),
  pack('SP logo, black', 'newlogoblack', 787, 777),
  pack('SP logo, white', 'newlogowhite', 722, 717),
  pack('Smugglers Paradise arch, orange', 'spfrtbarch', 963, 465),
  pack('No Risk No Reward', 'norisknorewardred', 1042, 568),
  pack('Classic logo, blue', 'classiclogoblue', 1013, 773),
  pack('SP Smugglers Paradise script', 'spsticker', 1016, 557),
  pack('Money rose', 'moneyrosesticker', 900, 794),
]

export const PACK_SIZE = 6

/** The sticker as a data URL, so it renders inside previews and uploads with the order like any artwork. */
export async function stickerData(s: Sticker): Promise<string> {
  const blob = await (await fetch(s.src)).blob()
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result as string)
    r.onerror = rej
    r.readAsDataURL(blob)
  })
}
