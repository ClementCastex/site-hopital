// Configuration de l'API
const API_BASE_URL = 'http://localhost:3000/api';

// État de la réservation
let reservationState = {
    currentBlock: 1,
    selectedProfessionalType: null, // Médecin, Psychologue, Surveicologue
    selectedDoctor: null,
    selectedAppointmentType: null, // Couple, Grossesse
    selectedConsultationType: null, // premier, suivi
    selectedDate: null,
    selectedAvailability: null,
    doctors: [],
    availabilities: []
};

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    initializeReservation();
    setupEventListeners();
    setMinDate();
});

// Initialiser la réservation
function initializeReservation() {
    showBlock(1);
    setupReservationForm();
}

// Configurer les écouteurs d'événements
function setupEventListeners() {
    // Permettre de cliquer sur les blocs précédents pour les modifier
    document.querySelectorAll('.reservation-block').forEach(block => {
        block.addEventListener('click', function(e) {
            // Ne pas déclencher si on clique sur un élément interactif
            if (e.target.closest('.professional-type-card, .doctor-card, .appointment-type-card, .consultation-type-card, .time-slot, .date-picker, button, a')) {
                return;
            }
            
            // Si le bloc est éditable et n'est pas le bloc actuel
            if (this.classList.contains('editable') && !this.classList.contains('showing')) {
                const blockNumber = parseInt(this.dataset.step);
                goToBlock(blockNumber);
            }
        });
    });
    
    // Étape 1 : Type de professionnel
    document.querySelectorAll('.professional-type-links').forEach(card => {
        card.addEventListener('click', function(e) {
            e.stopPropagation();
            const type = this.dataset.type;
            selectProfessionalType(type);
        });
    });

    // Étape 3 : Type de rendez-vous
    document.querySelectorAll('.appointment-type-card').forEach(card => {
        card.addEventListener('click', function(e) {
            e.stopPropagation();
            const type = this.dataset.type;
            selectAppointmentType(type);
        });
    });

    // Étape 4 : Type de consultation
    document.querySelectorAll('.consultation-type-card').forEach(card => {
        card.addEventListener('click', function(e) {
            e.stopPropagation();
            const consultationType = this.dataset.consultation;
            selectConsultationType(consultationType);
        });
    });

    // Date picker
    document.getElementById('date-select').addEventListener('change', function() {
        if (this.value && reservationState.selectedDoctor) {
            reservationState.selectedDate = this.value;
            loadAvailabilities(reservationState.selectedDoctor.id, this.value);
        }
    });
}

// Définir la date minimale (aujourd'hui)
function setMinDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date-select').setAttribute('min', today);
}

