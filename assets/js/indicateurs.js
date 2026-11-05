// Indicateurs et notifications du chat : en ligne / hors ligne, « en train d'écrire »,
// notification des nouveaux messages et accusés de réception (reçu, lu)

// Durée pendant laquelle « en train d'écrire » reste affiché sans nouveau signal
const DUREE_ECRITURE_MS = 3000;
// Délai minimum entre deux signaux d'écriture envoyés
const DELAI_ENVOI_ECRITURE_MS = 1500;

let utilisateurCourant = null;
let utilisateursEnLigne = new Set();
let canalEcriture = null;
let minuteurEcriture = null;
let dernierEnvoiEcriture = 0;
let contexteAudio = null;
const titreDeBase = document.title;

// Nombre de messages non lus par conversation (clé "contact:<id>" ou "salon:<id>")
const nonLus = new Map();

// ---------- En ligne / hors ligne ----------

// Colore la pastille de chaque contact selon qu'il est connecté au chat ou non
function maj_statuts_en_ligne() {
    document.querySelectorAll("#contact-list li[data-type='contact']").forEach(contact => {
        const pastille = contact.querySelector(".pastille-statut");
        if (pastille) pastille.classList.toggle("en-ligne", utilisateursEnLigne.has(contact.dataset.id));
    });
    maj_statut_contact();
}

// Affiche « En ligne » ou « Hors ligne » dans l'en-tête de la conversation avec un contact
function maj_statut_contact() {
    const element = document.getElementById("statut-contact");
    if (!element) return;

    const conversation = conversation_active();
    if (!conversation || conversation.type !== "contact") {
        element.textContent = "";
        element.classList.remove("en-ligne");
        return;
    }

    const connecte = utilisateursEnLigne.has(conversation.id);
    element.textContent = connecte ? "En ligne" : "Hors ligne";
    element.classList.toggle("en-ligne", connecte);
}

// Annonce notre présence et suit celle des autres (la clé de présence est l'id de l'utilisateur)
function demarrer_presence() {
    const canal = supabaseClient.channel("presence:wallo", {
        config: { presence: { key: utilisateurCourant } }
    });

    canal
        .on("presence", { event: "sync" }, () => {
            utilisateursEnLigne = new Set(Object.keys(canal.presenceState()));
            maj_statuts_en_ligne();
        })
        .subscribe(async (statut, erreur) => {
            suivre_abonnement("présence")(statut, erreur);
            if (statut === "SUBSCRIBED") {
                await canal.track({ en_ligne_depuis: new Date().toISOString() });
            }
        });
}

// ---------- En train d'écrire ----------

// Efface l'indicateur « en train d'écrire »
function effacer_ecriture() {
    clearTimeout(minuteurEcriture);
    const element = document.getElementById("indicateur-ecriture");
    if (element) element.textContent = "";
}

// Affiche « X est en train d'écrire... » pendant quelques secondes
function afficher_ecriture(nom) {
    const element = document.getElementById("indicateur-ecriture");
    if (!element) return;

    element.textContent = nom + " est en train d'écrire...";
    clearTimeout(minuteurEcriture);
    minuteurEcriture = setTimeout(effacer_ecriture, DUREE_ECRITURE_MS);
}

// Signale aux autres qu'on écrit dans la conversation ouverte (au plus un signal toutes les 1,5 s)
function envoyer_ecriture() {
    const conversation = conversation_active();
    if (!conversation || !canalEcriture) return;

    const maintenant = Date.now();
    if (maintenant - dernierEnvoiEcriture < DELAI_ENVOI_ECRITURE_MS) return;
    dernierEnvoiEcriture = maintenant;

    canalEcriture.send({
        type: "broadcast",
        event: "ecriture",
        payload: { de: utilisateurCourant, type: conversation.type, id: conversation.id }
    });
}

// Affiche l'indicateur si la personne écrit dans la conversation qui est ouverte
async function recevoir_ecriture(payload) {
    const conversation = conversation_active();
    if (!conversation || !payload || payload.de === utilisateurCourant) return;

    const concerne = payload.type === "contact"
        ? conversation.type === "contact" && payload.id === utilisateurCourant && payload.de === conversation.id
        : conversation.type === "salon" && payload.type === "salon" && payload.id === conversation.id;

    if (!concerne) return;

    await charger_profils();
    afficher_ecriture(nom_utilisateur(payload.de));
}

