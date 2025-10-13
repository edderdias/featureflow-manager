import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Adicionado para depuração: verifique se as variáveis estão sendo carregadas
console.log("Supabase URL:", supabaseUrl);
console.log("Supabase Anon Key:", supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Erro: As variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são necessárias.");
  // Você pode lançar um erro ou lidar com isso de outra forma, dependendo da sua necessidade
  throw new Error("As variáveis de ambiente do Supabase não estão configuradas corretamente.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);