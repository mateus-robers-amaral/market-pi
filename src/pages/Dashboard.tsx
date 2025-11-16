import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertTriangle, TrendingDown, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStock: 0,
    nearExpiration: 0,
    totalValue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    loadStats();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const loadStats = async () => {
    try {
      // Total de produtos
      const { count: totalProducts } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("status", "ativo");

      // Produtos com estoque baixo
      const { data: lowStockData } = await supabase
        .from("products")
        .select("current_stock, minimum_stock")
        .eq("status", "ativo");

      const lowStock = lowStockData?.filter(
        (p) => p.current_stock <= p.minimum_stock
      ).length || 0;

      // Produtos próximos ao vencimento (30 dias)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      const { count: nearExpiration } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("status", "ativo")
        .not("expiration_date", "is", null)
        .lte("expiration_date", thirtyDaysFromNow.toISOString());

      // Valor total do estoque
      const { data: products } = await supabase
        .from("products")
        .select("current_stock, cost_price")
        .eq("status", "ativo");

      const totalValue = products?.reduce(
        (acc, product) => acc + (product.current_stock * product.cost_price),
        0
      ) || 0;

      setStats({
        totalProducts: totalProducts || 0,
        lowStock,
        nearExpiration: nearExpiration || 0,
        totalValue,
      });
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, variant = "default" }: any) => {
    const variants = {
      default: "text-foreground",
      success: "text-success",
      warning: "text-warning",
      danger: "text-destructive",
    };

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className={`h-4 w-4 ${variants[variant as keyof typeof variants]}`} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">Carregando...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do estoque</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total de Produtos"
            value={stats.totalProducts}
            icon={Package}
            variant="default"
          />
          <StatCard
            title="Estoque Baixo"
            value={stats.lowStock}
            icon={TrendingDown}
            variant="warning"
          />
          <StatCard
            title="Próximo ao Vencimento"
            value={stats.nearExpiration}
            icon={AlertTriangle}
            variant="danger"
          />
          <StatCard
            title="Valor Total"
            value={`R$ ${stats.totalValue.toFixed(2)}`}
            icon={DollarSign}
            variant="success"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Bem-vindo ao Estoque Pro!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Use o menu lateral para navegar entre as funcionalidades do sistema.
              Gerencie produtos, controle movimentações e acompanhe o estoque em tempo real.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
