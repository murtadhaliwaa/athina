/** تنسيق المبالغ بالدينار العراقي — أعداد صحيحة فقط.
 * عزل LTR حول العملة يمنع خوارزمية Unicode من وضع «د.ع» يمين الرقم.
 */
export function formatIQD(n: number): string {
  const amount = n.toLocaleString("en-US");
  // U+2066 LRI … U+2069 PDI — يثبت د.ع يسار الرقم داخل أي سياق
  return `\u2066د.ع\u2069 ${amount}`;
}
