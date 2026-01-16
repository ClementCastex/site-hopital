const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Supprimer les données existantes
  await prisma.reservation.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.doctor.deleteMany();

  // Créer les psychologues avec leurs données réelles
  const psychologists = [
    {
      firstName: 'Madame',
      lastName: 'Lemaire',
      specialty: 'Psychologue',
      type: 'Psychologue',
      email: 'lemaire@cabinet-psy.fr',
      phone: '(0) 77 83 32 45',
      schedule: {
        startHour: 7,
        endHour: 15,
        pauseStart: 11,
        pauseEnd: 12,
        slots: [
          { time: '07:00', end: '08:00', type: 'Couple' },
          { time: '08:00', end: '08:45', type: 'Grossesse' },
          { time: '09:00', end: '10:00', type: 'Couple' },
          { time: '10:00', end: '10:45', type: 'Grossesse' },
          { time: '12:00', end: '13:00', type: 'Couple' },
          { time: '13:00', end: '13:45', type: 'Grossesse' },
          { time: '14:00', end: '15:00', type: 'Couple' }
        ]
      }
    },
    {
      firstName: 'Monsieur',
      lastName: 'André',
      specialty: 'Psychologue',
      type: 'Psychologue',
      email: 'andre@cabinet-psy.fr',
      phone: '(0) 77 83 32 45',
      schedule: {
        startHour: 9,
        endHour: 18,
        pauseStart: 12,
        pauseEnd: 13.5,
        slots: [
          { time: '09:00', end: '10:00', type: 'Couple' },
          { time: '10:00', end: '10:45', type: 'Grossesse' },
          { time: '11:00', end: '12:00', type: 'Couple' },
          { time: '13:30', end: '14:30', type: 'Couple' },
          { time: '14:30', end: '15:15', type: 'Grossesse' },
          { time: '15:30', end: '16:30', type: 'Couple' },
          { time: '16:30', end: '17:15', type: 'Grossesse' },
          { time: '17:15', end: '18:00', type: 'Grossesse' }
        ]
      }
    },
    {
      firstName: 'Madame',
      lastName: 'Honoré',
      specialty: 'Psychologue',
      type: 'Psychologue',
      email: 'honore@cabinet-psy.fr',
      phone: '(0) 77 83 32 45',
      schedule: {
        startHour: 11,
        endHour: 19,
        pauseStart: null,
        pauseEnd: null,
        slots: [
          { time: '11:00', end: '12:00', type: 'Couple' },
          { time: '12:00', end: '12:45', type: 'Grossesse' },
          { time: '13:00', end: '14:00', type: 'Couple' },
          { time: '14:00', end: '14:45', type: 'Grossesse' },
          { time: '15:00', end: '16:00', type: 'Couple' },
          { time: '16:00', end: '16:45', type: 'Grossesse' },
          { time: '17:00', end: '18:00', type: 'Couple' },
          { time: '18:00', end: '18:45', type: 'Grossesse' }
        ]
      }
    },
    {
      firstName: 'Madame',
      lastName: 'Garnier',
      specialty: 'Psychologue',
      type: 'Psychologue',
      email: 'secretariatpsy-garnier@bativodenc.fr',
      phone: '(0) 77 83 32 45',
      schedule: {
        startHour: 9,
        endHour: 19,
        pauseStart: 11.5,
        pauseEnd: 13.5,
        slots: [
          { time: '09:00', end: '10:00', type: 'Couple' },
          { time: '10:00', end: '10:45', type: 'Grossesse' },
          { time: '10:45', end: '11:30', type: 'Grossesse' },
          { time: '13:30', end: '14:30', type: 'Couple' },
          { time: '14:30', end: '15:15', type: 'Grossesse' },
          { time: '15:30', end: '16:30', type: 'Couple' },
          { time: '16:30', end: '17:15', type: 'Grossesse' },
          { time: '17:30', end: '18:30', type: 'Couple' },
          { time: '18:30', end: '19:00', type: 'Grossesse' }
        ]
      }
    }
  ];

  // Créer les psychologues
  const createdPsychologists = [];
  for (const psych of psychologists) {
    const { schedule, ...psychData } = psych;
    const created = await prisma.doctor.create({
      data: psychData
    });
    createdPsychologists.push({ ...created, schedule });
  }

  // Créer des disponibilités pour chaque psychologue sur 30 jours
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
    const date = new Date(today);
    date.setDate(today.getDate() + dayOffset);
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay(); // 0 = dimanche, 6 = samedi

    // Ne pas créer de disponibilités le dimanche (0)
    if (dayOfWeek === 0) continue;

    for (const psych of createdPsychologists) {
      for (const slot of psych.schedule.slots) {
        await prisma.availability.create({
          data: {
            doctorId: psych.id,
            date: dateStr,
            startTime: slot.time,
            endTime: slot.end,
            appointmentType: slot.type,
            isAvailable: true
          }
        });
      }
    }
  }

  console.log(`✅ Created ${createdPsychologists.length} psychologists with availabilities`);
  console.log('✅ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
