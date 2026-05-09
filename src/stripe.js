// Stripe integration
// In production, payments are processed through a backend (Firebase Cloud Functions)
// This module handles the client-side flow

import { loadStripe } from '@stripe/stripe-js';

// Replace with your Stripe publishable key
const STRIPE_PK = 'pk_test_YOUR_STRIPE_KEY';
let stripePromise = null;

export function getStripe() {
  if (!stripePromise) {
    stripePromise = loadStripe(STRIPE_PK);
  }
  return stripePromise;
}

// In a real deployment, this calls your Firebase Cloud Function
// For now, we'll track payments in Firestore and simulate the flow
export async function createPaymentIntent(poolId, userId, amount, orgId) {
  // This would call: /api/create-payment-intent
  // For demo, we simulate a payment record
  console.log('Payment intent:', { poolId, userId, amount, orgId });
  return {
    clientSecret: 'demo_secret',
    paymentIntentId: 'pi_demo_' + Date.now()
  };
}

// Record a payment in Firestore (called after successful Stripe payment)
export function buildPaymentRecord(userId, alias, poolId, poolName, amount, charityPercent, method, orgId) {
  const charityAmount = amount * (charityPercent / 100);
  const poolAmount = amount - charityAmount;
  return {
    userId,
    alias,
    poolId,
    poolName,
    amount,
    charityAmount,
    poolAmount,
    charityPercent,
    method, // 'stripe', 'cash', 'check', 'other'
    status: method === 'stripe' ? 'completed' : 'pending',
    orgId,
    createdAt: new Date().toISOString()
  };
}

// Payment methods display
export function paymentMethodLabel(method) {
  const labels = { stripe: '💳 Card', zelle: '📱 Zelle', cash: '💵 Cash', check: '📝 Check', other: '📋 Other' };
  return labels[method] || method;
}
