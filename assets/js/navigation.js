// Panneau Navigation : distance, temps de trajet et liens d'itinéraire vers le contact sélectionné

// Dernier calcul de la session : évite de rappeler l'API (quota limité) tant que personne n'a bougé
let dernierCalcul = null;

// Affiche un message d'état ; type vaut "ok" (succès), "erreur" ou "" (information)
function afficher_statut(message, type = "") {
    const statut = document.getElementById("nav-status");
    statut.textContent = message;
    statut.className = "nav-status " + type;
}

// Affiche ma position et l'heure de la dernière confirmation que la base est à jour
function afficher_ma_position() {
    document.getElementById("nav-ma-position").textContent = maPosition
        ? `${maPosition.latitude.toFixed(5)}, ${maPosition.longitude.toFixed(5)}`
        : "-";
    document.getElementById("nav-synchro").textContent = derniereSynchro
        ? derniereSynchro.toLocaleTimeString("fr-FR")
        : "-";
}

function ouvrir_navigation() {
    document.getElementById("navigation-panel").hidden = false;
    maj_navigation(false);
}

function fermer_navigation() {
    document.getElementById("navigation-panel").hidden = true;
}

// Affiche la distance et le temps, et prépare les liens d'itinéraire vers la position du contact
function afficher_resultat(resultat, positionContact) {
    const destination = `${positionContact.latitude}%2C${positionContact.longitude}`;

    document.getElementById("nav-distance").textContent = resultat.distance;
    document.getElementById("nav-duree").textContent = resultat.duree;
    document.getElementById("nav-google").href = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    document.getElementById("nav-waze").href = `https://waze.com/ul?ll=${destination}&navigate=yes`;
    document.getElementById("nav-links").hidden = false;
}

// Met à jour le panneau. Avec forcer, la position est réenregistrée et la distance recalculée ;
// sinon l'API n'est rappelée que si une position a bougé d'au moins 10 m.
async function maj_navigation(forcer) {
    const boutonMaj = document.getElementById("nav-update");
    boutonMaj.disabled = true;
    boutonMaj.textContent = "Mise à jour...";
    afficher_statut(forcer ? "Mise à jour de ta position..." : "Chargement...");
    document.getElementById("nav-links").hidden = true;
    afficher_ma_position();

    try {
        if (forcer || !maPosition) {
            const sauvegarde = await save_loc(forcer);
            afficher_ma_position();
            if (sauvegarde.erreur) {
                afficher_statut(sauvegarde.erreur, "erreur");
                return;
            }
        }

        const confirmation = forcer ? "Position enregistrée. " : "";

        const contactId = document.querySelector(".header-contact").dataset.contactId;
        if (!contactId) {
            afficher_statut(confirmation + "Aucun contact sélectionné pour calculer la distance.", forcer ? "ok" : "");
            return;
        }

        const positionContact = await get_saved_loc(contactId);
        if (!positionContact) {
            afficher_statut(confirmation + "Ce contact n'a pas encore partagé sa position.", forcer ? "ok" : "");
            return;
        }

        const c = dernierCalcul;
        const inchange = c !== null
            && c.contactId === contactId
            && ecart_metres(c.moi.latitude, c.moi.longitude, maPosition.latitude, maPosition.longitude) < SEUIL_DEPLACEMENT_METRES
            && ecart_metres(c.contact.latitude, c.contact.longitude, positionContact.latitude, positionContact.longitude) < SEUIL_DEPLACEMENT_METRES;

        let resultat;
        if (!forcer && inchange) {
            resultat = c.resultat;
        } else {
            resultat = await distance(maPosition.latitude, maPosition.longitude, positionContact.latitude, positionContact.longitude);
            if (!resultat) {
                afficher_statut(confirmation + "Impossible de calculer la distance pour le moment.", "erreur");
                return;
            }
            dernierCalcul = { contactId, moi: maPosition, contact: positionContact, resultat };
        }

        afficher_resultat(resultat, positionContact);
        afficher_statut(forcer ? "Position enregistrée et distance mise à jour." : "", forcer ? "ok" : "");
    } catch (error) {
        afficher_statut("Erreur : " + error.message, "erreur");
    } finally {
        boutonMaj.disabled = false;
        boutonMaj.textContent = "Mettre à jour";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const panneau = document.getElementById("navigation-panel");

    document.getElementById("navigation-open").addEventListener("click", (event) => {
        event.preventDefault();
        ouvrir_navigation();
    });
    document.getElementById("navigation-close").addEventListener("click", fermer_navigation);
    document.getElementById("nav-update").addEventListener("click", () => maj_navigation(true));
    panneau.addEventListener("click", (event) => {
        if (event.target === panneau) {
            fermer_navigation();
        }
    });
});
