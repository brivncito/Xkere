import { useState, type FormEvent } from "react";

const initialMessages = [
  { name: "Nox", color: "violet", time: "12:02", text: "¿Quién se apunta a unas partidas esta noche?" },
  { name: "Raven", color: "orange", time: "12:04", text: "Yo estoy dentro. Nos vemos en la sala de voz." },
  { name: "Ghost", color: "blue", time: "12:06", text: "Perfecto, llevo el equipo listo." },
];

const rooms = [
  { name: "Sala principal", type: "voice", people: 3 },
  { name: "Ranked squad", type: "voice", people: 2 },
  { name: "Música", type: "voice", people: 0 },
  { name: "general", type: "text" },
  { name: "clips-y-momentos", type: "text" },
];

function App() {
  const [room, setRoom] = useState("general");
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [muted, setMuted] = useState(false);
  const [joined, setJoined] = useState(false);
  const [activeCommunity, setActiveCommunity] = useState("Night Owls");

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setMessages([...messages, { name: "Waricho", color: "violet", time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), text }]);
    setDraft("");
  }

  return (
    <div className="app">
      <aside className="rail">
        <div className="logo">X</div>
        <button className="rail-button active" aria-label="Inicio">⌂</button>
        <button className="rail-button" aria-label="Mensajes">✉</button>
        <button className="rail-button" aria-label="Añadir comunidad">＋</button>
        <div className="rail-spacer" />
        <div className="user-avatar">W</div>
      </aside>

      <aside className="community-sidebar">
        <div className="brand"><div><strong>XKERE<span>.</span></strong><small>COMUNIDADES EN TIEMPO REAL</small></div><button className="icon-button">⌕</button></div>
        <div className="side-label">TUS COMUNIDADES <button>＋</button></div>
        {["Night Owls", "Racing Hub", "Guild Zero"].map((name, index) => (
          <button key={name} onClick={() => setActiveCommunity(name)} className={`community ${activeCommunity === name ? "selected" : ""}`}>
            <span className={`community-icon c${index}`}>{name[0]}</span><span>{name}</span>{index === 0 && <i />}
          </button>
        ))}
        <button className="add-community">＋ Añadir comunidad</button>
        <div className="side-label rooms-label">SALAS DE {activeCommunity.toUpperCase()}</div>
        <div className="room-group">◖ SALAS DE VOZ</div>
        {rooms.filter(item => item.type === "voice").map(item => (
          <button key={item.name} onClick={() => setRoom(item.name)} className={`room ${room === item.name ? "room-active" : ""}`}>
            <span>♫</span><span>{item.name}</span>{(item.people ?? 0) > 0 && <small>{item.people}</small>}
          </button>
        ))}
        <div className="room-group text-group"># CANALES DE TEXTO</div>
        {rooms.filter(item => item.type === "text").map(item => (
          <button key={item.name} onClick={() => setRoom(item.name)} className={`room ${room === item.name ? "room-active" : ""}`}>
            <span>#</span><span>{item.name}</span>
          </button>
        ))}
        <div className="voice-connection"><span className={joined ? "live-dot" : "idle-dot"} /><div><b>{joined ? "Conectado a voz" : "Sin conexión de voz"}</b><small>{joined ? "Sala principal · vista previa" : "Selecciona una sala para entrar"}</small></div><button aria-label="Configuración">⚙</button></div>
        <div className="profile"><div className="user-avatar small-avatar">W</div><div><b>Waricho</b><small>En línea</small></div><button className="icon-button">⚙</button></div>
      </aside>

      <main className="main">
        <header className="topbar"><div className="crumb"><span className="tiny-community">{activeCommunity[0]}</span><b>{activeCommunity}</b><span className="muted">/</span><span>{room}</span></div><div className="top-tools"><button>⌕</button><button>♙</button><button>?</button></div></header>
        <section className="hero"><div className="eyebrow"><span /> TU COMUNIDAD, TU ESPACIO</div><h1>Donde tu gente<br/><em>se encuentra.</em></h1><p>Entra a una sala, conversa y comparte cada partida.</p><div className="hero-stats"><div><b>03</b><small>MIEMBROS EN LÍNEA</small></div><div><b>03</b><small>SALAS DE VOZ</small></div><div><b>24/7</b><small>SIEMPRE CONECTADOS</small></div></div></section>
        <section className="chat-panel"><div className="chat-heading"><div><small>CANAL DE LA COMUNIDAD</small><h2>{room.startsWith("#") ? room : room === "general" || room === "clips-y-momentos" ? "# " + room : "♫ " + room}</h2></div><span className="demo-pill">VISTA PREVIA</span></div>
          <div className="messages">{messages.map((message, index) => <article className="message" key={index}><div className={`avatar ${message.color}`}>{message.name[0]}</div><div className="message-body"><div className="message-meta"><b>{message.name}</b><time>{message.time}</time></div><p>{message.text}</p></div></article>)}</div>
          <form className="composer" onSubmit={sendMessage}><button type="button" className="attach">＋</button><input value={draft} onChange={event => setDraft(event.target.value)} placeholder={`Escribe en #${room}…`} maxLength={400}/><button className="send" type="submit">Enviar</button></form>
          <p className="demo-note">Los mensajes de esta vista previa se guardan solo mientras esta página está abierta. El chat multiusuario se conectará en una siguiente etapa.</p>
        </section>
      </main>

      <aside className="members"><div className="members-title">MIEMBROS — 3</div><div className="members-label">EN LÍNEA — 3</div>
        {[["N","Nox","Jugando ahora","violet"],["R","Raven","En Sala principal","orange"],["G","Ghost","Jugando ahora","blue"]].map(([letter,name,status,color]) => <div className="member" key={name}><div className={`avatar ${color}`}>{letter}<i/></div><div><b>{name}</b><small>{status}</small></div></div>)}
        <div className="voice-card"><div className="voice-symbol">♫</div><b>Sala principal</b><p>Reúnete con tu squad y mantén la comunicación.</p><button onClick={() => { setRoom("Sala principal"); setJoined(!joined); }}>{joined ? "Salir de voz" : "Entrar a voz"}</button><small>{joined ? "Vista previa: audio aún no conectado" : "Audio real pendiente de implementar"}</small></div>
        <div className="audio-controls"><button onClick={() => setMuted(!muted)} className={muted ? "control-on" : ""}>{muted ? "Micrófono silenciado" : "🎙 Micrófono"}</button><button>🎧 Auriculares</button></div>
      </aside>
    </div>
  );
}

export default App;
