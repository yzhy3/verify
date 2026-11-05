// api/callback.js
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO_ID",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "TU_MESSAGING_ID",
  appId: "TU_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: "No code provided" });
  }

  try {
    // 1. Intercambiar código por token
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code: code,
        redirect_uri: process.env.REDIRECT_URI || "https://x.greed.best/oauth/callback"
      })
    });

    const data = await tokenResponse.json();
    
    if (!data.access_token) throw new Error("Failed to exchange code");

    // 2. Obtener datos del usuario
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${data.access_token}` }
    });
    const userData = await userResponse.json();

    // 3. Guardar en Firebase
    await setDoc(doc(db, "users", userData.id), {
      id: userData.id,
      username: userData.username,
      token: data.access_token,
      lastLogin: new Date().toISOString()
    });

    // 4. Redirección Silenciosa a la página principal
    // Usamos 'state' para pasar información extra si fuera necesario, 
    // pero aquí usamos el query param ?user=ID para que el JS frontend lo lea.
    res.redirect(`https://vzon.moe/?auth=${userData.id}`);

  } catch (error) {
    console.error(error);
    res.redirect("https://vzon.moe/?error=true");
  }
}