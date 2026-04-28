"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient as createClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { syncBoundPartnersForCurrentUser } from "@/features/partner-binding/mirror";

type ProfileLite = {
  id: string;
  email: string | null;
  display_name: string | null;
  identity_code: string | null;
};

export type BindingRequestView = {
  id: string;
  created_at: string;
  user: ProfileLite | null;
};

export type BoundPartnerView = {
  id: string;
  email: string | null;
  display_name: string | null;
};

function makeIdentityCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

async function isAlreadyBoundTo(userId: string, targetId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("couple_bindings")
    .select("id")
    .or(
      `and(user1_id.eq.${userId},user2_id.eq.${targetId}),and(user1_id.eq.${targetId},user2_id.eq.${userId})`
    )
    .limit(1);
  return Boolean(data && data.length > 0);
}

export async function getMyIdentityCode() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("identity_code")
    .eq("id", user.id)
    .single();
  if (profileErr?.code === "42703") return "";
  if (profileErr) throw new Error(profileErr.message);

  if (profile?.identity_code) return profile.identity_code as string;

  for (let i = 0; i < 6; i++) {
    const candidate = makeIdentityCode();
    const { error } = await supabase
      .from("profiles")
      .update({ identity_code: candidate })
      .eq("id", user.id);
    if (!error) return candidate;
  }

  throw new Error("Failed to generate identity code.");
}

