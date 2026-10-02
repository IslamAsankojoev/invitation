import { Lock } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Forbidden() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/60 p-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <Lock className="mx-auto mb-2 size-6 text-muted-foreground" />
          <CardTitle className="text-3xl">403</CardTitle>
          <CardDescription>Нет доступа. Проверьте, что ссылка на редактор скопирована целиком вместе с token.</CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}
