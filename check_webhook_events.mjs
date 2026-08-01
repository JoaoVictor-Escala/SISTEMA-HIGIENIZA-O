import Stripe from 'stripe';
import dotenv from 'dotenv';
dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const webhooks = await stripe.webhookEndpoints.list();

webhooks.data.forEach(wh => {
  console.log('\n📌 Webhook:', wh.description || wh.id);
  console.log('   URL:', wh.url);
  console.log('   Status:', wh.status);
  console.log('   Eventos configurados:');
  wh.enabled_events.forEach(e => console.log('     -', e));
});
