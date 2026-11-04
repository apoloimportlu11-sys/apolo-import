require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

(async () => {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.CREATE_ADMIN_EMAIL;
  const newPassword = process.env.CREATE_ADMIN_PASSWORD;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !email || !newPassword) {
    console.error('Falta una variable de entorno. Configura SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY, CREATE_ADMIN_EMAIL y CREATE_ADMIN_PASSWORD en .env.local');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

  try {
    // List users (admin) and find by email
    const listRes = await supabase.auth.admin.listUsers();
    if (listRes.error) throw listRes.error;

    // Normalize users array from different client versions
    let users = [];
    if (Array.isArray(listRes.users)) users = listRes.users;
    else if (Array.isArray(listRes.data?.users)) users = listRes.data.users;
    else if (Array.isArray(listRes.data)) users = listRes.data;

    const user = users.find(u => (u.email || u.user?.email) === email);
    if (!user) {
      console.error('Usuario no encontrado con email:', email);
      process.exit(2);
    }

    const userId = user.id || user.user?.id;
    if (!userId) {
      console.error('No se pudo obtener el id del usuario desde la respuesta:', user);
      process.exit(3);
    }

    // Update password and mark email confirmed for convenience in testing
    const updateRes = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
      email_confirm: true
    });

    if (updateRes.error) throw updateRes.error;

    console.log('Usuario actualizado correctamente. userId=', userId);
    console.log('Respuesta:', updateRes.data || updateRes.user || updateRes);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
