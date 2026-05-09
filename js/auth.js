import { supabase } from "./supabase.js";

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    window.location.replace("login.html");
    return null;
  }
  return session;
}

export async function logout() {
  await supabase.auth.signOut();
  window.location.replace("login.html");
}
