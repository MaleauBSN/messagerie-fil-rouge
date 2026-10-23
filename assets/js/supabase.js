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

        if (!passwordIsValid(password)) {
            status.textContent = "Le mot de passe ne respecte pas les critères de sécurité.";
            document.getElementById("password").value = "";
            document.getElementById("password-confirm").value = "";
            return;
        }

        const passwordConfirm = document.getElementById("password-confirm").value;

        if (passwordConfirm != password) {
            status.textContent = "Le mot de passe et la confirmation sont différent.";
            document.getElementById("password").value = "";
            document.getElementById("password-confirm").value = "";
        return;
        }

        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: { data: { display_name: pseudo } }
        });

        if (error || !data.user) {
            status.textContent = error?.message ?? "Erreur d'inscription.";
            return;
        }

        const userId = data.user.id;

        const { error: profileError } = await supabaseClient.from("profiles").insert([{ user_id: userId, user_name: pseudo }]);

        if (profileError) {
            status.textContent = "Erreur du profil : " + profileError.message;
            return;
        }

        if (test_mdp == false) {
            status.textContent = "Le mot de passe est non conforme."
        }

        status.textContent = "Compte créé ! Redirection vers la page de connexion...";

        setTimeout(() => {
            window.location.href = "connexion.html";
        }, 1500);
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
            document.getElementById("password").value = "";
            status.style.color = "rgb(224, 104, 104)";
            status.textContent = "Les informations ne sont associées à aucun compte.";
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

async function enregistrer_message() {
    const bouton = document.getElementById("bouton-envoyer");
    if (!bouton) return;

    bouton.addEventListener("click", async () => {
        const message = document.getElementById("barre-texte-message");

        supabaseClient.from("messages").insert([{content : message}]);
        if (error) {
            console.error("Erreur :", error.message);
        } else {
            console.log("Message enregistré !");
        }
    });
}

function recupere_message() {

}

function recupere_chanel() {

}

async function recupere_contact() {
    const listUsers = await supabaseClient.auth.admin.listUsers();
    console.log(listUsers)

}

function recupere_chanel() {

}

function passwordIsValid(password) {
    const longueur = password.length >= 8;
    const majuscule = /[A-Z]/.test(password);
    const chiffre = /[0-9]/.test(password);

    return longueur && majuscule && chiffre;
}

inscription();
connexion();
deconnexion();
recupere_contact();
enregistrer_message();