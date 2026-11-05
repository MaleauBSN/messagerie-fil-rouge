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

        const { error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

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

// Id de l'utilisateur connecté d'après la session Supabase (null si personne n'est connecté)
async function get_user_id() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    return session?.user?.id ?? null;
}

// Vérifie qu'une valeur ressemble à un uuid, pour ne rien injecter d'autre dans les filtres
function est_uuid(valeur) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valeur ?? "");
}

// Profils (id -> pseudo), chargés une seule fois : contacts et auteurs des messages de salon
let profils = null;

async function charger_profils() {
    if (profils) return profils;

    const { data, error } = await supabaseClient
        .from("profiles")
        .select("user_id, user_name");

    if (error) {
        console.error("Erreur :", error.message);
        return [];
    }

    profils = data;
    return profils;
}

// Pseudo d'un utilisateur d'après les profils chargés
function nom_utilisateur(userId) {
    const profil = (profils ?? []).find(p => String(p.user_id) === String(userId));
    return profil ? profil.user_name : "Inconnu";
}

// Conversation ouverte : un contact (message direct) ou un salon, jamais les deux
function conversation_active() {
    const salonId = sessionStorage.getItem("salonId");
    const destinataireId = sessionStorage.getItem("destinataireId");

    if (/^\d+$/.test(salonId ?? "")) return { type: "salon", id: salonId };
    if (est_uuid(destinataireId)) return { type: "contact", id: destinataireId };
    return null;
}

// Met en évidence, dans les listes, le contact ou le salon ouvert
function marquer_conversation_active() {
    const conversation = conversation_active();

    document.querySelectorAll("#contact-list li, #salon-list li").forEach(element => {
        const actif = conversation
            && element.dataset.type === conversation.type
            && element.dataset.id === String(conversation.id);
        element.classList.toggle("actif", Boolean(actif));
    });
}

// Cache les salons et les contacts qui ne correspondent pas à la recherche (sans tenir compte des accents ni des majuscules)
function appliquer_recherche() {
    const champ = document.getElementById("recherche");
    if (!champ) return;

    const normaliser = (texte) => texte.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const terme = normaliser(champ.value.trim());

    let visibles = 0;
    document.querySelectorAll("#contact-list li, #salon-list li").forEach(element => {
        const cache = terme !== "" && !normaliser(element.dataset.nom ?? element.textContent).includes(terme);
        element.hidden = cache;
        if (!cache) visibles++;
    });

    const vide = document.getElementById("recherche-vide");
    if (vide) vide.hidden = !(terme !== "" && visibles === 0);
}

// Filtre les listes à chaque lettre tapée dans la barre de recherche
function activer_recherche() {
    const champ = document.getElementById("recherche");
    if (!champ) return;

    champ.addEventListener("input", appliquer_recherche);
}

// Heure d'un message (avec la date s'il n'a pas été envoyé aujourd'hui)
function formater_heure(dateIso) {
    if (!dateIso) return "";

    const date = new Date(dateIso);
    const heure = date.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" });

    return date.toDateString() === new Date().toDateString()
        ? heure
        : date.toLocaleDateString("fr-CA") + " " + heure;
}

// Ids des messages déjà affichés, pour ne jamais afficher deux fois le même message
const messagesAffiches = new Set();

// Messages affichés (id -> { element, message }), pour mettre à jour leur statut
const bullesMessages = new Map();

// Les accusés de réception (delivered_at, read_at) sont désactivés si ces colonnes n'existent pas encore
let accusesDisponibles = true;

// Statut d'un de mes messages directs : Envoyé, Reçu ou Lu
function statut_accuse(message) {
    if (message.read_at) return "Lu";
    if (message.delivered_at) return "Reçu";
    return "Envoyé";
}

// Met à jour le statut affiché sous un de mes messages directs quand la base change
function maj_accuse_message(message) {
    const bulle = bullesMessages.get(message.id);
    if (!bulle) return;

    bulle.message.delivered_at = message.delivered_at;
    bulle.message.read_at = message.read_at;

    const statut = bulle.element.querySelector(".message-statut");
    if (statut) statut.textContent = " · " + statut_accuse(bulle.message);
}

