// Configuration de l'API
const API_BASE_URL = 'http://localhost:3000/api';

// État du dashboard
let dashboardState = {
    doctors: [],
    reservations: [],
    currentTab: 'reservations',
    currentDate: new Date(),
    selectedDate: null,
    selectedDoctorId: null
};

// Noms des mois en français
const monthNames = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
];

// Noms des jours en français
const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const dayNamesShort = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    // Lire les paramètres URL pour pré-sélectionner le professionnel et la date
    const urlParams = new URLSearchParams(window.location.search);
    const doctorIdParam = urlParams.get('doctorId');
    const dateParam = urlParams.get('date');
    
    if (doctorIdParam) {
        dashboardState.selectedDoctorId = doctorIdParam;
    }
    
    if (dateParam) {
        // Convertir la date en objet Date pour le calendrier
        const date = new Date(dateParam + 'T00:00:00');
        dashboardState.currentDate = new Date(date.getFullYear(), date.getMonth(), 1); // Premier jour du mois
        dashboardState.selectedDate = dateParam;
    }
    
    initializeDashboard();
    setupEventListeners();
    loadDoctors().then(() => {
        // Après avoir chargé les médecins, pré-sélectionner le professionnel si spécifié dans l'URL
        if (doctorIdParam) {
            const selectProfessional = document.getElementById('select-professional');
            if (selectProfessional) {
                selectProfessional.value = doctorIdParam;
            }
            // Pré-sélectionner aussi dans les autres sélecteurs
            const selectPresence = document.getElementById('select-doctor-presence');
            if (selectPresence) {
                selectPresence.value = doctorIdParam;
            }
        }
        // Charger les réservations après avoir configuré le professionnel
        loadReservations();
    }).catch(error => {
        console.error('Erreur lors du chargement des médecins:', error);
        // Charger quand même les réservations sans filtre
        loadReservations();
    });
    setMinDate();
});

// Initialiser le dashboard
function initializeDashboard() {
    // Afficher l'onglet par défaut
    showTab('reservations');
    // Générer le calendrier pour le mois actuel (même sans réservations)
    renderCalendar();
}

// Configurer les écouteurs d'événements
function setupEventListeners() {
    // Onglets
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', function() {
            const tab = this.dataset.tab;
            showTab(tab);
        });
    });
    
    // Navigation du calendrier
    document.getElementById('prev-month').addEventListener('click', () => {
        dashboardState.currentDate.setMonth(dashboardState.currentDate.getMonth() - 1);
        renderCalendar();
        loadReservations();
    });
    
    document.getElementById('next-month').addEventListener('click', () => {
        dashboardState.currentDate.setMonth(dashboardState.currentDate.getMonth() + 1);
        renderCalendar();
        loadReservations();
    });
    
    // Sélection du professionnel
    const selectProfessional = document.getElementById('select-professional');
    if (selectProfessional) {
        selectProfessional.addEventListener('change', function() {
            dashboardState.selectedDoctorId = this.value || null;
            // Réinitialiser la date sélectionnée quand on change de professionnel
            dashboardState.selectedDate = null;
            const appointmentsBlock = document.getElementById('appointments-block');
            if (appointmentsBlock) {
                appointmentsBlock.classList.add('hidden');
            }
            loadReservations();
        });
    }
    
    // Gestion de la présence
    const selectPresence = document.getElementById('select-doctor-presence');
    const presenceDate = document.getElementById('presence-date');
    
    if (selectPresence) {
        selectPresence.addEventListener('change', function() {
            if (this.value && presenceDate.value) {
                loadPresenceSlots(parseInt(this.value), presenceDate.value);
            }
        });
    }
    
    if (presenceDate) {
        presenceDate.addEventListener('change', function() {
            if (this.value && selectPresence && selectPresence.value) {
                loadPresenceSlots(parseInt(selectPresence.value), this.value);
            }
        });
    }
    
    // Boutons de présence globale
    const btnMarkPresent = document.getElementById('btn-mark-present');
    const btnMarkAbsent = document.getElementById('btn-mark-absent');
    
    if (btnMarkPresent) {
        btnMarkPresent.addEventListener('click', function() {
            if (selectPresence && selectPresence.value && presenceDate && presenceDate.value) {
                updatePresenceForDate(parseInt(selectPresence.value), presenceDate.value, true);
            } else {
                alert('Veuillez sélectionner un professionnel et une date');
            }
        });
    }
    
    if (btnMarkAbsent) {
        btnMarkAbsent.addEventListener('click', function() {
            if (selectPresence && selectPresence.value && presenceDate && presenceDate.value) {
                updatePresenceForDate(parseInt(selectPresence.value), presenceDate.value, false);
            } else {
                alert('Veuillez sélectionner un professionnel et une date');
            }
        });
    }
    
    // Génération de disponibilités
    document.getElementById('btn-generate-availability').addEventListener('click', generateAvailabilities);
    
    // Bouton pour fermer le bloc des rendez-vous
    const btnCloseAppointments = document.getElementById('btn-close-appointments');
    if (btnCloseAppointments) {
        btnCloseAppointments.addEventListener('click', () => {
            const appointmentsBlock = document.getElementById('appointments-block');
            if (appointmentsBlock) {
                appointmentsBlock.classList.add('hidden');
                dashboardState.selectedDate = null;
                // Re-rendre le calendrier pour enlever la sélection
                renderCalendar();
            }
        });
    }
}

