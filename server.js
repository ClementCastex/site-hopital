const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Test de connexion Prisma au démarrage
async function testPrismaConnection() {
  try {
    await prisma.$connect();
    console.log('✅ Connexion à la base de données réussie');
    
    // Vérifier si des médecins existent
    const count = await prisma.doctor.count();
    console.log(`📊 Nombre de professionnels en base : ${count}`);
    
    if (count === 0) {
      console.log('⚠️  Aucun professionnel trouvé. Exécutez: npm run prisma:seed');
    }
  } catch (error) {
    console.error('❌ Erreur de connexion à la base de données:', error.message);
    console.log('💡 Assurez-vous d\'avoir exécuté: npm run prisma:generate && npm run prisma:push');
    process.exit(1);
  }
}

// Routes API

// Route de test
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Serveur actif' });
});

// Récupérer tous les médecins
app.get('/api/doctors', async (req, res) => {
  try {
    const { type } = req.query;
    const where = {};
    
    if (type) {
      where.type = type;
    }
    
    const doctors = await prisma.doctor.findMany({
      where,
      orderBy: {
        lastName: 'asc'
      }
    });
    
    console.log(`📋 ${doctors.length} professionnel(s) trouvé(s)${type ? ` (type: ${type})` : ''}`);
    res.json(doctors);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des médecins:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des médecins',
      details: error.message 
    });
  }
});

// Récupérer les disponibilités d'un médecin
app.get('/api/doctors/:doctorId/availabilities', async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date, includeUnavailable } = req.query;

    const where = {
      doctorId: parseInt(doctorId),
      isPresent: true // Seulement les créneaux où le médecin est présent
    };

    // Si includeUnavailable n'est pas spécifié, ne montrer que les disponibles
    if (includeUnavailable !== 'true') {
      where.isAvailable = true;
    }

    if (date) {
      where.date = date;
    }

    const availabilities = await prisma.availability.findMany({
      where,
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' }
      ],
      include: {
        doctor: {
          select: {
            firstName: true,
            lastName: true,
            specialty: true
          }
        }
      }
    });

    res.json(availabilities);
  } catch (error) {
    console.error('Error fetching availabilities:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des disponibilités' });
  }
});

// Créer une réservation
app.post('/api/reservations', async (req, res) => {
  try {
    const { doctorId, availabilityId, patientName, patientEmail, patientPhone, date, time, appointmentType } = req.body;

    // Validation des champs requis
    if (!patientName || !patientPhone || !doctorId || !availabilityId || !date || !time) {
      return res.status(400).json({ error: 'Tous les champs requis doivent être remplis' });
    }

    // Utiliser une transaction pour garantir l'atomicité et éviter les conflits de concurrence
    const result = await prisma.$transaction(async (tx) => {
      // Vérifier que la disponibilité existe et est disponible (avec verrou pessimiste)
      const availability = await tx.availability.findUnique({
        where: { id: parseInt(availabilityId) },
        include: {
          doctor: true
        }
      });

      if (!availability) {
        throw new Error('Cette disponibilité n\'existe pas');
      }

      // Vérifier que le médecin est présent
      if (!availability.isPresent) {
        throw new Error('Le professionnel n\'est pas présent à ce créneau');
      }

      // Vérifier que le créneau est disponible
      if (!availability.isAvailable) {
        throw new Error('Ce créneau n\'est plus disponible. Veuillez choisir un autre horaire.');
      }

      // Vérifier que le doctorId correspond
      if (availability.doctorId !== parseInt(doctorId)) {
        throw new Error('Incohérence entre le professionnel et la disponibilité');
      }

      // Vérifier qu'il n'y a pas déjà une réservation active pour cette disponibilité
      const existingReservation = await tx.reservation.findFirst({
        where: {
          availabilityId: parseInt(availabilityId),
          status: {
            not: 'cancelled'
          }
        }
      });

      if (existingReservation) {
        throw new Error('Ce créneau est déjà réservé');
      }

      // Créer la réservation et marquer la disponibilité comme non disponible en une seule transaction
      const reservation = await tx.reservation.create({
        data: {
          doctorId: parseInt(doctorId),
          availabilityId: parseInt(availabilityId),
          patientName,
          patientEmail: patientEmail || null,
          patientPhone,
          date,
          time,
          appointmentType: appointmentType || 'Couple',
          status: 'pending'
        },
        include: {
          doctor: {
            select: {
              firstName: true,
              lastName: true,
              specialty: true,
              type: true
            }
          }
        }
      });

      // Marquer la disponibilité comme non disponible
      await tx.availability.update({
        where: { id: parseInt(availabilityId) },
        data: { isAvailable: false }
      });

      return reservation;
    });

    console.log(`✅ Réservation créée : #${result.id} - ${patientName} - ${date} à ${time} avec ${result.doctor.firstName} ${result.doctor.lastName}`);
    
    res.json(result);
  } catch (error) {
    console.error('❌ Erreur lors de la création de la réservation:', error);
    
    // Gérer les erreurs spécifiques
    if (error.message.includes('n\'existe pas') || error.message.includes('n\'est plus disponible') || 
        error.message.includes('déjà réservé') || error.message.includes('n\'est pas présent')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ 
      error: 'Erreur lors de la création de la réservation',
      details: error.message 
    });
  }
});

