import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

type EnsureAuthUserInput = {
  email: string;
  name?: string;
  password?: string;
  updatePasswordIfExists?: boolean;
  appUserId?: string;
  organizationId?: string;
};

type EnsureAuthUserResult = {
  userId: string;
  created: boolean;
};

type DeleteAuthUserInput = {
  userId?: string | null;
  email?: string | null;
};

let adminClient: SupabaseClient | null = null;

function getSupabaseAdminClient() {
  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase admin is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  adminClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}

function normalizeEmail(email: string) {
  return email.toLowerCase().trim();
}

async function findSupabaseAuthUserByEmail(email: string): Promise<User | null> {
  const supabase = getSupabaseAdminClient();
  const normalizedEmail = normalizeEmail(email);

  const perPage = 200;
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(`Failed to list Supabase users: ${error.message}`);
    }

    const users = data.users ?? [];
    const match = users.find((user) => normalizeEmail(user.email ?? "") === normalizedEmail);
    if (match) {
      return match;
    }

    if (users.length < perPage) {
      return null;
    }

    page += 1;
  }
}

export async function getSupabaseAuthUserByEmail(email: string) {
  return findSupabaseAuthUserByEmail(email);
}

export async function getSupabaseAuthUserById(userId: string): Promise<User | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.auth.admin.getUserById(userId);

  if (error) {
    const normalized = error.message.toLowerCase();
    if (normalized.includes("not found") || normalized.includes("user") && normalized.includes("found")) {
      return null;
    }

    throw new Error(`Failed to fetch Supabase auth user ${userId}: ${error.message}`);
  }

  return data.user ?? null;
}

function isAlreadyRegisteredError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("already") && normalized.includes("registered");
}

export async function ensureSupabaseAuthUser(input: EnsureAuthUserInput): Promise<EnsureAuthUserResult> {
  const supabase = getSupabaseAdminClient();
  const email = normalizeEmail(input.email);

  const existing = await findSupabaseAuthUserByEmail(email);
  if (existing) {
    if (input.password && input.updatePasswordIfExists) {
      await setSupabaseAuthUserPassword(existing.id, input.password);
    }

    return { userId: existing.id, created: false };
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: input.name ? { name: input.name } : undefined,
    app_metadata:
      input.appUserId || input.organizationId
        ? {
            appUserId: input.appUserId,
            organizationId: input.organizationId,
          }
        : undefined,
  });

  if (error) {
    if (isAlreadyRegisteredError(error.message)) {
      const linked = await findSupabaseAuthUserByEmail(email);
      if (linked) {
        return { userId: linked.id, created: false };
      }
    }

    throw new Error(`Failed to create Supabase auth user: ${error.message}`);
  }

  const userId = data.user?.id;
  if (!userId) {
    throw new Error("Supabase auth user creation returned no user id");
  }

  return { userId, created: true };
}

export async function deleteSupabaseAuthUser(userId: string) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) {
    throw new Error(`Failed to delete Supabase auth user ${userId}: ${error.message}`);
  }
}

export async function setSupabaseAuthUserPassword(userId: string, password: string) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    password,
  });

  if (error) {
    throw new Error(`Failed to update Supabase auth user password ${userId}: ${error.message}`);
  }
}

export async function updateSupabaseAuthUserEmail(userId: string, email: string) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    email: normalizeEmail(email),
    email_confirm: true,
  });

  if (error) {
    throw new Error(`Failed to update Supabase auth user email ${userId}: ${error.message}`);
  }
}

export async function deleteSupabaseAuthUserByReference(input: DeleteAuthUserInput) {
  const userId = input.userId?.trim();
  const email = input.email ? normalizeEmail(input.email) : null;

  let targetUserId = userId ?? null;

  if (!targetUserId && email) {
    const existing = await findSupabaseAuthUserByEmail(email);
    targetUserId = existing?.id ?? null;
  }

  if (!targetUserId) {
    return { deleted: false };
  }

  try {
    await deleteSupabaseAuthUser(targetUserId);
    return { deleted: true };
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    if (message.includes("not found") || message.includes("user not found")) {
      return { deleted: false };
    }

    throw error;
  }
}
