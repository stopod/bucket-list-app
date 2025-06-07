import { AuthenticatedLayout } from "~/components/authenticated-layout";
import { withAuth } from "~/lib/with-auth";

function SampleComponent() {
  return (
    <AuthenticatedLayout>
      <div>
        <h1>Sample Component</h1>
        <p>This is a sample component for demonstration purposes.</p>
      </div>
    </AuthenticatedLayout>
  );
}

export default withAuth(SampleComponent);