// Ajoute un message à la conversation (envoyé à droite, reçu à gauche) avec son heure
// Dans un salon, le pseudo de l'auteur est affiché sur les messages reçus ;
// sous mes messages directs, le statut (Envoyé, Reçu, Lu)
function ajouter_message(message, userId) {
    const listeMessages = document.getElementById("message-list");
    if (!listeMessages || messagesAffiches.has(message.id)) return;
    messagesAffiches.add(message.id);

    const envoye = String(message.user_id) === userId;

    const element = document.createElement("li");
    element.classList.add(envoye ? "message-envoye" : "message-recu");

    if (!envoye && message.channel_id != null) {
        const auteur = document.createElement("strong");
        auteur.classList.add("message-auteur");
        auteur.textContent = nom_utilisateur(message.user_id);
        element.append(auteur);
    }

    const texte = document.createElement("span");
    texte.textContent = message.content;

    const heure = document.createElement("small");
    heure.classList.add("message-heure");
    heure.append(formater_heure(message.created_at));

    if (envoye && message.channel_id == null) {
        const statut = document.createElement("span");
        statut.classList.add("message-statut");
        statut.textContent = " · " + statut_accuse(message);
        heure.append(statut);
    }

    element.append(texte, heure);
    listeMessages.appendChild(element);
    bullesMessages.set(message.id, { element, message: { ...message } });

    // Descendre jusqu'au dernier message
    listeMessages.scrollTop = listeMessages.scrollHeight;
}

// Envoie le message de la barre de texte à la conversation ouverte (bouton ou touche Entrée)
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

        const userId = await get_user_id();
        const conversation = conversation_active();
        const message = barreTexte.value.trim();

        if (!userId || !conversation || !message) return;

        // Un salon se repère par channel_id, un message direct par destinataire_id
        const nouveauMessage = conversation.type === "salon"
            ? { content: message, user_id: userId, channel_id: Number(conversation.id) }
            : { content: message, user_id: userId, destinataire_id: conversation.id };

        const { data, error } = await supabaseClient
            .from("messages")
            .insert([nouveauMessage])
            .select();

        if (error) {
            console.error("Erreur :", error.message);
        } else {
            // Vider la barre de texte et afficher tout de suite le message envoyé
            barreTexte.value = "";

            const ligne = Array.isArray(data) ? data[0] : data;
            if (ligne) ajouter_message(ligne, userId);
        }
    });
}

// Lit les messages d'une conversation, avec les accusés de réception si les colonnes existent
async function charger_messages_conversation(conversation, userId) {
    // Requête des messages de la conversation, avec ou sans les colonnes d'accusés de réception
    const lire_messages = (avecAccuses) => {
        let requete = supabaseClient
            .from("messages")
            .select("id, content, user_id, destinataire_id, channel_id, created_at" + (avecAccuses ? ", delivered_at, read_at" : ""));

        if (conversation.type === "salon") {
            requete = requete.eq("channel_id", Number(conversation.id));
        } else {
            requete = requete.or(
                `and(user_id.eq.${userId},destinataire_id.eq.${conversation.id}),` +
                `and(user_id.eq.${conversation.id},destinataire_id.eq.${userId})`
            );
        }

        return requete.order("created_at", { ascending: true });
    };

    let { data, error } = await lire_messages(accusesDisponibles);

    // Colonnes d'accusés absentes (script SQL pas encore lancé) : on s'en passe
    if (error && accusesDisponibles && /delivered_at|read_at/.test(error.message)) {
        accusesDisponibles = false;
        ({ data, error } = await lire_messages(false));
    }

    return { data, error };
}

// Affiche la conversation ouverte (contact ou salon), du plus ancien au plus récent message
async function recupere_message() {
    const listeMessages = document.getElementById("message-list");
    const conversation = conversation_active();

    if (!listeMessages || !conversation) return;

    const userId = await get_user_id();
    if (!userId) return;

    await charger_profils();

    const { data, error } = await charger_messages_conversation(conversation, userId);

    if (error) {
        console.error("Erreur :", error.message);
        return;
    }

    // Abandonner si l'utilisateur a changé de conversation pendant le chargement
    const encore = conversation_active();
    if (!encore || encore.type !== conversation.type || encore.id !== conversation.id) return;

    listeMessages.innerHTML = "";
    messagesAffiches.clear();
    bullesMessages.clear();

    data.forEach(message => ajouter_message(message, userId));

    // Les messages reçus sont maintenant affichés : les marquer comme lus
    window.marquer_conversation_lue?.();
}

