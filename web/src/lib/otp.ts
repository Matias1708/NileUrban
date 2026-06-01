import { collection, addDoc, getDocs, query, where, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

const OTP_COLLECTION = "otpSessions";
const OTP_TTL_MS = 10 * 60 * 1000;

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function createOtpSession(phone: string): Promise<{ sessionId: string; code: string }> {
  const code = generateCode();
  const ref = await addDoc(collection(db, OTP_COLLECTION), {
    phone,
    code,
    expiresAt: Date.now() + OTP_TTL_MS,
    verified: false,
  });
  return { sessionId: ref.id, code };
}

export async function verifyOtp(sessionId: string, phone: string, code: string): Promise<boolean> {
  const snap = await getDocs(
    query(
      collection(db, OTP_COLLECTION),
      where("__name__", "==", sessionId)
    )
  );
  if (snap.empty) return false;
  const data = snap.docs[0].data();
  if (data.phone !== phone || data.code !== code) return false;
  if (Date.now() > data.expiresAt) return false;
  await deleteDoc(doc(db, OTP_COLLECTION, sessionId));
  return true;
}

/** Client-side demo: in production OTP is sent via API route + SMS/WhatsApp */
export function maskPhone(phone: string): string {
  if (phone.length < 4) return "****";
  return `${phone.slice(0, 2)}****${phone.slice(-2)}`;
}
