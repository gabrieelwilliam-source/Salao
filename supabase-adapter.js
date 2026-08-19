/**
 * Supabase adapter - referência para a etapa de integração.
 * O MVP atual usa dados de demonstração.
 *
 * Recomendação:
 * - nunca exponha service_role no navegador;
 * - use Supabase Auth + RLS;
 * - exponha views/RPC específicas para o painel;
 * - ações críticas (confirmar agendamento, takeover, marcar pagamento)
 *   devem passar por RPC controlada ou webhook autenticado do n8n.
 */

export const expectedViews = {
  dashboard: "salao_nayara_dashboard_today",
  pending: "salao_nayara_pending_handoffs",
  clients: "salao_nayara_customer_profiles",
  finance: "salao_nayara_financial_dashboard",
  agenda: "salao_nayara_agenda_dashboard",
  health: "salao_nayara_iana_health"
};

export function createDashboardApi(supabase) {
  return {
    async dashboardToday() {
      return supabase.from(expectedViews.dashboard).select("*").single();
    },
    async pendingHandoffs() {
      return supabase.from(expectedViews.pending).select("*").order("priority_rank");
    },
    async clients(search="") {
      let q = supabase.from(expectedViews.clients).select("*").limit(100);
      if (search) q = q.ilike("customer_name", `%${search}%`);
      return q;
    },
    async finance() {
      return supabase.from(expectedViews.finance).select("*");
    },
    async agenda() {
      return supabase.from(expectedViews.agenda).select("*").order("starts_at");
    },
    async health() {
      return supabase.from(expectedViews.health).select("*").single();
    }
  };
}
