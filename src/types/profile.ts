/**
 * Tipagem do perfil de usuário baseada no schema do Supabase (tabela profiles).
 */
export interface Profile {
  user_id: string;
  nome_completo: string;
  email?: string;
  avatar_url?: string | null;
  discord?: string;
  discord_user_id?: string;
  id_personagem?: string;
  telefone_ingame?: string;
  precisa_atualizar_cadastro?: boolean;
  created_at?: string;
  updated_at?: string;
}