
revoke execute on function public.claim_slot(text) from public, anon;
revoke execute on function public.student_cancel_booking(text) from public, anon;
revoke execute on function public.teacher_cancel_booking(text, text) from public, anon;
revoke execute on function public.freeze_course(text, text) from public, anon;
revoke execute on function public.unfreeze_course(text, text) from public, anon;
revoke execute on function public.expire_stale_freezes() from public, anon;
revoke execute on function public.assign_student_to_offline_class(text, text) from public, anon;
revoke execute on function public.log_action(text, jsonb) from public, anon;
revoke execute on function public.current_user_role() from public, anon;
revoke execute on function public.current_user_specific_id() from public, anon;
revoke execute on function public.is_admin() from public, anon;

grant execute on function public.claim_slot(text) to authenticated;
grant execute on function public.student_cancel_booking(text) to authenticated;
grant execute on function public.teacher_cancel_booking(text, text) to authenticated;
grant execute on function public.freeze_course(text, text) to authenticated;
grant execute on function public.unfreeze_course(text, text) to authenticated;
grant execute on function public.expire_stale_freezes() to authenticated;
grant execute on function public.assign_student_to_offline_class(text, text) to authenticated;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.current_user_specific_id() to authenticated;
grant execute on function public.is_admin() to authenticated;
