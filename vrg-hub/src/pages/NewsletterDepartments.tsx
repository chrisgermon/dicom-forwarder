import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { AssignmentManagement } from "@/components/newsletter/AssignmentManagement";

export default function NewsletterDepartments() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Department Assignments</h1>
          <p className="text-muted-foreground">
            Please sign in to manage department assignments
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Department Assignments</h1>
        <p className="text-muted-foreground">
          Assign contributors to departments for newsletter submissions
        </p>
      </div>

      <Card className="p-6">
        <AssignmentManagement />
      </Card>
    </div>
  );
}
