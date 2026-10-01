import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

// Senin Firebase kimlik kartın
const firebaseConfig = {
    apiKey: "AIzaSyDsQPa2PlDUBzjEiPaH_SoPdgk3ihniCbU",
    authDomain: "gokalppo.firebaseapp.com",
    databaseURL: "https://gokalppo-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "gokalppo",
    storageBucket: "gokalppo.firebasestorage.app",
    messagingSenderId: "1044267247162",
    appId: "1:1044267247162:web:22f5ccd91df340d1bbb703"
};

// Eğer uygulama zaten başlatılmışsa onu kullan, yoksa yenisini başlat
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Optional App Check (reCAPTCHA v3): only active when a site key is configured, so the
// repo works out of the box. See README > "Hardening" before enforcing it in the console.
const appCheckSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
if (appCheckSiteKey) {
    import('firebase/app-check')
        .then(({ initializeAppCheck, ReCaptchaV3Provider }) => {
            initializeAppCheck(app, {
                provider: new ReCaptchaV3Provider(appCheckSiteKey),
                isTokenAutoRefreshEnabled: true
            });
        })
        .catch((e) => console.warn('App Check failed to initialize', e));
}

// Diğer dosyaların kullanabilmesi için dışa aktar
export const auth = getAuth(app);
export const db = getDatabase(app);
