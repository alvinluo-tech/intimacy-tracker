"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient as createClient } from "@/lib/supabase/server";

export async function createInviteCode() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Check if already bound
  const { data: bindings } = await supabase
    .from("couple_bindings")
    .select("*")
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
    
  if (bindings && bindings.length > 0) {
    throw new Error("You are already bound to a partner.");
  }

  // Clear old invitations
  await supabase.from("couple_invitations").delete().eq("inviter_id", user.id);

  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h

  const { error } = await supabase.from("couple_invitations").insert({
    inviter_id: user.id,
    invite_code: inviteCode,
    expires_at: expiresAt,
  });

  if (error) throw new Error("Failed to create invite code.");
  
  revalidatePath("/settings");
  return inviteCode;
}

export async function getInviteCode() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("couple_invitations")
    .select("invite_code, expires_at")
    .eq("inviter_id", user.id)
    .gt("expires_at", new Date().toISOString())
    .single();

  return data;
}

export async function acceptInviteCode(inviteCode: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const code = inviteCode.trim().toUpperCase();

  // Check bindings
  const { data: bindings } = await supabase
    .from("couple_bindings")
    .select("*")
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
    
  if (bindings && bindings.length > 0) {
    throw new Error("You are already bound to a partner.");
  }

  // Find invitation
  const { data: invite } = await supabase
    .from("couple_invitations")
    .select("*")
    .eq("invite_code", code)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (!invite) throw new Error("Invalid or expired invite code.");
  if (invite.inviter_id === user.id) throw new Error("You cannot invite yourself.");

  // Check if inviter is already bound
  const { data: inviterBindings } = await supabase
    .from("couple_bindings")
    .select("*")
    .or(`user1_id.eq.${invite.inviter_id},user2_id.eq.${invite.inviter_id}`);
    
  if (inviterBindings && inviterBindings.length > 0) {
    throw new Error("The inviter is already bound to someone else.");
  }

  // Create binding
  const { error: bindError } = await supabase.from("couple_bindings").insert({
    user1_id: invite.inviter_id,
    user2_id: user.id,
  });

  if (bindError) throw new Error("Failed to bind partners.");

  // Delete all invitations for both users
  await supabase.from("couple_invitations").delete().or(`inviter_id.eq.${user.id},inviter_id.eq.${invite.inviter_id}`);

  revalidatePath("/", "layout");
  return true;
}

export async function unbindPartner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("couple_bindings")
    .delete()
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

  if (error) throw new Error("Failed to unbind.");

  revalidatePath("/", "layout");
  return true;
}

export async function getPartnerProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: bindings } = await supabase
    .from("couple_bindings")
    .select("*")
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .single();

  if (!bindings) return null;

  const partnerId = bindings.user1_id === user.id ? bindings.user2_id : bindings.user1_id;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, display_name")
    .eq("id", partnerId)
    .single();

  return profile;
}