// Sélectionne un contact : mémorise son id, affiche son nom et charge la conversation
function choisir_contact(profil) {
    sessionStorage.removeItem("salonId");
    sessionStorage.setItem("destinataireId", profil.user_id);
    document.querySelector("#header-contact h2").textContent = profil.user_name;
    marquer_conversation_active();
    window.apres_choix_conversation?.();
    recupere_message();
}

// Remplit la liste des contacts avec tous les profils sauf le sien
async function recupere_contacts() {
    const listeContacts = document.getElementById("contact-list");
    if (!listeContacts) return;

    const userId = await get_user_id();
    if (!userId) return;

    const data = await charger_profils();

    // Vider la liste avant de la remplir
    listeContacts.innerHTML = "";

    const destinataireId = sessionStorage.getItem("destinataireId");

    // Créer un élément pour chaque profil
    data.forEach(profil => {
        if (String(profil.user_id) === userId) return;

        const contact = document.createElement("li");
        contact.classList.add("contact");
        contact.dataset.userId = profil.user_id;
        contact.dataset.type = "contact";
        contact.dataset.id = profil.user_id;
        contact.dataset.nom = profil.user_name;

        // Pastille en ligne / hors ligne, nom et nombre de messages non lus
        const pastille = document.createElement("span");
        pastille.classList.add("pastille-statut");

        const nom = document.createElement("span");
        nom.classList.add("nom-element");
        nom.textContent = profil.user_name;

        const badge = document.createElement("span");
        badge.classList.add("badge-non-lu");
        badge.hidden = true;

        contact.append(pastille, nom, badge);
        listeContacts.appendChild(contact);

        contact.addEventListener("click", () => choisir_contact(profil));

        // Après un rechargement de la page, retrouver la conversation en cours
        if (String(profil.user_id) === destinataireId) {
            choisir_contact(profil);
        }
    });

    appliquer_recherche();
    window.apres_rendu_listes?.();
}

// Ids des salons déjà affichés dans la liste
const salonsAffiches = new Set();

// Ajoute un salon à la liste des salons
function ajouter_salon(salon) {
    const listeSalons = document.getElementById("salon-list");
    if (!listeSalons || salonsAffiches.has(salon.id)) return;
    salonsAffiches.add(salon.id);

    const element = document.createElement("li");
    element.classList.add("salon");
    element.dataset.type = "salon";
    element.dataset.id = String(salon.id);
    element.dataset.nom = salon.name;

    const nom = document.createElement("span");
    nom.classList.add("nom-element");
    nom.textContent = "# " + salon.name;

    const badge = document.createElement("span");
    badge.classList.add("badge-non-lu");
    badge.hidden = true;

    element.append(nom, badge);

    element.addEventListener("click", () => choisir_salon(salon));
    listeSalons.appendChild(element);

    appliquer_recherche();
    window.apres_rendu_listes?.();
}

// Sélectionne un salon : mémorise son id, affiche son nom et charge la conversation
function choisir_salon(salon) {
    sessionStorage.removeItem("destinataireId");
    sessionStorage.setItem("salonId", String(salon.id));
    document.querySelector("#header-contact h2").textContent = "# " + salon.name;
    marquer_conversation_active();
    window.apres_choix_conversation?.();
    recupere_message();
}

// Remplit la liste des salons
async function recupere_salons() {
    const listeSalons = document.getElementById("salon-list");
    if (!listeSalons) return;

    const userId = await get_user_id();
    if (!userId) return;

    const { data, error } = await supabaseClient
        .from("channels")
        .select("id, name")
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Erreur :", error.message);
        return;
    }

    listeSalons.innerHTML = "";
    salonsAffiches.clear();

    const salonId = sessionStorage.getItem("salonId");

    data.forEach(salon => {
        ajouter_salon(salon);

        // Après un rechargement de la page, retrouver le salon en cours
        if (String(salon.id) === salonId) {
            choisir_salon(salon);
        }
    });
}

// Crée un salon public à l'envoi du petit formulaire du bouton « + »
function creer_salon() {
    const bouton = document.getElementById("salon-ajouter");
    const formulaire = document.getElementById("salon-form");
    const champ = document.getElementById("salon-nom");

    if (!bouton || !formulaire || !champ) return;

    bouton.addEventListener("click", () => {
        formulaire.hidden = !formulaire.hidden;
        if (!formulaire.hidden) champ.focus();
    });

    formulaire.addEventListener("submit", async (event) => {
        event.preventDefault();

        const nom = champ.value.trim();
        const statut = document.getElementById("salon-status");
        const userId = await get_user_id();

        if (!nom) return;
        if (!userId) {
            statut.textContent = "Tu dois être connecté pour créer un salon.";
            return;
        }

        const { data, error } = await supabaseClient
            .from("channels")
            .insert([{ name: nom, created_by: userId }])
            .select();

        if (error) {
            statut.textContent = "Création impossible : " + error.message;
            return;
        }

        statut.textContent = "";
        champ.value = "";
        formulaire.hidden = true;

        const salon = Array.isArray(data) ? data[0] : data;
        if (salon) {
            ajouter_salon(salon);
            choisir_salon(salon);
        }
    });
}