// Démarrer le serveur
async function startServer() {
  try {
    // Tester la connexion Prisma
    await testPrismaConnection();
    
    // Démarrer le serveur
    app.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
      console.log(`📝 API disponible sur http://localhost:${PORT}/api`);
      console.log(`🌐 Page de réservation: http://localhost:${PORT}/reservation.html`);
    });
  } catch (error) {
    console.error('❌ Erreur au démarrage du serveur:', error);
    process.exit(1);
  }
}

startServer();

// ============================================
// Routes API pour le tableau de bord
// ============================================

// Récupérer toutes les réservations
app.get('/api/reservations', async (req, res) => {
  try {
    const { doctorId, date, status, startDate, endDate } = req.query;
    const where = {};
    
    if (doctorId) {
      where.doctorId = parseInt(doctorId);
    }
    
    if (date) {
      where.date = date;
    } else if (startDate || endDate) {
      // Filtrer par plage de dates
      where.date = {};
      if (startDate) {
        where.date.gte = startDate;
      }
      if (endDate) {
        where.date.lte = endDate;
      }
    }
    
    if (status) {
      where.status = status;
    }
    
    const reservations = await prisma.reservation.findMany({
      where,
      include: {
        doctor: {
          select: {
            firstName: true,
            lastName: true,
            specialty: true,
            type: true
          }
        }
      },
      orderBy: [
        { date: 'asc' },
        { time: 'asc' }
      ]
    });
    
    res.json(reservations);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des réservations:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des réservations' });
  }
});

// Statistiques pour le dashboard
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const totalReservations = await prisma.reservation.count();
    
    const today = new Date().toISOString().split('T')[0];
    const todayReservations = await prisma.reservation.count({
      where: { date: today }
    });
    
    const totalDoctors = await prisma.doctor.count();
    
    res.json({
      totalReservations,
      todayReservations,
      totalDoctors
    });
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
});

