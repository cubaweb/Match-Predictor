/* ============================================================
   CONFIGURACIÓN SUPABASE (compartida por todas las páginas)
   Reemplaza estos valores con los tuyos en:
   supabase.com → tu proyecto → Settings → API
   ============================================================ */
const SUPABASE_URL = 'https://xjvfasmlkoaldmcfpmzz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqdmZhc21sa29hbGRtY2ZwbXp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5NjIwMDEsImV4cCI6MjA5NTUzODAwMX0.oHaopTE0FxDXNvWKnt0aOvExDpYJw4LpNlZSpdBRmSc';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);
