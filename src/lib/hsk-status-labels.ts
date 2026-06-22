export const BOOKING_STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  cancelled: "Đã huỷ",
  cancelled_valid: "Huỷ hợp lệ",
  cancelled_late: "Huỷ muộn",
};

export const USER_STATUS_LABELS: Record<string, string> = {
  active: "Đang hoạt động",
  disabled: "Đã vô hiệu hoá",
};

export const LEARNING_PROGRESS_STATUS_LABELS: Record<string, string> = {
  active: "Đang học",
  frozen: "Bảo lưu",
  completed: "Hoàn thành",
};

export function getStatusLabel(
  status: string | null | undefined,
  labels: Record<string, string>,
) {
  if (!status) return "";
  return labels[String(status).toLowerCase()] ?? status;
}