// Écoute les signaux d'écriture des autres et envoie les nôtres à chaque frappe
function demarrer_ecriture() {
    canalEcriture = supabaseClient.channel("ecriture:wallo");
    canalEcriture
        .on("broadcast", { event: "ecriture" }, ({ payload }) => recevoir_ecriture(payload))
        .subscribe(suivre_abonnement("écriture"));

    const barreTexte = document.getElementById("barre-texte-message");
    if (barreTexte) barreTexte.addEventListener("input", envoyer_ecriture);
}

// ---------- Notifications (pastilles, titre de l'onglet, son) ----------

// Le son est activé par défaut, l'utilisateur peut le couper dans les paramètres
function son_active() {
    try {
        return localStorage.getItem("sonNotifications") !== "non";
    } catch {
        return true;
    }
}

// Le navigateur n'autorise le son qu'après une action de l'utilisateur : on prépare l'audio au premier clic ou à la première touche
function preparer_audio() {
    if (!contexteAudio) {
        const ContexteAudio = window.AudioContext || window.webkitAudioContext;
        if (!ContexteAudio) return;
        contexteAudio = new ContexteAudio();
    }
    if (contexteAudio.state === "suspended") contexteAudio.resume();
}

// Joue un court « bip » de notification
function jouer_son() {
    if (!son_active() || !contexteAudio || contexteAudio.state !== "running") return;

    const oscillateur = contexteAudio.createOscillator();
    const volume = contexteAudio.createGain();
    const debut = contexteAudio.currentTime;

    oscillateur.type = "sine";
    oscillateur.frequency.setValueAtTime(880, debut);
    volume.gain.setValueAtTime(0.15, debut);
    volume.gain.exponentialRampToValueAtTime(0.001, debut + 0.25);

    oscillateur.connect(volume);
    volume.connect(contexteAudio.destination);
    oscillateur.start(debut);
    oscillateur.stop(debut + 0.25);
}

// Affiche le nombre de messages non lus sur chaque contact et salon, et dans le titre de l'onglet
function maj_badges() {
    document.querySelectorAll("#contact-list li, #salon-list li").forEach(element => {
        const nombre = nonLus.get(element.dataset.type + ":" + element.dataset.id) ?? 0;
        const badge = element.querySelector(".badge-non-lu");
        if (!badge) return;

        badge.textContent = nombre > 9 ? "9+" : String(nombre);
        badge.hidden = nombre === 0;
    });

    const total = [...nonLus.values()].reduce((somme, nombre) => somme + nombre, 0);
    document.title = total > 0 ? "(" + total + ") " + titreDeBase : titreDeBase;
}

// Les listes viennent d'être remplies : appliquer les pastilles et les badges
function apres_rendu_listes() {
    maj_statuts_en_ligne();
    maj_badges();
}

