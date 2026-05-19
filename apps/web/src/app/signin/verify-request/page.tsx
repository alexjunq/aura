export default function VerifyRequestPage() {
  return (
    <main style={{ maxWidth: 480, margin: '4rem auto', padding: '0 1rem' }}>
      <h1>Check your inbox</h1>
      <p>
        We&apos;ve sent you a sign-in link. Open it from the same device you requested it on.
      </p>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Didn&apos;t arrive? Check your spam folder or <a href="/signin">try again</a>.
      </p>
    </main>
  );
}