// Afficher un bloc (sans cacher les précédents)
function showBlock(blockNumber) {
    // Afficher tous les blocs jusqu'au bloc actuel
    for (let i = 1; i <= blockNumber; i++) {
        const block = document.getElementById(`block-${i}`);
        if (block) {
            block.classList.remove('hidden');
            if (i === blockNumber) {
                block.classList.add('showing');
            }
        }
    }
    
    // Masquer les blocs suivants
    for (let i = blockNumber + 1; i <= 7; i++) {
        const block = document.getElementById(`block-${i}`);
        if (block) {
            block.classList.add('hidden');
        }
    }
    
    reservationState.currentBlock = blockNumber;
    
    // Mettre à jour l'affichage des sélections dans chaque bloc
    updateBlockSelections();
    
    // Scroll vers le nouveau bloc
    const currentBlock = document.getElementById(`block-${blockNumber}`);
    if (currentBlock) {
        setTimeout(() => {
            currentBlock.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    }
}

// Mettre à jour l'affichage des sélections dans chaque bloc
function updateBlockSelections() {
    // Bloc 1 : Type de professionnel
    if (reservationState.selectedProfessionalType) {
        const block1 = document.getElementById('block-1');
        if (block1) {
            const title = block1.querySelector('.block-title');
            if (title && !title.classList.contains('selected')) {
                title.textContent = reservationState.selectedProfessionalType;
                title.classList.add('selected');
            }
            block1.classList.add('editable');
        }
    }
    
    // Bloc 2 : Professionnel sélectionné
    if (reservationState.selectedDoctor) {
        const block2 = document.getElementById('block-2');
        if (block2) {
            const title = block2.querySelector('.block-title');
            if (title) {
                const doctorName = `${reservationState.selectedDoctor.firstName} ${reservationState.selectedDoctor.lastName}`.toUpperCase();
                title.textContent = doctorName;
                title.classList.add('selected');
            }
            block2.classList.add('editable');
        }
    }
    
    // Afficher le professionnel sélectionné dans les blocs suivants
    const professionalDisplay = reservationState.selectedDoctor 
        ? `${reservationState.selectedDoctor.firstName} ${reservationState.selectedDoctor.lastName}`.toUpperCase()
        : '';
    
    // Bloc 3, 4, 5, 6 : Afficher le professionnel
    for (let i = 3; i <= 6; i++) {
        const displayDiv = document.getElementById(`selected-professional-display-${i}`);
        if (displayDiv && professionalDisplay) {
            displayDiv.innerHTML = `<div class="selected-professional-info">${professionalDisplay}</div>`;
        }
    }
    
    // Bloc 3 : Type de rendez-vous
    if (reservationState.selectedAppointmentType) {
        const block3 = document.getElementById('block-3');
        if (block3) {
            block3.classList.add('editable');
        }
    }
    
    // Bloc 4 : Type de consultation
    if (reservationState.selectedConsultationType) {
        const block4 = document.getElementById('block-4');
        if (block4) {
            block4.classList.add('editable');
        }
    }
    
    // Bloc 5 : Date
    if (reservationState.selectedDate) {
        const block5 = document.getElementById('block-5');
        if (block5) {
            const dateInput = document.getElementById('date-select');
            if (dateInput) {
                dateInput.value = reservationState.selectedDate;
            }
            block5.classList.add('editable');
        }
    }
}

// Sélectionner le type de professionnel
function selectProfessionalType(type) {
    // Désélectionner toutes les cartes
    document.querySelectorAll('.professional-type-links').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Sélectionner la carte cliquée
    const selectedCard = document.querySelector(`[data-type="${type}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
    }
    
    reservationState.selectedProfessionalType = type;
    
    // Mettre à jour le titre du bloc 1
    const block1Title = document.querySelector('#block-1 .block-title');
    if (block1Title) {
        block1Title.textContent = type;
        block1Title.classList.add('selected');
    }
    
    // Mettre à jour le titre du bloc 2
    document.getElementById('block-2-title').textContent = type;
    
    // Charger les professionnels de ce type
    loadDoctors(type);
    
    // Afficher le bloc suivant
    showBlock(2);
    
    // Restaurer les sélections visuelles
    restoreVisualSelections();
}

// Charger les médecins/professionnels
async function loadDoctors(type) {
    const doctorsList = document.getElementById('doctors-list');
    doctorsList.innerHTML = '<div class="loading">Chargement...</div>';
    
    try {
        // Vérifier d'abord si le serveur est accessible
        const healthCheck = await fetch(`${API_BASE_URL}/health`).catch(() => null);
        if (!healthCheck || !healthCheck.ok) {
            throw new Error('Le serveur n\'est pas accessible. Assurez-vous que le serveur est démarré (npm run dev)');
        }
        
        const response = await fetch(`${API_BASE_URL}/doctors?type=${type}`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Erreur lors du chargement');
        }
        
        const doctors = await response.json();
        reservationState.doctors = doctors;
        displayDoctors(doctors);
    } catch (error) {
        console.error('Error loading doctors:', error);
        doctorsList.innerHTML = `
            <div class="loading" style="color: #d32f2f;">
                <strong>Erreur de connexion</strong><br>
                ${error.message}<br><br>
                <small>Vérifiez que le serveur est démarré avec: <code>npm run dev</code></small>
            </div>
        `;
    }
}

// Afficher les médecins
function displayDoctors(doctors) {
    const doctorsList = document.getElementById('doctors-list');
    
    if (doctors.length === 0) {
        doctorsList.innerHTML = '<div class="loading">Aucun professionnel disponible pour le moment.</div>';
        return;
    }
    
    doctorsList.innerHTML = doctors.map(doctor => `
        <div class="doctor-card" data-doctor-id="${doctor.id}">
            <h4>${doctor.firstName} ${doctor.lastName}</h4>
            <div class="specialty">${doctor.specialty}</div>
        </div>
    `).join('');
    
    // Ajouter les écouteurs de clic
    document.querySelectorAll('.doctor-card').forEach(card => {
        card.addEventListener('click', function(e) {
            e.stopPropagation();
            const doctorId = parseInt(this.dataset.doctorId);
            selectDoctor(doctorId);
        });
    });
    
    // Restaurer la sélection si un médecin était déjà sélectionné
    if (reservationState.selectedDoctor) {
        const selectedCard = document.querySelector(`[data-doctor-id="${reservationState.selectedDoctor.id}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }
    }
}

// Sélectionner un médecin
function selectDoctor(doctorId) {
    // Désélectionner toutes les cartes
    document.querySelectorAll('.doctor-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Sélectionner la carte cliquée
    const selectedCard = document.querySelector(`[data-doctor-id="${doctorId}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
    }
    
    // Trouver le médecin dans la liste
    const doctor = reservationState.doctors.find(d => d.id === doctorId);
    if (doctor) {
        reservationState.selectedDoctor = doctor;
        
        // Mettre à jour les infos du professionnel sélectionné
        updateSelectedProfessionalInfo(doctor);
        
        // Afficher le bloc suivant (type de rendez-vous)
        showBlock(3);
    }
}

// Aller à un bloc spécifique (pour modification)
function goToBlock(blockNumber) {
    // Réinitialiser les blocs suivants si on revient en arrière
    if (blockNumber < reservationState.currentBlock) {
        // Réinitialiser les sélections des blocs suivants
        if (blockNumber < 2) {
            reservationState.selectedProfessionalType = null;
            reservationState.selectedDoctor = null;
            reservationState.selectedAppointmentType = null;
            reservationState.selectedConsultationType = null;
            reservationState.selectedDate = null;
            reservationState.selectedAvailability = null;
        } else if (blockNumber < 3) {
            reservationState.selectedDoctor = null;
            reservationState.selectedAppointmentType = null;
            reservationState.selectedConsultationType = null;
            reservationState.selectedDate = null;
            reservationState.selectedAvailability = null;
        } else if (blockNumber < 4) {
            reservationState.selectedAppointmentType = null;
            reservationState.selectedConsultationType = null;
            reservationState.selectedDate = null;
            reservationState.selectedAvailability = null;
        } else if (blockNumber < 5) {
            reservationState.selectedConsultationType = null;
            reservationState.selectedDate = null;
            reservationState.selectedAvailability = null;
        } else if (blockNumber < 6) {
            reservationState.selectedDate = null;
            reservationState.selectedAvailability = null;
        }
    }
    
    showBlock(blockNumber);
    
    // Restaurer les sélections visuelles
    restoreVisualSelections();
}

// Restaurer les sélections visuelles
function restoreVisualSelections() {
    // Restaurer le type de professionnel
    if (reservationState.selectedProfessionalType) {
        document.querySelectorAll('.professional-type-links').forEach(card => {
            card.classList.remove('selected');
            if (card.dataset.type === reservationState.selectedProfessionalType) {
                card.classList.add('selected');
            }
        });
    }
    
    // Restaurer le type de rendez-vous
    if (reservationState.selectedAppointmentType) {
        document.querySelectorAll('.appointment-type-card').forEach(card => {
            card.classList.remove('selected');
            if (card.dataset.type === reservationState.selectedAppointmentType) {
                card.classList.add('selected');
            }
        });
    }
    
    // Restaurer le type de consultation
    if (reservationState.selectedConsultationType) {
        document.querySelectorAll('.consultation-type-card').forEach(card => {
            card.classList.remove('selected');
            if (card.dataset.consultation === reservationState.selectedConsultationType) {
                card.classList.add('selected');
            }
        });
    }
    
    // Restaurer le médecin sélectionné
    if (reservationState.selectedDoctor) {
        document.querySelectorAll('.doctor-card').forEach(card => {
            card.classList.remove('selected');
            if (parseInt(card.dataset.doctorId) === reservationState.selectedDoctor.id) {
                card.classList.add('selected');
            }
        });
    }
}

// Mettre à jour les infos du professionnel sélectionné
function updateSelectedProfessionalInfo(doctor) {
    // Mettre à jour l'affichage dans tous les blocs
    updateBlockSelections();
}

// Sélectionner le type de rendez-vous
function selectAppointmentType(type) {
    // Désélectionner toutes les cartes
    document.querySelectorAll('.appointment-type-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Sélectionner la carte cliquée
    const selectedCard = document.querySelector(`[data-type="${type}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
    }
    
    reservationState.selectedAppointmentType = type;
    
    // Mettre à jour les infos
    updateSelectedProfessionalInfo(reservationState.selectedDoctor);
    
    // Mettre à jour l'affichage
    updateBlockSelections();
    
    // Afficher le bloc suivant (type de consultation)
    showBlock(4);
}

// Sélectionner le type de consultation
function selectConsultationType(consultationType) {
    // Désélectionner toutes les cartes
    document.querySelectorAll('.consultation-type-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Sélectionner la carte cliquée
    const selectedCard = document.querySelector(`[data-consultation="${consultationType}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
    }
    
    reservationState.selectedConsultationType = consultationType;
    
    // Mettre à jour les infos
    updateSelectedProfessionalInfo(reservationState.selectedDoctor);
    
    // Mettre à jour l'affichage
    updateBlockSelections();
    
    // Afficher le bloc suivant (date)
    showBlock(5);
}

// Charger les disponibilités
async function loadAvailabilities(doctorId, date = null) {
    try {
        let url = `${API_BASE_URL}/doctors/${doctorId}/availabilities`;
        if (date) {
            url += `?date=${date}`;
        }
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Erreur lors du chargement des disponibilités');
        
        const availabilities = await response.json();
        reservationState.availabilities = availabilities;
        
        // Filtrer selon le type de rendez-vous sélectionné
        const filtered = availabilities.filter(a => 
            a.appointmentType === reservationState.selectedAppointmentType
        );
        
        displayTimeSlots(filtered);
        
        // Afficher le bloc des horaires
        showBlock(6);
    } catch (error) {
        console.error('Error loading availabilities:', error);
    }
}

// Afficher les créneaux horaires
function displayTimeSlots(availabilities) {
    const morningSlots = document.getElementById('morning-slots');
    const afternoonSlots = document.getElementById('afternoon-slots');
    
    morningSlots.innerHTML = '';
    afternoonSlots.innerHTML = '';
    
    const morning = [];
    const afternoon = [];
    
    availabilities.forEach(avail => {
        const hour = parseInt(avail.startTime.split(':')[0]);
        const slot = {
            id: avail.id,
            time: avail.startTime,
            end: avail.endTime,
            available: avail.isAvailable
        };
        
        if (hour < 12) {
            morning.push(slot);
        } else {
            afternoon.push(slot);
        }
    });
    
    // Afficher les créneaux du matin
    morning.forEach(slot => {
        const slotElement = document.createElement('div');
        slotElement.className = `time-slot ${!slot.available ? 'unavailable' : ''}`;
        slotElement.dataset.slotId = slot.id;
        slotElement.textContent = slot.time;
        
        if (slot.available) {
            slotElement.addEventListener('click', () => selectTimeSlot(slot.id));
        }
        
        morningSlots.appendChild(slotElement);
    });
    
    // Afficher les créneaux de l'après-midi
    afternoon.forEach(slot => {
        const slotElement = document.createElement('div');
        slotElement.className = `time-slot ${!slot.available ? 'unavailable' : ''}`;
        slotElement.dataset.slotId = slot.id;
        slotElement.textContent = slot.time;
        
        if (slot.available) {
            slotElement.addEventListener('click', () => selectTimeSlot(slot.id));
        }
        
        afternoonSlots.appendChild(slotElement);
    });
    
    // Restaurer la sélection si un créneau était déjà sélectionné
    if (reservationState.selectedAvailability) {
        const selectedSlot = document.querySelector(`[data-slot-id="${reservationState.selectedAvailability.id}"]`);
        if (selectedSlot) {
            selectedSlot.classList.add('selected');
        }
    }
}

// Sélectionner un créneau horaire
function selectTimeSlot(slotId) {
    // Désélectionner tous les créneaux
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.classList.remove('selected');
    });
    
    // Sélectionner le créneau cliqué
    const selectedSlot = document.querySelector(`[data-slot-id="${slotId}"]`);
    if (selectedSlot) {
        selectedSlot.classList.add('selected');
    }
    
    // Trouver la disponibilité
    const availability = reservationState.availabilities.find(a => a.id === slotId);
    if (availability) {
        reservationState.selectedAvailability = availability;
        
        // Mettre à jour l'affichage
        updateBlockSelections();
        
        // Afficher le formulaire de confirmation
        showBlock(7);
        displayReservationSummaryForm();
    }
}

// Afficher le résumé dans le formulaire
function displayReservationSummaryForm() {
    const doctor = reservationState.selectedDoctor;
    const availability = reservationState.selectedAvailability;
    const date = new Date(reservationState.selectedDate + 'T00:00:00');
    
    const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const monthNames = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    
    const dayName = dayNames[date.getDay()];
    const day = date.getDate();
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    
    const appointmentTypeText = reservationState.selectedAppointmentType === 'Couple' 
        ? 'en couple' 
        : 'femme enceinte';
    
    const summaryDiv = document.getElementById('reservation-summary-form');
    summaryDiv.innerHTML = `
        <div class="reservation-summary-box">
            <h4>Résumé de votre réservation</h4>
            <p><strong>Professionnel :</strong> ${doctor.firstName} ${doctor.lastName} (${doctor.specialty})</p>
            <p><strong>Type :</strong> Rendez-vous ${appointmentTypeText}</p>
            <p><strong>Date :</strong> ${dayName} ${day} ${month} ${year}</p>
            <p><strong>Heure :</strong> ${availability.startTime} - ${availability.endTime}</p>
        </div>
    `;
    
    // Mettre à jour l'affichage du professionnel
    const displayDiv = document.getElementById('selected-professional-display-7');
    if (displayDiv) {
        displayDiv.innerHTML = `<div class="selected-professional-info">${doctor.firstName} ${doctor.lastName}</div>`;
    }
}

// Configurer le formulaire de réservation
function setupReservationForm() {
    const form = document.getElementById('reservation-form');
    if (form) {
        form.addEventListener('submit', handleReservationSubmit);
    }
    
    const backButton = document.getElementById('btn-back-step7');
    if (backButton) {
        backButton.addEventListener('click', () => goToBlock(6));
    }
}

// Gérer la soumission du formulaire
async function handleReservationSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const submitButton = document.getElementById('btn-submit-reservation');
    const resultDiv = document.getElementById('reservation-result');
    
    // Désactiver le bouton
    submitButton.disabled = true;
    submitButton.textContent = 'Traitement...';
    
    // Préparer les données
    const reservationData = {
        doctorId: reservationState.selectedDoctor.id,
        availabilityId: reservationState.selectedAvailability.id,
        patientName: formData.get('patientName'),
        patientEmail: formData.get('patientEmail') || null,
        patientPhone: formData.get('patientPhone'),
        date: reservationState.selectedDate,
        time: reservationState.selectedAvailability.startTime,
        appointmentType: reservationState.selectedAppointmentType
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/reservations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reservationData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erreur lors de la création de la réservation');
        }
        
        const reservation = await response.json();
        
        // Masquer le formulaire
        form.style.display = 'none';
        
        // Afficher la confirmation
        displayConfirmation(reservation);
        
        // Mettre à jour l'état pour refléter que le créneau est réservé
        if (reservationState.selectedAvailability) {
            reservationState.selectedAvailability.isAvailable = false;
        }
        
    } catch (error) {
        console.error('Error creating reservation:', error);
        resultDiv.style.display = 'block';
        resultDiv.className = 'reservation-result error';
        resultDiv.innerHTML = `
            <h4>❌ Erreur</h4>
            <p>${error.message}</p>
            <p>Veuillez réessayer ou choisir un autre créneau.</p>
        `;
        
        submitButton.disabled = false;
        submitButton.textContent = 'Confirmer la réservation';
    }
}

// Afficher la confirmation
function displayConfirmation(reservation) {
    const doctor = reservationState.selectedDoctor;
    const availability = reservationState.selectedAvailability;
    const date = new Date(reservationState.selectedDate + 'T00:00:00');
    
    const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const monthNames = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    
    const dayName = dayNames[date.getDay()];
    const day = date.getDate();
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    
    const appointmentTypeText = reservationState.selectedAppointmentType === 'Couple' 
        ? 'en couple' 
        : 'femme enceinte';
    
    const resultDiv = document.getElementById('reservation-result');
    resultDiv.style.display = 'block';
    resultDiv.className = 'reservation-result success';
    
    // Créer le lien vers le dashboard avec les paramètres pour pré-sélectionner le professionnel et la date
    const dashboardUrl = `dashboard.html?doctorId=${doctor.id}&date=${reservationState.selectedDate}`;
    
    resultDiv.innerHTML = `
        <h3>✅ Vous avez rendez-vous !</h3>
        <p>Vous avez rendez-vous ${appointmentTypeText} avec ${doctor.firstName} ${doctor.lastName}, ${doctor.specialty.toLowerCase()} le ${dayName} ${day} ${month} à ${availability.startTime}.</p>
        <p><strong>Numéro de réservation :</strong> #${reservation.id}</p>
        <div class="confirmation-actions">
            <a href="${dashboardUrl}" class="confirmation-link">Voir dans le tableau de bord</a>
            <a href="reservation.html" class="confirmation-link">Prendre un autre rendez-vous</a>
        </div>
    `;
    
    // Actualiser les statistiques du dashboard si on y est
    if (typeof loadStats === 'function') {
        loadStats();
    }
}
