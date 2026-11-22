export default function Home() {
  return (
    <main style={{
      minHeight: "100vh",
      background: "#f7f4ef",
      color: "#292722",
      padding: "70px 24px",
      fontFamily: "Georgia, serif"
    }}>
      <div style={{
        maxWidth: "700px",
        margin: "auto"
      }}>
        <p style={{
          fontSize: "12px",
          letterSpacing: "4px",
          color: "#999"
        }}>
          A PERSONAL JOURNAL
        </p>

        <h1 style={{
          fontSize: "48px",
          fontWeight: "normal",
          marginTop: "20px"
        }}>
          lilwff’s story
        </h1>

        <p style={{
          color: "#888",
          fontSize: "16px",
          marginTop: "12px"
        }}>
          Little pieces of a life, collected in one place.
        </p>

        <hr style={{
          border: "none",
          borderTop: "1px solid #ddd",
          margin: "50px 0"
        }} />

        <p style={{
          color: "#aaa",
          textAlign: "center",
          padding: "70px 0"
        }}>
          The story begins here.
        </p>
      </div>
    </main>
  );
}
