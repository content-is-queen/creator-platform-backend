# Cloud Functions

## stripeEvent

A cloud function triggered by the stripe `customer.subscription.deleted` event

---

### How to test

1. Install dependencies

```
npm i
```

2. Start up local firebase emulator

```
npm run serve
```

3. Create an `.env` file and add the `STRIPE_WHSEC` variable which can be found here: https://dashboard.stripe.com/test/webhooks/create?endpoint_location=local

4. Download the CLI and login to stripe so that we can manually trigger an event

```
stripe login
```

5. Forward the event to the stripeEvent cloud function

```
stripe listen --forward-to http://127.0.0.1:5001/creator-platform---production/us-central1/stripeEvent
```

6. Trigger a customer event

```
stripe trigger customer.subscription.deleted
```

```
stripe trigger invoice.paid
```

### Deployment

Don't forget to update the `STRIPE_WHSEC` variable in your `.env` file

**Staging**

1. Set project to staging

```
firebase use staging
```

2. Deploy

```
npm run deploy
```

**Production**

1. Set project to production

```
firebase use production
```

2. Deploy

```
npm run deploy
```
