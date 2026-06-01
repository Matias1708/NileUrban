/** Set Firebase Auth custom claims for staff users. Run with service account credentials. */
import * as admin from "firebase-admin";

const STAFF = [
  { email: "admin@nileurban.com", claims: { staff: true, admin: true, name: "Admin" } },
  { email: "nico@nileurban.com", claims: { staff: true, admin: true, name: "Nicolas", barberName: "Nicolas" } },
  { email: "pablo@nileurban.com", claims: { staff: true, name: "Pablo", barberName: "Pablo" } },
  { email: "lautaro@nileurban.com", claims: { staff: true, name: "Lautaro", barberName: "Lautaro" } },
  { email: "matias@nileurban.com", claims: { staff: true, name: "Matias", barberName: "Matias" } },
];

async function main() {
  if (!admin.apps.length) admin.initializeApp();
  for (const { email, claims } of STAFF) {
    try {
      const user = await admin.auth().getUserByEmail(email);
      await admin.auth().setCustomUserClaims(user.uid, claims);
      console.log(`Claims set for ${email}`);
    } catch {
      console.warn(`User not found: ${email} — create in Firebase Auth first`);
    }
  }
}

main().catch(console.error);
