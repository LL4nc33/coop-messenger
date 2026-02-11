package payments

// Available indicates that Stripe payments are not supported in Coop.
const Available = false

// SubscriptionStatus is a stub type (payments not used in Coop)
type SubscriptionStatus string

// PriceRecurringInterval is a stub type (payments not used in Coop)
type PriceRecurringInterval string

// Setup is a no-op (payments not used in Coop)
func Setup(stripeSecretKey string) {
}
