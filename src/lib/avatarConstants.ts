export const AVATARS: string[] = [
  "/images/avatars/batman.webp",
  "/images/avatars/wonderwoman.webp",
  "/images/avatars/superman.webp",
  "/images/avatars/spiderman.png",
  "/images/avatars/ironman.png",
  "/images/avatars/captainamerica.png",
  "/images/avatars/hulk.png",
  "/images/avatars/Flash.png",
  "/images/avatars/GreenLantern.png",
];

export function randomAvatar(): string {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)];
}
