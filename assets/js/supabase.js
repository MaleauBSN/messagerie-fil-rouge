// Client Supabase et fonctions d'authentification (inscription, connexion, déconnexion)
const SUPABASE_URL = "https://eshvsvyyrdmlgwtfiglz.supabase.co";
// Clé publique (publishable) : prévue pour être visible côté navigateur
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Hb5v4x8v8iZZJVXWufp23A_fzheBExR";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
)

// Crée le compte à l'envoi du formulaire d'inscription (le pseudo devient le nom d'affichage)
function inscription() {
    const form = document.getElementById("signup-form");
    if (!form) return;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const pseudo = document.getElementById("pseudo").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const status = document.getElementById("signup-status");

        const { error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: { data: { display_name: pseudo } }
        });
        if (error) {
            status.textContent = error.message;
        } else {
            status.textContent = "Compte créé ! Redirection vers la page de connexion...";
            setTimeout(() => {
                window.location.href = "connexion.html";
            }, 1500);
        }
    });
}

// Connecte l'utilisateur à l'envoi du formulaire de connexion, puis ouvre le chat
function connexion() {
    const form = document.getElementById("signin-form");
    if (!form) return;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const status = document.getElementById("signin-status");

        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) {
            status.textContent = error.message;
        } else {
            window.location.href = "chat.html";
        }
    });
}

// Déconnecte l'utilisateur de ce navigateur seulement (scope "local"), puis retourne à la connexion
function deconnexion() {
    const bouton = document.getElementById("logout-button");
    if (!bouton) return;

    bouton.addEventListener("click", async () => {
        const status = document.getElementById("logout-status");
        bouton.disabled = true;
        status.textContent = "";

        const { error } = await supabaseClient.auth.signOut({ scope: "local" });
        if (error) {
            status.textContent = "Déconnexion impossible : " + error.message;
            bouton.disabled = false;
        } else {
            window.location.href = "connexion.html";
        }
    });
}

// Chaque fonction ne fait rien si son formulaire ou son bouton n'est pas sur la page
inscription();
connexion();
deconnexion();
