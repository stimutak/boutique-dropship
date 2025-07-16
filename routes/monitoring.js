const express = require('express');
const mongoose = require('mongoose');
const { logger } = require('../utils/logger');
const { getCircuitBreakerStatus } = require('../utils/errorRecovery');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Basic health check
router.get('/health', (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  };

  res.json(healthCheck);
});

// Detailed system status (admin only)
router.get('/status', requireAdmin, async (req, res) => {
  try {
    const status = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: await getDatabaseStatus(),
      circuitBreakers: getCircuitBreakerStatus(),
      services: await getServicesStatus()
    };

    logger.info('System status requested', {
      requestedBy: req.user.email,
      timestamp: status.timestamp
    });

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Error getting system status:', {
      error: error.message,
      requestedBy: req.user.email
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'STATUS_ERROR',
        message: 'Unable to retrieve system status'
      }
    });
  }
});

// Database health check
async function getDatabaseStatus() {
  try {
    const dbState = mongoose.connection.readyState;
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    const status = {
      state: states[dbState],
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name
    };

    // Test database connectivity
    if (dbState === 1) {
      await mongoose.connection.db.admin().ping();
      status.ping = 'success';
    }

    return status;
  } catch (error) {
    return {
      state: 'error',
      error: error.message
    };
  }
}

// Services health check
async function getServicesStatus() {
  const services = {};

  // Check payment service (Mollie)
  try {
    // In a real implementation, you might ping Mollie's API
    services.payment = {
      status: 'available',
      provider: 'mollie'
    };
  } catch (error) {
    services.payment = {
      status: 'unavailable',
      error: error.message
    };
  }

  // Check email service
  try {
    // In a real implementation, you might test SMTP connection
    services.email = {
      status: 'available',
      provider: 'nodemailer'
    };
  } catch (error) {
    services.email = {
      status: 'unavailable',
      error: error.message
    };
  }

  return services;
}

// Metrics endpoint (admin only)
router.get('/metrics', requireAdmin, async (req, res) => {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      },
      database: {
        connections: mongoose.connection.readyState,
        collections: await getCollectionStats()
      },
      errors: await getErrorMetrics()
    };

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Error getting metrics:', {
      error: error.message,
      requestedBy: req.user.email
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'METRICS_ERROR',
        message: 'Unable to retrieve metrics'
      }
    });
  }
});

// Get collection statistics
async function getCollectionStats() {
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    const stats = {};

    for (const collection of collections) {
      try {
        const collectionStats = await mongoose.connection.db.collection(collection.name).stats();
        stats[collection.name] = {
          count: collectionStats.count,
          size: collectionStats.size,
          avgObjSize: collectionStats.avgObjSize
        };
      } catch (error) {
        stats[collection.name] = { error: error.message };
      }
    }

    return stats;
  } catch (error) {
    return { error: error.message };
  }
}

// Get error metrics (simplified - in production you'd use proper metrics storage)
async function getErrorMetrics() {
  // This is a simplified implementation
  // In production, you'd use proper metrics collection like Prometheus
  return {
    note: 'Error metrics would be collected from logs or metrics store',
    last24Hours: {
      total: 0,
      byType: {},
      byEndpoint: {}
    }
  };
}

// Logs endpoint (admin only) - recent logs
router.get('/logs', requireAdmin, (req, res) => {
  try {
    const { level = 'info', limit = 100 } = req.query;
    
    // In a real implementation, you'd read from log files or log aggregation service
    res.json({
      success: true,
      data: {
        message: 'Log retrieval endpoint - would return recent logs',
        level,
        limit,
        note: 'In production, this would read from log files or log aggregation service'
      }
    });
  } catch (error) {
    logger.error('Error retrieving logs:', {
      error: error.message,
      requestedBy: req.user.email
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'LOGS_ERROR',
        message: 'Unable to retrieve logs'
      }
    });
  }
});

module.exports = router;