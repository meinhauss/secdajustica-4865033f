REVOKE EXECUTE ON FUNCTION public.orgao_do_membro(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.preparar_denuncia_membro() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_ouvidoria_promotores() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.pode_corregedoria(uuid,text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.pode_corregedoria(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.orgao_do_membro(uuid) TO authenticated;