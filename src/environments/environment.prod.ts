export const environment = {
  production: true,
  supabaseUrl: (typeof process !== 'undefined' && process.env?.['SUPABASE_URL']) || 'https://hbhhiqurzufsgqprmypb.supabase.co',
  supabaseAnonKey: (typeof process !== 'undefined' && process.env?.['SUPABASE_ANON_KEY']) || 'sb_publishable_is23AtXCxXVlK9p7k6emmw_Eoj-lJRa'
};
