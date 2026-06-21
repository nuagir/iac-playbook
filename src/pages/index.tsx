import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";

export default function Home() {
  return (
    <Layout title="IaC Playbook" description="Opinionated Infrastructure-as-Code best practices">
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "3rem 1.5rem" }}>
        <h1>IaC Playbook</h1>
        <p>
          An opinionated guide to writing, structuring, and operating Infrastructure-as-Code at
          scale. The playbook covers naming conventions, module design, state management, secret
          handling, CI/CD pipelines, and day-two operations across cloud providers.
        </p>
        <p>
          Each section is self-contained and actionable. Start with the topic most relevant to your
          current work, or read sequentially to build a complete mental model.
        </p>
        <h2>Contents</h2>
        <ul>
          <li>
            <Link to="/terraform">Terraform</Link> — naming conventions, backends, module structure,
            providers, variables, secrets, workflow, CI/CD pipelines, and lifecycle rules.
          </li>
        </ul>
      </main>
    </Layout>
  );
}
