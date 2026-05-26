import { supabase } from '../lib/supabase';

export async function createTestUsers() {
  const testUsers = [
    { email: 'verkoper@test.nl', password: 'wachtwoord123', fullName: 'Test Verkoper', role: 'verkoper' as const },
    { email: 'manager@test.nl', password: 'wachtwoord123', fullName: 'Test Manager', role: 'manager' as const },
    { email: 'handelaar@test.nl', password: 'wachtwoord123', fullName: 'Test Handelaar', role: 'handelaar' as const },
  ];

  console.log('Creating test users...');

  for (const user of testUsers) {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: user.email,
        password: user.password,
        options: {
          data: {
            full_name: user.fullName,
            role: user.role,
          },
        },
      });

      if (authError) {
        console.error(`Error creating ${user.email}:`, authError.message);
        continue;
      }

      if (!authData.user) {
        console.error(`No user data returned for ${user.email}`);
        continue;
      }

      console.log(`✓ Created ${user.email} (${user.role})`);
    } catch (err) {
      console.error(`Exception creating ${user.email}:`, err);
    }
  }

  console.log('Done creating test users');
}
