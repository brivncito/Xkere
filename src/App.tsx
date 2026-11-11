import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";

type Profile = { id: string; username: string; display_name: string; avatar_url: string | null };
type Community = { id: string; name: string; slug: string; description: string };
type Channel = { id: string; community_id: string; name: string; kind: "text" | "voice" | "category"; topic: string };
type Message = { id: string; channel_id: string; author_id: string; body: string; created_at: string; profiles?: { username: string; display_name: string } | null };

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeCommunityId, setActiveCommunityId] = useState("");
  const [activeChannelId, setActiveChannelId] = useState("");
  const [draft, setDraft] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [communityName, setCommunityName] = useState("");
  const [showCreateCommunity, setShowCreateCommunity] = useState(false);

  const activeCommunity = communities.find(c => c.id === activeCommunityId) ?? communities[0];
  const activeChannel = channels.find(c => c.id === activeChannelId) ?? channels.find(c => c.kind === "text");

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) setNotice(error.message);
      setSession(data.session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) setSession(nextSession);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setProfile(null); setCommunities([]); setChannels([]); setMessages([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: p, error: profileError } = await supabase.from("profiles").select("id,username,display_name,avatar_url").eq("id", session.user.id).maybeSingle();
      if (cancelled) return;
      if (profileError) { setNotice(profileError.message); return; }
      setProfile(p);
      const { data: memberships, error: membersError } = await supabase.from("community_members").select("community_id,communities(id,name,slug,description)").eq("user_id", session.user.id);
      if (cancelled) return;
      if (membersError) { setNotice(membersError.message); return; }
      const rows = (memberships ?? []).map((m: any) => m.communities).filter(Boolean) as Community[];
      setCommunities(rows);
      if (rows.length) setActiveCommunityId(current => rows.some(c => c.id === current) ? current : rows[0].id);
      else { setChannels([]); setActiveCommunityId(""); setActiveChannelId(""); }
    })();
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  useEffect(() => {
    if (!activeCommunityId) { setChannels([]); return; }
    let cancelled = false;
    supabase.from("channels").select("id,community_id,name,kind,topic").eq("community_id", activeCommunityId).order("position").then(({ data, error }) => {
      if (cancelled) return;
      if (error) { setNotice(error.message); return; }
      const rows = (data ?? []) as Channel[];
      setChannels(rows);
      setActiveChannelId(current => rows.some(c => c.id === current) ? current : rows.find(c => c.kind === "text")?.id ?? "");
    });
    return () => { cancelled = true; };
  }, [activeCommunityId]);

  useEffect(() => {
    if (!activeChannelId || activeChannel?.kind !== "text") { setMessages([]); return; }
    let cancelled = false;
    const load = async () => {
      const { data, error } = await supabase.from("messages").select("id,channel_id,author_id,body,created_at,profiles(username,display_name)").eq("channel_id", activeChannelId).is("deleted_at", null).order("created_at", { ascending: true }).limit(100);
      if (cancelled) return;
      if (error) { setNotice(error.message); return; }
      setMessages((data ?? []) as Message[]);
    };
    void load();
    const channel = supabase.channel(`messages:${activeChannelId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `channel_id=eq.${activeChannelId}` }, () => { void load(); })
      .subscribe();
    return () => { cancelled = true; void supabase.removeChannel(channel); };
  }, [activeChannelId, activeChannel?.kind]);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setNotice("");
    try {
      if (authMode === "signup") {
        const normalized = username.trim().toLowerCase();
        if (!/^[a-z0-9_]{3,24}$/.test(normalized)) throw new Error("El usuario debe tener 3–24 caracteres: letras, números o guion bajo.");
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { username: normalized, display_name: username.trim() } } });
        if (error) throw error;
        if (data.session && data.user) {
          const { error: profileError } = await supabase.from("profiles").upsert({ id: data.user.id, username: normalized, display_name: username.trim() });
          if (profileError) throw profileError;
        }
        setNotice(data.session ? "Cuenta creada. Bienvenido a Xkere." : "Cuenta creada. Confirma tu correo; luego podrás iniciar sesión.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
    } catch (e) { setNotice(e instanceof Error ? e.message : "No se pudo completar la operación."); }
    finally { setBusy(false); }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    setNotice(error ? error.message : "Sesión cerrada.");
  }

  async function createCommunity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.user || !profile) { setNotice("Tu cuenta no tiene perfil configurado. Cierra sesión e inicia sesión nuevamente o termina de configurar el perfil."); return; }
    const name = communityName.trim();
    const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
    if (name.length < 2 || slug.length < 2) { setNotice("El nombre de la comunidad debe tener al menos 2 caracteres válidos."); return; }
    setBusy(true);
    try {
      const { data: community, error } = await supabase.from("communities").insert({ owner_id: session.user.id, name, slug }).select("id,name,slug,description").single();
      if (error) throw error;
      const { error: memberError } = await supabase.from("community_members").insert({ community_id: community.id, user_id: session.user.id });
      if (memberError) throw memberError;
      const { data: roles, error: roleError } = await supabase.from("community_roles").insert([
        { community_id: community.id, name: "Owner", position: 100, permissions: 0, is_system: true },
        { community_id: community.id, name: "Member", position: 10, permissions: 0, is_system: true },
      ]).select("id,name");
      if (roleError) throw roleError;
      const ownerRole = roles?.find(r => r.name === "Owner");
      if (ownerRole) {
        const { error: assignmentError } = await supabase.from("member_roles").insert({ community_id: community.id, user_id: session.user.id, role_id: ownerRole.id });
        if (assignmentError) throw assignmentError;
      }
      const { error: channelError } = await supabase.from("channels").insert([
        { community_id: community.id, name: "General", kind: "text", position: 1 },
        { community_id: community.id, name: "Sala principal", kind: "voice", position: 2 },
      ]);
      if (channelError) throw channelError;
      setCommunities(current => [...current, community]);
      setActiveCommunityId(community.id);
      setCommunityName(""); setShowCreateCommunity(false); setNotice("Comunidad creada.");
    } catch (e) { setNotice(e instanceof Error ? e.message : "No se pudo crear la comunidad."); }
    finally { setBusy(false); }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !activeChannelId || !session?.user) return;
    setBusy(true);
    const { error } = await supabase.from("messages").insert({ channel_id: activeChannelId, author_id: session.user.id, body });
    if (error) setNotice(error.message);
    else setDraft("");
    setBusy(false);
  }

  const displayName = profile?.display_name || profile?.username || session?.user.email || "Usuario";
  const textChannels = useMemo(() => channels.filter(c => c.kind === "text"), [channels]);
  const voiceChannels = useMemo(() => channels.filter(c => c.kind === "voice"), [channels]);

  if (!session) return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={submitAuth}>
        <div className="auth-logo">XKERE<span>.</span></div>
        <p className="auth-subtitle">JUEGA. HABLA. CONECTA.</p>
        <div className="auth-tabs">
          <button type="button" className={authMode === "login" ? "auth-tab active" : "auth-tab"} onClick={() => setAuthMode("login")}>Iniciar sesión</button>
          <button type="button" className={authMode === "signup" ? "auth-tab active" : "auth-tab"} onClick={() => setAuthMode("signup")}>Crear cuenta</button>
        </div>
        {authMode === "signup" && <><label htmlFor="username">Nombre de usuario</label><input id="username" autoComplete="username" minLength={3} maxLength={24} value={username} onChange={e => setUsername(e.target.value)} required /></>}
        <label htmlFor="email">Correo electrónico</label><input id="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required />
        <label htmlFor="password">Contraseña</label><input id="password" type="password" autoComplete={authMode === "signup" ? "new-password" : "current-password"} minLength={8} value={password} onChange={e => setPassword(e.target.value)} required />
        <button className="auth-submit" type="submit" disabled={busy}>{busy ? "Procesando…" : authMode === "signup" ? "Crear mi cuenta" : "Entrar a Xkere"}</button>
        {notice && <p className="auth-status" role="status">{notice}</p>}
        <p className="auth-footnote">Las cuentas se gestionan mediante Supabase Auth. Nunca compartas tu contraseña.</p>
      </form>
    </div>
  );

  return (
    <div className="app">
      <aside className="rail"><div className="logo">X</div><button className="rail-button active" aria-label="Inicio">⌂</button><button className="rail-button" aria-label="Mensajes">✉</button><div className="rail-spacer" /><div className="user-avatar">{displayName[0]?.toUpperCase()}</div></aside>
      <aside className="community-sidebar">
        <div className="brand"><div><strong>XKERE<span>.</span></strong><small>COMUNIDADES EN TIEMPO REAL</small></div><button className="icon-button" onClick={signOut} title="Cerrar sesión">↪</button></div>
        <div className="side-label">TUS COMUNIDADES <button onClick={() => setShowCreateCommunity(v => !v)}>＋</button></div>
        {communities.map(c => <button key={c.id} onClick={() => setActiveCommunityId(c.id)} className={`community ${activeCommunityId === c.id ? "selected" : ""}`}><span className="community-icon c0">{c.name[0]?.toUpperCase()}</span><span>{c.name}</span></button>)}
        {showCreateCommunity && <form className="inline-create" onSubmit={createCommunity}><input value={communityName} onChange={e => setCommunityName(e.target.value)} placeholder="Nombre de comunidad" maxLength={80} required /><button disabled={busy}>Crear</button></form>}
        {communities.length === 0 && <p className="empty-sidebar">Todavía no perteneces a una comunidad.</p>}
        <button className="add-community" onClick={() => setShowCreateCommunity(true)}>＋ Añadir comunidad</button>
        {activeCommunity && <>
          <div className="side-label rooms-label">SALAS DE {activeCommunity.name.toUpperCase()}</div>
          <div className="room-group">◖ SALAS DE VOZ</div>
          {voiceChannels.map(c => <button key={c.id} onClick={() => setActiveChannelId(c.id)} className={`room ${activeChannelId === c.id ? "room-active" : ""}`}><span>♫</span><span>{c.name}</span></button>)}
          <div className="room-group text-group"># CANALES DE TEXTO</div>
          {textChannels.map(c => <button key={c.id} onClick={() => setActiveChannelId(c.id)} className={`room ${activeChannelId === c.id ? "room-active" : ""}`}><span>#</span><span>{c.name}</span></button>)}
        </>}
        <div className="voice-connection"><span className="idle-dot" /><div><b>Cuenta conectada</b><small>El audio real requiere SFU</small></div></div>
        <div className="profile"><div className="user-avatar small-avatar">{displayName[0]?.toUpperCase()}</div><div><b>{displayName}</b><small>En línea</small></div><button className="icon-button" onClick={signOut}>↪</button></div>
      </aside>
      <main className="main">
        <header className="topbar"><div className="crumb"><span className="tiny-community">{activeCommunity?.name[0] ?? "X"}</span><b>{activeCommunity?.name ?? "Xkere"}</b><span className="muted">/</span><span>{activeChannel?.name ?? "Sin canal"}</span></div><div className="top-tools"><button title="Cuenta" onClick={signOut}>↪</button></div></header>
        <section className="hero"><div className="eyebrow"><span /> TU COMUNIDAD, TU ESPACIO</div><h1>Donde tu gente<br/><em>se encuentra.</em></h1><p>Comunidades, canales y conversaciones conectadas.</p><div className="hero-stats"><div><b>{communities.length.toString().padStart(2,"0")}</b><small>TUS COMUNIDADES</small></div><div><b>{voiceChannels.length.toString().padStart(2,"0")}</b><small>SALAS DE VOZ</small></div><div><b>EN VIVO</b><small>SUPABASE</small></div></div></section>
        <section className="chat-panel">
          <div className="chat-heading"><div><small>{activeCommunity ? activeCommunity.name.toUpperCase() : "TU ESPACIO"}</small><h2>{activeChannel?.kind === "voice" ? "♫ " : "# "}{activeChannel?.name ?? "Selecciona una comunidad"}</h2></div><span className="demo-pill">{activeChannel?.kind === "voice" ? "VOZ · SFU PENDIENTE" : "CHAT CONECTADO"}</span></div>
          {activeChannel?.kind === "voice" ? <div className="messages"><p className="empty-state">La sala existe, pero el audio bidireccional aún necesita configurar el servidor SFU y sus credenciales.</p></div> :
            <div className="messages">
              {!activeChannel && <p className="empty-state">Crea una comunidad para empezar a organizar tus salas.</p>}
              {activeChannel && messages.length === 0 && <p className="empty-state">Todavía no hay mensajes. ¡Saluda a tu comunidad!</p>}
              {messages.map((m) => <article className="message" key={m.id}><div className="avatar violet">{(m.profiles?.display_name || m.profiles?.username || "U")[0].toUpperCase()}</div><div className="message-body"><div className="message-meta"><b>{m.profiles?.display_name || m.profiles?.username || (m.author_id === session.user.id ? displayName : "Miembro")}</b><time>{new Date(m.created_at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</time></div><p>{m.body}</p></div></article>)}
            </div>}
          {activeChannel?.kind === "text" && <form className="composer" onSubmit={sendMessage}><button type="button" className="attach" disabled>＋</button><input value={draft} onChange={e => setDraft(e.target.value)} placeholder={`Escribe en #${activeChannel.name}…`} maxLength={4000} /><button className="send" type="submit" disabled={busy || !draft.trim()}>{busy ? "Enviando…" : "Enviar"}</button></form>}
          {notice && <p className="demo-note" role="status">{notice}</p>}
        </section>
      </main>
      <aside className="members"><div className="members-title">TU CUENTA</div><div className="member"><div className="avatar violet">{displayName[0]?.toUpperCase()}</div><div><b>{displayName}</b><small>{session.user.email}</small></div></div><div className="voice-card"><div className="voice-symbol">♫</div><b>Salas de voz</b><p>La estructura de canales está lista. La comunicación de audio se activará al conectar un SFU.</p><button onClick={() => setNotice("La voz todavía no está activada.")}>Estado de voz</button><small>Audio real pendiente de infraestructura</small></div></aside>
    </div>
  );
}
export default App;
