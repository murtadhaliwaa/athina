/** تصنيف نظام لأصناف العروض — لا يُدار من لوحة المنيو العادية */
export const OFFERS_CATEGORY_NAME = "العروض";

export function isOffersCategoryName(name: string) {
  return name.trim() === OFFERS_CATEGORY_NAME;
}
