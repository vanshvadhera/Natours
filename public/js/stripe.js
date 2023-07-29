/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

export const bookTour = async (tourId) => {
  const stripe = Stripe('pk_test_51NY7tqSFncmyCuRW87VaZIyBHpM6q4JgVwyOv11K9sTIHrzHyMUmxyY2cvzptgqzcSp32JN5IXMoirhT4sCxhA0600KAeWxvqC');
  try {
    // 1) Get checkout session from API
    const session = await axios(`/api/v1/bookings/checkOutSession/${tourId}`);
    console.log("This is session", session);

    // 2) Create checkout form + chanre credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};