// Définir la date minimale
function setMinDate() {
    const today = new Date().toISOString().split('T')[0];
    const availabilityDate = document.getElementById('availability-date');
    const presenceDate = document.getElementById('presence-date');
    if (availabilityDate) {
        availabilityDate.setAttribute('min', today);
    }
    if (presenceDate) {
        presenceDate.setAttribute('min', today);
    }
}

// Afficher un onglet
function showTab(tabName) {
    // Mettre à jour les boutons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Mettre à jour le contenu
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`tab-${tabName}`).classList.add('active');
    
    dashboardState.currentTab = tabName;
    
    // Si on affiche l'onglet réservations, recharger le calendrier
    if (tabName === 'reservations') {
        renderCalendar();
        loadReservations();
    }
    
    // Si on affiche l'onglet présence, initialiser la date minimale
    if (tabName === 'presence') {
        setMinDate();
    }
}

// Charger les médecins
async function loadDoctors() {
    try {
        const response = await fetch(`${API_BASE_URL}/doctors`);
        if (!response.ok) throw new Error('Erreur lors du chargement');
        
        const doctors = await response.json();
        dashboardState.doctors = doctors;
        
        // Remplir les sélecteurs
        const professionalSelect = document.getElementById('select-professional');
        const availabilitySelect = document.getElementById('select-doctor-availability');
        
        // Vider les sélecteurs avant de les remplir
        if (professionalSelect) {
            professionalSelect.innerHTML = '<option value="">Tous les professionnels</option>';
        }
        if (availabilitySelect) {
            availabilitySelect.innerHTML = '<option value="">Sélectionner un professionnel</option>';
        }
        
        doctors.forEach(doctor => {
            if (professionalSelect) {
                const option1 = document.createElement('option');
                option1.value = doctor.id;
                option1.textContent = `${doctor.type === 'Psychologue' ? 'Madame' : 'Monsieur'} ${doctor.lastName}`;
                professionalSelect.appendChild(option1);
            }
            
            if (availabilitySelect) {
                const option2 = document.createElement('option');
                option2.value = doctor.id;
                option2.textContent = `${doctor.firstName} ${doctor.lastName} (${doctor.type})`;
                availabilitySelect.appendChild(option2);
            }
            
            // Ajouter aussi dans le sélecteur de présence
            const presenceSelect = document.getElementById('select-doctor-presence');
            if (presenceSelect) {
                const option3 = document.createElement('option');
                option3.value = doctor.id;
                option3.textContent = `${doctor.firstName} ${doctor.lastName} (${doctor.type})`;
                presenceSelect.appendChild(option3);
            }
        });
    } catch (error) {
        console.error('Error loading doctors:', error);
    }
}

