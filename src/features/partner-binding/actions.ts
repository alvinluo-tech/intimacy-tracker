"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient as createClient } from "@/lib/supabase/server";

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

function makeIdentityCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

async function isUserBound(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("couple_bindings")
    .select("id")
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
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

  if (await isUserBound(user.id)) {
    throw new Error("你已绑定伴侣，无法再次发起请求。");
  }

  const code = identityCode.trim().toUpperCase();
  if (!code) throw new Error("请输入身份码。");

  const { data: target, error: targetErr } = await supabase
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
  if (await isUserBound(target.id as string)) {
    throw new Error("对方已绑定伴侣。");
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

  const [requesterProfilesRes, targetProfilesRes] = await Promise.all([
    requesterIds.length
      ? supabase
          .from("profiles")
          .select("id,email,display_name,identity_code")
          .in("id", requesterIds)
      : Promise.resolve({ data: [] as ProfileLite[] }),
    targetIds.length
      ? supabase
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
  const supabase = await createClient();
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
  if (reqErr) throw new Error(reqErr.message);

  if (!req || req.status !== "pending") throw new Error("请求不存在或已处理。");
  if (req.target_id !== user.id) throw new Error("无权限操作该请求。");

  if (await isUserBound(req.requester_id) || (await isUserBound(req.target_id))) {
    throw new Error("请求双方中有一方已绑定伴侣。");
  }

  const { error: bindError } = await supabase.from("couple_bindings").insert({
    user1_id: req.requester_id,
    user2_id: req.target_id,
  });
  if (bindError) throw new Error("绑定失败，请稍后重试。");

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

  revalidatePath("/partners");
  revalidatePath("/", "layout");
  return true;
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

export async function unbindPartner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("couple_bindings")
    .delete()
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

  if (error) throw new Error("Failed to unbind.");

  revalidatePath("/partners");
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
