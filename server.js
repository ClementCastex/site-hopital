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
    const { date } = req.query;

    const where = {
      doctorId: parseInt(doctorId),
      isAvailable: true
    };

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
    const { doctorId, availabilityId, patientName, patientEmail, patientPhone, date, time } = req.body;

    // Vérifier que la disponibilité existe et est disponible
    const availability = await prisma.availability.findUnique({
      where: { id: parseInt(availabilityId) }
    });

    if (!availability || !availability.isAvailable) {
      return res.status(400).json({ error: 'Cette disponibilité n\'est plus disponible' });
    }

    // Créer la réservation
    const reservation = await prisma.reservation.create({
      data: {
        doctorId: parseInt(doctorId),
        availabilityId: parseInt(availabilityId),
        patientName,
        patientEmail,
        patientPhone,
        date,
        time,
        appointmentType: req.body.appointmentType || 'Couple',
        status: 'pending'
      }
    });

    // Marquer la disponibilité comme non disponible
    await prisma.availability.update({
      where: { id: parseInt(availabilityId) },
      data: { isAvailable: false }
    });

    res.json(reservation);
  } catch (error) {
    console.error('Error creating reservation:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la réservation' });
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