// Générer le calendrier mensuel
function renderCalendar() {
    const calendarGrid = document.getElementById('calendar-grid');
    const monthYear = document.getElementById('calendar-month-year');
    
    const year = dashboardState.currentDate.getFullYear();
    const month = dashboardState.currentDate.getMonth();
    
    // Mettre à jour le titre du mois
    monthYear.textContent = `${monthNames[month]} ${year}`;
    
    // Obtenir le premier jour du mois et le nombre de jours
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    // Créer la grille du calendrier
    let calendarHTML = '';
    
    // En-têtes des jours de la semaine
    calendarHTML += '<div class="calendar-weekdays">';
    dayNamesShort.forEach(day => {
        calendarHTML += `<div class="calendar-weekday">${day}</div>`;
    });
    calendarHTML += '</div>';
    
    // Jours du mois
    calendarHTML += '<div class="calendar-days">';
    
    // Cases vides pour les jours avant le premier jour du mois
    for (let i = 0; i < startingDayOfWeek; i++) {
        calendarHTML += '<div class="calendar-day empty"></div>';
    }
    
    // Jours du mois
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateString = formatDateForAPI(date);
        const dayOfWeek = date.getDay();
        const dayName = dayNames[dayOfWeek];
        
        // Vérifier s'il y a des rendez-vous ce jour
        // Comparer les dates en format YYYY-MM-DD pour éviter les problèmes de fuseau horaire
        const dayReservations = dashboardState.reservations.filter(res => {
            if (!res || !res.date) return false;
            // Normaliser les dates pour la comparaison
            const resDateStr = res.date instanceof Date 
                ? formatDateForAPI(res.date) 
                : res.date.split('T')[0]; // Enlever l'heure si présente
            return resDateStr === dateString;
        });
        const hasAppointments = dayReservations.length > 0;
        const appointmentCount = dayReservations.length;
        
        // Vérifier si c'est aujourd'hui
        const today = new Date().toISOString().split('T')[0];
        const isToday = dateString === today;
        
        // Vérifier si c'est la date sélectionnée
        const isSelected = dashboardState.selectedDate === dateString;
        
        let dayClass = 'calendar-day';
        if (isToday) {
            dayClass += ' today';
        }
        if (hasAppointments) {
            dayClass += ' has-appointments';
        }
        if (isSelected) {
            dayClass += ' selected';
        }
        
        const dayId = `day-${dateString}`;
        
        calendarHTML += `
            <div class="${dayClass}" data-date="${dateString}" id="${dayId}">
                <span class="day-number">${day}</span>
                ${hasAppointments ? `<span class="appointment-count" title="${appointmentCount} rendez-vous">${appointmentCount}</span>` : ''}
            </div>
        `;
    }
    
    calendarHTML += '</div>';
    
    calendarGrid.innerHTML = calendarHTML;
    
    // Ajouter les écouteurs d'événements pour chaque jour
    document.querySelectorAll('.calendar-day:not(.empty)').forEach(dayElement => {
        dayElement.addEventListener('click', function() {
            const dateString = this.dataset.date;
            selectDate(dateString);
        });
    });
    
    // Si une date est sélectionnée, afficher ses rendez-vous
    if (dashboardState.selectedDate) {
        selectDate(dashboardState.selectedDate);
    }
}

