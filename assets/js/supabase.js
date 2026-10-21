const SUPABASE_URL = "https://eshvsvyyrdmlgwtfiglz.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Hb5v4x8v8iZZJVXWufp23A_fzheBExR";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
)

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
                window.location.href = "sign_in.html";
            }, 1500);
        }
    });
}

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
            window.location.href = "sign_in.html";
        }
    });
}

inscription();
connexion();
deconnexion();
