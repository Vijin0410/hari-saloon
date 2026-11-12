/** 统一读取后端的字段名_text；框架以 - 表示未匹配，页面统一显示「暂无」。 */
export function getDictText(text: string | null | undefined, fallback = '暂无'): string {
  const value = text?.trim();
  return value && value !== '-' ? value : fallback;
}
