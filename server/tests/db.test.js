import { describe, it, expect, beforeAll } from 'vitest';
import { createTenant, verifyTenant, getStats } from '../database.js';
import crypto from 'crypto';

describe('Database Functions', () => {
    let testEmail = `test_${crypto.randomBytes(4).toString('hex')}@example.com`;
    let tenantId;

    it('should create a new tenant', () => {
        // signature is: name, email, password_hash, verification_token, referred_by = null
        const result = createTenant(
            'Test Tenant',
            testEmail,
            'hash123',
            'token123'
        );
        
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('email', testEmail);
        tenantId = result.id;
    });

    it('should verify the tenant', () => {
        const tenant = verifyTenant(testEmail);
        expect(tenant).toBeDefined();
        expect(tenant.email).toBe(testEmail);
    });

    it('should calculate empty analytics for new tenant', () => {
        const stats = getStats(tenantId);
        expect(stats).toBeDefined();
        expect(stats.monthlyRevenue).toBe(0);
        expect(stats.finishedOrders).toBe(0);
    });
});
