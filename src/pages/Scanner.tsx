import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QrCode, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Scanner() {
  const [scanning, setScanning] = useState(false);
  const { toast } = useToast();

  const startScanning = () => {
    toast({
      title: "Em desenvolvimento",
      description: "A funcionalidade de scanner será implementada em breve!",
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Scanner QR Code</h1>
          <p className="text-muted-foreground">Escaneie produtos para consulta rápida</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Escanear QR Code
              </CardTitle>
              <CardDescription>
                Use a câmera para escanear o código QR do produto
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <QrCode className="h-24 w-24 text-muted-foreground" />
              </div>
              <Button
                onClick={startScanning}
                disabled={scanning}
                className="w-full"
              >
                {scanning ? "Escaneando..." : "Iniciar Scanner"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informações</CardTitle>
              <CardDescription>Como usar o scanner</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-semibold">Funcionalidades:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Consulta rápida de informações do produto</li>
                  <li>Registro de entrada/saída de estoque</li>
                  <li>Verificação de validade e lote</li>
                  <li>Histórico de movimentações</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold">Dicas:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Mantenha o código QR limpo e visível</li>
                  <li>Use boa iluminação para melhor leitura</li>
                  <li>Aproxime a câmera até focar o código</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
