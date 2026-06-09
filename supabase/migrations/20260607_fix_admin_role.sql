-- =========================================================
-- FIX: Đảm bảo admin account có role = 'admin' đúng
-- Nguyên nhân: migration 20260607 dùng CREATE TABLE IF NOT EXISTS
-- với role text thô, có thể gây xung đột với app_role enum.
-- =========================================================

-- 1. Đảm bảo role column đúng kiểu (cast về text nếu cần)
--    Cập nhật row admin theo auth user id thực tế
UPDATE public.users
SET role = 'admin'
WHERE email = 'nguyenvanthanh110394@gmail.com'
  AND role IS DISTINCT FROM 'admin';

-- 2. Nếu row chưa tồn tại (trigger chưa tạo), insert thủ công
--    Dùng subquery để lấy id từ auth.users
INSERT INTO public.users (id, specific_id, full_name, email, role, status)
SELECT
  au.id,
  COALESCE(
    (SELECT specific_id FROM public.users WHERE email = au.email LIMIT 1),
    'AD-' || to_char(now(), 'YY') || '-' || lpad((floor(random()*9999)+1)::text, 4, '0')
  ),
  COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
  au.email,
  'admin',
  'active'
FROM auth.users au
WHERE au.email = 'nguyenvanthanh110394@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.users pu WHERE pu.id = au.id
  );

-- 3. Xác nhận kết quả (chạy SELECT này trong SQL Editor để kiểm tra)
-- SELECT id, specific_id, full_name, email, role, status
-- FROM public.users
-- WHERE email = 'nguyenvanthanh110394@gmail.com';
