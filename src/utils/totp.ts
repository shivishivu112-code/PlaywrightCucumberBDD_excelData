import { authenticator } from 'otplib';

export async function getTotp(secret: string): Promise<string> {
  const remaining = authenticator.timeRemaining();
  if (remaining < 3) {
    await new Promise((resolve) => setTimeout(resolve, (remaining + 1) * 1000));
  }
  return authenticator.generate(secret);
}