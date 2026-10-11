
const SUPABASE_URL = "https://mrraurmwnvmunwljosxe.supabase.co/rest/v1/";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_1iP-6NEYz_U7YIBkzucwOg_wNIC538u";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const translations = {
  es: {
    tagline:"Juega. Habla. Conecta.", communities:"TUS COMUNIDADES", addCommunity:"Añadir comunidad", channels:"CANALES",
    voice:"Voz", lobby:"Sala principal", ranked:"Ranked squad", text:"Texto", general:"general", clips:"clips-y-momentos",
    voiceConnected:"Vista previa de voz", voiceDemo:"Audio aún no conectado", online:"En línea", earlyPreview:"VISTA PREVIA · CONCEPTO INICIAL",
    welcomeTitle:"Tu gente.<br><em>Tu partida.</em>", welcomeText:"Un espacio para reunirte, coordinar y compartir cada momento. Xkere está empezando.",
    onlineNow:"EN LÍNEA", voiceRooms:"SALAS DE VOZ", yourCommunity:"TU COMUNIDAD", communityChat:"CHAT DE LA COMUNIDAD", demoMode:"MODO DEMO",
    msg1:"¿Quién se apunta a unas partidas esta noche?", msg2:"Yo estoy dentro. Nos vemos en la sala de voz.", msg3:"Perfecto, llevo el equipo listo.",
    messagePlaceholder:"Escribe un mensaje en #general…", send:"Enviar", demoNote:"Esta es una maqueta visual: los mensajes solo se muestran en este navegador. El chat real y la voz se conectarán en la siguiente fase.",
    members:"MIEMBROS — 3", onlineGroup:"EN LÍNEA — 3", playing:"Jugando ahora", inVoice:"En Sala principal",
    voiceRoomTitle:"Sala principal", voiceRoomText:"Reúnete con tu squad y mantén la comunicación.", joinVoice:"Entrar a voz", voiceNotReady:"Función visual · audio pendiente",
    voiceJoined:"Vista previa activa", voiceJoinedNote:"Interfaz de voz en modo demo"
  },
  en: {
    tagline:"Play. Talk. Connect.", communities:"YOUR COMMUNITIES", addCommunity:"Add a community", channels:"CHANNELS",
    voice:"Voice", lobby:"Main lobby", ranked:"Ranked squad", text:"Text", general:"general", clips:"clips-and-moments",
    voiceConnected:"Voice preview", voiceDemo:"Audio not connected yet", online:"Online", earlyPreview:"PREVIEW · EARLY CONCEPT",
    welcomeTitle:"Your people.<br><em>Your game.</em>", welcomeText:"A place to meet up, coordinate, and share every moment. Xkere is just getting started.",
    onlineNow:"ONLINE", voiceRooms:"VOICE ROOMS", yourCommunity:"YOUR COMMUNITY", communityChat:"COMMUNITY CHAT", demoMode:"DEMO MODE",
    msg1:"Who’s up for a few games tonight?", msg2:"I’m in. See you in the voice room.", msg3:"Perfect, I’ve got the squad ready.",
    messagePlaceholder:"Write a message in #general…", send:"Send", demoNote:"This is a visual mockup: messages only appear in this browser. Real chat and voice will be connected in the next phase.",
    members:"MEMBERS — 3", onlineGroup:"ONLINE — 3", playing:"Playing now", inVoice:"In Main lobby",
    voiceRoomTitle:"Main lobby", voiceRoomText:"Meet up with your squad and stay connected.", joinVoice:"Join voice", voiceNotReady:"Visual feature · audio pending",
    voiceJoined:"Preview active", voiceJoinedNote:"Voice interface in demo mode"
  }
};
let currentLang = "es";
const langToggle = document.getElementById("lang-toggle");
function setLanguage(lang) {
  currentLang = lang;
  document.documentElement.lang = lang;
  langToggle.textContent = lang === "es" ? "EN" : "ES";
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    if (translations[lang][key]) el.innerHTML = translations[lang][key];
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    if (translations[lang][key]) el.placeholder = translations[lang][key];
  });
}
langToggle.addEventListener("click", () => setLanguage(currentLang === "es" ? "en" : "es"));

