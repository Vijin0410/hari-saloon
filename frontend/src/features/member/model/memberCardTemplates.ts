/** 内置卡面目录：业务表保存模板编号，自选图片仍保存独立的文件对象键。 */
export const CARD_TEMPLATE_KEYS = ['auto', 'lilac', 'silver', 'gold', 'plum', 'black-gold'] as const;
export type MemberCardTemplate = (typeof CARD_TEMPLATE_KEYS)[number];
export const MEMBER_CARD_BACKGROUNDS = [
  { key: 'lilac', name: '柔紫', colors: ['#ddd5e9', '#b8a4cf', '#78618f', '#392b49'] },
  { key: 'silver', name: '银灰', colors: ['#cbd2e0', '#8996b5', '#53617f', '#242c42'] },
  { key: 'gold', name: '暖金', colors: ['#e6d3b5', '#b99463', '#806044', '#3d2b28'] },
  { key: 'plum', name: '深梅', colors: ['#b9a4cd', '#79618f', '#49344f', '#251c30'] },
  { key: 'black-gold', name: '尊享会员 · 黑金', colors: ['#d9ba79', '#242321', '#101113', '#060709'] },
] as const;
export function resolveCardBackground(template: string | null | undefined, levelNo: number) {
  const fallback = MEMBER_CARD_BACKGROUNDS[Math.abs(Math.trunc(levelNo)) % 4];
  return MEMBER_CARD_BACKGROUNDS.find((item) => item.key === template) ?? fallback;
}
