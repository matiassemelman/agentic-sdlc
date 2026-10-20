export default function Home() {
  return (
    <main style={{ maxWidth: "40rem", padding: "4rem 1.25rem", lineHeight: 1.5 }}>
      <h1 style={{ fontSize: "1.5rem" }}>agentic-sdlc factory</h1>
      <p>
        This app receives the board&apos;s webhooks and wakes the factory on GitHub. Its panel comes later. The code is at{" "}
        <a href="https://github.com/matiassemelman/agentic-sdlc">github.com/matiassemelman/agentic-sdlc</a>.
      </p>
    </main>
  );
}