// Vérifie les critères du mot de passe : 8 caractères, une majuscule et un chiffre
function passwordIsValid(password) {
    const longueur = password.length >= 8;
    const majuscule = /[A-Z]/.test(password);
    const chiffre = /[0-9]/.test(password);

    return longueur && majuscule && chiffre;
}

// Le temps réel applique les règles d'accès avec le rôle de l'abonné : le canal doit donc
// utiliser le jeton de l'utilisateur connecté avant de s'abonner (renvoie false sans session)
async function authentifier_realtime() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return false;

    await supabaseClient.realtime.setAuth(session.access_token);
    return true;
}

// Journalise l'état d'un abonnement en direct (SUBSCRIBED, CHANNEL_ERROR, TIMED_OUT, CLOSED)
function suivre_abonnement(nom) {
    return (statut, erreur) => {
        if (statut !== "SUBSCRIBED") {
            console.warn("Temps réel (" + nom + ") :", statut, erreur ?? "");
        }
    };
}

// Vérifie les nouveaux messages de la conversation ouverte : filet de sécurité si le temps réel
// ne livre pas tout (aucune garantie de livraison côté Supabase) ; met aussi les statuts à jour
async function actualiser_messages() {
    const conversation = conversation_active();
    if (!conversation || !document.getElementById("message-list")) return;
    if (document.visibilityState !== "visible") return;

    const userId = await get_user_id();
    if (!userId) return;

    const { data, error } = await charger_messages_conversation(conversation, userId);
    if (error) return;

    // Abandonner si l'utilisateur a changé de conversation pendant le chargement
    const encore = conversation_active();
    if (!encore || encore.type !== conversation.type || encore.id !== conversation.id) return;

    await charger_profils();

    let nouveaux = 0;
    data.forEach(message => {
        if (bullesMessages.has(message.id)) {
            maj_accuse_message(message);
        } else {
            ajouter_message(message, userId);
            nouveaux++;
        }
    });

    if (nouveaux > 0) window.marquer_conversation_lue?.();
}

// Affiche en direct les nouveaux messages de la conversation ouverte et les nouveaux salons
async function activer_realtime() {
    if (!document.getElementById("message-list")) return;

    // Actualisation de secours toutes les 5 secondes
    setInterval(actualiser_messages, 5000);

    if (!(await authentifier_realtime())) return;

    // Renouveler le jeton du canal quand la session est rafraîchie
    supabaseClient.auth.onAuthStateChange((evenement, session) => {
        if (session) supabaseClient.realtime.setAuth(session.access_token);
    });

    supabaseClient
        .channel("public:messages")
        .on("postgres_changes",
            {
                event: "INSERT",
                schema: "public",
                table: "messages"
            },
            async (payload) => {
                const userId = await get_user_id();
                const conversation = conversation_active();

                const message = payload.new;

                if (!userId || !conversation) return;

                // Vérifier si le message appartient à la conversation ouverte
                let appartient;
                if (conversation.type === "salon") {
                    appartient = message.channel_id != null
                        && String(message.channel_id) === conversation.id;
                } else {
                    appartient =
                        (String(message.user_id) === userId &&
                         String(message.destinataire_id) === conversation.id) ||
                        (String(message.user_id) === conversation.id &&
                         String(message.destinataire_id) === userId);
                }

                if (appartient) {
                    await charger_profils();
                    ajouter_message(message, userId);
                }
            }
        )
        .subscribe(suivre_abonnement("messages"));

    supabaseClient
        .channel("public:channels")
        .on("postgres_changes",
            {
                event: "INSERT",
                schema: "public",
                table: "channels"
            },
            (payload) => ajouter_salon(payload.new)
        )
        .subscribe(suivre_abonnement("salons"));
}

inscription();
connexion();
deconnexion();
activer_recherche();
recupere_contacts();
recupere_salons();
creer_salon();
enregistrer_message();
activer_realtime();
