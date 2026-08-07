/**
 * 締め日に基づいて請求期間を計算
 * @param year 対象年
 * @param month 対象月
 * @param billingDay 締め日（1-31）
 * @returns { startDate: Date, endDate: Date }
 */
export function calculateBillingPeriod(
  year: number,
  month: number,
  billingDay: number
): { startDate: Date; endDate: Date } {
  // 締め日が28以上の場合（月末締め）
  if (billingDay >= 28) {
    // 対象月の1日から末日まで
    const startDate = new Date(year, month - 1, 1)
    startDate.setHours(0, 0, 0, 0)
    const endDate = new Date(year, month, 0) // 月末
    endDate.setHours(23, 59, 59, 999)
    return { startDate, endDate }
  }

  // 通常の締め日（1-27）
  // 開始日: 前月の締め日翌日
  const startDate = new Date(year, month - 2, billingDay + 1)
  startDate.setHours(0, 0, 0, 0)

  // 終了日: 対象月の締め日
  const endDate = new Date(year, month - 1, billingDay)
  endDate.setHours(23, 59, 59, 999)

  return { startDate, endDate }
}
