/**
 * One-off bootstrap script — creates/updates the owner user via Supabase Auth + existing tables.
 * Run: node scripts/bootstrap-owner.mjs
 * Does NOT store the password in any database table.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnv() {
  try {
    const raw = readFileSync(resolve(root, ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    /* ignore */
  }
}

loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const OWNER = {
  email: "mahipaljinjala@gmail.com",
  password: "Mahipal@123",
  fullName: "Mahipal Jinjala",
  businessName: "SHREE ADS",
  role: "owner",
};

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or auth key");
  process.exit(1);
}

const isServiceRole =
  SUPABASE_KEY.includes("service_role") ||
  SUPABASE_KEY.startsWith("sb_secret_") ||
  !!process.env.SUPABASE_SERVICE_ROLE_KEY;

function createSupabaseFetch(supabaseKey) {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) new Headers(init.headers).forEach((v, k) => headers.set(k, v));
    if (
      (supabaseKey.startsWith("sb_publishable_") || supabaseKey.startsWith("sb_secret_")) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }
    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  global: { fetch: createSupabaseFetch(SUPABASE_KEY) },
  auth: { persistSession: false, autoRefreshToken: false },
});

const report = {
  userAction: "",
  authStatus: "",
  profileStatus: "",
  businessStatus: "",
  role: OWNER.role,
  loginVerified: false,
  loginError: null,
  userId: null,
};

async function upsertProfileAndBusiness(userId) {
  const { error: profileErr } = await supabase.from("profiles").upsert(
    {
      id: userId,
      email: OWNER.email,
      full_name: OWNER.fullName,
    },
    { onConflict: "id" },
  );
  if (profileErr) throw new Error(`Profile upsert failed: ${profileErr.message}`);

  const { error: bizErr } = await supabase.from("business_settings").upsert(
    {
      owner_id: userId,
      business_name: OWNER.businessName,
      owner_name: OWNER.fullName,
      email: OWNER.email,
    },
    { onConflict: "owner_id" },
  );
  if (bizErr) throw new Error(`Business settings upsert failed: ${bizErr.message}`);

  report.profileStatus = "OK — full_name, email set";
  report.businessStatus = `OK — business_name=${OWNER.businessName}, owner_name=${OWNER.fullName}`;
}

async function findUserByEmail(email) {
  if (!isServiceRole) return null;
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  return data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

async function createOrUpdateUser() {
  // 1. Try sign-in first (user may already exist)
  const signIn = await supabase.auth.signInWithPassword({
    email: OWNER.email,
    password: OWNER.password,
  });

  if (signIn.data.user && signIn.data.session) {
    report.userAction = "Already existed — signed in and updated profile/business";
    report.authStatus = "Existing user — credentials valid";
    report.userId = signIn.data.user.id;
    await upsertProfileAndBusiness(signIn.data.user.id);
    if (isServiceRole) {
      await supabase.auth.admin.updateUserById(signIn.data.user.id, {
        user_metadata: { full_name: OWNER.fullName, role: OWNER.role },
        app_metadata: { role: OWNER.role },
      });
    }
    return;
  }

  // 2. Admin path: find by email without password
  const existing = await findUserByEmail(OWNER.email);
  if (existing) {
    report.userAction = "Already existed — updated via admin API";
    report.authStatus = "Existing user — password reset via admin";
    report.userId = existing.id;

    if (!isServiceRole) {
      throw new Error(
        "User exists but sign-in failed. SUPABASE_SERVICE_ROLE_KEY required to reset password.",
      );
    }

    const { error: updateErr } = await supabase.auth.admin.updateUserById(existing.id, {
      password: OWNER.password,
      email_confirm: true,
      user_metadata: { full_name: OWNER.fullName, role: OWNER.role },
      app_metadata: { role: OWNER.role },
    });
    if (updateErr) throw updateErr;

    await upsertProfileAndBusiness(existing.id);
    return;
  }

  // 3. Create new user
  if (isServiceRole) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: OWNER.email,
      password: OWNER.password,
      email_confirm: true,
      user_metadata: { full_name: OWNER.fullName, role: OWNER.role },
      app_metadata: { role: OWNER.role },
    });
    if (error) throw error;
    report.userAction = "Created new user via admin API";
    report.authStatus = "New user — email confirmed";
    report.userId = data.user.id;
    await upsertProfileAndBusiness(data.user.id);
    return;
  }

  // 4. Public signUp fallback
  const signUp = await supabase.auth.signUp({
    email: OWNER.email,
    password: OWNER.password,
    options: {
      data: { full_name: OWNER.fullName, role: OWNER.role },
    },
  });

  if (signUp.error) {
    if (signUp.error.message.toLowerCase().includes("already registered")) {
      throw new Error(
        "User already registered but sign-in failed. Provide SUPABASE_SERVICE_ROLE_KEY to reset password.",
      );
    }
    throw signUp.error;
  }

  if (!signUp.data.user) throw new Error("SignUp returned no user");

  report.userAction = signUp.data.session
    ? "Created new user via signUp (session returned)"
    : "Created new user via signUp (email confirmation may be required)";
  report.authStatus = signUp.data.session ? "New user — session active" : "New user — check email confirmation";
  report.userId = signUp.data.user.id;

  if (signUp.data.session) {
    await upsertProfileAndBusiness(signUp.data.user.id);
  } else if (isServiceRole) {
    await supabase.auth.admin.updateUserById(signUp.data.user.id, { email_confirm: true });
    await upsertProfileAndBusiness(signUp.data.user.id);
  }
}

async function verifyLogin() {
  const client = createClient(SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY || SUPABASE_KEY, {
    global: {
      fetch: createSupabaseFetch(process.env.VITE_SUPABASE_PUBLISHABLE_KEY || SUPABASE_KEY),
    },
    auth: { persistSession: false },
  });

  const { data, error } = await client.auth.signInWithPassword({
    email: OWNER.email,
    password: OWNER.password,
  });

  if (error) {
    report.loginVerified = false;
    report.loginError = error.message;
    return;
  }

  report.loginVerified = true;
  report.userId = data.user?.id ?? report.userId;

  const { data: settings } = await client.from("business_settings").select("*").maybeSingle();
  report.dashboardBusinessName = settings?.business_name ?? "(not loaded)";
  report.dashboardOwnerName = settings?.owner_name ?? "(not loaded)";
  report.userRole =
    data.user?.app_metadata?.role ?? data.user?.user_metadata?.role ?? OWNER.role;

  await client.auth.signOut();
}

async function main() {
  console.log("Bootstrap owner user...");
  console.log(`Using ${isServiceRole ? "service role" : "publishable"} key\n`);

  await createOrUpdateUser();
  await verifyLogin();

  console.log("\n=== REPORT ===");
  console.log(JSON.stringify(report, null, 2));

  if (!report.loginVerified) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("\nFAILED:", err.message);
  process.exit(1);
});