// Une conversation vient d'être ouverte : mettre à jour son statut et effacer l'indicateur d'écriture
function apres_choix_conversation() {
    maj_statut_contact();
    effacer_ecriture();

    // Sur téléphone, la conversation est sous les listes : y descendre
    if (window.matchMedia("(max-width: 768px)").matches) {
        document.querySelector(".chat-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

// ---------- Accusés de réception (reçu, lu) ----------

// Une erreur de colonne ou de droit signifie que le script SQL des accusés n'est pas lancé : on s'en passe
function accuses_en_echec(error) {
    if (!error) return false;

    console.warn("Accusés de réception indisponibles :", error.message);
    accusesDisponibles = false;
    return true;
}

// Marque un message direct reçu comme reçu, et comme lu si la conversation est ouverte et visible
async function marquer_message(id, lu) {
    if (!accusesDisponibles) return;

    const maintenant = new Date().toISOString();
    const valeurs = lu ? { delivered_at: maintenant, read_at: maintenant } : { delivered_at: maintenant };

    const { error } = await supabaseClient
        .from("messages")
        .update(valeurs)
        .eq("id", id)
        .eq("destinataire_id", utilisateurCourant);

    accuses_en_echec(error);
}

// Au démarrage, tous les messages qui m'attendent sont marqués comme reçus
async function marquer_tout_recu() {
    if (!accusesDisponibles) return;

    const { error } = await supabaseClient
        .from("messages")
        .update({ delivered_at: new Date().toISOString() })
        .eq("destinataire_id", utilisateurCourant)
        .is("delivered_at", null);

    accuses_en_echec(error);
}

// Les messages de la conversation ouverte sont affichés et visibles : les marquer comme lus
async function marquer_conversation_lue() {
    const conversation = conversation_active();
    if (!conversation || document.visibilityState !== "visible" || !utilisateurCourant) return;

    nonLus.delete(conversation.type + ":" + conversation.id);
    maj_badges();

    if (conversation.type !== "contact" || !accusesDisponibles) return;

    const maintenant = new Date().toISOString();
    const { error } = await supabaseClient
        .from("messages")
        .update({ delivered_at: maintenant, read_at: maintenant })
        .eq("destinataire_id", utilisateurCourant)
        .eq("user_id", conversation.id)
        .is("read_at", null);

    accuses_en_echec(error);
}

// Au démarrage, compte les messages directs non lus pour afficher les badges
async function charger_non_lus() {
    if (!accusesDisponibles) return;

    const { data, error } = await supabaseClient
        .from("messages")
        .select("user_id")
        .eq("destinataire_id", utilisateurCourant)
        .is("read_at", null);

    if (accuses_en_echec(error)) return;

    data.forEach(message => {
        const cle = "contact:" + message.user_id;
        nonLus.set(cle, (nonLus.get(cle) ?? 0) + 1);
    });
    maj_badges();
}

// Réagit à un nouveau message : accusé de réception, pastille, titre de l'onglet et son
function traiter_message(message) {
    const direct = message.channel_id == null
        && String(message.destinataire_id) === utilisateurCourant
        && String(message.user_id) !== utilisateurCourant;
    const salon = message.channel_id != null && String(message.user_id) !== utilisateurCourant;

    if (!direct && !salon) return;

    const cle = direct ? "contact:" + message.user_id : "salon:" + message.channel_id;
    const conversation = conversation_active();
    const ouverte = Boolean(conversation) && cle === conversation.type + ":" + conversation.id;
    const visible = document.visibilityState === "visible";

    if (direct) marquer_message(message.id, ouverte && visible);

    // L'auteur vient d'envoyer son message : il n'est plus « en train d'écrire »
    if (ouverte) effacer_ecriture();

    // Conversation sous les yeux de l'utilisateur : rien à signaler
    if (ouverte && visible) return;

    nonLus.set(cle, (nonLus.get(cle) ?? 0) + 1);
    maj_badges();
    jouer_son();
}

// Écoute les nouveaux messages (notifications, accusés) et les changements de statut de mes messages
function demarrer_messages_entrants() {
    supabaseClient
        .channel("indicateurs:messages")
        .on("postgres_changes",
            { event: "INSERT", schema: "public", table: "messages" },
            (payload) => traiter_message(payload.new)
        )
        .on("postgres_changes",
            { event: "UPDATE", schema: "public", table: "messages" },
            (payload) => maj_accuse_message(payload.new)
        )
        .subscribe(suivre_abonnement("notifications"));
}

// ---------- Démarrage ----------

async function demarrer_indicateurs() {
    if (!document.getElementById("message-list")) return;

    utilisateurCourant = await get_user_id();
    if (!utilisateurCourant) return;

    await charger_profils();
    await authentifier_realtime();

    demarrer_presence();
    demarrer_ecriture();
    demarrer_messages_entrants();

    marquer_tout_recu();
    charger_non_lus();

    document.addEventListener("click", preparer_audio);
    document.addEventListener("keydown", preparer_audio);

    // Retour sur l'onglet : la conversation ouverte est lue
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") marquer_conversation_lue();
    });
}

demarrer_indicateurs();