// Sélectionner une date et afficher ses rendez-vous
function selectDate(dateString) {
    dashboardState.selectedDate = dateString;
    
    // Mettre à jour l'apparence des jours
    document.querySelectorAll('.calendar-day').forEach(day => {
        day.classList.remove('selected');
    });
    
    const selectedDay = document.getElementById(`day-${dateString}`);
    if (selectedDay) {
        selectedDay.classList.add('selected');
    }
    
    // Afficher le bloc des rendez-vous
    const appointmentsBlock = document.getElementById('appointments-block');
    const appointmentsDate = document.getElementById('appointments-date');
    const appointmentsList = document.getElementById('appointments-list');
    
    // Formater la date pour l'affichage
    const date = new Date(dateString + 'T00:00:00');
    const dayOfWeek = dayNames[date.getDay()];
    const day = date.getDate();
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    
    appointmentsDate.textContent = `${dayOfWeek} ${day} ${month} ${year}`;
    
    // Filtrer les réservations pour cette date
    const dateReservations = dashboardState.reservations.filter(res => {
        if (!res || !res.date) return false;
        // Normaliser les dates pour la comparaison
        const resDateStr = res.date instanceof Date 
            ? formatDateForAPI(res.date) 
            : res.date.split('T')[0]; // Enlever l'heure si présente
        return resDateStr === dateString;
    });
    
    if (dateReservations.length === 0) {
        appointmentsList.innerHTML = '<p class="no-appointments">Aucun rendez-vous pour cette date.</p>';
    } else {
        appointmentsList.innerHTML = dateReservations.map(reservation => {
            const doctor = reservation.doctor;
            const statusClass = reservation.status === 'confirmed' ? 'confirmed' : 
                               reservation.status === 'cancelled' ? 'cancelled' : 'pending';
            const statusText = reservation.status === 'confirmed' ? 'Confirmée' :
                              reservation.status === 'cancelled' ? 'Annulée' : 'En attente';
            
            return `
                <div class="appointment-item ${statusClass}">
                    <div class="appointment-header">
                        <h4>${reservation.patientName}</h4>
                        <span class="appointment-status ${statusClass}">${statusText}</span>
                    </div>
                    <div class="appointment-details">
                        <p><strong>Heure :</strong> ${reservation.time}</p>
                        <p><strong>Type :</strong> ${reservation.appointmentType === 'Couple' ? 'Couple (1h)' : 'Femme enceinte (45min)'}</p>
                        ${reservation.patientEmail ? `<p><strong>Email :</strong> ${reservation.patientEmail}</p>` : ''}
                        ${reservation.patientPhone ? `<p><strong>Téléphone :</strong> ${reservation.patientPhone}</p>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Afficher le bloc
    appointmentsBlock.classList.remove('hidden');
}

// Charger les réservations
async function loadReservations() {
    try {
        let url = `${API_BASE_URL}/reservations`;
        const params = [];
        
        // Filtrer par professionnel si sélectionné
        if (dashboardState.selectedDoctorId) {
            params.push(`doctorId=${dashboardState.selectedDoctorId}`);
        }
        
        // Filtrer par mois en cours pour optimiser le chargement
        const year = dashboardState.currentDate.getFullYear();
        const month = dashboardState.currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        params.push(`startDate=${formatDateForAPI(firstDay)}`);
        params.push(`endDate=${formatDateForAPI(lastDay)}`);
        
        if (params.length > 0) {
            url += '?' + params.join('&');
        }
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Erreur lors du chargement');
        
        const reservations = await response.json();
        dashboardState.reservations = reservations;
        
        console.log(`✅ ${reservations.length} réservation(s) chargée(s) pour le mois`, {
            month: dashboardState.currentDate.getMonth() + 1,
            year: dashboardState.currentDate.getFullYear(),
            reservations: reservations.map(r => ({ id: r.id, date: r.date, patient: r.patientName }))
        });
        
        // Mettre à jour les statistiques
        updateStats(reservations);
        
        // Re-rendre le calendrier pour mettre à jour les indicateurs
        renderCalendar();
        
        // Si une date est sélectionnée, mettre à jour l'affichage
        if (dashboardState.selectedDate) {
            selectDate(dashboardState.selectedDate);
        }
    } catch (error) {
        console.error('❌ Erreur lors du chargement des réservations:', error);
        // Afficher un message d'erreur dans l'interface
        const calendarGrid = document.getElementById('calendar-grid');
        if (calendarGrid) {
            calendarGrid.innerHTML = '<div class="loading error">Erreur lors du chargement des réservations. Veuillez réessayer.</div>';
        }
    }
}

// Mettre à jour les statistiques
function updateStats(reservations) {
    const today = new Date().toISOString().split('T')[0];
    const todayReservations = reservations.filter(r => r.date === today);
    
    const monthReservations = reservations.length;
    
    const pendingReservations = reservations.filter(r => r.status === 'pending').length;
    
    const statToday = document.getElementById('stat-today');
    const statMonth = document.getElementById('stat-month');
    const statPending = document.getElementById('stat-pending');
    
    if (statToday) statToday.textContent = todayReservations.length;
    if (statMonth) statMonth.textContent = monthReservations;
    if (statPending) statPending.textContent = pendingReservations;
}

// Générer les disponibilités
async function generateAvailabilities() {
    const doctorId = document.getElementById('select-doctor-availability').value;
    const date = document.getElementById('availability-date').value;
    const slotsPerDay = parseInt(document.getElementById('slots-per-day').value);
    const startTime = document.getElementById('start-time').value;
    const endTime = document.getElementById('end-time').value;
    const pauseStart = document.getElementById('pause-start').value;
    const pauseEnd = document.getElementById('pause-end').value;
    
    const slotTypes = [];
    if (document.getElementById('slot-couple').checked) {
        slotTypes.push('Couple');
    }
    if (document.getElementById('slot-grossesse').checked) {
        slotTypes.push('Grossesse');
    }
    
    // Validation
    if (!doctorId) {
        alert('Veuillez sélectionner un professionnel');
        return;
    }
    
    if (!date) {
        alert('Veuillez sélectionner une date');
        return;
    }
    
    if (slotsPerDay < 1) {
        alert('Le nombre de créneaux doit être au moins 1');
        return;
    }
    
    if (slotTypes.length === 0) {
        alert('Veuillez sélectionner au moins un type de créneau');
        return;
    }
    
    const button = document.getElementById('btn-generate-availability');
    button.disabled = true;
    button.textContent = 'Génération...';
    
    try {
        const response = await fetch(`${API_BASE_URL}/doctors/${doctorId}/availabilities/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                date,
                slotsPerDay,
                slotTypes,
                startTime,
                endTime,
                pauseStart: pauseStart || null,
                pauseEnd: pauseEnd || null
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erreur lors de la génération');
        }
        
        const result = await response.json();
        
        // Afficher un message de succès
        showToast(`✅ ${result.message}`, 'success');
        
        // Réinitialiser le formulaire
        document.getElementById('availability-date').value = '';
        document.getElementById('slots-per-day').value = '3';
        document.getElementById('pause-start').value = '';
        document.getElementById('pause-end').value = '';
        
        // Recharger les réservations si on est sur l'onglet réservations
        if (dashboardState.currentTab === 'reservations') {
            loadReservations();
        }
        
    } catch (error) {
        console.error('Error generating availabilities:', error);
        showToast('Erreur : ' + error.message, 'error');
    } finally {
        button.disabled = false;
        button.textContent = 'Générer les créneaux';
    }
}

// Formater une date pour l'API (YYYY-MM-DD)
function formatDateForAPI(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Charger les créneaux pour la gestion de présence
async function loadPresenceSlots(doctorId, date) {
    try {
        const response = await fetch(`${API_BASE_URL}/doctors/${doctorId}/availabilities/all?date=${date}`);
        if (!response.ok) throw new Error('Erreur lors du chargement des créneaux');
        
        const availabilities = await response.json();
        const slotsContainer = document.getElementById('presence-slots-container');
        const slotsGrid = document.getElementById('presence-slots-grid');
        const slotsDate = document.getElementById('presence-slots-date');
        
        if (!slotsContainer || !slotsGrid || !slotsDate) return;
        
        // Formater la date pour l'affichage
        const dateObj = new Date(date + 'T00:00:00');
        const dayOfWeek = dayNames[dateObj.getDay()];
        const day = dateObj.getDate();
        const month = monthNames[dateObj.getMonth()];
        const year = dateObj.getFullYear();
        slotsDate.textContent = `${dayOfWeek} ${day} ${month} ${year}`;
        
        if (availabilities.length === 0) {
            slotsGrid.innerHTML = '<p class="no-slots">Aucun créneau généré pour cette date. Générez d\'abord les créneaux dans l\'onglet "Générer les créneaux".</p>';
            slotsContainer.classList.remove('hidden');
            return;
        }
        
        // Trier par heure
        availabilities.sort((a, b) => {
            if (a.startTime < b.startTime) return -1;
            if (a.startTime > b.startTime) return 1;
            return 0;
        });
        
        slotsGrid.innerHTML = availabilities.map(avail => {
            const statusClass = !avail.isPresent ? 'absent' : 
                               !avail.isAvailable || avail.hasReservation ? 'reserved' : 'available';
            const statusText = !avail.isPresent ? 'Absent' : 
                              avail.hasReservation ? 'Réservé' : 'Disponible';
            const statusIcon = !avail.isPresent ? '✗' : 
                              avail.hasReservation ? '✓' : '○';
            
            return `
                <div class="presence-slot ${statusClass}" data-availability-id="${avail.id}">
                    <div class="slot-time">${avail.startTime} - ${avail.endTime}</div>
                    <div class="slot-type">${avail.appointmentType || 'N/A'}</div>
                    <div class="slot-status">
                        <span class="status-icon">${statusIcon}</span>
                        <span class="status-text">${statusText}</span>
                    </div>
                    ${avail.hasReservation && avail.reservation ? `
                        <div class="slot-reservation">
                            <strong>Réservé par:</strong> ${avail.reservation.patientName}
                        </div>
                    ` : ''}
                    <button class="btn-toggle-presence" 
                            data-availability-id="${avail.id}" 
                            data-current-present="${avail.isPresent}"
                            ${avail.hasReservation ? 'disabled' : ''}>
                        ${avail.isPresent ? 'Marquer absent' : 'Marquer présent'}
                    </button>
                </div>
            `;
        }).join('');
        
        // Ajouter les écouteurs d'événements pour les boutons
        document.querySelectorAll('.btn-toggle-presence').forEach(btn => {
            btn.addEventListener('click', function() {
                const availabilityId = parseInt(this.dataset.availabilityId);
                const currentPresent = this.dataset.currentPresent === 'true';
                toggleSlotPresence(availabilityId, !currentPresent);
            });
        });
        
        slotsContainer.classList.remove('hidden');
    } catch (error) {
        console.error('Erreur lors du chargement des créneaux:', error);
        alert('Erreur lors du chargement des créneaux: ' + error.message);
    }
}

// Basculer la présence d'un créneau individuel
async function toggleSlotPresence(availabilityId, isPresent) {
    try {
        const response = await fetch(`${API_BASE_URL}/availabilities/${availabilityId}/presence`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ isPresent })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erreur lors de la mise à jour');
        }
        
        // Recharger les créneaux
        const selectPresence = document.getElementById('select-doctor-presence');
        const presenceDate = document.getElementById('presence-date');
        if (selectPresence && selectPresence.value && presenceDate && presenceDate.value) {
            loadPresenceSlots(parseInt(selectPresence.value), presenceDate.value);
        }
        
        // Afficher un message de succès
        const message = isPresent ? 'Créneau marqué comme présent' : 'Créneau marqué comme absent';
        showToast(`✅ ${message}`, 'success');
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la présence:', error);
        showToast('Erreur: ' + error.message, 'error');
    }
}

// Afficher une notification toast
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    // Animation d'entrée
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Supprimer après 3 secondes
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            container.removeChild(toast);
        }, 300);
    }, 3000);
}

// Mettre à jour la présence pour toute une date
async function updatePresenceForDate(doctorId, date, isPresent) {
    try {
        const response = await fetch(`${API_BASE_URL}/doctors/${doctorId}/availabilities/presence`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ date, isPresent })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erreur lors de la mise à jour');
        }
        
        const result = await response.json();
        showToast(`✅ ${result.count} créneau(x) mis à jour: ${isPresent ? 'Présent' : 'Absent'}`, 'success');
        
        // Recharger les créneaux
        loadPresenceSlots(doctorId, date);
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la présence:', error);
        showToast('Erreur: ' + error.message, 'error');
    }
}
