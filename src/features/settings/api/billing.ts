import type { ServerResponse } from "@/types";

import { apiClient } from "@/services/api";

/**
 * Organization subscription status information
 */
export interface SubscriptionStatus {
  plan: string;
  status: string;
  stripe_customer_id: string;
}

/**
 * Stripe checkout session response containing payment URL
 */
export interface CheckoutSessionResponse {
  url: string;
}

/**
 * Billing and subscription management API service
 * Handles subscription management, checkout sessions, and payment processing
 */
export const billingService = {
  /**
   * Create a Stripe checkout session for subscription upgrade
   * @param orgId - Organization ID
   * @param priceId - Stripe price ID
   * @returns Checkout session with URL to redirect to Stripe
   */
  createCheckoutSession: async (orgId: string, priceId: string) => {
    const response = await apiClient.post<ServerResponse<CheckoutSessionResponse>>(
      `/api/v1/organizations/${orgId}/billing/checkout`,
      { price_id: priceId },
    );
    return response.data.data;
  },

  /**
   * Get current subscription status for an organization
   * @param orgId - Organization ID
   * @returns Current subscription status information
   */
  getSubscriptionStatus: async (orgId: string) => {
    const response = await apiClient.get<ServerResponse<SubscriptionStatus>>(
      `/api/v1/organizations/${orgId}/billing/status`,
    );
    return response.data.data;
  },
};