// Générer des disponibilités pour un médecin
app.post('/api/doctors/:doctorId/availabilities/generate', async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date, slotsPerDay, slotTypes, startTime, endTime, pauseStart, pauseEnd } = req.body;
    
    const doctor = await prisma.doctor.findUnique({
      where: { id: parseInt(doctorId) }
    });
    
    if (!doctor) {
      return res.status(404).json({ error: 'Professionnel non trouvé' });
    }
    
    // Supprimer les disponibilités existantes pour cette date (sauf celles réservées)
    await prisma.availability.deleteMany({
      where: {
        doctorId: parseInt(doctorId),
        date: date,
        isAvailable: true
      }
    });
    
    // Générer les créneaux
    const availabilities = [];
    const start = parseTime(startTime);
    const end = parseTime(endTime);
    const pauseStartTime = pauseStart ? parseTime(pauseStart) : null;
    const pauseEndTime = pauseEnd ? parseTime(pauseEnd) : null;
    
    // Calculer la répartition des créneaux
    const totalSlots = slotsPerDay;
    let coupleCount = 0;
    let grossesseCount = 0;
    
    if (slotTypes.includes('Couple') && slotTypes.includes('Grossesse')) {
      // Répartition équitable
      coupleCount = Math.floor(totalSlots / 2);
      grossesseCount = Math.ceil(totalSlots / 2);
    } else if (slotTypes.includes('Couple')) {
      coupleCount = totalSlots;
    } else if (slotTypes.includes('Grossesse')) {
      grossesseCount = totalSlots;
    }
    
    let currentTime = { ...start };
    let slotsCreated = 0;
    
    // Fonction pour vérifier si on peut placer un créneau
    const canPlaceSlot = (duration, timeRef) => {
      const currentMinutes = timeRef.hour * 60 + timeRef.minute;
      const endMinutes = end.hour * 60 + end.minute;
      
      // Vérifier qu'on ne dépasse pas la fin
      if (currentMinutes + duration > endMinutes) {
        return false;
      }
      
      // Vérifier si on est dans la pause
      if (pauseStartTime && pauseEndTime) {
        const pauseStartMinutes = pauseStartTime.hour * 60 + pauseStartTime.minute;
        const pauseEndMinutes = pauseEndTime.hour * 60 + pauseEndTime.minute;
        
        if (currentMinutes >= pauseStartMinutes && currentMinutes < pauseEndMinutes) {
          timeRef.hour = pauseEndTime.hour;
          timeRef.minute = pauseEndTime.minute;
          return canPlaceSlot(duration, timeRef);
        }
      }
      
      return true;
    };
    
    // Générer les créneaux Couple (1h = 60min)
    for (let i = 0; i < coupleCount && slotsCreated < totalSlots; i++) {
      if (!canPlaceSlot(60, currentTime)) break;
      
      const endSlot = addMinutes(currentTime, 60);
      availabilities.push({
        doctorId: parseInt(doctorId),
        date: date,
        startTime: formatTime(currentTime),
        endTime: formatTime(endSlot),
        appointmentType: 'Couple',
        isAvailable: true,
        isPresent: true
      });
      
      currentTime = addMinutes(currentTime, 60);
      slotsCreated++;
    }
    
    // Générer les créneaux Grossesse (45min)
    for (let i = 0; i < grossesseCount && slotsCreated < totalSlots; i++) {
      if (!canPlaceSlot(45, currentTime)) break;
      
      const endSlot = addMinutes(currentTime, 45);
      availabilities.push({
        doctorId: parseInt(doctorId),
        date: date,
        startTime: formatTime(currentTime),
        endTime: formatTime(endSlot),
        appointmentType: 'Grossesse',
        isAvailable: true,
        isPresent: true
      });
      
      currentTime = addMinutes(currentTime, 45);
      slotsCreated++;
    }
    
    // Créer les disponibilités
    if (availabilities.length > 0) {
      const created = await prisma.availability.createMany({
        data: availabilities
      });
      
      res.json({ 
        message: `${created.count} créneaux générés avec succès`,
        count: created.count
      });
    } else {
      res.json({ 
        message: 'Aucun créneau généré (horaires incompatibles)',
        count: 0
      });
    }
  } catch (error) {
    console.error('❌ Erreur lors de la génération des disponibilités:', error);
    res.status(500).json({ error: 'Erreur lors de la génération des disponibilités', details: error.message });
  }
});

// Fonctions utilitaires pour la gestion du temps
function parseTime(timeString) {
  const [hour, minute] = timeString.split(':').map(Number);
  return { hour, minute };
}