export async function requestBindingByIdentityCode(identityCode: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const code = identityCode.trim().toUpperCase();
  if (!code) throw new Error("请输入身份码。");

  // Use admin client (service_role) to bypass RLS for identity_code lookup
  const admin = createSupabaseAdminClient();
  const { data: target, error: targetErr } = await admin
    .from("profiles")
    .select("id,email,display_name,identity_code")
    .eq("identity_code", code)
    .maybeSingle();
  if (targetErr?.code === "42703") {
    throw new Error("数据库尚未升级，请先执行 0005 迁移。");
  }
  if (targetErr) throw new Error(targetErr.message);

  if (!target) throw new Error("身份码不存在。");
  if (target.id === user.id) throw new Error("不能输入自己的身份码。");
  if (await isAlreadyBoundTo(user.id, target.id as string)) {
    throw new Error("你们已绑定，无需重复发起请求。");
  }

  const { data: pending, error: pendingErr } = await supabase
    .from("couple_binding_requests")
    .select("id")
    .eq("status", "pending")
    .or(
      `and(requester_id.eq.${user.id},target_id.eq.${target.id}),and(requester_id.eq.${target.id},target_id.eq.${user.id})`
    )
    .limit(1);
  if (pendingErr?.code === "42P01") {
    throw new Error("数据库尚未升级，请先执行 0005 迁移。");
  }
  if (pendingErr) throw new Error(pendingErr.message);

  if (pending && pending.length > 0) {
    throw new Error("你们之间已有待处理的绑定请求。");
  }

  const { error } = await supabase.from("couple_binding_requests").insert({
    requester_id: user.id,
    target_id: target.id,
    status: "pending",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/partners");
  return true;
}

export async function getBindingRequests() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { incoming: [], outgoing: [] } as {
    incoming: BindingRequestView[];
    outgoing: BindingRequestView[];
  };

  const [{ data: incomingRows, error: incomingErr }, { data: outgoingRows, error: outgoingErr }] = await Promise.all([
    supabase
      .from("couple_binding_requests")
      .select("id,requester_id,created_at")
      .eq("target_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase
      .from("couple_binding_requests")
      .select("id,target_id,created_at")
      .eq("requester_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);
  if (incomingErr?.code === "42P01" || outgoingErr?.code === "42P01") {
    return { incoming: [], outgoing: [] };
  }
  if (incomingErr) throw new Error(incomingErr.message);
  if (outgoingErr) throw new Error(outgoingErr.message);

  const requesterIds = Array.from(
    new Set((incomingRows ?? []).map((r) => r.requester_id as string))
  );
  const targetIds = Array.from(
    new Set((outgoingRows ?? []).map((r) => r.target_id as string))
  );

  const admin = createSupabaseAdminClient();
  const [requesterProfilesRes, targetProfilesRes] = await Promise.all([
    requesterIds.length
      ? admin
          .from("profiles")
          .select("id,email,display_name,identity_code")
          .in("id", requesterIds)
      : Promise.resolve({ data: [] as ProfileLite[] }),
    targetIds.length
      ? admin
          .from("profiles")
          .select("id,email,display_name,identity_code")
          .in("id", targetIds)
      : Promise.resolve({ data: [] as ProfileLite[] }),
  ]);
  if ((requesterProfilesRes as any).error?.code === "42703" || (targetProfilesRes as any).error?.code === "42703") {
    return { incoming: [], outgoing: [] };
  }

  const requesterMap = new Map(
    ((requesterProfilesRes.data ?? []) as ProfileLite[]).map((p) => [p.id, p])
  );
  const targetMap = new Map(
    ((targetProfilesRes.data ?? []) as ProfileLite[]).map((p) => [p.id, p])
  );

  return {
    incoming: (incomingRows ?? []).map((r) => ({
      id: r.id as string,
      created_at: r.created_at as string,
      user: requesterMap.get(r.requester_id as string) ?? null,
    })),
    outgoing: (outgoingRows ?? []).map((r) => ({
      id: r.id as string,
      created_at: r.created_at as string,
      user: targetMap.get(r.target_id as string) ?? null,
    })),
  };
}

export async function approveBindingRequest(requestId: string) {
  try {
    const supabase = await createClient();
    const admin = createSupabaseAdminClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: req, error: reqErr } = await supabase
      .from("couple_binding_requests")
      .select("id,requester_id,target_id,status")
      .eq("id", requestId)
      .maybeSingle();
    if (reqErr?.code === "42P01") throw new Error("数据库尚未升级，请先执行 0005 迁移。");
    if (reqErr) throw new Error(`查询绑定请求失败: ${reqErr.message}`);

    if (!req || req.status !== "pending") throw new Error("请求不存在或已处理。");
    if (req.target_id !== user.id) throw new Error("无权限操作该请求。");

    if (await isAlreadyBoundTo(req.requester_id, req.target_id)) {
      throw new Error("你们已绑定，无需重复操作。");
    }

    const [user1Id, user2Id] = [req.requester_id, req.target_id].sort();
    // Use admin client to bypass RLS for binding insertion
    const { error: bindError } = await admin.from("couple_bindings").insert({
      user1_id: user1Id,
      user2_id: user2Id,
    });
    if (bindError?.code === "23505") {
      throw new Error("你们已绑定，无需重复操作。");
    }
    if (bindError) throw new Error(`绑定失败: ${bindError.message} (code: ${bindError.code})`);

    await supabase
      .from("couple_binding_requests")
      .update({ status: "approved", reviewed_at: new Date().toISOString() })
      .eq("id", req.id);

    await supabase
      .from("couple_binding_requests")
      .update({ status: "rejected", reviewed_at: new Date().toISOString() })
      .eq("status", "pending")
      .or(
        `and(requester_id.eq.${req.requester_id},target_id.eq.${req.target_id}),and(requester_id.eq.${req.target_id},target_id.eq.${req.requester_id})`
      )
      .neq("id", req.id);

    // Sync mirror partner records
    // For the current user (approver / target), use the authenticated client
    await syncBoundPartnersForCurrentUser(supabase, req.target_id);
    // For the requester, use admin (service_role) to bypass RLS
    await syncBoundPartnersForCurrentUser(admin as any, req.requester_id);

    revalidatePath("/partners");
    revalidatePath("/", "layout");
    return true;
  } catch (error) {
    console.error("approveBindingRequest error:", error);
    throw error;
  }
}

export async function rejectBindingRequest(requestId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: req, error: reqErr } = await supabase
    .from("couple_binding_requests")
    .select("id,target_id,status")
    .eq("id", requestId)
    .maybeSingle();
  if (reqErr?.code === "42P01") throw new Error("数据库尚未升级，请先执行 0005 迁移。");
  if (reqErr) throw new Error(reqErr.message);
  if (!req || req.status !== "pending") throw new Error("请求不存在或已处理。");
  if (req.target_id !== user.id) throw new Error("无权限操作该请求。");

  const { error } = await supabase
    .from("couple_binding_requests")
    .update({ status: "rejected", reviewed_at: new Date().toISOString() })
    .eq("id", requestId);
  if (error) throw new Error("拒绝请求失败。");

  revalidatePath("/partners");
  return true;
}

export async function unbindPartner(targetUserId?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = targetUserId
    ? await supabase
        .from("couple_bindings")
        .delete()
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${targetUserId}),and(user1_id.eq.${targetUserId},user2_id.eq.${user.id})`)
    : await supabase
        .from("couple_bindings")
        .delete()
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

  if (error) throw new Error("Failed to unbind.");

  await supabase
    .from("profiles")
    .update({
      prefer_bound_partner_default: false,
      default_bound_user_id: null,
    })
    .eq("id", user.id);

  if (targetUserId) {
    await supabase
      .from("partners")
      .update({ status: "archived", is_active: false, is_default: false })
      .eq("user_id", user.id)
      .eq("source", "bound")
      .eq("bound_user_id", targetUserId);
  }

  revalidatePath("/partners");
  revalidatePath("/", "layout");
  return true;
}

export async function getPreferBoundPartnerDefault() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from("profiles")
    .select("prefer_bound_partner_default,default_bound_user_id")
    .eq("id", user.id)
    .maybeSingle();

  if (error?.code === "42703") return false;
  if (error) throw new Error(error.message);

  if ((data as any)?.default_bound_user_id) return true;
  return Boolean(data?.prefer_bound_partner_default);
}

export async function getDefaultBoundPartnerId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("default_bound_user_id")
    .eq("id", user.id)
    .maybeSingle();
  if (error?.code === "42703") return null;
  if (error) throw new Error(error.message);
  return ((data as any)?.default_bound_user_id as string | null) ?? null;
}

export async function setBoundPartnerAsDefault(boundUserId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: bindingRow, error: bindingErr } = await supabase
    .from("couple_bindings")
    .select("id")
    .or(`and(user1_id.eq.${user.id},user2_id.eq.${boundUserId}),and(user1_id.eq.${boundUserId},user2_id.eq.${user.id})`)
    .limit(1);
  if (bindingErr) throw new Error(bindingErr.message);
  if (!bindingRow || bindingRow.length === 0) throw new Error("当前未与该账号绑定");

  const { error: clearErr } = await supabase
    .from("partners")
    .update({ is_default: false })
    .eq("user_id", user.id);
  if (clearErr) throw new Error(clearErr.message);

  const { error: profileErr } = await supabase
    .from("profiles")
    .update({
      prefer_bound_partner_default: true,
      default_bound_user_id: boundUserId,
    })
    .eq("id", user.id);

  if (profileErr?.code === "42703") {
    throw new Error("数据库尚未升级，请先执行 0009 迁移。");
  }
  if (profileErr) throw new Error(profileErr.message);

  revalidatePath("/partners");
  revalidatePath("/", "layout");
  return true;
}

export async function getBoundPartnerProfiles(): Promise<BoundPartnerView[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: bindings, error: bindErr } = await supabase
    .from("couple_bindings")
    .select("user1_id,user2_id")
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
  if (bindErr) throw new Error(bindErr.message);

  const ids = Array.from(
    new Set(
      (bindings ?? [])
        .map((row: any) => (row.user1_id === user.id ? row.user2_id : row.user1_id))
        .filter((id: string | null) => Boolean(id))
    )
  );
  if (!ids.length) return [];

  const { data: profiles, error: profileErr } = await supabase
    .from("profiles")
    .select("id,email,display_name")
    .in("id", ids);
  if (profileErr) throw new Error(profileErr.message);

  const map = new Map(
    ((profiles ?? []) as BoundPartnerView[]).map((p) => [p.id, p])
  );
  return ids.map((id) => map.get(id)).filter((v): v is BoundPartnerView => Boolean(v));
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
