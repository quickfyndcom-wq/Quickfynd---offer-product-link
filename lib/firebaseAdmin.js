import admin from 'firebase-admin';

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!admin.apps.length && serviceAccountKey) {
  try {
    const serviceAccount = JSON.parse(serviceAccountKey);
    if (serviceAccount?.project_id && serviceAccount?.private_key && serviceAccount?.client_email) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      console.warn('⚠️ Firebase Admin credentials are incomplete in FIREBASE_SERVICE_ACCOUNT_KEY');
    }
  } catch (error) {
    console.warn('⚠️ Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY for firebaseAdmin helper:', error.message);
  }
}

export default admin;
