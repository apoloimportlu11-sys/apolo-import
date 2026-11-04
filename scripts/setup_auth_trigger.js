const { Client } = require('pg');

async function createTrigger() {
  const client = new Client({
    host: 'aws-0-us-west-2.pooler.supabase.com',
    port: 6543,
    user: 'postgres.libngipioqzjoljmsosv',
    password: 'ApoloDistrib128',
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Connected to us-west-2 PostgreSQL.');

    await client.query(`
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS trigger AS $$
      BEGIN
        INSERT INTO public.users (id, name, email, role, is_active, created_at, updated_at)
        VALUES (
          NEW.id,
          COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), 'Cliente'),
          NEW.email,
          'cliente',
          true,
          NOW(),
          NOW()
        )
        ON CONFLICT (email) DO NOTHING;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
    `);

    console.log('Successfully created auth.users -> public.users trigger for automatic role cliente!');
  } catch (err) {
    console.error('Trigger creation error:', err);
  } finally {
    await client.end();
  }
}

createTrigger();
