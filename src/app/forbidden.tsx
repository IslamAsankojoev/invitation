import { Home, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Forbidden() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/60 p-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <Lock aria-hidden="true" className="mx-auto mb-2 size-6 text-muted-foreground" />
          <h1 className="text-3xl font-semibold">403</h1>
          <CardTitle>Нет доступа</CardTitle>
          <CardDescription>
            Проверьте, что ссылка на редактор скопирована целиком — вместе с частью после «?token=». Если приглашение
            сохранено в аккаунте, войдите в него.
          </CardDescription>
        </CardHeader>
        {/* Выход из тупика: на главную, к шаблонам. */}
        <CardContent>
          <Button asChild variant="outline" className="w-full pointer-coarse:h-10">
            <a href="/">
              <Home /> На главную
            </a>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
