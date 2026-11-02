// Page Paramètres : modifier son pseudo et son mot de passe

// Affiche un message sous un formulaire (en blanc si ok, en rouge pour une erreur)
function afficher_message(id, texte, ok) {
    const element = document.getElementById(id);
    element.textContent = texte;
    element.style.color = ok ? "white" : "rgb(224, 104, 104)";
}

// Renvoie l'utilisateur connecté, ou ramène à la connexion s'il n'y en a pas
async function utilisateur_connecte() {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        window.location.href = "connexion.html";
        return null;
    }
    return session.user;
}

// Remplit la page avec l'adresse courriel et le pseudo actuels
async function charger_parametres() {
    const user = await utilisateur_connecte();
    if (!user) return;

    document.getElementById("parametres-email").textContent = user.email;

    const { data: profil } = await supabaseClient
        .from("profiles")
        .select("user_name")
        .eq("user_id", user.id)
        .maybeSingle();

    document.getElementById("pseudo-parametre").value =
        profil?.user_name ?? user.user_metadata?.display_name ?? "";
}

// Enregistre le nouveau pseudo dans le profil (liste des contacts) puis dans le compte
function changer_pseudo() {
    const formulaire = document.getElementById("pseudo-form");

    formulaire.addEventListener("submit", async (event) => {
        event.preventDefault();

        const pseudo = document.getElementById("pseudo-parametre").value.trim();
        const user = await utilisateur_connecte();
        if (!user || !pseudo) return;

        const { data, error } = await supabaseClient
            .from("profiles")
            .update({ user_name: pseudo })
            .eq("user_id", user.id)
            .select();

        if (error) {
            afficher_message("pseudo-status", "Modification impossible : " + error.message, false);
            return;
        }

        // Compte créé sans profil : on le crée maintenant
        if (!data || data.length === 0) {
            const { error: erreurCreation } = await supabaseClient
                .from("profiles")
                .insert([{ user_id: user.id, user_name: pseudo }]);

            if (erreurCreation) {
                afficher_message("pseudo-status", "Modification impossible : " + erreurCreation.message, false);
                return;
            }
        }

        const { error: erreurCompte } = await supabaseClient.auth.updateUser({ data: { display_name: pseudo } });

        if (erreurCompte) {
            afficher_message("pseudo-status", "Pseudo modifié pour vos contacts, mais pas dans le compte : " + erreurCompte.message, false);
            return;
        }

        afficher_message("pseudo-status", "Pseudo modifié.", true);
    });
}

// Change le mot de passe après avoir vérifié le mot de passe actuel
function changer_mot_de_passe() {
    const formulaire = document.getElementById("mdp-form");

    formulaire.addEventListener("submit", async (event) => {
        event.preventDefault();

        const actuel = document.getElementById("password-actuel").value;
        const nouveau = document.getElementById("password").value;
        const confirmation = document.getElementById("password-confirm").value;

        if (!passwordIsValid(nouveau)) {
            afficher_message("mdp-status", "Le nouveau mot de passe ne respecte pas les critères de sécurité.", false);
            return;
        }
        if (nouveau !== confirmation) {
            afficher_message("mdp-status", "Le mot de passe et la confirmation sont différents.", false);
            return;
        }

        const user = await utilisateur_connecte();
        if (!user) return;

        // Vérifier le mot de passe actuel en se reconnectant avec
        const { error: erreurVerification } = await supabaseClient.auth.signInWithPassword({
            email: user.email,
            password: actuel
        });

        if (erreurVerification) {
            afficher_message("mdp-status", "Le mot de passe actuel est incorrect.", false);
            return;
        }

        const { error } = await supabaseClient.auth.updateUser({ password: nouveau });

        if (error) {
            afficher_message("mdp-status", "Modification impossible : " + error.message, false);
            return;
        }

        formulaire.reset();
        document.querySelectorAll("#password-requirements li").forEach(critere => {
            critere.style.color = "";
        });
        afficher_message("mdp-status", "Mot de passe modifié.", true);
    });
}

// Case « son des notifications » : le choix est gardé dans ce navigateur
function regler_son_notifications() {
    const case_son = document.getElementById("son-notifications");

    try {
        case_son.checked = localStorage.getItem("sonNotifications") !== "non";
    } catch {
        case_son.checked = true;
    }

    case_son.addEventListener("change", () => {
        try {
            localStorage.setItem("sonNotifications", case_son.checked ? "oui" : "non");
        } catch {
            // Stockage indisponible (navigation privée) : le réglage n'est pas conservé
        }
    });
}

charger_parametres();
changer_pseudo();
changer_mot_de_passe();
regler_son_notifications();
