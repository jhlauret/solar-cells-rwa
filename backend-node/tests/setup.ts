// Variables d'environnement minimales pour les tests (avant le chargement de env.ts)
process.env.NODE_ENV               = 'test';
process.env.PORT                   = '3001';
process.env.JWT_ACCESS_SECRET      = 'test-access-secret-min-32-characters-ok';
process.env.JWT_REFRESH_SECRET     = 'test-refresh-secret-min-32-characters-ok';
process.env.ODOO_URL               = 'http://localhost:8069';
process.env.ODOO_DB                = 'solarcells_test';
process.env.ODOO_API_USER          = 'api@test.com';
process.env.ODOO_API_PASSWORD      = 'test_password';
process.env.MINIO_ENDPOINT         = 'localhost';
process.env.MINIO_ACCESS_KEY       = 'minioadmin';
process.env.MINIO_SECRET_KEY       = 'minioadmin';
process.env.STRIPE_SECRET_KEY      = 'sk_test_placeholder_for_tests';
process.env.STRIPE_WEBHOOK_SECRET  = 'whsec_placeholder_for_tests';
process.env.CORS_ORIGINS           = 'http://localhost:5173';
