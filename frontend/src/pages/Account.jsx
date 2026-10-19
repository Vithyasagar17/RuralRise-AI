import { useState } from 'react';
import { signIn, signUp } from '../services/authClient.js';
export default function Account() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(null); setMessage(null);
    try {
      if (creating) {
        const signedIn = await signUp(email, password);
        if (!signedIn) setMessage('Check your email to confirm your account, then return here and sign in. An account may already exist for this address.');
      } else await signIn(email, password);
      setPassword('');
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <section className="rr-account"><h1>{creating ? 'Create your account' : 'Sign in to RuralRise'}</h1><p>Students keep their own learning records. Facilitators see only students assigned by the coordinator.</p>
    {error && <p role="alert" className="rr-error">{error}</p>}{message && <p role="status" className="rr-notice">{message}</p>}
    <form onSubmit={submit}><label>Email<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>Password<input type="password" autoComplete={creating ? 'new-password' : 'current-password'} minLength={creating ? 8 : undefined} required value={password} onChange={(event) => setPassword(event.target.value)} /></label><button type="submit" disabled={busy}>{busy ? 'Please wait…' : creating ? 'Create account' : 'Sign in'}</button></form>
    <button type="button" disabled={busy} onClick={() => { setCreating((v) => !v); setError(null); setMessage(null); }}>{creating ? 'I already have an account' : 'Create a student account'}</button><p>Facilitator access is assigned by the coordinator after account creation.</p></section>;
}
