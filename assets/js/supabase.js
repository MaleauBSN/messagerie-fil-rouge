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

        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            document.getElementById("password").value = "";
            status.style.color = "rgb(224, 104, 104)";
            status.textContent = "Les informations ne sont associées à aucun compte.";
        } else {
            // Enregistrer l'ID de l'utilisateur
            sessionStorage.setItem("userId", data.user.id);

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

function enregistrer_message() {
    const bouton = document.getElementById("bouton-envoyer");
    const barreTexte = document.getElementById("barre-texte-message");

    if (!bouton || !barreTexte) return;

    // Envoi avec Enter
    barreTexte.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            bouton.click();
        }
    });

    // Envoi avec le bouton
    bouton.addEventListener("click", async (event) => {
        event.preventDefault();

        const userId = sessionStorage.getItem("userId");
        const destinataireId = sessionStorage.getItem("destinataireId");
        const message = barreTexte.value.trim();

        if (!userId || !destinataireId || !message) return;

        const { error } = await supabaseClient
            .from("messages")
            .insert([{
                content: message,
                destinataire_id: destinataireId,
                user_id: userId
            }]);

        if (error) {
            console.error("Erreur :", error.message);
        } else {
            console.log("Message enregistré !");

            // Vider la barre de texte
            barreTexte.value = "";
        }
    });
}


async function recupere_message() {
    const userId = sessionStorage.getItem("userId");
    const destinataireId = sessionStorage.getItem("destinataireId");
    const listeMessages = document.getElementById("message-list");

    if (!userId || !listeMessages) return;

    // Récupérer les messages de la conversation
    const { data, error } = await supabaseClient
        .from("messages")
        .select("*")
        .or(
            `and(user_id.eq.${userId},destinataire_id.eq.${destinataireId}),` +
            `and(user_id.eq.${destinataireId},destinataire_id.eq.${userId})`
        );

    if (error) {
        console.error("Erreur :", error.message);
        return;
    }
    
    listeMessages.innerHTML = "";
    document.getElementById("header-contact").textContent = (await supabaseClient.from("profiles").select("user_name").eq("user_id", destinataireId).single()).data.user_name;

    data.forEach(message => {
        const element = document.createElement("div");

        if (message.user_id != userId) {
            element.classList.add("message-recu");
            element.textContent = message.content;
            element.dataset.userId = message.destinataire_id;

            listeMessages.appendChild(element);
        } else {
            element.classList.add("message-envoye");
            element.textContent = message.content;
            element.dataset.userId = message.destinataire_id;

            listeMessages.appendChild(element);
        }
        
    });
}

function recupere_chanel() {

}

async function recupere_contacts() {

    const { data, error } = await supabaseClient
        .from("profiles")
        .select("user_id, user_name");

    if (error) {
        console.error("Erreur :", error.message);
        return;
    }

    const listeContacts = document.getElementById("contact-list");

    // Vider la liste avant de la remplir
    listeContacts.innerHTML = "";

    const userId = sessionStorage.getItem("userId")

    // Créer un élément pour chaque profil
    data.forEach(profil => {
        const contact = document.createElement("div");

        if (profil.user_id != userId) {
            contact.classList.add("contact");
            contact.textContent = profil.user_name;
            contact.dataset.userId = profil.user_id;

            listeContacts.appendChild(contact);

            contact.addEventListener("click", async () => {
            sessionStorage.setItem("destinataireId", profil.user_id);
            recupere_message();
            });
        }
        
    });

}

function recupere_chanel() {

}

function passwordIsValid(password) {
    const longueur = password.length >= 8;
    const majuscule = /[A-Z]/.test(password);
    const chiffre = /[0-9]/.test(password);

    return longueur && majuscule && chiffre;
}

function activer_realtime() {
    supabaseClient
        .channel("public:messages")
        .on("postgres_changes",
            {
                event: "INSERT",
                schema: "public",
                table: "messages"
            },
            async (payload) => {
                const userId = sessionStorage.getItem("userId");
                const destinataireId = sessionStorage.getItem("destinataireId");

                const message = payload.new;

                // Vérifier si le message appartient à la conversation
                if (
                    (message.user_id === userId &&
                     message.destinataire_id === destinataireId) ||
                    (message.user_id === destinataireId &&
                     message.destinataire_id === userId)
                ) {
                    await recupere_message();
                }
            }
        )
        .subscribe();
}

inscription();
connexion();
deconnexion();
recupere_contacts();
recupere_message();
enregistrer_message();
activer_realtime();