function formatTime(time) {
  return `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
}

function addMinutes(time, minutes) {
  const totalMinutes = time.hour * 60 + time.minute + minutes;
  return {
    hour: Math.floor(totalMinutes / 60),
    minute: totalMinutes % 60
  };
}

function isTimeInRange(time, start, end) {
  const timeMinutes = time.hour * 60 + time.minute;
  const startMinutes = start.hour * 60 + start.minute;
  const endMinutes = end.hour * 60 + end.minute;
  return timeMinutes >= startMinutes && timeMinutes < endMinutes;
}

// Mettre à jour la présence d'un médecin pour un créneau spécifique
app.patch('/api/availabilities/:availabilityId/presence', async (req, res) => {
  try {
    const { availabilityId } = req.params;
    const { isPresent } = req.body;

    if (typeof isPresent !== 'boolean') {
      return res.status(400).json({ error: 'Le champ isPresent doit être un booléen' });
    }

    const availability = await prisma.availability.findUnique({
      where: { id: parseInt(availabilityId) },
      include: {
        doctor: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!availability) {
      return res.status(404).json({ error: 'Créneau non trouvé' });
    }

    // Si on marque comme absent, on doit aussi marquer comme non disponible
    const updatedAvailability = await prisma.availability.update({
      where: { id: parseInt(availabilityId) },
      data: {
        isPresent,
        // Si le médecin n'est pas présent, le créneau n'est pas disponible
        isAvailable: isPresent ? availability.isAvailable : false
      },
      include: {
        doctor: {
          select: {
            firstName: true,
            lastName: true,
            specialty: true
          }
        }
      }
    });

    console.log(`✅ Présence mise à jour pour le créneau #${availabilityId}: ${isPresent ? 'Présent' : 'Absent'}`);
    
    res.json(updatedAvailability);
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour de la présence:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la mise à jour de la présence',
      details: error.message 
    });
  }
});

// Mettre à jour la présence d'un médecin pour tous les créneaux d'une date
app.patch('/api/doctors/:doctorId/availabilities/presence', async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date, isPresent } = req.body;

    if (typeof isPresent !== 'boolean') {
      return res.status(400).json({ error: 'Le champ isPresent doit être un booléen' });
    }

    if (!date) {
      return res.status(400).json({ error: 'La date est requise' });
    }

    const doctor = await prisma.doctor.findUnique({
      where: { id: parseInt(doctorId) }
    });

    if (!doctor) {
      return res.status(404).json({ error: 'Professionnel non trouvé' });
    }

    // Mettre à jour tous les créneaux de cette date
    const result = await prisma.availability.updateMany({
      where: {
        doctorId: parseInt(doctorId),
        date: date
      },
      data: {
        isPresent,
        // Si le médecin n'est pas présent, les créneaux ne sont pas disponibles
        isAvailable: isPresent ? undefined : false // undefined = ne pas modifier si isPresent est true
      }
    });

    console.log(`✅ Présence mise à jour pour ${result.count} créneau(x) du ${date} pour ${doctor.firstName} ${doctor.lastName}: ${isPresent ? 'Présent' : 'Absent'}`);
    
    res.json({ 
      message: `${result.count} créneau(x) mis à jour`,
      count: result.count,
      date,
      isPresent
    });
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour de la présence:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la mise à jour de la présence',
      details: error.message 
    });
  }
});

// Récupérer toutes les disponibilités d'un médecin (pour le dashboard, incluant les non disponibles)
app.get('/api/doctors/:doctorId/availabilities/all', async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date, startDate, endDate } = req.query;

    const where = {
      doctorId: parseInt(doctorId)
    };

    if (date) {
      where.date = date;
    } else if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = startDate;
      }
      if (endDate) {
        where.date.lte = endDate;
      }
    }

    const availabilities = await prisma.availability.findMany({
      where,
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' }
      ],
      include: {
        doctor: {
          select: {
            firstName: true,
            lastName: true,
            specialty: true,
            type: true
          }
        },
        // Inclure les réservations associées
        _count: {
          select: {
            // On va compter les réservations via une requête séparée si nécessaire
          }
        }
      }
    });

    // Pour chaque disponibilité, vérifier s'il y a une réservation
    const availabilitiesWithReservations = await Promise.all(
      availabilities.map(async (availability) => {
        const reservation = await prisma.reservation.findFirst({
          where: {
            availabilityId: availability.id,
            status: {
              not: 'cancelled'
            }
          },
          select: {
            id: true,
            patientName: true,
            status: true
          }
        });

        return {
          ...availability,
          hasReservation: !!reservation,
          reservation: reservation || null
        };
      })
    );

    res.json(availabilitiesWithReservations);
  } catch (error) {
    console.error('Error fetching all availabilities:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des disponibilités' });
  }
});

// Gestion de l'arrêt propre
process.on('SIGINT', async () => {
  console.log('\n🛑 Arrêt du serveur...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Arrêt du serveur...');
  await prisma.$disconnect();
  process.exit(0);
});
