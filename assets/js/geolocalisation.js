const DISTANCEMATRIX_KEY = "Az3H4fm1zFlZWYbHS2MKoGwxRe0FH2uuQGmpQQryGddTKWziidfvWmqb2BtHKHgL";

// En dessous de cet écart (en mètres), on considère que la position n'a pas changé
const SEUIL_DEPLACEMENT_METRES = 10;

// Dernière position connue de l'utilisateur pour cette session (null tant qu'elle n'est pas récupérée)
let maPosition = null;

// Heure de la dernière fois où la base a été confirmée à jour avec ma position (null si jamais)
let derniereSynchro = null;

// Récupère la position de l'utilisateur via le navigateur (promesse qui renvoie { latitude, longitude })
function get_loc() {
    return new Promise((resolve, reject) => {
        if (!("geolocation" in navigator)) {
            reject(new Error("La géolocalisation n'est pas supportée par ce navigateur."));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            }),
            (error) => reject(error),
            { timeout: 10000 }
        );
    });
}

// Traduit une erreur de géolocalisation du navigateur en message lisible
function message_geoloc(error) {
    if (error.code === 1) {
        return "Géolocalisation refusée : autorise-la dans les réglages du navigateur.";
    }
    if (error.code === 2) {
        return "Position indisponible pour le moment.";
    }
    if (error.code === 3) {
        return "Délai dépassé pour obtenir ta position.";
    }
    return error.message;
}

// Écart en mètres entre deux positions (formule de Haversine), calculé localement sans appeler l'API
function ecart_metres(lat1, lon1, lat2, lon2) {
    const rayonTerre = 6371000;
    const toRad = (degres) => degres * Math.PI / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a = Math.sin(dLat / 2) ** 2
        + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

    return rayonTerre * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Appelle l'API Distancematrix.ai : renvoie { distance, duree } (textes) entre deux positions, ou null en cas d'erreur
async function distance(lat1, lon1, lat2, lon2) {
    const url = "https://api.distancematrix.ai/maps/api/distancematrix/json"
        + `?origins=${lat1},${lon1}`
        + `&destinations=${lat2},${lon2}`
        + `&key=${DISTANCEMATRIX_KEY}`;

    try {
        const response = await fetch(url);
        const json = await response.json();
        const element = json.rows?.[0]?.elements?.[0];

        if (json.status !== "OK" || element?.status !== "OK") {
            console.error("Erreur de l'API de distance :", json.status, json.error_message ?? element?.status);
            return null;
        }
        return { distance: element.distance.text, duree: element.duration.text };
    } catch (error) {
        console.error("Erreur de l'API de distance :", error.message);
        return null;
    }
}

// Lit la position enregistrée d'un utilisateur (la sienne ou celle d'un contact) dans la table coordonnees
async function get_saved_loc(userId) {
    const { data, error } = await supabaseClient
        .from("coordonnees")
        .select("latitude, longitude")
        .eq("user_id", userId)
        .maybeSingle();

    if (error || !data) {
        return null;
    }
    return data;
}

// Récupère la position de l'utilisateur connecté et l'enregistre dans coordonnees
// uniquement si elle a changé d'au moins 10 m (ou si forcer est vrai).
// Renvoie { position, erreur } : erreur vaut null quand tout s'est bien passé.
async function save_loc(forcer = false) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        console.log("Aucun utilisateur connecté : position non enregistrée.");
        return { position: null, erreur: "Tu n'es pas connecté : connecte-toi pour enregistrer ta position." };
    }

    let position;
    try {
        position = await get_loc();
    } catch (error) {
        console.error("Erreur de géolocalisation :", error.message);
        return { position: null, erreur: message_geoloc(error) };
    }
    maPosition = position;

    try {
        const ancienne = await get_saved_loc(session.user.id);
        const aBouge = !ancienne || ecart_metres(
            ancienne.latitude, ancienne.longitude,
            position.latitude, position.longitude
        ) >= SEUIL_DEPLACEMENT_METRES;

        if (forcer || aBouge) {
            const { error } = await supabaseClient.from("coordonnees").upsert(
                {
                    user_id: session.user.id,
                    latitude: position.latitude,
                    longitude: position.longitude,
                    updated_at: new Date().toISOString()
                },
                { onConflict: "user_id" }
            );
            if (error) {
                console.error("Erreur d'enregistrement de la position :", error.message);
                return { position, erreur: "Enregistrement impossible : " + error.message };
            }
        }
    } catch (error) {
        console.error("Erreur d'enregistrement de la position :", error.message);
        return { position, erreur: "Enregistrement impossible : " + error.message };
    }

    derniereSynchro = new Date();
    return { position, erreur: null };
}

// Nouvelle session : on actualise la position au chargement de la page
document.addEventListener("DOMContentLoaded", () => save_loc());
