const { PrismaClient } = require('@prisma/client');

// Client único do app — o "model" é o prisma/schema.prisma.
module.exports = new PrismaClient();