const form = document.getElementById("chat-form");
const input = document.getElementById("message-input");
const messages = document.getElementById("messages");
form.addEventListener("submit", event => {
  event.preventDefault();
  const value = input.value.trim();
  if (!value) return;
  const message = document.createElement("div");
  message.className = "message";
  const avatar = document.createElement("div");
  avatar.className = "avatar you";
  avatar.textContent = "W";
  const body = document.createElement("div");
  const meta = document.createElement("div");
  meta.className = "message-meta";
  const name = document.createElement("strong");
  name.textContent = "Waricho";
  const time = document.createElement("time");
  time.textContent = new Date().toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
  const text = document.createElement("p");
  text.textContent = value;
  meta.append(name, time);
  body.append(meta, text);
  message.append(avatar, body);
  messages.append(message);
  input.value = "";
  messages.scrollTop = messages.scrollHeight;
});
const voiceButton = document.getElementById("voice-button");
voiceButton.addEventListener("click", () => {
  const card = voiceButton.closest(".voice-card");
  const joined = card.classList.toggle("joined");
  voiceButton.textContent = joined ? (currentLang === "es" ? "Salir de vista previa" : "Leave preview") : translations[currentLang].joinVoice;
  card.querySelector("small").textContent = joined ? translations[currentLang].voiceJoinedNote : translations[currentLang].voiceNotReady;
});

/* XKERE — Autenticación con Supabase */

const authScreen = document.getElementById("auth-screen");
const signupForm = document.getElementById("signup-form");
const loginForm = document.getElementById("login-form");
const showLogin = document.getElementById("show-login");
const showSignup = document.getElementById("show-signup");
const authStatus = document.getElementById("auth-status");

function showAuthMessage(message, isError = false) {
  authStatus.textContent = message;
  authStatus.style.color = isError ? "#ff8585" : "#c8b6ff";
}

showLogin.addEventListener("click", () => {
  signupForm.hidden = true;
  loginForm.hidden = false;
  showLogin.classList.add("active");
  showSignup.classList.remove("active");
  showAuthMessage("");
});

showSignup.addEventListener("click", () => {
  loginForm.hidden = true;
  signupForm.hidden = false;
  showSignup.classList.add("active");
  showLogin.classList.remove("active");
  showAuthMessage("");
});

signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const username = document.getElementById("signup-username").value.trim();
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;

  if (!supabaseClient || !SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    showAuthMessage("Falta configurar la conexión con Supabase.", true);
    return;
  }

  showAuthMessage("Creando tu cuenta...");

  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: { username },
        emailRedirectTo: window.location.origin + window.location.pathname
      }
    });

    if (error) throw error;

    if (data.session) {
      showAuthMessage("¡Cuenta creada! Ya puedes entrar a Xkere.");
    } else {
      showAuthMessage("¡Casi listo! Revisa tu correo y confirma tu cuenta.");
    }
  } catch (error) {
    showAuthMessage(error.message || "No se pudo crear la cuenta.", true);
  }
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  showAuthMessage("Iniciando sesión...");

  try {
    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    showAuthMessage("¡Sesión iniciada correctamente!");
  } catch (error) {
    showAuthMessage(error.message || "No se pudo iniciar sesión.", true);
  }
});

async function updateAuthScreen() {
  const { data, error } = await supabaseClient.auth.getSession();

  if (error) {
    showAuthMessage("No se pudo comprobar la sesión.", true);
    return;
  }

  if (data.session) {
    authScreen.hidden = true;
  } else {
    authScreen.hidden = false;
  }
}

supabaseClient.auth.onAuthStateChange(() => {
  updateAuthScreen();
});

updateAuthScreen();
